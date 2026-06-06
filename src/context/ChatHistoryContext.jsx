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
    // Ref mirror of currentChatId — prevents stale closure in the persist debounce callback
    const currentChatIdRef = useRef(null);

    // Load chat list on mount: from backend when logged in, else localStorage (filter empty).
    // When Supabase is configured but user is not logged in, show empty list — auth is required.
    useEffect(() => {
        setIsListLoading(true);
        if (accessToken) {
            chatsApi.getChats(accessToken)
                .then((serverList) => {
                    if (serverList && serverList.length >= 0) {
                        const list = serverList.map((c) => ({
                            id: c.id,
                            title: c.title ?? c.name ?? 'New chat',
                            updatedAt: c.updated_at ?? c.updatedAt ?? Date.now(),
                        }));
                        setChatList(list);
                        isLoadedRef.current = true;
                        setIsListLoading(false);
                        return;
                    }
                    loadLocalList();
                })
                .catch(() => loadLocalList());
        } else if (supabaseConfigured) {
            // Auth required but not logged in — show empty sidebar
            setChatList([]);
            isLoadedRef.current = true;
            setIsListLoading(false);
        } else {
            loadLocalList();
        }

        function loadLocalList() {
            const list = chatStorage.getChatList().filter((c) => chatStorage.getChatMessages(c.id).length > 0);
            setChatList(list);
            chatStorage.saveChatList(list);
            isLoadedRef.current = true;
            setIsListLoading(false);
        }
    }, [accessToken, supabaseConfigured]);

    // Keep ref in sync so the debounce callback always reads the latest chatId
    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

    // Persist current chat when messages or currentChatId change (debounced).
    // When logged in, sync to backend; always persist to localStorage as cache/fallback.
    useEffect(() => {
        if (!currentChatId || !isLoadedRef.current) return;
        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = setTimeout(() => {
            // Use ref to get the chatId at time-of-execution, not time-of-capture.
            // Prevents stale closure when user switches chats during the 400ms debounce.
            const chatId = currentChatIdRef.current;
            if (!chatId) return;
            const hasMessages = messages.length > 0;
            // Only consider messages NEW if they exceed the synced baseline.
            // This prevents merely *viewing* a loaded chat from bumping its updatedAt.
            const hasNewMessages = messages.length > syncedMessageCountRef.current;
            if (hasMessages) {
                const title = chatStorage.getTitleFromMessages(messages);
                // Strip heavy chartData before persisting to localStorage to avoid QuotaExceededError.
                // chartData (OHLCV arrays) can be 2-5MB per message. Keep it in memory only.
                const msgsForStorage = messages.map(({ chartData: _cd, ...rest }) => rest);
                try {
                    chatStorage.saveChatMessages(chatId, msgsForStorage);
                } catch (storageErr) {
                    // localStorage full — clear oldest chats and retry once
                    console.warn('localStorage quota exceeded, pruning old chats:', storageErr);
                    try {
                        const list = chatStorage.getChatList();
                        const oldest = list.slice(-Math.ceil(list.length / 2));
                        oldest.forEach(c => chatStorage.saveChatMessages(c.id, []));
                        chatStorage.saveChatMessages(chatId, msgsForStorage);
                    } catch (_) { /* give up silently */ }
                }
                setChatList((prev) => {
                    const next = prev.map((c) =>
                        c.id === chatId
                            ? { ...c, title, ...(hasNewMessages ? { updatedAt: Date.now() } : {}) }
                            : c
                    );
                    // New chat being created for the first time — add it to list
                    const found = next.some((c) => c.id === chatId);
                    if (!found) next.unshift({ id: chatId, title, updatedAt: Date.now() });
                    chatStorage.saveChatList(next);
                    return next;
                });
                if (accessToken) {
                    const start = syncedMessageCountRef.current;
                    // Exclude chartData from backend sync — too large for DB JSONB column
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
                            // chartData intentionally excluded — too large for DB
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
        if (accessToken) {
            try {
                const serverId = await chatsApi.createChat(accessToken, 'New chat');
                if (serverId) {
                    syncedMessageCountRef.current = 0;
                    setCurrentChatId(serverId);
                    setChatList((prev) => {
                        const next = [{ id: serverId, title: 'New chat', updatedAt: Date.now() }, ...prev];
                        return next;
                    });
                    return serverId;
                }
            } catch (_) {}
        }
        syncedMessageCountRef.current = 0;
        const id = crypto.randomUUID?.() ?? `chat_${Date.now()}`;
        const now = Date.now();
        setCurrentChatId(id);
        setChatList((prev) => {
            const next = [{ id, title: 'New chat', updatedAt: now }, ...prev];
            chatStorage.saveChatList(next);
            return next;
        });
        return id;
    }, [currentChatId, accessToken]);

    const newChat = useCallback(() => {
        // Persist current chat if it has messages before switching away
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
                if (serverId) {
                    setCurrentChatId(serverId);
                    setMessages([]);
                } else {
                    setCurrentChatId(crypto.randomUUID?.() ?? `chat_${Date.now()}`);
                    setMessages([]);
                }
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
        // Always prefer localStorage first — it has rich fields (thinkingSteps, newsHeadlines,
        // suggestedFollowUps, chartData, etc.) that the backend does not return directly.
        const localMsgs = chatStorage.getChatMessages(id);
        if (localMsgs.length > 0) {
            setMessages(localMsgs);
            syncedMessageCountRef.current = localMsgs.length;
            return;
        }
        // No local data (e.g. different device/browser): fall back to backend.
        setMessages([]); // Only clear when we know we'll fetch remotely
        if (accessToken) {
            setIsChatLoading(true);
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
                        metadata: m.metadata ?? undefined,
                    }));
                    setMessages(msgs);
                    syncedMessageCountRef.current = msgs.length;
                    // Cache locally so next load is instant with rich fields
                    chatStorage.saveChatMessages(id, msgs);
                }
                setChatLoadError(null);
            }).catch(() => {
                setChatLoadError('Failed to load chat. Please try again.');
            }).finally(() => {
                setIsChatLoading(false);
            });
        }
    }, [accessToken]);

    const deleteChat = useCallback((id) => {
        if (accessToken) {
            chatsApi.deleteChat(id, accessToken).catch(() => {});
        }
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
        chatList: [...chatList].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
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
