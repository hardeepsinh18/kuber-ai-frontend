/**
 * Chat history must survive on the server, not just in localStorage.
 *
 * The bug these pin: appendMessages treated 404 the same as 501 and returned
 * null, i.e. it RESOLVED. The caller advances its synced-message counter before
 * the request and only rolls it back in .catch(), so a resolved 404 marked the
 * messages as stored when the server had never seen them. The only remaining
 * copy was localStorage, which the persist layer treats as evictable — so the
 * user reopened a chat and found their question with no answer.
 *
 * 404 and 501 mean different things here and must not be conflated:
 *   501 — the endpoint isn't deployed. Nothing to retry; degrade quietly.
 *   404 — THIS chat is unknown to the server. Recoverable, and must be retried.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appendMessages, createChat, MissingChatError } from './chatsApi.js';

const okJson = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
});

describe('appendMessages failure signalling', () => {
    beforeEach(() => { globalThis.fetch = vi.fn(); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('throws MissingChatError on 404 so the caller can heal and retry', async () => {
        globalThis.fetch.mockResolvedValue(okJson({ detail: 'Chat not found.' }, 404));

        await expect(appendMessages('chat-1', [{ role: 'user' }], 'tok'))
            .rejects.toBeInstanceOf(MissingChatError);
    });

    it('carries the chat id on the error', async () => {
        globalThis.fetch.mockResolvedValue(okJson({}, 404));

        await expect(appendMessages('chat-42', [], 'tok'))
            .rejects.toMatchObject({ chatId: 'chat-42' });
    });

    it('still degrades quietly when the endpoint is not deployed (501)', async () => {
        globalThis.fetch.mockResolvedValue(okJson({}, 501));

        await expect(appendMessages('chat-1', [], 'tok')).resolves.toBeNull();
    });

    it('rejects on other server errors so they are retried too', async () => {
        globalThis.fetch.mockResolvedValue(okJson({}, 500));

        await expect(appendMessages('chat-1', [], 'tok')).rejects.toThrow();
    });

    it('resolves true on success', async () => {
        globalThis.fetch.mockResolvedValue(okJson({ appended: 2 }, 201));

        await expect(appendMessages('chat-1', [], 'tok')).resolves.toBe(true);
    });
});

describe('createChat under a client-supplied id', () => {
    beforeEach(() => { globalThis.fetch = vi.fn(); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('sends the id so the chat is healed under the one already in use', async () => {
        globalThis.fetch.mockResolvedValue(okJson({ id: 'local-uuid' }, 201));

        await createChat('tok', 'TCS fundamentals', 'local-uuid');

        const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
        expect(body).toEqual({ title: 'TCS fundamentals', id: 'local-uuid' });
    });

    it('omits the id entirely for an ordinary new chat', async () => {
        globalThis.fetch.mockResolvedValue(okJson({ id: 'server-uuid' }, 201));

        await createChat('tok', 'New chat');

        const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
        expect(body).toEqual({ title: 'New chat' });
        expect('id' in body).toBe(false);
    });

    it('returns the server id', async () => {
        globalThis.fetch.mockResolvedValue(okJson({ id: 'server-uuid' }, 201));

        await expect(createChat('tok', 'New chat')).resolves.toBe('server-uuid');
    });
});
