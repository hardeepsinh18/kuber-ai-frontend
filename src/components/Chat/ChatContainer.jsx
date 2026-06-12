import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import StartScreen from './StartScreen';
import ThinkingPaths from './ThinkingPaths';
import SourcesPanel from './SourcesPanel';
import { useAuth } from '../../context/AuthContext';
import { useChatHistory } from '../../context/ChatHistoryContext';
import { useTheme } from '../../context/ThemeContext';
import { useChatMode } from '../../context/ChatModeContext';

// API Base URL - unset = same-origin (Vercel proxies /api/* to AWS).
// Supports both Vite and Next-style env names for deployment safety.
const _raw = import.meta.env.VITE_API_BASE || import.meta.env.NEXT_PUBLIC_API_URL;
const API_BASE = (_raw && _raw.startsWith('http')) ? _raw.replace(/\/$/, '') : '';
const API_ENDPOINT = API_BASE ? `${API_BASE}/api/v1/chat` : '/api/v1/chat';
const FEEDBACK_ENDPOINT = API_BASE ? `${API_BASE}/api/v1/feedback` : '/api/v1/feedback';
// Default 120s: multi-symbol comparisons + fundamentals + LLM can exceed 60s on EC2.
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_CHAT_TIMEOUT_MS || 120000);

/**
 * Extract chart resolution from user query for Fyers API
 * Returns: 'intraday' | 'daily' | 'weekly' | 'monthly' | null (null = no chart)
 * FYERS: 1min/5min/15min/30min/60min → intraday, D → daily, W → weekly, M → monthly
 *
 * Key distinction: "1 month chart" = daily candles for 1 month (NOT monthly candles).
 * Only "monthly chart/data/performance" explicitly requests monthly (M) candles.
 */
