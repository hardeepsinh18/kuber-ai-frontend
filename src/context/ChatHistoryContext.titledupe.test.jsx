/**
 * VNTY-022 (QA report, 24-25 Aug 2026, P3): a suggestion card sends the SAME
 * literal prompt text every time it's clicked, so titling a chat from its
 * first user message (the normal, correct behavior) made two chats started
 * from the same card — even on different days — collide verbatim. A 42-chat
 * account carried only 38 distinct names.
 *
 * These drive the real provider, same pattern as ChatHistoryContext.rename.test.jsx.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useEffect } from 'react';

vi.mock('../lib/chatsApi');
vi.mock('../lib/chatStorage');
vi.mock('./AuthContext', () => ({
    useAuth: () => ({ accessToken: 'tok', supabaseConfigured: true, loading: false }),
}));

import * as chatsApi from '../lib/chatsApi';
import * as chatStorage from '../lib/chatStorage';
import { ChatHistoryProvider, useChatHistory } from './ChatHistoryContext';

const CARD_PROMPT = 'Show Nifty 50 chart for last 6 months';

const holder = { value: null };
const api = new Proxy({}, { get: (_t, k) => holder.value?.[k] });

function Probe() {
    const ctx = useChatHistory();
    useEffect(() => { holder.value = ctx; });
    return null;
}

let storedList;
let storedMsgs;

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    storedList = [];
    storedMsgs = {};

    chatStorage.getChatList.mockImplementation(() => storedList);
    chatStorage.saveChatList.mockImplementation((l) => { storedList = l; });
    chatStorage.getChatMessages.mockImplementation((id) => storedMsgs[id] || []);
    chatStorage.saveChatMessages.mockImplementation((id, msgs) => { storedMsgs[id] = msgs; });
    chatStorage.getPendingDeletes.mockReturnValue([]);
    chatStorage.getTitleFromMessages.mockImplementation((msgs) => {
        const u = (msgs || []).find((m) => m.role === 'user');
        return u ? String(u.content).slice(0, 40) : 'New chat';
    });
    chatStorage.toTimestamp.mockImplementation((v) => (typeof v === 'number' ? v : 1000));

    chatsApi.getChats.mockResolvedValue([]);
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

// Simulates loading a chat and sending the suggestion-card prompt as its
// first (and only, for this test) message, flushing the persist debounce.
async function startChatFromCard(chatId) {
    await act(async () => { api.loadChat(chatId); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => {
        api.setMessages([{ id: 'm1', role: 'user', content: CARD_PROMPT }]);
        api.markChatTouched(chatId);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
}

describe('suggestion-card chats get distinguishable titles', () => {
    it('titles the first chat from a card with the bare prompt text', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');
        expect(titleOf('chat-a')).toBe(CARD_PROMPT);
    });

    it('disambiguates a SECOND chat started from the same card', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');
        await startChatFromCard('chat-b');

        expect(titleOf('chat-a')).toBe(CARD_PROMPT);
        expect(titleOf('chat-b')).not.toBe(CARD_PROMPT);
        expect(titleOf('chat-b')).toContain(CARD_PROMPT);
        expect(titleOf('chat-a')).not.toBe(titleOf('chat-b'));
    });

    it('numbers the duplicate instead of dating it', async () => {
        // The suffix used to be the date ("hi · 2 Sept"), which read as part of
        // the question itself — a chat called "hi" looked like it had asked
        // something about a date. It was redundant too: every sidebar row
        // already shows a relative timestamp.
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');
        await startChatFromCard('chat-b');
        expect(titleOf('chat-b')).toBe(`${CARD_PROMPT} (2)`);
    });

    it('never puts a date in a title', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');
        await startChatFromCard('chat-b');
        await startChatFromCard('chat-c');
        for (const id of ['chat-a', 'chat-b', 'chat-c']) {
            // No month name, and no "·" separator that introduced one.
            expect(titleOf(id)).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
            expect(titleOf(id)).not.toContain('·');
        }
    });

    it('keeps counting up for a third and fourth duplicate', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');
        await startChatFromCard('chat-b');
        await startChatFromCard('chat-c');
        expect(titleOf('chat-c')).toBe(`${CARD_PROMPT} (3)`);
        // All three remain distinct — the point of disambiguating at all.
        const all = ['chat-a', 'chat-b', 'chat-c'].map(titleOf);
        expect(new Set(all).size).toBe(3);
    });

    it('a disambiguated title stays stable across later flushes (does not re-suffix or revert)', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');
        await startChatFromCard('chat-b');
        const firstDisambiguated = titleOf('chat-b');

        // A later flush of the SAME chat (e.g. opening it again) must not
        // re-derive a fresh suffix or collapse back to the bare duplicate text.
        await act(async () => {
            api.setMessages([
                { id: 'm1', role: 'user', content: CARD_PROMPT },
                { id: 'm2', role: 'ai', content: 'Here is the chart.' },
            ]);
            api.markChatTouched('chat-b');
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        expect(titleOf('chat-b')).toBe(firstDisambiguated);
    });

    it('does not disambiguate genuinely different chats', async () => {
        render(<ChatHistoryProvider><Probe /></ChatHistoryProvider>);
        await startChatFromCard('chat-a');

        await act(async () => { api.loadChat('chat-c'); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        await act(async () => {
            api.setMessages([{ id: 'm1', role: 'user', content: 'is TCS a good buy right now' }]);
            api.markChatTouched('chat-c');
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(900); });

        expect(titleOf('chat-c')).toBe('is TCS a good buy right now');
    });
});
