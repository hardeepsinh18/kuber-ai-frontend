/**
 * Renaming a chat did not survive a reload: the sidebar showed the new name,
 * then reverted to the first-message text on refresh.
 *
 * flushPersist derives a title from the messages (getTitleFromMessages) and
 * wrote it into the chat list unconditionally, so any custom name was clobbered
 * the next time that chat was flushed — which happens on open, on hydrate and on
 * switching away. Worse, the titleChanged check then saw the derived title as a
 * change and PATCHed it to the SERVER, making the revert permanent rather than
 * merely local.
 *
 * These drive the real provider so they fail against the shipped code.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';

vi.mock('../lib/chatsApi');
vi.mock('../lib/chatStorage');
vi.mock('./AuthContext', () => ({
    useAuth: () => ({ accessToken: 'tok', supabaseConfigured: true, loading: false }),
}));

import * as chatsApi from '../lib/chatsApi';
import * as chatStorage from '../lib/chatStorage';
import { ChatHistoryProvider, useChatHistory } from './ChatHistoryContext';

const ID = 'chat-1';
const FIRST_MSG = 'Top PSU stocks by dividend yield';
const CUSTOM = 'bugs';

const holder = { value: null };
const api = new Proxy({}, { get: (_t, k) => holder.value?.[k] });

function Probe() {
    const ctx = useChatHistory();
    useEffect(() => { holder.value = ctx; });
    return null;
}

// A stand-in for the persisted list, so a rename written by the provider is
// visible to the next read exactly as localStorage would be.
let storedList;

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    storedList = [{ id: ID, title: FIRST_MSG, updatedAt: 1000 }];

    chatStorage.getChatList.mockImplementation(() => storedList);
    chatStorage.saveChatList.mockImplementation((l) => { storedList = l; });
    chatStorage.getChatMessages.mockReturnValue([
        { id: 'm1', role: 'user', content: FIRST_MSG },
        { id: 'm2', role: 'ai', content: 'Here are the results.' },
    ]);
    chatStorage.getPendingDeletes.mockReturnValue([]);
    chatStorage.saveChatMessages.mockImplementation(() => {});
    // The real implementation: title is always the first user message.
    chatStorage.getTitleFromMessages.mockImplementation((msgs) => {
        const u = (msgs || []).find((m) => m.role === 'user');
        return u ? String(u.content).slice(0, 40) : 'New chat';
    });
    chatStorage.toTimestamp.mockImplementation((v) => (typeof v === 'number' ? v : 1000));
    chatStorage.setStorageIdentity?.mockImplementation?.(() => {});

    chatsApi.getChats.mockResolvedValue([{ id: ID, title: FIRST_MSG, updated_at: 1000 }]);
    chatsApi.getChat.mockResolvedValue(null);
    chatsApi.appendMessages.mockResolvedValue({});
    chatsApi.updateChatTitle.mockResolvedValue({});
    chatsApi.deleteChat.mockResolvedValue({});
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

const titleOf = (id) => storedList.find((c) => c.id === id)?.title;

describe('renaming a chat', () => {
    it('keeps the custom name after a persist flush', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);

        await act(async () => { api.loadChat(ID); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });

        await act(async () => { api.renameChat(ID, CUSTOM); });
        expect(titleOf(ID)).toBe(CUSTOM);

        // Any later flush (open, hydrate, switch away) must not re-derive over it.
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        expect(titleOf(ID), 'a renamed chat must not revert to its first message').toBe(CUSTOM);
    });

    it('does not push the derived title back to the server after a rename', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);

        await act(async () => { api.loadChat(ID); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { api.renameChat(ID, CUSTOM); });

        chatsApi.updateChatTitle.mockClear();
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        const pushed = chatsApi.updateChatTitle.mock.calls.map(([, t]) => t);
        expect(pushed, 'the flush must not overwrite the rename on the server')
            .not.toContain(FIRST_MSG);
    });

    it('still derives a title for a chat the user never renamed', async () => {
        // Guard against over-correcting: untitled chats must still get their
        // first-message title, or the sidebar fills with "New chat".
        storedList = [];
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);

        await act(async () => { api.loadChat(ID); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        await waitFor(() => expect(titleOf(ID)).toBe(FIRST_MSG));
    });

    it('does not move the chat to the top of the sidebar', async () => {
        // Renaming is a label change, not new activity. The sidebar sorts by
        // updatedAt, so stamping it on rename yanked a chat from hours-old
        // straight to "now" — the user renames something at the bottom of the
        // list and it jumps to the top.
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);

        await act(async () => { api.loadChat(ID); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });

        await act(async () => { api.renameChat(ID, CUSTOM); });

        const row = storedList.find((c) => c.id === ID);
        expect(row?.title, 'the rename itself must still apply').toBe(CUSTOM);
        expect(row?.updatedAt, 'renaming must not re-sort the chat').toBe(1000);
    });

    it('does not let a later flush bump it either', async () => {
        // renameChat also marked the chat "touched", which is the signal
        // flushPersist uses to stamp updatedAt — so even with the direct stamp
        // removed, the next flush (open, hydrate, switch away) would move it.
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);

        await act(async () => { api.loadChat(ID); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { api.renameChat(ID, CUSTOM); });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        const bumped = chatStorage.saveChatList.mock.calls
            .flatMap(([list]) => list ?? [])
            .filter((c) => c.id === ID)
            .some((c) => (c.updatedAt ?? 0) > 1000);
        expect(bumped, 'a flush after a rename must not re-sort it').toBe(false);
    });

    it('still derives a title for a chat the user never renamed', async () => {
        // Guard against over-correcting: untitled chats must still get their
        // first-message title, or the sidebar fills with "New chat".
        storedList = [];
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);

        await act(async () => { api.loadChat(ID); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        await waitFor(() => expect(titleOf(ID)).toBe(FIRST_MSG));
    });
});
