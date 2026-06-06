/**
 * Chat history persistence using localStorage.
 * Schema: chat_list = [{ id, title, updatedAt }], chat_{id} = messages[]
 * Optional userId for future backend sync (guest = local-only).
 */

const CHAT_LIST_KEY = 'stockhug_chat_list';
const CHAT_PREFIX = 'stockhug_chat_';
const MAX_CHATS = 50;
const MAX_MESSAGES_PER_CHAT = 500;

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

export function getTitleFromMessages(messages) {
    if (!messages || !messages.length) return 'New chat';
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser || !firstUser.content) return 'New chat';
    const text = typeof firstUser.content === 'string' ? firstUser.content : '';
    return text.trim().slice(0, 40) || 'New chat';
}
