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

    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

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
            // Retry pending deletes so server eventually catches up
            pendingDeletes.forEach((id) => {
                chatsApi.deleteChat(id, accessToken)
                    .then(() => chatStorage.clearPendingDelete(id))
                    .catch(() => {});
            });

            chatsApi.getChats(accessToken)
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
                                chatsApi.deleteChat(c.id, accessToken).catch(() => {});
                            }
                            return !isEmpty;
                        })
                        .map((c) => ({
                            id: c.id,
                            title: c.title ?? c.name ?? 'New chat',
                            updatedAt: chatStorage.toTimestamp(c.updated_at ?? c.updatedAt),
                        }));
                    setChatList(merged);
                    chatStorage.saveChatList(merged);
                })
                .catch(() => {}) // server fetch failed — local list already shown
                .finally(() => setIsListLoading(false));
        } else if (supabaseConfigured) {
            setChatList([]);
            setIsListLoading(false);
        } else {
            setIsListLoading(false);
        }
    }, [accessToken, supabaseConfigured]);

    // Persist current chat when messages or currentChatId change (debounced).
    useEffect(() => {
        if (!currentChatId || !isLoadedRef.current) return;
        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = setTimeout(() => {
            const chatId = currentChatIdRef.current;
            if (!chatId) return;
            const hasMessages = messages.length > 0;
            const hasNewMessages = messages.length > syncedMessageCountRef.current;
            if (hasMessages) {
                const title = chatStorage.getTitleFromMessages(messages);
                const msgsForStorage = messages.map(({ chartData: _cd, ...rest }) => rest);
                try {
                    chatStorage.saveChatMessages(chatId, msgsForStorage);
                } catch {
                    // localStorage quota full — messages are safely on the server, no pruning
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
                            ...(m.responseMode != null ? { _responseMode: m.responseMode } : {}),
                        },
                    }));
                    if (newOnes.length > 0) {
                        chatsApi.appendMessages(chatId, newOnes, accessToken)
                            .then(() => { syncedMessageCountRef.current = messages.length; })
                            .catch((err) => {
                                console.warn('Chat sync to backend failed (messages safe in localStorage):', err?.message);
                            });
                    }
                    chatsApi.updateChatTitle(chatId, title, accessToken).catch(() => {});
                }
            }
            persistTimeoutRef.current = null;
        }, 400);
        return () => {
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        };
    }, [currentChatId, messages, accessToken]);

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
            chatStorage.saveChatMessages(currentChatId, messages);
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
        syncedMessageCountRef.current = 0;
        if (accessToken) {
            chatsApi.createChat(accessToken, 'New chat').then((serverId) => {
                setCurrentChatId(serverId ?? (crypto.randomUUID?.() ?? `chat_${Date.now()}`));
                setMessages([]);
            }).catch(() => {
                setCurrentChatId(crypto.randomUUID?.() ?? `chat_${Date.now()}`);
                setMessages([]);
            });
        } else {
            setCurrentChatId(crypto.randomUUID?.() ?? `chat_${Date.now()}`);
            setMessages([]);
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
                        responseMode: m.metadata?._responseMode ?? undefined,
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
                        chatStorage.saveChatMessages(id, msgs);
                    }
                }
                setChatLoadError(null);
            }).catch(() => {
                if (!hasLocal) setChatLoadError('Failed to load chat. Please try again.');
            }).finally(() => {
                setIsChatLoading(false);
            });
        }
    }, [accessToken]);

    const deleteChat = useCallback((id) => {
        // Immediately mark as pending-delete in localStorage.
        // Even if the API call below fails or is slow, this chat won't reappear on next reload
        // because the mount effect filters out pending-deletes from the server list.
        chatStorage.addPendingDelete(id);
        chatStorage.saveChatMessages(id, []);
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
