import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as chatStorage from '../lib/chatStorage';
import * as chatsApi from '../lib/chatsApi';
import { useAuth } from './AuthContext';

const ChatHistoryContext = createContext(null);

export function ChatHistoryProvider({ children }) {
    const { accessToken, supabaseConfigured } = useAuth();
    const [chatList, setChatList] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isListLoading, setIsListLoading] = useState(true);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatLoadError, setChatLoadError] = useState(null);
    const persistTimeoutRef = useRef(null);
    const isLoadedRef = useRef(false);
    const syncedMessageCountRef = useRef(0);
    const currentChatIdRef = useRef(null);
    const lastListRefreshRef = useRef(0);
    const listRefreshInFlightRef = useRef(false);
    const messagesRef = useRef([]);
    const accessTokenRef = useRef(null);

    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

    // Fetch the server's chat list and merge it into local state/localStorage.
    // Used both on mount and on tab focus/visibility — a chat created on another
    // device (e.g. mobile) only ever shows up here once this runs again, since
    // there is no push/websocket sync.
    const refreshChatListFromServer = useCallback((token) => {
        if (!token || listRefreshInFlightRef.current) return Promise.resolve();
        listRefreshInFlightRef.current = true;
        lastListRefreshRef.current = Date.now();
        return chatsApi.getChats(token)
            .then((serverList) => {
                if (!serverList) return; // 404/501 — no chat API, keep local
                const pDeletes = chatStorage.getPendingDeletes();
                // Server is source of truth: show all chats, no date/count filter.
                // Skip server-side empty "New chat" entries (title=null/New chat, no
                // local messages) — these are leftover from abandoned sessions.
                // Delete them from the server in the background to keep it clean.
                const merged = serverList
                    .filter((c) => !pDeletes.includes(c.id))
                    .filter((c) => {
                        const title = c.title ?? c.name ?? '';
                        const isEmpty = (!title || title === 'New chat') &&
                            chatStorage.getChatMessages(c.id).length === 0;
                        if (isEmpty) {
                            // Clean up server side silently
                            chatsApi.deleteChat(c.id, token).catch(() => {});
                        }
                        return !isEmpty;
                    })
                    .map((c) => ({
                        id: c.id,
                        title: c.title ?? c.name ?? 'New chat',
                        updatedAt: chatStorage.toTimestamp(c.updated_at ?? c.updatedAt),
                    }));
                // The currently open chat may have a newer title/timestamp locally
                // than what the server has committed yet (append + title-update are
                // separate, in-flight async calls) — don't let a background refresh
                // flicker it back to a stale server value while it's being typed in.
                const openId = currentChatIdRef.current;
                setChatList((prev) => {
                    const prevOpen = openId ? prev.find((c) => c.id === openId) : null;
                    const next = prevOpen && !merged.some((c) => c.id === openId)
                        ? [...merged, prevOpen]
                        : merged.map((c) => (c.id === openId && prevOpen ? prevOpen : c));
                    chatStorage.saveChatList(next);
                    return next;
                });
            })
            .catch(() => {}) // server fetch failed — local list already shown
            .finally(() => { listRefreshInFlightRef.current = false; });
    }, []);

    // Load chat list on mount.
    // 1. Show localStorage immediately (minus pending-deletes) — instant sidebar, no limits.
    // 2. If logged in, fetch ALL chats from server in background — server is the permanent store.
    // 3. Retry any pending-delete API calls so server stays in sync.
    useEffect(() => {
        const pendingDeletes = chatStorage.getPendingDeletes();

        function buildLocalList() {
            // No date filter, no count cap — show everything that isn't deleted
            // and has at least one message stored (empty "New chat" entries are noise)
            return chatStorage.getChatList()
                .filter((c) => !pendingDeletes.includes(c.id))
                .filter((c) => c.title !== 'New chat' || chatStorage.getChatMessages(c.id).length > 0);
        }

        // Show local data immediately so sidebar doesn't flicker
        const localList = buildLocalList();
        setChatList(localList);
        isLoadedRef.current = true;
        setIsListLoading(!!accessToken);

        if (accessToken) {
            // Retry pending deletes so server eventually catches up, THEN fetch —
            // otherwise the list fetch can race an in-flight delete and read a
            // stale server row back into localStorage right as the delete's own
            // .then() clears the pending-delete flag that would have hidden it.
            const pendingDeleteCalls = pendingDeletes.map((id) =>
                chatsApi.deleteChat(id, accessToken)
                    .then(() => chatStorage.clearPendingDelete(id))
                    .catch(() => {})
            );
            Promise.all(pendingDeleteCalls)
                .then(() => refreshChatListFromServer(accessToken))
                .finally(() => setIsListLoading(false));
        } else if (supabaseConfigured) {
            setChatList([]);
            setIsListLoading(false);
        } else {
            setIsListLoading(false);
        }
    }, [accessToken, supabaseConfigured, refreshChatListFromServer]);

    // Re-sync whenever the tab becomes visible/focused again — this is what
    // actually surfaces chats created on another device (phone) without
    // requiring a manual page reload. Throttled so rapid tab switching
    // doesn't spam the API.
    useEffect(() => {
        if (!accessToken) return undefined;
        const MIN_INTERVAL_MS = 15_000;
        const maybeRefresh = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - lastListRefreshRef.current < MIN_INTERVAL_MS) return;
            refreshChatListFromServer(accessToken);
        };
        window.addEventListener('focus', maybeRefresh);
        document.addEventListener('visibilitychange', maybeRefresh);
        return () => {
            window.removeEventListener('focus', maybeRefresh);
            document.removeEventListener('visibilitychange', maybeRefresh);
        };
    }, [accessToken, refreshChatListFromServer]);

    // The actual persist work, extracted so it can run either on the 400ms
    // debounce OR eagerly (flushed) the instant the debounce would otherwise
    // be cancelled — a chat switch, tab hide, or page unload. Previously the
    // debounce's cleanup only did `clearTimeout`, silently discarding
    // whatever hadn't been saved yet: since streaming resets this timer on
    // every token, the FIRST chance it ever gets to fire is ~400ms after the
    // answer finishes rendering. Switching chats or refreshing inside that
    // window lost the entire exchange — both the question and the answer —
    // because nothing had reached localStorage or the server yet.
    const flushPersist = useCallback((chatId, messages, accessToken) => {
        if (!chatId) return;
        const hasMessages = messages.length > 0;
        const hasNewMessages = messages.length > syncedMessageCountRef.current;
        if (hasMessages) {
            const title = chatStorage.getTitleFromMessages(messages);
            try {
                // Keep chartData in localStorage so the chart (and its pattern overlay)
                // survives a refresh / chat switch directly — no backend round-trip needed.
                chatStorage.saveChatMessages(chatId, messages);
            } catch {
                // Over quota with chartData included — retry WITHOUT it (stripped). Those
                // charts are still on the server (metadata._chartData) and get restored by
                // loadChat()'s backend hydration, so nothing is lost.
                try {
                    const stripped = messages.map(({ chartData: _cd, ...rest }) => rest);
                    chatStorage.saveChatMessages(chatId, stripped);
                } catch {
                    // still over quota — messages are safely on the server, no pruning
                }
            }
            setChatList((prev) => {
                const next = prev.map((c) =>
                    c.id === chatId
                        ? { ...c, title, ...(hasNewMessages ? { updatedAt: Date.now() } : {}) }
                        : c
                );
                const found = next.some((c) => c.id === chatId);
                if (!found) next.unshift({ id: chatId, title, updatedAt: Date.now() });
                chatStorage.saveChatList(next);
                return next;
            });
            if (accessToken) {
                const start = syncedMessageCountRef.current;
                const newOnes = messages.slice(start).map((m) => ({
                        role: m.role === 'ai' ? 'assistant' : 'user',
                        content: m.content ?? '',
                        metadata: {
                            ...(m.metadata || {}),
                            ...(m.thinkingSteps?.length ? { _thinkingSteps: m.thinkingSteps } : {}),
                            ...(m.newsHeadlines?.length ? { _newsHeadlines: m.newsHeadlines } : {}),
                            ...(m.suggestedFollowUps?.length ? { _suggestedFollowUps: m.suggestedFollowUps } : {}),
                            ...(m.processingTime != null ? { _processingTime: m.processingTime } : {}),
                            ...(m.signal != null ? { _signal: m.signal } : {}),
                            // K-042/K-105: persist the structured cards + display mode so a
                            // chat rehydrated from the server (other device / cleared
                            // localStorage) renders the same rich answer, not bare text.
                            // chartData is stripped from localStorage (quota) but the server
                            // (jsonb) can hold it — persist here so the chart survives a
                            // device switch, matching the restore path in loadChat().
                            ...(m.chartData != null ? { _chartData: m.chartData } : {}),
                            ...(m.scoreCard != null ? { _scoreCard: m.scoreCard } : {}),
                            ...(m.indicatorsTable != null ? { _indicatorsTable: m.indicatorsTable } : {}),
                            ...(m.patternSummary != null ? { _patternSummary: m.patternSummary } : {}),
                            ...(m.technicalSummary != null ? { _technicalSummary: m.technicalSummary } : {}),
                            ...(m.managementSentiment != null ? { _managementSentiment: m.managementSentiment } : {}),
                            ...(m.annualReportIntelligence != null ? { _annualReportIntelligence: m.annualReportIntelligence } : {}),
                            ...(m.companyFilings != null ? { _companyFilings: m.companyFilings } : {}),
                            ...(m.recentDevelopments != null ? { _recentDevelopments: m.recentDevelopments } : {}),
                            ...(m.aiTake != null ? { _aiTake: m.aiTake } : {}),
                            ...(m.queryIntent != null ? { _queryIntent: m.queryIntent } : {}),
                            ...(m.query != null ? { _query: m.query } : {}),
                            ...(m.responseMode != null ? { _responseMode: m.responseMode } : {}),
                            // Rendered but previously never persisted, so a chat
                            // rehydrated from the server (other device / cleared
                            // cache) silently lost its Sources panel and Retry
                            // button. _isError/_isClientNotice additionally keep
                            // error bubbles OUT of chat_history after a reload —
                            // without them a stored "⚠️ Something went wrong" comes
                            // back indistinguishable from a real assistant turn.
                            ...(m.sourceDocuments?.length ? { _sourceDocuments: m.sourceDocuments } : {}),
                            ...(m.isError ? { _isError: true } : {}),
                            ...(m.isClientNotice ? { _isClientNotice: true } : {}),
                            ...(m.failedQuery ? { _failedQuery: m.failedQuery } : {}),
                            ...(m.isScannerResult ? { _isScannerResult: true } : {}),
                            // The follow-up context boundary (K-056) must survive a
                            // reload, or the stale stock leaks back in.
                            ...(m._topicReset ? { _topicReset: true } : {}),
                        },
                    }));
                    if (newOnes.length > 0) {
                        // Reserve the counter BEFORE the request, not in .then().
                        // A POST routinely outlives the 400ms debounce, so run 2
                        // used to read the still-unadvanced start and re-send the
                        // messages run 1 was already sending (server ends up with
                        // m0,m1,m0,m1,m2). Roll back on failure so they retry.
                        const sentThrough = messages.length;
                        syncedMessageCountRef.current = sentThrough;
                        chatsApi.appendMessages(chatId, newOnes, accessToken)
                            .catch((err) => {
                                syncedMessageCountRef.current = Math.min(
                                    syncedMessageCountRef.current,
                                    start
                                );
                                console.warn('Chat sync to backend failed (messages safe in localStorage):', err?.message);
                            });
                    }
                chatsApi.updateChatTitle(chatId, title, accessToken).catch(() => {});
            }
        }
    }, []);

    // Debounce persisting while messages are actively changing (e.g. tokens
    // streaming in) so we're not hitting localStorage/the API on every token.
    // Cleanup here ONLY cancels — it re-runs on every token during streaming
    // (messages changes each time), and flushing there would fire a full
    // save + API round-trip per token instead of once, 400ms after the last
    // change. The "flush instead of discard" fix lives in the effect below,
    // which is keyed on currentChatId alone so it only fires on an actual
    // chat switch, not on ordinary message updates within the same chat.
    useEffect(() => {
        if (!currentChatId || !isLoadedRef.current) return undefined;
        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = setTimeout(() => {
            persistTimeoutRef.current = null;
            flushPersist(currentChatId, messages, accessToken);
        }, 400);
        return () => {
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        };
    }, [currentChatId, messages, accessToken, flushPersist]);

    // Fires only when the chat identity itself changes (or on unmount) —
    // never on a mid-stream `messages` update within the same chat. This is
    // the moment a pending debounce from the PREVIOUS chat must be flushed
    // rather than silently dropped: without it, asking a question and
    // switching away before the 400ms silence window elapsed lost the whole
    // exchange, since streaming keeps resetting the timer above right up
    // until the last token arrives.
    useEffect(() => {
        const chatId = currentChatId;
        return () => {
            if (persistTimeoutRef.current) {
                clearTimeout(persistTimeoutRef.current);
                persistTimeoutRef.current = null;
                flushPersist(chatId, messagesRef.current, accessTokenRef.current);
            }
        };
    }, [currentChatId, flushPersist]);

    // A hard refresh or tab close kills the JS runtime outright — the effect
    // cleanup above never gets to run, so a pending debounce would otherwise
    // vanish along with everything the user just did. `pagehide` fires
    // reliably in that case (unlike `beforeunload`, which mobile browsers and
    // bfcache navigations can skip); `visibilitychange`→hidden is a second
    // safety net for backgrounding on mobile. Both read refs, not closed-over
    // state, since this effect is registered once and must see the latest
    // values whenever it actually fires.
    useEffect(() => {
        const flushNow = () => {
            if (!persistTimeoutRef.current) return;
            clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = null;
            flushPersist(currentChatIdRef.current, messagesRef.current, accessTokenRef.current);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flushNow();
        };
        window.addEventListener('pagehide', flushNow);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            window.removeEventListener('pagehide', flushNow);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [flushPersist]);

    const ensureCurrentChat = useCallback(async () => {
        if (currentChatId) return currentChatId;
        // Don't add to chatList here with title "New chat" — that creates phantom sidebar
        // entries for chats where the user never sends a message.
        // The debounce persist effect (above) adds the chat to the sidebar with the correct
        // title derived from the first real message once messages actually arrive.
        if (accessToken) {
            try {
                const serverId = await chatsApi.createChat(accessToken, 'New chat');
                if (serverId) {
                    syncedMessageCountRef.current = 0;
                    setCurrentChatId(serverId);
                    return serverId;
                }
            } catch (_) {}
        }
        syncedMessageCountRef.current = 0;
        const id = crypto.randomUUID?.() ?? `chat_${Date.now()}`;
        setCurrentChatId(id);
        return id;
    }, [currentChatId, accessToken]);

    const newChat = useCallback(() => {
        if (currentChatId && messages.length > 0) {
            const title = chatStorage.getTitleFromMessages(messages);
            // Strip chartData, exactly as the debounced persist does. Writing the
            // raw messages here bypassed the quota guard on every new-chat click,
            // and multi-symbol OHLCV blobs are what actually blows the quota.
            try {
                chatStorage.saveChatMessages(
                    currentChatId,
                    messages.map(({ chartData: _cd, ...rest }) => rest)
                );
            } catch (e) {
                console.warn('newChat: could not cache previous chat locally:', e?.message);
            }
            setChatList((prev) => {
                const next = prev.map((c) =>
                    c.id === currentChatId ? { ...c, title, updatedAt: Date.now() } : c
                );
                const found = next.some((c) => c.id === currentChatId);
                if (!found) next.unshift({ id: currentChatId, title, updatedAt: Date.now() });
                chatStorage.saveChatList(next);
                return next;
            });
        }

        // Reset the sync counter ONLY when the chat actually switches. Doing it
        // synchronously here (while currentChatId/messages still point at the old
        // chat) meant a persist timer firing during the createChat round-trip read
        // start=0 and re-appended EVERY message of the old chat to the server —
        // doubling its history on the next load from another device.
        const switchTo = (id) => {
            syncedMessageCountRef.current = 0;
            setCurrentChatId(id);
            setMessages([]);
        };
        const fallbackId = () => crypto.randomUUID?.() ?? `chat_${Date.now()}`;
        if (accessToken) {
            chatsApi.createChat(accessToken, 'New chat')
                .then((serverId) => switchTo(serverId ?? fallbackId()))
                .catch(() => switchTo(fallbackId()));
        } else {
            switchTo(fallbackId());
        }
    }, [currentChatId, messages, accessToken]);

    const loadChat = useCallback((id) => {
        setCurrentChatId(id);
        setChatLoadError(null);
        syncedMessageCountRef.current = 0;
        const rawLocalMsgs = chatStorage.getChatMessages(id);
        const localMsgs = rawLocalMsgs
            .filter(m => m != null && m.role)
            .map(m => ({
                ...m,
                id: m.id ?? (crypto.randomUUID?.() ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`),
                content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
            }));
        // Show the localStorage copy immediately (instant open). It has every field EXCEPT
        // chartData, which is stripped to stay under the localStorage quota (see persist above).
        // So ALWAYS hydrate from the backend below (it holds _chartData) and merge it in — the
        // old early-return skipped that fetch, so the chart + its pattern overlay disappeared on
        // every refresh / chat switch.
        const hasLocal = localMsgs.length > 0;
        setMessages(hasLocal ? localMsgs : []);
        if (hasLocal) syncedMessageCountRef.current = localMsgs.length;
        if (accessToken) {
            if (!hasLocal) setIsChatLoading(true);
            chatsApi.getChat(id, accessToken).then((data) => {
                // The user may have clicked another chat while this was in flight.
                // Without this guard, B's server messages landed in state while A
                // was open — and the persist effect then wrote B's messages under
                // A's key, corrupting A.
                if (currentChatIdRef.current !== id) return;
                if (data && data.messages && data.messages.length > 0) {
                    const msgs = data.messages.map((m) => ({
                        id: m.id ?? (crypto.randomUUID?.() ?? `msg_${Date.now()}_${Math.random()}`),
                        role: m.role === 'assistant' ? 'ai' : (m.role ?? 'user'),
                        content: m.content ?? '',
                        thinkingSteps: m.metadata?._thinkingSteps ?? undefined,
                        newsHeadlines: m.metadata?._newsHeadlines ?? undefined,
                        suggestedFollowUps: m.metadata?._suggestedFollowUps ?? undefined,
                        processingTime: m.metadata?._processingTime ?? undefined,
                        signal: m.metadata?._signal ?? undefined,
                        chartData: m.metadata?._chartData ?? undefined,
                        // K-042/K-105: restore structured cards + display mode
                        scoreCard: m.metadata?._scoreCard ?? undefined,
                        indicatorsTable: m.metadata?._indicatorsTable ?? undefined,
                        patternSummary: m.metadata?._patternSummary ?? undefined,
                        technicalSummary: m.metadata?._technicalSummary ?? undefined,
                        managementSentiment: m.metadata?._managementSentiment ?? undefined,
                        annualReportIntelligence: m.metadata?._annualReportIntelligence ?? undefined,
                        companyFilings: m.metadata?._companyFilings ?? undefined,
                        recentDevelopments: m.metadata?._recentDevelopments ?? undefined,
                        aiTake: m.metadata?._aiTake ?? undefined,
                        queryIntent: m.metadata?._queryIntent ?? undefined,
                        query: m.metadata?._query ?? undefined,
                        responseMode: m.metadata?._responseMode ?? undefined,
                        // Mirror of the persist whitelist — keep these in sync, or a
                        // rehydrated chat renders differently from a live one.
                        sourceDocuments: m.metadata?._sourceDocuments ?? undefined,
                        isError: m.metadata?._isError ?? undefined,
                        isClientNotice: m.metadata?._isClientNotice ?? undefined,
                        failedQuery: m.metadata?._failedQuery ?? undefined,
                        isScannerResult: m.metadata?._isScannerResult ?? undefined,
                        _topicReset: m.metadata?._topicReset ?? undefined,
                        metadata: m.metadata ?? undefined,
                    }));
                    if (hasLocal) {
                        // Merge by index: fill chartData (stripped from localStorage) + the
                        // pattern overlay into the already-shown messages, without clobbering
                        // any local-only message. Backend appends are order-preserving, so index
                        // alignment holds.
                        setMessages(prev => prev.map((pm, i) => (
                            msgs[i]
                                ? { ...pm,
                                    chartData: pm.chartData ?? msgs[i].chartData,
                                    patternSummary: pm.patternSummary ?? msgs[i].patternSummary }
                                : pm
                        )));
                    } else {
                        setMessages(msgs);
                        syncedMessageCountRef.current = msgs.length;
                        // Strip the OHLCV blob from BOTH places before writing to
                        // localStorage. The top-level `chartData` strip elsewhere
                        // misses `metadata._chartData`, which the server round-trip
                        // re-embeds — so a rehydrated chat wrote the full blob to
                        // localStorage anyway and blew the quota.
                        try {
                            chatStorage.saveChatMessages(id, msgs.map(({ chartData: _cd, metadata, ...rest }) => {
                                if (!metadata || !('_chartData' in metadata)) return { ...rest, metadata };
                                const { _chartData: _mcd, ...metaRest } = metadata;
                                return { ...rest, metadata: metaRest };
                            }));
                        } catch (e) {
                            console.warn('loadChat: could not cache chat locally:', e?.message);
                        }
                    }
                }
                setChatLoadError(null);
            }).catch(() => {
                if (currentChatIdRef.current !== id) return;
                if (!hasLocal) setChatLoadError('Failed to load chat. Please try again.');
            }).finally(() => {
                if (currentChatIdRef.current !== id) return;
                setIsChatLoading(false);
            });
        }
    }, [accessToken]);

    const deleteChat = useCallback((id) => {
        // Immediately mark as pending-delete in localStorage.
        // Even if the API call below fails or is slow, this chat won't reappear on next reload
        // because the mount effect filters out pending-deletes from the server list.
        chatStorage.addPendingDelete(id);
        try {
            chatStorage.saveChatMessages(id, []);
        } catch { /* clearing can't meaningfully fail; nothing to recover */ }
        setChatList((prev) => {
            const next = prev.filter((c) => c.id !== id);
            chatStorage.saveChatList(next);
            return next;
        });
        if (currentChatId === id) {
            setCurrentChatId(null);
            setMessages([]);
            syncedMessageCountRef.current = 0;
        }
        if (accessToken) {
            chatsApi.deleteChat(id, accessToken)
                .then(() => chatStorage.clearPendingDelete(id))
                .catch(() => { /* stays in pending-deletes - retried on next mount */ });
        } else {
            chatStorage.clearPendingDelete(id);
        }
    }, [accessToken, currentChatId]);

    const renameChat = useCallback((id, title) => {
        if (accessToken) chatsApi.updateChatTitle(id, title, accessToken).catch(() => {});
        setChatList((prev) => {
            const next = prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c));
            chatStorage.saveChatList(next);
            return next;
        });
    }, [accessToken]);

    const value = {
        // Hide "New chat" entries only when they have NO locally stored messages.
        // A chat titled "New chat" but WITH messages is a real chat whose server title
        // update failed — it must still appear in the sidebar.
        chatList: [...chatList]
            .filter((c) => c.title !== 'New chat' || chatStorage.getChatMessages(c.id).length > 0)
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
        currentChatId,
        // Live ref to the open chat. `currentChatId` is captured by closure at
        // render time, so an in-flight request can't use it to tell whether the
        // user has since switched chats — the ref always reads current.
        currentChatIdRef,
        messages,
        setMessages,
        isListLoading,
        isChatLoading,
        chatLoadError,
        setChatLoadError,
        ensureCurrentChat,
        newChat,
        loadChat,
        deleteChat,
        renameChat,
    };

    return (
        <ChatHistoryContext.Provider value={value}>
            {children}
        </ChatHistoryContext.Provider>
    );
}

export function useChatHistory() {
    const ctx = useContext(ChatHistoryContext);
    if (!ctx) throw new Error('useChatHistory must be used within ChatHistoryProvider');
    return ctx;
}
