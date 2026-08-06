// SSE streaming client for POST /api/v1/chat/stream.
//
// Resolves with the authoritative `done` payload (same shape POST /chat returns)
// and invokes onToken(delta) / onData(payload) live as the answer streams in.
// THROWS on network error, non-200, a non-SSE response, an `error` event, or a
// stream that ends without `done` — callers MUST catch and fall back to the plain
// /chat request so streaming can never break the chat.

export async function streamChatRequest({
    endpoint,
    payload,
    headers = {},
    onToken,
    onData,
    onStep,
    onFirstEvent,
    timeoutMs = 120000,
    registerAbort,
}) {
    const controller = new AbortController();
    if (registerAbort) registerAbort(controller);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let resp;
    try {
        resp = await fetch(endpoint, {
            method: 'POST',
            headers: { ...headers, Accept: 'text/event-stream' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
    } catch (e) {
        clearTimeout(timeoutId);
        throw e; // network/abort — caller falls back
    }

    if (!resp.ok || !resp.body) {
        clearTimeout(timeoutId);
        const err = new Error(`stream http ${resp.status}`);
        err.httpStatus = resp.status;
        throw err;
    }
    const ctype = resp.headers.get('content-type') || '';
    if (!ctype.includes('text/event-stream')) {
        clearTimeout(timeoutId);
        throw new Error('stream: not an event-stream response');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let donePayload = null;
    let streamError = null;
    let sawFirst = false;

    const handleBlock = (block) => {
        let ev = 'message';
        let data = '';
        for (const line of block.split('\n')) {
            if (line.startsWith('event:')) ev = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) return;
        let parsed;
        try { parsed = JSON.parse(data); } catch { return; }
        if (!sawFirst) { sawFirst = true; if (onFirstEvent) onFirstEvent(); }
        if (ev === 'token') {
            if (onToken && parsed.delta) onToken(parsed.delta);
        } else if (ev === 'step') {
            // Provenance as it happens: {id, phase: 'start'|'done', text, ok, ms}.
            // `start` is the present-tense label, `done` the factual result under
            // the same id, so the UI resolves the line in place.
            if (onStep && parsed.id != null) onStep(parsed);
        } else if (ev === 'data') {
            if (onData) onData(parsed);
        } else if (ev === 'done') {
            donePayload = parsed;
        } else if (ev === 'error') {
            streamError = new Error(parsed.message || 'stream error event');
        }
    };

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf('\n\n')) >= 0) {
                handleBlock(buffer.slice(0, idx));
                buffer = buffer.slice(idx + 2);
            }
        }
        if (buffer.trim()) handleBlock(buffer); // flush any tail
    } finally {
        clearTimeout(timeoutId);
        try { reader.releaseLock(); } catch { /* noop */ }
    }

    if (streamError && !donePayload) throw streamError;
    if (!donePayload) throw new Error('stream ended without a done event');
    return donePayload;
}
