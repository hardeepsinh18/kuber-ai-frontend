/**
 * Regression tests for SEC-C-002 (audit run 2026-07-26) and VNTY-003/VNTY-009
 * (QA report, 24-25 Aug 2026): cached chats must be namespaced per identity,
 * purged on sign-out, and never fall back to a shared no-identity key.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    setStorageIdentity,
    clearAllLocalChats,
    saveChatList,
    getChatList,
    saveChatMessages,
    getChatMessages,
    addPendingDelete,
    getPendingDeletes,
} from './chatStorage';

beforeEach(() => {
    localStorage.clear();
    setStorageIdentity(null);
});

describe('SEC-C-002 per-identity namespacing', () => {
    it('does not leak one user\'s chat list to another user', () => {
        setStorageIdentity('user-alice-sub');
        saveChatList([{ id: 'c1', title: 'Alice: is RELIANCE a buy?', updatedAt: 1 }]);

        setStorageIdentity('user-bob-sub');
        expect(getChatList()).toEqual([]);

        setStorageIdentity('user-alice-sub');
        expect(getChatList()).toHaveLength(1);
    });

    it('does not leak one user\'s messages to another user under the same chat id', () => {
        setStorageIdentity('user-alice-sub');
        saveChatMessages('shared-id', [{ role: 'user', content: 'my portfolio is 40% HDFC' }]);

        setStorageIdentity('user-bob-sub');
        expect(getChatMessages('shared-id')).toEqual([]);
    });

    it('namespaces pending deletes per identity', () => {
        setStorageIdentity('user-alice-sub');
        addPendingDelete('c1');

        setStorageIdentity('user-bob-sub');
        expect(getPendingDeletes()).toEqual([]);

        setStorageIdentity('user-alice-sub');
        expect(getPendingDeletes()).toEqual(['c1']);
    });

    it('writes identity-suffixed keys, never a bare shared key, when signed in', () => {
        setStorageIdentity('user-alice-sub');
        saveChatList([{ id: 'c1', title: 't', updatedAt: 1 }]);
        saveChatMessages('c1', [{ role: 'user', content: 'hi' }]);

        const keys = Object.keys(localStorage);
        expect(keys).toContain('stockhug_chat_list::user-alice-sub');
        expect(keys).toContain('stockhug_chat_c1::user-alice-sub');
        expect(keys).not.toContain('stockhug_chat_list');
        expect(keys).not.toContain('stockhug_chat_c1');
    });

    it('VNTY-003: never reads or writes a shared key when no identity is set', () => {
        setStorageIdentity(null);
        saveChatList([{ id: 'c1', title: 't', updatedAt: 1 }]);
        saveChatMessages('c1', [{ role: 'user', content: 'no-identity write attempt' }]);
        addPendingDelete('c9');

        // Nothing landed anywhere — not the old bare key, not any key at all.
        expect(Object.keys(localStorage)).toEqual([]);
        expect(getChatList()).toEqual([]);
        expect(getChatMessages('c1')).toEqual([]);
        expect(getPendingDeletes()).toEqual([]);
    });

    it('VNTY-003: a no-identity read cannot see a previous identity\'s data', () => {
        setStorageIdentity('user-alice-sub');
        saveChatList([{ id: 'c1', title: 'alice', updatedAt: 1 }]);

        setStorageIdentity(null);
        expect(getChatList()).toEqual([]);
    });
});

describe('SEC-C-002 sign-out purge', () => {
    it('removes every cached chat for every identity, not just the active one', () => {
        setStorageIdentity('user-alice-sub');
        saveChatList([{ id: 'c1', title: 'alice', updatedAt: 1 }]);
        saveChatMessages('c1', [{ role: 'user', content: 'alice secret' }]);
        addPendingDelete('c9');

        setStorageIdentity('user-bob-sub');
        saveChatList([{ id: 'c2', title: 'bob', updatedAt: 1 }]);
        saveChatMessages('c2', [{ role: 'user', content: 'bob secret' }]);

        clearAllLocalChats();

        const remaining = Object.keys(localStorage).filter(
            (k) => k.startsWith('stockhug_chat') || k.startsWith('stockhug_pending_deletes')
        );
        expect(remaining).toEqual([]);
    });

    it('leaves unrelated keys alone', () => {
        localStorage.setItem('kuberai_demo_user', '{"id":"demo"}');
        localStorage.setItem('theme', 'dark');
        setStorageIdentity('user-alice-sub');
        saveChatList([{ id: 'c1', title: 't', updatedAt: 1 }]);

        clearAllLocalChats();

        expect(localStorage.getItem('theme')).toBe('dark');
        expect(localStorage.getItem('kuberai_demo_user')).toBe('{"id":"demo"}');
    });

    it('no chat bytes remain readable after purge', () => {
        setStorageIdentity('user-alice-sub');
        saveChatMessages('c1', [{ role: 'user', content: 'CONFIDENTIAL-HOLDINGS' }]);
        clearAllLocalChats();
        const dump = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('');
        expect(dump).not.toContain('CONFIDENTIAL-HOLDINGS');
    });
});
