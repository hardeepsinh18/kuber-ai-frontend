/**
 * Two reported bugs, same root cause: opening a chat is treated as changing it.
 *
 * 1. Opening an old chat jumped it to the top of the sidebar. Reading a chat is
 *    not activity — only typing/editing should re-sort it. The user explicitly
 *    wants the list to hold still until they actually contribute a message.
 *
 * 2. Yesterday's chats opened with the question visible but no answer.
 *
 * Both come from loadChat()'s interaction with the debounced persist effect.
 * loadChat resets syncedMessageCountRef to 0 and then hydrates from the server,
 * which changes `messages` — that schedules flushPersist. flushPersist computes
 * `hasNewMessages = messages.length > syncedMessageCountRef.current`, so if it
 * runs while the counter still lags the hydrated message list, a pure read is
 * indistinguishable from the user having typed, and updatedAt gets bumped.
 *
 * These tests drive the REAL provider through the real loadChat, with the API
 * and storage layers mocked, so they fail against the shipped code rather than
 * against a reimplementation of it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';

vi.mock('../lib/chatsApi');
vi.mock('../lib/chatStorage');
vi.mock('./AuthContext', () => ({
    useAuth: () => ({ accessToken: 'tok', supabaseConfigured: true, loading: false }),
}));

import * as chatsApi from '../lib/chatsApi';
import * as chatStorage from '../lib/chatStorage';
import { ChatHistoryProvider, useChatHistory } from './ChatHistoryContext';

const OLD = 'chat-old';
const SERVER_MSGS = [
    { id: 'm1', role: 'user', content: 'Reliance Infrastructure Limited', metadata: {} },
    {
        id: 'm2',
        role: 'assistant',
        content: 'Here is the full analyst answer body.',
        metadata: { _scoreCard: { score: 71 }, _aiTake: 'Fundamentals look stable.' },
    },
];

// The context is captured in an effect, never during render: writing to
// anything declared outside the component while rendering is a side effect
// (react-hooks/globals). `api` reads through the holder, so tests can drive the
// real provider without the probe reassigning a module binding mid-render.
const chatCtxHolder = { value: null };
const api = new Proxy({}, { get: (_t, k) => chatCtxHolder.value?.[k] });

let resolveGetChat;
function Probe() {
    const ctx = useChatHistory();
    useEffect(() => {
        chatCtxHolder.value = ctx;
    });
    return (
        <div>
            <span data-testid="count">{ctx.messages.length}</span>
            <span data-testid="ai">
                {ctx.messages.filter((m) => m.role === 'ai').map((m) => m.content).join('|')}
            </span>
            <span data-testid="scorecard">
                {ctx.messages.some((m) => m.scoreCard) ? 'has-scorecard' : 'no-scorecard'}
            </span>
        </div>
    );
}

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default: nothing cached locally — the state after localStorage eviction,
    // a different device, or simply an older chat. This is the path that must
    // hydrate everything from the server.
    chatStorage.getChatMessages.mockReturnValue([]);
    chatStorage.getChatList.mockReturnValue([
        { id: OLD, title: 'Reliance Infrastructure Limited', updatedAt: 1000 },
    ]);
    chatStorage.getPendingDeletes.mockReturnValue([]);
    chatStorage.saveChatMessages.mockImplementation(() => {});
    chatStorage.saveChatList.mockImplementation(() => {});
    chatStorage.getTitleFromMessages.mockReturnValue('Reliance Infrastructure Limited');
    chatStorage.toTimestamp.mockImplementation((v) => (typeof v === 'number' ? v : 1000));
    chatStorage.setStorageIdentity?.mockImplementation?.(() => {});

    chatsApi.getChats.mockResolvedValue([
        { id: OLD, title: 'Reliance Infrastructure Limited', updated_at: 1000 },
    ]);
    // Deferred deliberately: loadChat's in-flight guard compares against
    // currentChatIdRef, which React only assigns in an effect. Resolving the
    // fetch before that effect commits makes the guard drop the response and
    // the test would measure the harness, not the component.
    resolveGetChat = null;
    chatsApi.getChat.mockImplementation(
        () => new Promise((res) => { resolveGetChat = () => res({ id: OLD, messages: SERVER_MSGS }); })
    );
    chatsApi.appendMessages.mockResolvedValue({});
    chatsApi.updateChatTitle.mockResolvedValue({});
    chatsApi.deleteChat.mockResolvedValue({});
});

afterEach(() => {
    cleanup();          // unmount between tests, or getByTestId sees both renders
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('opening an old chat', () => {
    it('renders the assistant answer, not just the question', async () => {
        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

        // The reported symptom: question shows, answer does not.
        expect(screen.getByTestId('ai').textContent).toBe('Here is the full analyst answer body.');
        // And the structured card must survive rehydration, or the answer renders
        // as bare text even when the content string is present.
        expect(screen.getByTestId('scorecard').textContent).toBe('has-scorecard');
    });

    it('does not bump updatedAt just because the chat was opened', async () => {
        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

        // Let the 400ms persist debounce fire — this is the window in which a
        // pure read used to be recorded as an edit.
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        const bumped = chatStorage.saveChatList.mock.calls
            .flatMap(([list]) => list ?? [])
            .filter((c) => c.id === OLD)
            .some((c) => (c.updatedAt ?? 0) > 1000);

        expect(bumped, 'reading a chat must not re-sort it to the top').toBe(false);
    });

    it('sends no write to the server when a chat is only read', async () => {
        // The local list above was already guarded, but the SERVER round-trip was
        // not: flushPersist PATCHed the title on every flush, including one caused
        // purely by opening a chat. That PATCH makes the backend touch updated_at,
        // so the next list refresh legitimately reports the chat as the most
        // recently updated and it floats to the top — with the sidebar showing
        // "now" for a chat from yesterday. Reading must be a no-op on the wire.
        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        expect(
            chatsApi.updateChatTitle.mock.calls.length,
            'opening a chat must not PATCH its title'
        ).toBe(0);
        expect(
            chatsApi.appendMessages.mock.calls.length,
            'opening a chat must not re-append its messages'
        ).toBe(0);
    });

    it('sends no write when a PARTIALLY cached chat is only read', async () => {
        // The case the earlier no-write test missed, and the reason the bug looked
        // intermittent ("sometimes it moves, sometimes it doesn't").
        //
        // With an EMPTY local cache, loadChat takes the setMessages(msgs) branch,
        // which advances syncedMessageCountRef to the server length — so nothing
        // looks new and nothing is written. But when localStorage holds only SOME
        // of the messages, the merge branch runs: it grows `messages` to the
        // server's length while syncedMessageCountRef stays at the shorter LOCAL
        // count. flushPersist then sees messages.length > syncedMessageCountRef,
        // concludes the user added messages, re-appends them and bumps updatedAt.
        // Purely from opening the chat.
        //
        // Which chats are partially cached depends on quota eviction and on
        // whether a persist landed mid-stream, hence the randomness.
        chatStorage.getChatMessages.mockReturnValue([
            { id: 'm1', role: 'user', content: 'Reliance Infrastructure Limited' },
        ]);

        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        expect(
            chatsApi.appendMessages.mock.calls.length,
            'hydrating a partially cached chat must not re-append its messages'
        ).toBe(0);
        expect(
            chatsApi.updateChatTitle.mock.calls.length,
            'hydrating a partially cached chat must not PATCH its title'
        ).toBe(0);

        const bumped = chatStorage.saveChatList.mock.calls
            .flatMap(([list]) => list ?? [])
            .filter((c) => c.id === OLD)
            .some((c) => (c.updatedAt ?? 0) > 1000);
        expect(bumped, 'hydrating a partially cached chat must not re-sort it').toBe(false);
    });

    it('does not mark a local-only tail as synced when hydrating', async () => {
        // The risk in advancing syncedMessageCountRef after the merge: push it past
        // the server's length and a message that never reached the server would be
        // recorded as already sent. The ref therefore advances to the SERVER's
        // length only (Math.max with the existing value, never beyond msgs.length).
        //
        // Scope note: loadChat seeds the ref from the LOCAL count, so a tail that
        // localStorage holds but the server does not is already treated as synced
        // before this code runs. That is a pre-existing limitation of tracking sync
        // state as a COUNT rather than per-message — it fails identically with and
        // without the change here, and fixing it means reworking the sync bookkeeping
        // (risking duplicate sends), which is out of scope for this bug. What this
        // test pins is that the hydration path does not make it any worse.
        chatStorage.getChatMessages.mockReturnValue([
            { id: 'm1', role: 'user', content: 'Reliance Infrastructure Limited' },
            { id: 'm2', role: 'ai', content: 'Here is the full analyst answer body.' },
            { id: 'm3', role: 'user', content: 'never reached the server' },
        ]);

        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        // The tail must survive in state regardless — never silently dropped.
        expect(screen.getByTestId('count').textContent).toBe('3');

        // And hydration must not re-send the messages the server already has.
        const appended = chatsApi.appendMessages.mock.calls.flatMap(([, msgs]) => msgs ?? []);
        expect(
            appended.map((m) => m.content),
            'hydration must not re-append messages the server already holds'
        ).not.toContain('Here is the full analyst answer body.');
    });

    it('does not bump the chat being LEFT when switching between two chats', async () => {
        // What the screenshots actually showed: click chat B, and the chat that was
        // already open (A) jumps to "now" — even though nothing was typed in either.
        //
        // loadChat flushes the chat it is LEAVING before switching. That flush is
        // correct in itself (it protects an answer still inside the 400ms debounce),
        // but it runs unconditionally whenever the outgoing chat has any messages.
        // If A was merely opened, its messages came from storage/server, not from
        // the user — so the flush must not record them as new activity.
        const A = 'chat-a';
        const B = 'chat-b';

        chatStorage.getChatList.mockReturnValue([
            { id: A, title: 'Show me TCS fundamentals', updatedAt: 1000 },
            { id: B, title: 'ICICI Bank Limited', updatedAt: 2000 },
        ]);
        chatStorage.getChatMessages.mockImplementation(() => [
            { id: 'm1', role: 'user', content: 'q' },
            { id: 'm2', role: 'ai', content: 'a' },
        ]);
        chatsApi.getChats.mockResolvedValue([
            { id: A, title: 'Show me TCS fundamentals', updated_at: 1000 },
            { id: B, title: 'ICICI Bank Limited', updated_at: 2000 },
        ]);
        chatsApi.getChat.mockResolvedValue({
            id: A,
            messages: [
                { id: 'm1', role: 'user', content: 'q', metadata: {} },
                { id: 'm2', role: 'assistant', content: 'a', metadata: {} },
            ],
        });

        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        // Open A (read only), let everything settle.
        await act(async () => { api.loadChat(A); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        chatStorage.saveChatList.mockClear();
        chatsApi.appendMessages.mockClear();
        chatsApi.updateChatTitle.mockClear();

        // Now click B. A is flushed on the way out — it must not be re-stamped.
        await act(async () => { api.loadChat(B); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        const aBumped = chatStorage.saveChatList.mock.calls
            .flatMap(([list]) => list ?? [])
            .filter((c) => c.id === A)
            .some((c) => (c.updatedAt ?? 0) > 1000);

        expect(aBumped, 'leaving a chat must not move it to the top').toBe(false);
        expect(
            chatsApi.appendMessages.mock.calls.length,
            'leaving a read-only chat must not re-append its messages'
        ).toBe(0);
    });

    it('never re-sorts on message-count growth alone, only on an explicit send', async () => {
        // The invariant behind all of the above. Four separate fixes each removed
        // one way for a COUNT change to be misread as user activity (open, hydrate
        // a partial cache, switch away, background refresh) — and the bug survived
        // each one, because the count is simply not the right signal: it moves for
        // hydration, eviction and merges too.
        //
        // Ordering is now driven by markChatTouched(), which only the send path
        // calls. This asserts the property directly: grow the message list without
        // a send, and the chat must not move.
        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        chatStorage.saveChatList.mockClear();

        // Messages appear WITHOUT a send — exactly what hydration/merge looks like.
        await act(async () => {
            api.setMessages((prev) => [...prev, { id: 'x1', role: 'ai', content: 'hydrated, not sent' }]);
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        const bumped = chatStorage.saveChatList.mock.calls
            .flatMap(([list]) => list ?? [])
            .filter((c) => c.id === OLD)
            .some((c) => (c.updatedAt ?? 0) > 1000);

        expect(bumped, 'a message arriving without a user send must not re-sort').toBe(false);
    });

    it('does write to the server once the user adds a message', async () => {
        // Guard against over-correcting: suppressing the read-only PATCH must not
        // suppress a real one, or renames and new turns stop syncing.
        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        await act(async () => {
            api.setMessages((prev) => [...prev, { id: 'm3', role: 'user', content: 'and its debt?' }]);
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        expect(chatsApi.appendMessages.mock.calls.length).toBeGreaterThan(0);
        expect(chatsApi.updateChatTitle.mock.calls.length).toBeGreaterThan(0);
    });

    it('recovers the answer when localStorage only cached the question', async () => {
        // The reported bug. localStorage is lossy: it evicts under quota
        // pressure, and a persist that lands mid-stream can store the user's
        // question before the assistant turn exists. The server still has both.
        // The index-merge only walked the LOCAL array, so a server message past
        // the end of it — the answer — was silently dropped and the chat opened
        // showing the question with nothing under it.
        chatStorage.getChatMessages.mockReturnValue([
            { id: 'm1', role: 'user', content: 'Reliance Infrastructure Limited' },
        ]);

        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });

        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        expect(screen.getByTestId('ai').textContent).toBe('Here is the full analyst answer body.');
        expect(screen.getByTestId('scorecard').textContent).toBe('has-scorecard');
    });

    it('keeps a local-only message the server has not stored yet', async () => {
        // The flip side: the merge must not truncate to the server's length
        // either, or an answer still syncing would vanish on a chat switch.
        chatStorage.getChatMessages.mockReturnValue([
            { id: 'm1', role: 'user', content: 'Reliance Infrastructure Limited' },
            { id: 'm2', role: 'ai', content: 'Here is the full analyst answer body.' },
            { id: 'm3', role: 'user', content: 'not yet synced' },
        ]);

        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });

        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    });

    it('still bumps updatedAt when the user actually adds a message', async () => {
        render(
            <ChatHistoryProvider>
                <Probe />
            </ChatHistoryProvider>
        );

        await act(async () => { api.loadChat(OLD); });
        await act(async () => { resolveGetChat(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        chatStorage.saveChatList.mockClear();

        // The user sends a message — this SHOULD move the chat to the top.
        // markChatTouched is the explicit activity signal the send path calls
        // (ChatContainer), replacing the old "message count grew" inference which
        // fired for hydration and merges too. Driving it here mirrors a real send.
        await act(async () => {
            api.markChatTouched(OLD);
            api.setMessages((prev) => [...prev, { id: 'm3', role: 'user', content: 'and its debt?' }]);
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        const bumped = chatStorage.saveChatList.mock.calls
            .flatMap(([list]) => list ?? [])
            .filter((c) => c.id === OLD)
            .some((c) => (c.updatedAt ?? 0) > 1000);

        expect(bumped, 'editing a chat must still re-sort it').toBe(true);
    });
});
