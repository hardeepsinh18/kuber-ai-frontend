/**
 * Chat history persistence using localStorage.
 * Schema: chat_list = [{ id, title, updatedAt }], chat_{id} = messages[]
 * Optional userId for future backend sync (guest = local-only).
 */

const CHAT_LIST_KEY = 'stockhug_chat_list';
const CHAT_PREFIX = 'stockhug_chat_';
const PENDING_DELETES_KEY = 'stockhug_pending_deletes';
// No artificial caps — server (Supabase) is the permanent store;
// localStorage is a fast local cache, not the authoritative limit.
const MAX_MESSAGES_PER_CHAT = 2000; // guard only against single-chat runaway

function getStorageKey(chatId) {
    return `${CHAT_PREFIX}${chatId}`;
}

export function getChatList() {
    try {
        const raw = localStorage.getItem(CHAT_LIST_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export function getChatMessages(chatId) {
    if (!chatId) return [];
    try {
        const raw = localStorage.getItem(getStorageKey(chatId));
        if (!raw) return [];
        const messages = JSON.parse(raw);
        return Array.isArray(messages) ? messages.slice(-MAX_MESSAGES_PER_CHAT) : [];
    } catch {
        return [];
    }
}

export function saveChatList(list) {
    try {
        localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('chatStorage: saveChatList failed (quota) — list not updated locally:', e);
    }
}

function isQuotaError(e) {
    return (
        e && (e.name === 'QuotaExceededError'
            || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
            || e.code === 22
            || e.code === 1014)
    );
}

/**
 * Evict the least-recently-updated OTHER chats until `write` succeeds.
 * Returns true if the write eventually went through.
 *
 * Without this, one oversized chat permanently wedged the origin: every
 * subsequent save for EVERY chat threw, and the sidebar then hid those chats
 * (its filter drops "New chat" entries with no locally stored messages), so
 * they looked deleted.
 */
function writeWithEviction(key, payload, protectedChatId) {
    try {
        localStorage.setItem(key, payload);
        return true;
    } catch (e) {
        if (!isQuotaError(e)) throw e;
    }
    const victims = getChatList()
        .filter((c) => c.id && c.id !== protectedChatId)
        .sort((a, b) => toTimestamp(a.updatedAt) - toTimestamp(b.updatedAt));
    for (const victim of victims) {
        try {
            localStorage.removeItem(getStorageKey(victim.id));
        } catch { /* ignore */ }
        try {
            localStorage.setItem(key, payload);
            console.warn(`chatStorage: evicted cached messages for chat ${victim.id} to free quota`);
            return true;
        } catch (e) {
            if (!isQuotaError(e)) throw e;
        }
    }
    return false;
}

/**
 * Persist a chat's messages to localStorage.
 *
 * THROWS on quota exhaustion (after attempting eviction). Callers rely on that
 * to retry with a smaller payload — swallowing it here made every caller's
 * `catch` unreachable and lost guest messages silently, since guests have no
 * server copy to fall back on.
 */
export function saveChatMessages(chatId, messages) {
    if (!chatId) return;
    const trimmed = Array.isArray(messages) ? messages.slice(-MAX_MESSAGES_PER_CHAT) : [];
    const key = getStorageKey(chatId);
    const payload = JSON.stringify(trimmed);
    if (!writeWithEviction(key, payload, chatId)) {
        throw new Error(`chatStorage: quota exhausted, could not persist chat ${chatId}`);
    }
}

export function getPendingDeletes() {
    try {
        const raw = localStorage.getItem(PENDING_DELETES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function addPendingDelete(id) {
    try {
        const list = getPendingDeletes();
        if (!list.includes(id)) list.push(id);
        localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(list));
    } catch {}
}

export function clearPendingDelete(id) {
    try {
        const list = getPendingDeletes().filter((d) => d !== id);
        localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(list));
    } catch {}
}

export function toTimestamp(updatedAt) {
    if (!updatedAt) return Date.now();
    if (typeof updatedAt === 'number') return updatedAt;
    const ts = new Date(updatedAt).getTime();
    return isNaN(ts) ? Date.now() : ts;
}


export function getTitleFromMessages(messages) {
    if (!messages || !messages.length) return 'New chat';
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser || !firstUser.content) return 'New chat';
    const text = typeof firstUser.content === 'string' ? firstUser.content : '';
    return text.trim().slice(0, 40) || 'New chat';
}
