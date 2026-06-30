/**
 * Chat history persistence using localStorage.
 * Schema: chat_list = [{ id, title, updatedAt }], chat_{id} = messages[]
 * Optional userId for future backend sync (guest = local-only).
 */

const CHAT_LIST_KEY = 'stockhug_chat_list';
const CHAT_PREFIX = 'stockhug_chat_';
const PENDING_DELETES_KEY = 'stockhug_pending_deletes';
const MAX_CHATS = 50;
const MAX_MESSAGES_PER_CHAT = 500;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getStorageKey(chatId) {
    return `${CHAT_PREFIX}${chatId}`;
}

export function getChatList() {
    try {
        const raw = localStorage.getItem(CHAT_LIST_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list.slice(0, MAX_CHATS) : [];
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
        const trimmed = list.slice(0, MAX_CHATS);
        localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('chatStorage: saveChatList failed', e);
    }
}

export function saveChatMessages(chatId, messages) {
    if (!chatId) return;
    try {
        const trimmed = Array.isArray(messages) ? messages.slice(-MAX_MESSAGES_PER_CHAT) : [];
        localStorage.setItem(getStorageKey(chatId), JSON.stringify(trimmed));
    } catch (e) {
        console.warn('chatStorage: saveChatMessages failed', e);
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

export function isWithin7Days(updatedAt) {
    if (!updatedAt) return true;
    return (Date.now() - Number(updatedAt)) < SEVEN_DAYS_MS;
}

export function getTitleFromMessages(messages) {
    if (!messages || !messages.length) return 'New chat';
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser || !firstUser.content) return 'New chat';
    const text = typeof firstUser.content === 'string' ? firstUser.content : '';
    return text.trim().slice(0, 40) || 'New chat';
}