const extractChartResolution = (query) => {
    const q = query.toLowerCase();
    // Intraday candles
    if (/\b(intraday|intra-day|today'?s?|1min|5min|15min|30min|60min|hourly|live|realtime|real-time)\b/.test(q)) return 'intraday';
    // Explicit candle-type chart requests
    if (/\b(monthly chart|monthly candles?|monthly data|monthly performance)\b/.test(q)) return 'monthly';
    if (/\b(weekly chart|weekly candles?|weekly data|weekly performance)\b/.test(q)) return 'weekly';
    // Period or generic chart requests → daily candles (backend picks period from chart_period)
    if (/\b(daily|day|eod|end of day)\b/.test(q)) return 'daily';
    if (/\b(week|month|quarter|year|chart|graph|plot)\b/.test(q)) return 'daily';
    return null;
};

/**
 * Extract chart period hint from user query.
 * Returns: '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y' | null
 * Sent alongside chart_resolution so backend knows the date range to fetch.
 */
const extractChartPeriod = (query) => {
    const q = query.toLowerCase();
    if (/\b(intraday|today'?s?)\b/.test(q)) return '1d';
    if (/\b(5 days?|this week|last week|past week|one week|1 week)\b/.test(q)) return '5d';
    if (/\b(3 months?|three months?|quarter(ly)?|90 days?)\b/.test(q)) return '3m';
    if (/\b(6 months?|six months?|half.?year|180 days?)\b/.test(q)) return '6m';
    if (/\b(1 month|one month|this month|last month|past month|30 days?)\b/.test(q)) return '1m';
    if (/\b(1 year|one year|annual(ly)?|12 months?|ytd|year to date|365 days?)\b/.test(q)) return '1y';
    if (/\b(5 years?|five years?)\b/.test(q)) return '5y';
    return null;
};

/**
 * Words that match ticker-shaped tokens but are normal English / query words.
 * Without this, queries like "How has TCS performed over 5 years?" send
 * symbols: ['HOW','HAS','TCS','PERFORMED','OVER'] and break backend resolution.
 */
const SYMBOL_HINT_STOPWORDS = new Set([
    'A', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO',
    'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE',
    'ALL', 'AND', 'ANY', 'ARE', 'ASK', 'BAD', 'BUT', 'CAN', 'DAY', 'DID', 'DUE', 'END', 'FOR',
    'GET', 'GOT', 'HAD', 'HAS', 'HER', 'HIM', 'HIS', 'HOW', 'ITS', 'LET', 'LOW', 'MAY', 'NEW',
    'NOT', 'NOW', 'OFF', 'OLD', 'ONE', 'OUR', 'OUT', 'OWN', 'PER', 'PUT', 'RAN', 'RED', 'SAY',
    'SEE', 'SHE', 'THE', 'TOO', 'TOP', 'TRY', 'TWO', 'USE', 'VIA', 'WAS', 'WAY', 'WHO', 'WHY',
    'YES', 'YET', 'YOU',
    'ABOUT', 'AFTER', 'ALSO', 'BACK', 'BEST', 'BOTH', 'CALL', 'CAME', 'COME', 'COULD', 'DAYS',
    'DOES', 'DONE', 'DOWN', 'EACH', 'EVEN', 'EVER', 'FIND', 'FIRST', 'FIVE', 'FOUR', 'FROM',
    'GAVE', 'GIVE', 'GOOD', 'GREAT', 'HAVE', 'HELP', 'HERE', 'HIGH', 'INTO', 'JUST', 'KEEP',
    'KNOW', 'LAST', 'LEFT', 'LIKE', 'LIST', 'LONG', 'LOOK', 'MADE', 'MAKE', 'MANY', 'MORE',
    'MOST', 'MUCH', 'MUST', 'NEAR', 'NEED', 'NEXT', 'NICE', 'ONLY', 'OPEN', 'OVER', 'PART',
    'PAST', 'PICK', 'PLAN', 'RATE', 'READ', 'REAL', 'RISK', 'SAID', 'SAME', 'SEEM', 'SENT',
    'SHOW', 'SIDE', 'SOME', 'SUCH', 'SURE', 'TAKE', 'TELL', 'THAN', 'THAT', 'THEM', 'THEN',
    'THEY', 'THIS', 'TIME', 'TOLD', 'TOOK', 'TURN', 'VERY', 'WANT', 'WELL', 'WENT',
    'WERE', 'WHAT', 'WHEN', 'WHOM', 'WILL', 'WITH', 'WORK', 'YEAR', 'YEARS', 'YOUR', 'ZONE',
    'CHART', 'GRAPH', 'PLOT', 'STOCK', 'STOCKS', 'SHARE', 'SHARES', 'PRICE', 'TODAY', 'DAILY',
    'WEEK', 'WEEKS', 'MONTH', 'MONTHS', 'INTRADAY', 'MARKET', 'INDEX', 'NIFTY', 'SENSEX',
    'PERFORM', 'PERFORMED', 'PERFORMANCE', 'OUTLOOK', 'COMPARE', 'VERSUS', 'AGAINST', 'PEER',
    'PEERS', 'SECTOR', 'TERM', 'TERMS', 'MEDIUM', 'SHORT', 'NEAR', 'TARGET', 'BUY', 'SELL',
    'HOLD', 'VIEW', 'TREND', 'GAIN', 'LOSS', 'DATA', 'NEWS', 'LIVE',
    // Sector/category words — sending these as symbol hints causes false resolutions
    // e.g. "DCB bank" sends ["DCB","BANK"] → "BANK" fuzzy-matches to HDFCBANK
    'BANK', 'BANKS', 'BANKING', 'FINANCE', 'FINANCIAL', 'INSURANCE',
    'AUTO', 'AUTOMOBILE', 'AUTOMOBILES', 'AUTOMOTIVE',
    'PHARMA', 'PHARMACEUTICAL', 'HEALTHCARE',
    'ENERGY', 'POWER', 'COAL', 'MINING',
    'CEMENT', 'STEEL', 'METAL', 'METALS', 'FMCG', 'CONSUMER', 'RETAIL',
    'TELECOM', 'TELECOMM',
    // Query descriptor words that look like tickers
    'ANALYSIS', 'ANALYZE', 'REPORT', 'REPORTS', 'QUARTERLY', 'ANNUAL',
    'FUTURE', 'FUTURES', 'OPTION', 'OPTIONS', 'CALL', 'PUTS',
    'FUNDAMENTAL', 'FUNDAMENTALS', 'TECHNICAL', 'TECHNICALS',
    'VALUATION', 'VALUATIONS', 'GROWTH', 'RETURNS', 'RETURN',
    'RALLY', 'CRASH', 'BULL', 'BEAR', 'BULLISH', 'BEARISH',
    // Financial concept words that are NOT stock tickers
    // Without this list, "what is lump sum" → sends LUMP+SUM as symbol hints
    'LUMP', 'SUM', 'NAV', 'ALPHA', 'LOAD', 'EXIT', 'EXPENSE', 'RATIO',
    'INDEX', 'FUND', 'FUNDS', 'CIRCUIT', 'UPPER', 'LOWER', 'BAND',
    'FACE', 'BOOK', 'SPLIT', 'BONUS', 'RIGHTS', 'BUYBACK', 'ISSUE',
    'MARGIN', 'LEVERAGE', 'HEDGE', 'HEDGING', 'ARBITRAGE', 'ARB',
    'EBITDA', 'EBIT', 'FCF', 'WORKING', 'CAPITAL', 'CORPUS',
    'PROMOTER', 'PLEDGE', 'PLEDGED', 'INSIDER', 'SLIPPAGE',
    'IMPACT', 'COST', 'SPREAD', 'DEPTH', 'LEVEL', 'REPO',
    'INFLATION', 'GDP', 'FISCAL', 'DEFICIT', 'SURPLUS',
    'BOND', 'GILT', 'BILL', 'DEBENTURE', 'NCD', 'FDI',
    'SHARPE', 'SORTINO', 'SORTINO', 'DRAWDOWN', 'ALPHA',
    'BRACKET', 'COVER', 'TRAILING', 'STOP', 'LIMIT', 'AMO',
    'EXPLAIN', 'DEFINE', 'MEANING', 'CONCEPT', 'DIFFERENCE',
    // Financial indicator abbreviations — these look like tickers but are not stocks
    // e.g. "what is the PE?" or "show me RSI" must not send PE/RSI as symbol hints
    'PE', 'ROE', 'EPS', 'ROA', 'EVA', 'DCF', 'NAV', 'IRR', 'NPV',
    'RSI', 'EMA', 'SMA', 'ATR', 'ADX', 'ADR', 'OBV', 'MFI', 'CCI',
    'MACD', 'VWAP', 'OHLC', 'CAGR', 'TTM', 'YTD', 'QOQ', 'YOY',
    'FII', 'DII', 'AMC', 'AUM', 'MF', 'ETF', 'NFO',
    'BETWEEN', 'VERSUS', 'COMPARE', 'COMPARISON',
    // Common words erroneously matching short tickers
    'LIST', 'TYPE', 'TYPES', 'KIND', 'KINDS', 'FORM', 'FORMS',
    'STEP', 'STEPS', 'RULE', 'RULES', 'LAW', 'LAWS', 'ACT',
    'MEAN', 'MEANS', 'TELL', 'KNOW', 'LEARN', 'TEACH',
]);

/**
 * Enhanced stock symbol extraction
 * Handles uppercase, lowercase, mixed case, and common stock name patterns
 * Backend will validate and normalize - this provides smart hints
 */
const extractStockSymbols = (query) => {
    const symbols = [];
    const words = query.split(/\s+/);

    // Common stock name mappings (case-insensitive)
    const stockAliases = {
        'bccl': 'BHARATCOAL',
        'bharat coal': 'BHARATCOAL',
        'bharatcoal': 'BHARATCOAL',
        'tcs': 'TCS',
        'infosys': 'INFY',
        'reliance': 'RELIANCE',
        'hdfc': 'HDFCBANK',
        'hdfc bank': 'HDFCBANK',
        'wipro': 'WIPRO',
        'tech mahindra': 'TECHM',
        'techm': 'TECHM',
    };

    for (const word of words) {
        // Remove punctuation
        const cleaned = word.replace(/[.,!?;:()]/g, '');
        const cleanedLower = cleaned.toLowerCase();
        
        // Check if it's a known alias
        if (stockAliases[cleanedLower]) {
            symbols.push(stockAliases[cleanedLower]);
            continue;
        }
        
        // Match ticker-like patterns (case-insensitive now)
        // Examples: TCS, INFY, RELIANCE, HDFCBANK, bccl, Wipro
        if (/^[A-Za-z]{2,15}$/i.test(cleaned)) {
            const upper = cleaned.toUpperCase();
            if (SYMBOL_HINT_STOPWORDS.has(upper)) continue;
            symbols.push(upper);
        }
        // Match NSE/BSE formatted symbols: SYMBOL.NS or SYMBOL.BO
        else if (/^[A-Za-z]{1,15}\.(NS|BO)$/i.test(cleaned)) {
            symbols.push(cleaned.toUpperCase());
        }
    }

    // Check for multi-word company names
    const queryLower = query.toLowerCase();
    for (const [alias, symbol] of Object.entries(stockAliases)) {
        if (queryLower.includes(alias) && !symbols.includes(symbol)) {
            symbols.push(symbol);
        }
    }

    // Remove duplicates, limit to 5
    // Backend will validate and normalize these
    return [...new Set(symbols)].slice(0, 5);
};

/**
 * Generate dynamic thinking steps based on user query
 * Creates contextual analysis steps that match the query intent
 */
const generateThinkingSteps = (query, symbols = []) => {
    const steps = [];
    const queryLower = query.toLowerCase();
    
    // Step 1: Query interpretation
    if (symbols.length > 0) {
        steps.push(`Analyzing query for ${symbols.length} stock${symbols.length > 1 ? 's' : ''}: ${symbols.join(', ')}`);
    } else {
        steps.push(`Understanding your question about market trends`);
    }
    
    // Step 2: Data fetching (dynamic based on query type)
    if (queryLower.includes('chart') || queryLower.includes('graph') || queryLower.includes('intraday') || queryLower.includes('weekly')) {
        steps.push(`Fetching OHLCV data from Fyers for chart rendering`);
    } else if (symbols.length > 0) {
        steps.push(`Fetching live market data and fundamentals`);
    } else if (queryLower.includes('market') || queryLower.includes('index')) {
        steps.push(`Retrieving index data and market sentiment`);
    } else {
        steps.push(`Gathering relevant market information`);
    }
    
    // Step 3: Technical analysis
    if (queryLower.includes('price') || queryLower.includes('target') || queryLower.includes('cross') || symbols.length > 0) {
        steps.push(`Running technical analysis and calculating indicators`);
    } else if (queryLower.includes('invest') || queryLower.includes('buy')) {
        steps.push(`Evaluating investment fundamentals`);
    } else {
        steps.push(`Analyzing market patterns and trends`);
    }
    
    // Step 4: Expert insights
    if (symbols.length > 0) {
        steps.push(`Compiling analyst recommendations and price targets`);
    } else {
        steps.push(`Gathering expert market insights`);
    }
    
    // Step 5: Synthesis
    if (queryLower.includes('possibility') || queryLower.includes('likelihood')) {
        steps.push(`Calculating probability based on historical patterns`);
    } else {
        steps.push(`Preparing comprehensive analysis`);
    }
    
    return steps;
};


const CHAT_MODES = [
    { key: 'snap',    label: 'Quick'   },
    { key: 'analyst', label: 'Analyst' },
];

// Stable unique ID generator — avoids Date.now() collisions
const genId = () =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const ChatContainer = ({ sidebarOpen, routeChatId }) => {
    const { chatId: routeChatIdParam } = useParams();
    const { accessToken } = useAuth();
    const { theme } = useTheme();
    const { setChatActive } = useChatMode();
    const { messages, setMessages, ensureCurrentChat, loadChat, currentChatId, isChatLoading, chatLoadError, setChatLoadError } = useChatHistory();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [streamingMessageId, setStreamingMessageId] = useState(null); // Track which message is streaming
    const [showThinking, setShowThinking] = useState(false); // Show thinking paths
    const [thinkingSteps, setThinkingSteps] = useState([]); // Store thinking steps
    const [startTime, setStartTime] = useState(null); // Track request start time
    const [processingTime, setProcessingTime] = useState(0); // Track processing time
    const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll-to-bottom button
    const [responseMode, setResponseModeState] = useState(
        () => localStorage.getItem('kuberai_mode') || 'snap'
    );

    const setResponseMode = (mode) => {
        localStorage.setItem('kuberai_mode', mode);
        setResponseModeState(mode);
    };

    const bottomRef = useRef(null);
    const chatContainerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const streamingTimeoutRef = useRef(null);
    const activeRequestIdRef = useRef(0);
    const isLoadingRef = useRef(false);
    const messagesRef = useRef(messages);
    const lastSendAtRef = useRef(0);
    const lastSendTextRef = useRef('');

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const clearStreamingTimeout = useCallback(() => {
        if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            clearStreamingTimeout();
        };
    }, [clearStreamingTimeout]);

    const handleStreamingDone = useCallback(() => {
        clearStreamingTimeout();
        setStreamingMessageId(null);
    }, [clearStreamingTimeout]);

    const handleStopRequest = useCallback(() => {
        activeRequestIdRef.current += 1;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = null; // Must clear so next send isn't blocked
        clearStreamingTimeout();
        setStreamingMessageId(null);
        setShowThinking(false);
        setThinkingSteps([]);
        isLoadingRef.current = false;
        setIsLoading(false);
    }, [clearStreamingTimeout]);

    // When opening /chat/:chatId, load that chat
    useEffect(() => {
        if (routeChatId && routeChatIdParam && routeChatIdParam !== currentChatId) {
            loadChat(routeChatIdParam);
        }
    }, [routeChatId, routeChatIdParam, currentChatId, loadChat]);

    // Scroll to bottom when messages change or loading state changes
    useEffect(() => {
        if (messages.length > 0 || streamingMessageId || showThinking) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, streamingMessageId, showThinking]);

    // During fake streaming the bubble grows but messages[] doesn't change,
    // so we run a fast interval to keep the viewport pinned to the bottom —
    // but only when the user is already near the bottom (don't fight user scroll).
    useEffect(() => {
        if (!streamingMessageId) return;
        const container = chatContainerRef.current;
        const id = setInterval(() => {
            if (!container) return;
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            if (isNearBottom) {
                bottomRef.current?.scrollIntoView({ behavior: 'instant' });
            }
        }, 60);
        return () => clearInterval(id);
    }, [streamingMessageId]);

    const updateScrollButtonVisibility = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const overflow = scrollHeight - clientHeight > 8; // real overflow, avoid rounding noise
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isNearBottom = distanceFromBottom < 200;

        // UX: do not show while generating/streaming/thinking
        const shouldShow =
            overflow &&
            !isNearBottom &&
            messagesRef.current.length > 0 &&
            !isLoadingRef.current &&
            !streamingMessageId &&
            !showThinking;

        setShowScrollButton(shouldShow);
    }, [streamingMessageId, showThinking]);

    // Detect scroll position to show/hide scroll button
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => updateScrollButtonVisibility();
        container.addEventListener('scroll', handleScroll, { passive: true });

        // Evaluate immediately to avoid stale visibility after route/chat changes.
        updateScrollButtonVisibility();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [updateScrollButtonVisibility, messages.length, isLoading, streamingMessageId, showThinking]);

    // Scroll to bottom function
    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleFeedback = useCallback(async (msgId, rating) => {
        try {
            await fetch(FEEDBACK_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: msgId, rating }),
            });
        } catch (_e) {
            // Fire-and-forget — never surface feedback errors to the user
        }
    }, []);

    const handleStartChat = (initialInput) => {
        // Do NOT setInput here — the text is added directly to messages,
        // and setting input then sending with manualInput bypasses the setInput('') clear.
        handleSend(initialInput);
    };

    const handleSend = async (manualInput = null) => {
        const textToSend = manualInput !== null ? manualInput : input;
        const normalized = textToSend.trim();
        const now = Date.now();

        if (!normalized) return;
        if (isLoadingRef.current || abortControllerRef.current) return;
        if ((now - lastSendAtRef.current) < 350 && lastSendTextRef.current === normalized) return;

        lastSendAtRef.current = now;
        lastSendTextRef.current = normalized;
        const requestId = ++activeRequestIdRef.current;
        isLoadingRef.current = true;
        setShowScrollButton(false);

        // Clear the input bar immediately on send — before any async work — so the user
        // doesn't see their text sitting there during the network round-trip.
        // Follow-up chip clicks pass manualInput so we don't wipe whatever the user is typing.
        if (manualInput === null) setInput('');

        try {
            await ensureCurrentChat();
            const userMsgId = genId();
            setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: normalized }]);
            setIsLoading(true);
            setError(null);
            
            // Start timing
            const requestStartTime = Date.now();
            setStartTime(requestStartTime);
            
            // Show thinking animation
            setShowThinking(true);
            setThinkingSteps([]);

            if (import.meta.env.DEV) console.log('Sending query:', normalized);
            // Generate dynamic thinking steps based on the query
            const extractedSymbols = extractStockSymbols(normalized);
            const chartResolution = extractChartResolution(normalized);
            const chartPeriod = extractChartPeriod(normalized);
            const dynamicSteps = generateThinkingSteps(normalized, extractedSymbols);
            
            // Per-chat context: last N turns for conversation continuity
            const maxHistoryMessages = 10;
            const conversationHistory = messagesRef.current
                .slice(-maxHistoryMessages)
                .map((m) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: typeof m.content === 'string' ? m.content : ''
                }))
                .filter((m) => m.content.trim());

            // Build payload according to backend schema
            let payload = {
                query: normalized,
                timeframe: "medium_term",
                risk_level: "medium",
                response_mode: responseMode,
            };

            // Extract potential symbol hints (backend will validate/normalize)
            if (extractedSymbols.length > 0) {
                payload.symbols = extractedSymbols;
            }
            // Chart resolution + period for Fyers — backend uses for chart_data
            if (chartResolution) {
                payload.chart_resolution = chartResolution;
            }
            if (chartPeriod) {
                payload.chart_period = chartPeriod;
            }
            if (conversationHistory.length > 0) {
                payload.chat_history = conversationHistory;
            }
            // If no symbols extracted, backend will parse query or answer conceptually

            const headers = { 'Content-Type': 'application/json' };
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            let response;
            try {
                response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (requestId !== activeRequestIdRef.current) return;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.detail || errorData.message || errorData.error;
                let msg;
                if (response.status === 401 || response.status === 403) {
                    msg = 'Session expired. Please sign in again.';
                } else if (response.status === 429) {
                    msg = 'Too many requests. Please wait a moment and try again.';
                } else if (response.status === 404) {
                    msg = detail || 'The requested resource was not found. Please try again.';
                } else if (response.status >= 500) {
                    msg = detail || 'The server encountered an error. Please retry in a moment.';
                } else {
                    msg = detail || `Request failed (${response.status})`;
                }
                throw new Error(msg);
            }

            const responseData = await response.json();
            
            // Calculate processing time
            const endTime = Date.now();
            const timeTaken = (endTime - requestStartTime) / 1000; // in seconds
            setProcessingTime(timeTaken);
            
            if (import.meta.env.DEV) {
                console.log('API Response:', responseData);
                console.log('Processing time:', timeTaken.toFixed(2), 'seconds');
            }
            
            // Hide thinking and show the steps that were processed
            setShowThinking(false);
            setThinkingSteps(dynamicSteps);
            
            const aiResponseText = responseData.content || responseData.answer || "No response content received.";

            // Validate chart data structure before passing to MessageBubble
            const rawChartData = responseData.chart_data || null;
            const chartData = (() => {
                if (!rawChartData || typeof rawChartData !== 'object') return null;
                // Accept both old format (ohlcv/candles/data key) and new array-of-arrays format (dates/close arrays)
                const hasOhlcv = (d) => d && (d.ohlcv || d.candles || d.data || (Array.isArray(d.dates) && d.dates.length > 0) || (Array.isArray(d.close) && d.close.length > 0));
                if (Array.isArray(rawChartData)) return rawChartData.every(hasOhlcv) ? rawChartData : null;
                return hasOhlcv(rawChartData) ? rawChartData : null;
            })();
            const metadata = responseData.metadata || { symbols: extractedSymbols };
            const signal = responseData.signal || null;
            const patternSummary = responseData.pattern_summary || null;
            const technicalSummary = responseData.technical_summary || null;
            const indicatorsTable = responseData.indicators_table || null;
            const scoreCard = responseData.score_card || null;
            const suggestedFollowUps = Array.isArray(responseData.suggested_follow_ups) ? responseData.suggested_follow_ups : null;
            const newsHeadlines = responseData.news_headlines || null;

            // Create AI message with streaming
            const aiMessageId = genId();
            setStreamingMessageId(aiMessageId); // Mark this message as streaming
            
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: aiResponseText,
                chartData,
                metadata,
                signal,
                patternSummary,
                technicalSummary,
                indicatorsTable,
                scoreCard,
                suggestedFollowUps,
                newsHeadlines,
                thinkingSteps: (responseData.retrieval_steps && responseData.retrieval_steps.length > 0) ? responseData.retrieval_steps : dynamicSteps,
                sourceDocuments: responseData.source_documents || [],
                processingTime: timeTaken,
                responseMode,
            }]);

            // MessageBubble calls onStreamingDone when its animation finishes.
            // Safety fallback clears streaming state if the callback never fires (45s max).
            clearStreamingTimeout();
            streamingTimeoutRef.current = setTimeout(() => {
                setStreamingMessageId(null);
            }, 45000);

        } catch (err) {
            if (requestId !== activeRequestIdRef.current) return;
            if (err.name === 'AbortError') {
                // Timeout — user-initiated stop already returned early via requestId check above
                setShowThinking(false);
                setThinkingSteps([]);
                setStreamingMessageId(null);
                clearStreamingTimeout();
                setMessages(prev => [...prev, {
                    id: genId(),
                    role: 'ai',
                    content: '⏱️ Request timed out. The query may be too complex — try asking about one stock at a time, or retry in a moment.',
                }]);
                isLoadingRef.current = false;
                setIsLoading(false);
                return;
            }
            if (import.meta.env.DEV) {
                console.error('Chat Error:', err);
                console.error('Error details:', { message: err.message, stack: err.stack, requestUrl: API_ENDPOINT });
            }
            setShowThinking(false);
            setThinkingSteps([]);
            // Sanitize error message — never expose raw internal errors to users
            let userErrorMsg = "Something went wrong. Please try again.";
            if (err.message) {
                // Already-mapped HTTP errors (from the !response.ok block above) are safe to show
                const safe = /session expired|too many requests|not found|server encountered|request failed/i.test(err.message);
                if (safe) userErrorMsg = err.message;
                else if (/network|fetch|failed to fetch|load failed|networkerror/i.test(err.message)) {
                    userErrorMsg = "Network error — check your connection and try again.";
                }
            }
            const errorMessageId = genId();
            setMessages(prev => [...prev, {
                id: errorMessageId,
                role: 'ai',
                content: `⚠️ ${userErrorMsg}`
            }]);
        } finally {
            if (requestId === activeRequestIdRef.current) {
                abortControllerRef.current = null;
                isLoadingRef.current = false;
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        setChatActive(messages.length > 0);
        return () => setChatActive(false);
    }, [messages.length, setChatActive]);

    if (messages.length === 0 && isChatLoading) {
        return (
            <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto w-full pt-10">
                {[80, 55, 90, 65].map((w, i) => (
                    <div key={i} className={`h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse`} style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
                ))}
            </div>
        );
    }

    if (messages.length === 0) {
        return <StartScreen onStartChat={handleStartChat} responseMode={responseMode} setResponseMode={setResponseMode} />;
    }

    return (
        <div className="flex flex-col h-full relative">
            {chatLoadError && (
                <div className="flex items-center justify-between gap-2 mx-4 mb-1 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-400">
                    <span>⚠️ {chatLoadError}</span>
                    <button onClick={() => setChatLoadError(null)} className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 flex-shrink-0">✕</button>
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col relative">
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto pt-4 pb-2 custom-scrollbar"
                >
                    {messages.map((msg) => (
                        <React.Fragment key={msg.id}>
                            {msg.role === 'ai' && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                                <ThinkingPaths
                                    steps={msg.thinkingSteps}
                                    isThinking={false}
                                    processingTime={msg.processingTime || 0}
                                />
                            )}

                            {msg.role === 'ai' && (
                                <SourcesPanel sourceDocuments={msg.sourceDocuments || []} />
                            )}

                            <MessageBubble
                                role={msg.role}
                                content={msg.content}
                                isStreaming={msg.id === streamingMessageId}
                                isLoading={isLoading}
                                chartData={msg.chartData}
                                metadata={msg.metadata}
                                signal={msg.signal}
                                patternSummary={msg.patternSummary}
                                technicalSummary={msg.technicalSummary}
                                indicatorsTable={msg.indicatorsTable}
                                scoreCard={msg.scoreCard}
                                suggestedFollowUps={msg.suggestedFollowUps}
                                newsHeadlines={msg.newsHeadlines}
                                onFollowUpClick={(text) => handleSend(text)}
                                onStreamingDone={msg.id === streamingMessageId ? handleStreamingDone : undefined}
                                messageId={msg.role === 'ai' ? msg.id : null}
                                onFeedback={msg.role === 'ai' ? handleFeedback : null}
                                responseMode={msg.role === 'ai' ? (msg.responseMode || null) : null}
                            />
                        </React.Fragment>
                    ))}

                    {showThinking && (
                        <ThinkingPaths isThinking={true} />
                    )}

                    <div ref={bottomRef} className="h-4" />
                </div>

                {/* Scroll to bottom button — inside the card */}
                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                                   flex items-center justify-center w-9 h-9 rounded-full
                                   bg-white/90 backdrop-blur
                                   border border-zinc-200/80
                                   shadow-sm hover:shadow-md
                                   opacity-70 hover:opacity-100
                                   transition-all duration-200 ease-out
                                   hover:scale-105 active:scale-95
                                   group"
                        aria-label="Scroll to bottom"
                    >
                        <svg
                            className="w-[18px] h-[18px] text-zinc-600/80 group-hover:text-zinc-900 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>
                )}
                {/* ── Input bar — inside the card at the bottom ── */}
                <InputBar
                    input={input}
                    setInput={setInput}
                    handleSend={() => handleSend()}
                    onStopRequest={handleStopRequest}
                    isLoading={isLoading}
                    responseMode={responseMode}
                    setResponseMode={setResponseMode}
                    horizonQuestion={(() => {
                        if (isLoading) return false;
                        const lastAI = [...messages].reverse().find(m => m.role === 'ai');
                        if (!lastAI?.content) return false;
                        const plain = lastAI.content.replace(/\*+/g, '').replace(/_+/g, '');
                        return /short\s*term.{0,40}or.{0,40}long\s*term|long\s*term.{0,40}or.{0,40}short\s*term/i.test(plain);
                    })()}
                    horizonSymbol={(() => {
                        const lastAI = [...messages].reverse().find(m => m.role === 'ai');
                        return lastAI?.metadata?.at_a_glance?.symbol
                            || lastAI?.metadata?.symbols?.[0]
                            || '';
                    })()}
                    onHorizonChoice={(q) => handleSend(q)}
                />
            </div>
        </div>
    );
};

export default ChatContainer;
