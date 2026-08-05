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

        // The user types — this SHOULD move the chat to the top.
        await act(async () => {
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
