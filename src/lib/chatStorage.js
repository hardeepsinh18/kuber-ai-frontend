/**
 * Chat history CACHE in localStorage.
 *
 * QA-C-014: this header used to say "persistence ... Optional userId for future
 * backend sync", which overstated what this module guarantees. What is actually
 * true today:
 *
 *  - This is a CACHE, not the record of truth. The server (see lib/chatsApi.js) is
 *    authoritative for a signed-in user; this exists so the sidebar and a reopened
 *    thread render instantly instead of waiting on a request.
 *  - It is NOT durable. Entries are evicted under quota pressure (writeWithEviction
 *    below), cleared on sign-out, and a browser can drop localStorage at any time.
 *  - For a GUEST there is no server copy, so a cleared cache means the history is
 *    genuinely gone. That is why saveChatMessages THROWS on quota exhaustion rather
 *    than failing silently — callers retry with a smaller payload.
 *  - Keys are namespaced per Cognito sub (SEC-C-002), so two profiles on one device
 *    cannot read each other's threads.
 *
 * Schema: <prefix>chat_list::<sub> = [{ id, title, updatedAt }],
 *         <prefix>chat_<id>::<sub> = messages[]
 */

const CHAT_LIST_BASE = 'stockhug_chat_list';
const CHAT_PREFIX = 'stockhug_chat_';
const PENDING_DELETES_BASE = 'stockhug_pending_deletes';
// No artificial caps — the server (RDS, via lib/chatsApi.js) is the permanent store;
// localStorage is a fast local cache, not the authoritative limit.
const MAX_MESSAGES_PER_CHAT = 2000; // guard only against single-chat runaway

/**
 * SEC-C-002: cached chats are namespaced per signed-in identity, so one profile's
 * financial queries can never be read by the next person to sign in on a shared
 * device. The suffix is the Cognito `sub`; signed-out/guest use keeps the legacy
 * un-suffixed keys so existing local history survives this change.
 *
 * Set once from AuthContext rather than threaded through every call site — the
 * module API is unchanged, so no consumer needs to know about namespacing.
 */
let activeUserSub = null;

export function setStorageIdentity(userSub) {
    activeUserSub = userSub || null;
}

function ns(baseKey) {
    return activeUserSub ? `${baseKey}::${activeUserSub}` : baseKey;
}

function getStorageKey(chatId) {
    return ns(`${CHAT_PREFIX}${chatId}`);
}

function chatListKey() {
    return ns(CHAT_LIST_BASE);
}

function pendingDeletesKey() {
    return ns(PENDING_DELETES_BASE);
}

/**
 * SEC-C-002: purge every locally cached chat for every identity. Called on sign-out
 * so the bytes are gone, not merely unreachable — namespacing alone leaves them on
 * disk for recovery, and purging alone re-exposes them if a crash beats the purge.
 */
export function clearAllLocalChats() {
    try {
        const doomed = Object.keys(localStorage).filter(
            (k) => k.startsWith(CHAT_PREFIX)
                || k === CHAT_LIST_BASE || k.startsWith(`${CHAT_LIST_BASE}::`)
                || k === PENDING_DELETES_BASE || k.startsWith(`${PENDING_DELETES_BASE}::`)
        );
        doomed.forEach((k) => {
            try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
    } catch (e) {
        console.warn('chatStorage: clearAllLocalChats failed:', e);
    }
}

export function getChatList() {
    try {
        const raw = localStorage.getItem(chatListKey());
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
        localStorage.setItem(chatListKey(), JSON.stringify(list));
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
        const raw = localStorage.getItem(pendingDeletesKey());
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function addPendingDelete(id) {
    try {
        const list = getPendingDeletes();
        if (!list.includes(id)) list.push(id);
        localStorage.setItem(pendingDeletesKey(), JSON.stringify(list));
    } catch {}
}

export function clearPendingDelete(id) {
    try {
        const list = getPendingDeletes().filter((d) => d !== id);
        localStorage.setItem(pendingDeletesKey(), JSON.stringify(list));
    } catch {}
}

/**
 * Normalise a server `updated_at` into an epoch ms value for sidebar ordering.
 *
 * Returns 0 — not Date.now() — when the value is missing or unparseable. The
 * old Date.now() fallback was not a neutral default: it stamped the chat as
 * "just now", so every background list refresh re-stamped those rows, floated
 * them to the top of the sidebar and labelled them "now". Unknown must sort as
 * OLD, so an unrecognised timestamp can never outrank a real one.
 *
 * Timezone-less strings are read as UTC. Postgres/FastAPI routinely serialise
 * "2026-08-04T09:12:00" or "2026-08-04 09:12:00" with no offset, and JS parses
 * the space form (and, per spec, the bare date-time form) as LOCAL time — which
 * in IST shifted every such timestamp by 5h30m, mis-ordering the list and
 * rendering wrong relative times. An EXPLICIT offset is still honoured.
 */
export function toTimestamp(updatedAt) {
    if (updatedAt == null || updatedAt === '') return 0;
    if (typeof updatedAt === 'number') return Number.isFinite(updatedAt) ? updatedAt : 0;
    if (typeof updatedAt !== 'string') return 0;

    const raw = updatedAt.trim();
    if (!raw) return 0;

    // Already carries a zone (Z or ±HH:MM) → trust it as-is.
    const hasZone = /(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(raw);
    // Date-only ("2026-08-04") is already parsed as UTC by spec — leave it.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);

    let candidate = raw;
    if (!hasZone && !isDateOnly) {
        const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)$/);
        if (m) candidate = `${m[1]}T${m[2]}Z`;
    }

    const ts = new Date(candidate).getTime();
    return Number.isNaN(ts) ? 0 : ts;
}


export function getTitleFromMessages(messages) {
    if (!messages || !messages.length) return 'New chat';
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser || !firstUser.content) return 'New chat';
    const text = typeof firstUser.content === 'string' ? firstUser.content : '';
    return text.trim().slice(0, 40) || 'New chat';
}
