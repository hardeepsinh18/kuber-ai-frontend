/**
 * The background list refresh is the last write path that can reorder the
 * sidebar, and the one the previous three fixes did not touch.
 *
 * refreshChatListFromServer replaces every row's updatedAt with the server's
 * `updated_at`, unconditionally, for every chat except the one currently open.
 * It runs on mount, on window focus, and on visibilitychange (throttled 15s).
 *
 * So if the server's updated_at is fresher than reality — because an earlier
 * build PATCHed on open, because the backend touches the row on read, or
 * because it serialises a write timestamp rather than a content-change one —
 * the frontend faithfully re-sorts the sidebar every time the tab regains
 * focus. That reproduces the reported symptom (several chats reading "now",
 * order changing on its own) even with every client-side write already fixed.
 *
 * These tests pin what the client can control: a refresh must not be able to
 * move a chat the user has not touched ABOVE its real position, and a real
 * server-side update must still be honoured.
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

const YESTERDAY = 1_700_000_000_000;
const RECENT = 1_700_000_600_000;

const holder = { value: null };
const api = new Proxy({}, { get: (_t, k) => holder.value?.[k] });

function Probe() {
    const ctx = useChatHistory();
    useEffect(() => { holder.value = ctx; });
    return <span data-testid="ids">{ctx.chatList.map((c) => `${c.id}:${c.updatedAt}`).join(',')}</span>;
}

beforeEach(() => {
    // The refresh is throttled via sessionStorage (15s); without clearing it the
    // second test in the file is skipped by the cooldown, not by the component.
    try { sessionStorage.clear(); } catch { /* ignore */ }
    chatStorage.getChatMessages.mockReturnValue([{ id: 'm1', role: 'user', content: 'q' }]);
    chatStorage.getPendingDeletes.mockReturnValue([]);
    chatStorage.saveChatMessages.mockImplementation(() => {});
    chatStorage.saveChatList.mockImplementation(() => {});
    chatStorage.getTitleFromMessages.mockReturnValue('t');
    chatStorage.setStorageIdentity?.mockImplementation?.(() => {});
    // Real implementation — this is the function under test downstream.
    chatStorage.toTimestamp.mockImplementation((v) => {
        if (v == null || v === '') return 0;
        if (typeof v === 'number') return v;
        const raw = String(v).trim();
        const hasZone = /(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(raw);
        const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)$/);
        const cand = !hasZone && m ? `${m[1]}T${m[2]}Z` : raw;
        const ts = new Date(cand).getTime();
        return Number.isNaN(ts) ? 0 : ts;
    });

    chatStorage.getChatList.mockReturnValue([
        { id: 'old', title: 'Show me TCS fundamentals', updatedAt: YESTERDAY },
        { id: 'new', title: 'HDFC Bank Limited', updatedAt: RECENT },
    ]);

    chatsApi.getChat.mockResolvedValue(null);
    chatsApi.appendMessages.mockResolvedValue({});
    chatsApi.updateChatTitle.mockResolvedValue({});
    chatsApi.deleteChat.mockResolvedValue({});
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('background list refresh', () => {
    it('does not let a stale-but-fresh-looking server timestamp reorder an untouched chat', async () => {
        // The server reports the OLD chat as updated "now" — exactly what an
        // earlier build's PATCH-on-open, or a backend that touches the row on
        // read, would leave behind. The user never typed in it.
        chatsApi.getChats.mockResolvedValue([
            { id: 'old', title: 'Show me TCS fundamentals', updated_at: new Date(Date.now()).toISOString() },
            { id: 'new', title: 'HDFC Bank Limited', updated_at: new Date(RECENT).toISOString() },
        ]);

        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await waitFor(() => expect(chatsApi.getChats).toHaveBeenCalled());
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });

        const byId = Object.fromEntries(
            (api.chatList ?? []).map((c) => [c.id, c.updatedAt])
        );
        expect(
            byId.old,
            'a chat the user never touched must keep its known timestamp, not jump to "now"'
        ).toBe(YESTERDAY);
    });

    it('still accepts a server timestamp for a chat with no local record', async () => {
        // Not over-correcting: a chat this device has never seen (created on the
        // phone) has no local timestamp to preserve, so the server value stands.
        // Keep one locally-known row so the provider still has a list to refresh.
        chatStorage.getChatList.mockReturnValue([
            { id: 'old', title: 'Show me TCS fundamentals', updatedAt: YESTERDAY },
        ]);
        chatsApi.getChats.mockResolvedValue([
            { id: 'old', title: 'Show me TCS fundamentals', updated_at: new Date(YESTERDAY).toISOString() },
            { id: 'fromPhone', title: 'Asked on mobile', updated_at: new Date(RECENT).toISOString() },
        ]);

        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await waitFor(() => expect(chatsApi.getChats).toHaveBeenCalled());
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });

        const row = (api.chatList ?? []).find((c) => c.id === 'fromPhone');
        expect(row?.updatedAt).toBe(RECENT);
    });
});
