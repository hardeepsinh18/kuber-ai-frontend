import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import GroupClarificationPopup from './GroupClarificationPopup';
import StartScreen from './StartScreen';
import ThinkingPaths from './ThinkingPaths';
import SourcesPanel from './SourcesPanel';
import ScannerDrawer from './ScannerDrawer';
import { useAuth } from '../../context/AuthContext';
import { useChatHistory } from '../../context/ChatHistoryContext';
import { useTheme } from '../../context/ThemeContext';
import { useChatMode } from '../../context/ChatModeContext';
import { getApiBase } from '../../lib/apiBase';

// API base — '' = same-origin relative /api/* (behind CloudFront/ALB). Set VITE_API_BASE for dev.
const API_BASE = getApiBase();
const API_ENDPOINT = `${API_BASE}/api/v1/chat`;
const FEEDBACK_ENDPOINT = `${API_BASE}/api/v1/feedback`;
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
 * Detect what specific information the user is asking for.
 * Returns: 'pe_ratio' | 'news' | 'technicals' | 'chart' | 'verdict' | 'full'
 * Used by MessageBubble to hide irrelevant sections and keep answers focused.
 */
const extractQueryIntent = (query) => {
    const q = query.toLowerCase();

    // Per-aspect signals (plural-safe: "technicals"/"fundamentals" included).
    const hasFundamental = /\bfundamentals?\b|\bfundamental analysis\b/i.test(q);
    const hasTechnical   = /\btechnicals?\b|\btechnical analysis\b|\brsi\b|\bmacd\b|\bbollinger\b|\bmomentum\b|\bindicators?\b/i.test(q);
    const hasNews        = /\bnews\b|\bheadlines?\b|latest news|recent news|what'?s new/i.test(q);
    const hasChart       = /\bchart\b|\bgraph\b|\bplot\b|\bcandlestick\b|price chart/i.test(q);

    const aspectCount = [hasFundamental, hasTechnical, hasNews, hasChart].filter(Boolean).length;

    // "fundamentals of X" (single aspect) → fundamentals-only view: price header,
    // verdict, fundamentals text + financial score cards. No chart, no technicals,
    // no management/filings wall. Checked BEFORE wantsFull so "fundamental
    // analysis" doesn't fall into the /analy/ full-view trap.
    if (hasFundamental && aspectCount === 1) return 'fundamentals';

    // Broad / analysis / multi-aspect queries → full response, no section filtering.
    // Covers "full analysis", "overview", "tell me about", and any query asking for
    // MORE THAN ONE aspect (e.g. "fundamentals AND technicals"). This must run
    // BEFORE the focused checks so a mixed query is never mistaken for a single-aspect one.
    const wantsFull =
        /analy|overview|detail|in.?depth|complete|everything|\bfull\b|tell me about|deep dive/i.test(q);
    if (wantsFull || aspectCount >= 2) return 'full';

    // K-002: buy/sell decision queries get a focused verdict view (signal + score +
    // valuation + management tone) instead of defaulting to the full wall of cards
    if (/should i (buy|sell|invest)|worth (buying|investing|it)|good (buy|investment)|buy or sell|\bgood stock\b/i.test(q)) {
        return 'verdict';
    }

    // Single fundamental metric queries — only show price header + text answer
    if (/\bp[/\s-]?e\b|pe ratio|p\/e ratio|price.{0,6}earn|price to earn/i.test(q)) return 'pe_ratio';
    if (/\b(roe|return on equity|roce|return on capital|eps|earnings per share|debt.equity|d\/e ratio|leverage|margins?|net margin|profit margin|operating margin|profitability|revenue growth|profit growth|dividend yield|dividend|book value|pb ratio|price.book|peg ratio|ebitda|fcf|free cash flow|cash flow|market cap|mcap)\b/i.test(q)) return 'pe_ratio';

    // News-only query
    if (hasNews) return 'news';

    // Technicals-only query
    if (hasTechnical) return 'technicals';

    // Chart-only query
    if (hasChart) return 'chart';

    return 'full';
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
    // Sector/category abbreviations — NOT stock tickers
    'PSU', 'PSUS', 'ETF', 'ETFS', 'NFO', 'IPO', 'FPO', 'OFS', 'QIP', 'SME',
    'MF', 'MFS', 'SIP', 'AMC', 'AUM', 'NAV',
    'FII', 'DII', 'FPI', 'HNI', 'LIC',
    // Financial metric abbreviations
    'PE', 'PB', 'EPS', 'ROE', 'ROA', 'ROCE', 'EBITDA', 'PAT', 'PEG',
    'CAGR', 'YOY', 'QOQ', 'MOM', 'TTM', 'DIV', 'DY',
    // Macro / regulatory / exchange bodies — not tickers
    'RBI', 'SEBI', 'NSE', 'BSE', 'MCX', 'GDP', 'CPI', 'WPI', 'IIP',
    // Query descriptor words that look like tickers
    'ANALYSIS', 'ANALYZE', 'REPORT', 'REPORTS', 'QUARTERLY', 'ANNUAL',
    'FUTURE', 'FUTURES', 'OPTION', 'OPTIONS', 'CALL', 'PUTS',
    'FUNDAMENTAL', 'FUNDAMENTALS', 'TECHNICAL', 'TECHNICALS',
    'VALUATION', 'VALUATIONS', 'GROWTH', 'RETURNS', 'RETURN',
    'RALLY', 'CRASH', 'BULL', 'BEAR', 'BULLISH', 'BEARISH',
    'DIVIDEND', 'YIELD', 'BONUS', 'SPLIT', 'RIGHTS',
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
/**
 * Extract stock symbols from a user query.
 * Returns { confident, raw } — only `confident` symbols should be sent to the backend.
 *
 * confident = alias-mapped names (hdfc bank → HDFCBANK) or user typed ALL-CAPS ticker (TCS, INFY)
 * raw       = individual words that look like tickers but may be parts of a company name
 *             ("prince pipes" → ["PRINCE","PIPES"]) — sending these confuses the backend
 */
const extractStockSymbols = (query) => {
    const confident = [];
    const raw = [];

    const stockAliases = {
        // Single-word aliases
        'tcs': 'TCS',
        'infosys': 'INFY',
        'infy': 'INFY',
        'reliance': 'RELIANCE',
        // bare 'hdfc' intentionally NOT aliased — HDFC Group is ambiguous
        // (HDFCBANK / HDFCLIFE / HDFCAMC); backend shows the disambiguation list
        'wipro': 'WIPRO',
        'techm': 'TECHM',
        'bccl': 'BHARATCOAL',
        'bharatcoal': 'BHARATCOAL',
        'ril': 'RELIANCE',
        'hul': 'HINDUNILVR',
        'itc': 'ITC',
        'sbi': 'SBIN',
        'sail': 'SAIL',
        'bajaj': 'BAJFINANCE',
        'bajajfin': 'BAJFINANCE',
        'kotak': 'KOTAKBANK',
        'axis': 'AXISBANK',
        'icici': 'ICICIBANK',
        'titan': 'TITAN',
        'nestle': 'NESTLEIND',
        'maruti': 'MARUTI',
        'asian': 'ASIANPAINT',
        'ultracemco': 'ULTRACEMCO',
        'ltim': 'LTIM',
        // HCL Technologies is a solo listed company — bare "hcl"/"hcl tech" must
        // resolve directly, never trigger the backend's fuzzy "Tech Group" popup
        // (it was sweeping in unrelated TAALTECH/RACLGEAR on the word "tech").
        'hcl': 'HCLTECH',
        'hcltech': 'HCLTECH',
        // Jio Financial Services is the only listed "Jio" company — resolve any
        // jio-phrase ("jio financestock", "jio finance stock") via the single
        // word. Deliberately NO multi-word 'jio finance' alias: its substring
        // rewrite would mangle "jio financestock" into "JIOFINstock".
        'jio': 'JIOFIN',
        'jiofin': 'JIOFIN',
        // Diensten Tech (NSE Emerge SME) — missing from the backend's main-board
        // symbol master, so bare "dtl" was fuzzy-matched into a fake "Dtl Group"
        // popup (TIL/GTL/DLF). Alias forces direct resolution via the symbol hint.
        'dtl': 'DTL',
        'diensten': 'DTL',
        'diensten tech': 'DTL',
        'sunpharma': 'SUNPHARMA',
        'drreddy': 'DRREDDY',
        'cipla': 'CIPLA',
        'powergrid': 'POWERGRID',
        'ntpc': 'NTPC',
        'ongc': 'ONGC',
        'ioc': 'IOC',
        'bpcl': 'BPCL',
        'grasim': 'GRASIM',
        'adanient': 'ADANIENT',
        'adaniports': 'ADANIPORTS',
        'hindalco': 'HINDALCO',
        'tatasteel': 'TATASTEEL',
        'jswsteel': 'JSWSTEEL',
        'indusindbk': 'INDUSINDBK',
        'hdfclife': 'HDFCLIFE',
        'sbilife': 'SBILIFE',
        'bajajfinsv': 'BAJAJFINSV',
        'bajajhfl': 'BAJAJHFL',
        'britannia': 'BRITANNIA',
        'heromotoco': 'HEROMOTOCO',
        'eichermot': 'EICHERMOT',
        'tataconsum': 'TATACONSUM',
        'divislab': 'DIVISLAB',
        'apollohosp': 'APOLLOHOSP',
        // Multi-word company names
        'hdfc bank': 'HDFCBANK',
        'hdfc life insurance': 'HDFCLIFE',
        'hdfc life': 'HDFCLIFE',
        'hdfc amc': 'HDFCAMC',
        'hdfc asset management': 'HDFCAMC',
        'steel authority': 'SAIL',
        'steel authority of india': 'SAIL',
        'sail steel': 'SAIL',
        'icici bank': 'ICICIBANK',
        'axis bank': 'AXISBANK',
        'kotak bank': 'KOTAKBANK',
        'state bank': 'SBIN',
        'tech mahindra': 'TECHM',
        'hcl tech': 'HCLTECH',
        'hcl technologies': 'HCLTECH',
        'bharat coal': 'BHARATCOAL',
        'asian paints': 'ASIANPAINT',
        'asian paint': 'ASIANPAINT',
        'bajaj finance': 'BAJFINANCE',
        'bajaj finserv': 'BAJAJFINSV',
        // Bajaj Housing Finance (NSE: BAJAJHFL) — must precede the greedy single-word
        // 'bajaj' → BAJFINANCE alias so "bajaj housing finance" doesn't resolve to the parent.
        'bajaj housing finance': 'BAJAJHFL',
        'bajaj housing': 'BAJAJHFL',
        'bajaj hfl': 'BAJAJHFL',
        'sun pharma': 'SUNPHARMA',
        'dr reddy': 'DRREDDY',
        'tata steel': 'TATASTEEL',
        'tata motors': 'TATAMOTORS',
        'tata power': 'TATAPOWER',
        'tata elxsi': 'TATAELXSI',
        'tata consultancy': 'TCS',
        'tata consumer': 'TATACONSUM',
        'jsw steel': 'JSWSTEEL',
        'hero motocorp': 'HEROMOTOCO',
        'eicher motors': 'EICHERMOT',
        'ultra cement': 'ULTRACEMCO',
        'ultratech cement': 'ULTRACEMCO',
        'indusind bank': 'INDUSINDBK',
        'apollo hospital': 'APOLLOHOSP',
        'apollo hospitals': 'APOLLOHOSP',
        'divi lab': 'DIVISLAB',
        'divis lab': 'DIVISLAB',
        'prince pipe': 'PRINCEPIPE',
        'prince pipes': 'PRINCEPIPE',
        'princepipe': 'PRINCEPIPE',
        'hfcl': 'HFCL',
        'irctc': 'IRCTC',
        'zomato': 'ZOMATO',
        'paytm': 'PAYTM',
        'nykaa': 'NYKAA',
        'delhivery': 'DELHIVERY',
        'policybazaar': 'POLICYBZR',
        'policy bazaar': 'POLICYBZR',
        'indigo': 'INDIGO',
        'interglobe': 'INDIGO',
        'godrej': 'GODREJCP',
        'dabur': 'DABUR',
        'marico': 'MARICO',
        'pidilite': 'PIDILITIND',
        'berger': 'BERGEPAINT',
        'berger paints': 'BERGEPAINT',
        'mrf': 'MRF',
        'ceat': 'CEATLTD',
        'balkrishna': 'BALKRISIND',
        'bkt': 'BALKRISIND',
        'voltas': 'VOLTAS',
        'blue star': 'BLUESTARCO',
        'havells': 'HAVELLS',
        'crompton': 'CROMPTON',
        'dixon': 'DIXON',
        'amber enterprise': 'AMBER',
        'amber enterprises': 'AMBER',
        'laurus labs': 'LAURUSLABS',
        'laurus': 'LAURUSLABS',
        'alkem': 'ALKEM',
        'torrent pharma': 'TORNTPHARM',
        'torrent': 'TORNTPHARM',
        'lupin': 'LUPIN',
        'biocon': 'BIOCON',
        'persistent': 'PERSISTENT',
        'coforge': 'COFORGE',
        'mphasis': 'MPHASIS',
        'ltts': 'LTTS',
        'tata elx': 'TATAELXSI',
        'atul auto': 'ATULAUTO',
        'suzuki': 'MARUTI',
        'maruti suzuki': 'MARUTI',
        // Pumps / capital goods
        'oswal pumps': 'OSWALPUMPS',
        'oswalpumps': 'OSWALPUMPS',
        'kirloskar': 'KIRLOSKAR',
        'ksb pumps': 'KSB',
        'ksb': 'KSB',
        'elgi equipments': 'ELGIEQUIP',
        'elgi': 'ELGIEQUIP',
        // Gas / energy PSUs
        'gail': 'GAIL',
        'petronet': 'PETRONET',
        'petronet lng': 'PETRONET',
        'igl': 'IGL',
        'mgl': 'MGL',
        'adani gas': 'ATGL',
        'atgl': 'ATGL',
        // Steel
        'tata steel': 'TATASTEEL',
        'jsw': 'JSWSTEEL',
        'jsw steel': 'JSWSTEEL',
        'sailsteel': 'SAIL',
        'vedanta': 'VEDL',
        'hindzinc': 'HINDZINC',
        'hind zinc': 'HINDZINC',
        'nmdc': 'NMDC',
        // Infra / roads
        'irb': 'IRB',
        'irb infra': 'IRB',
        'l&t': 'LT',
        'larsen': 'LT',
        'larsen toubro': 'LT',
        'knr': 'KNRCON',
        // Consumer
        'dmart': 'DMART',
        'd mart': 'DMART',
        'avenue supermarts': 'DMART',
        'varun beverages': 'VBL',
        'vbl': 'VBL',
        // Defence
        'hal': 'HAL',
        'bharat electronics': 'BEL',
        'bel': 'BEL',
        'bhel': 'BHEL',
        'mazagon': 'MAZDOCK',
        'mazagon dock': 'MAZDOCK',
        // Railways / infra
        'rvnl': 'RVNL',
        'irfc': 'IRFC',
        'ircon': 'IRCON',
        // IT mid-cap
        'hexaware': 'HEXAWARE',
        'kpit': 'KPITTECH',
        'kpit tech': 'KPITTECH',
        // Telecom
        'vi': 'IDEA',
        'vodafone': 'IDEA',
        'vodafone idea': 'IDEA',
        'idea': 'IDEA',
        'vodafoneidea': 'IDEA',   // catches chip text like "VODAFONEIDEA long term..."
        'airtel': 'BHARTIARTL',
        'bharti airtel': 'BHARTIARTL',
        'bsnl': 'BSNL',
        // Other commonly missed
        'zeel': 'ZEEL',
        'zee': 'ZEEL',
        'zee entertainment': 'ZEEL',
        'pnb': 'PNB',
        'punjab national': 'PNB',
        'canara': 'CANBK',
        'canara bank': 'CANBK',
        'bob': 'BANKBARODA',
        'bank of baroda': 'BANKBARODA',
        'union bank': 'UNIONBANK',
        'iob': 'IOB',
        'indian overseas': 'IOB',
        'uco bank': 'UCOBANK',
        'uco': 'UCOBANK',
        'central bank': 'CENTRALBK',
        'motherson': 'MOTHERSON',
        'samvardhana motherson': 'MOTHERSON',
        'minda': 'MINDAIND',
        'bajaj auto': 'BAJAJ-AUTO',
        'tvs motor': 'TVSMOTOR',
        'tvs': 'TVSMOTOR',
        'hero': 'HEROMOTOCO',
        'abb': 'ABB',
        'siemens': 'SIEMENS',
        'cg power': 'CGPOWER',
        'cg': 'CGPOWER',
        'suzlon': 'SUZLON',
        'inox wind': 'INOXWIND',
        'renew power': 'RNP',
        'pfc': 'PFC',
        'rec': 'RECLTD',
        'ireda': 'IREDA',
        'nhpc': 'NHPC',
        'sjvn': 'SJVN',
        'torrent power': 'TORNTPOWER',
        'tata power': 'TATAPOWER',
        'adani power': 'ADANIPOWER',
        'jppower': 'JPPOWER',
        'coal india': 'COALINDIA',
        'nle': 'NLC',
        'nlc': 'NLC',
        'hindalco': 'HINDALCO',
        'nalco': 'NATIONALUM',
        'national aluminium': 'NATIONALUM',
        'vedl': 'VEDL',
        'hpcl': 'HINDPETRO',
        'hindustan petroleum': 'HINDPETRO',
        'mrpl': 'MRPL',
        'castrol': 'CASTROLIND',
        'gulf oil': 'GULFOILLUB',
        'godrej properties': 'GODREJPROP',
        'oberoi realty': 'OBEROIRLTY',
        'dlf': 'DLF',
        'prestige': 'PRESTIGE',
        'brigade': 'BRIGADE',
        'sobha': 'SOBHA',
        'lodha': 'LODHA',
        'macrotech': 'LODHA',
    };

    const queryLower = query.toLowerCase();
    // rewrittenQuery replaces alias text with the actual ticker so the backend
    // receives "tell about SAIL" instead of "tell about sail" — prevents fuzzy mismatch
    let rewrittenQuery = query;

    // 1. Check multi-word aliases first (most reliable), longest match wins
    const multiWordAliases = Object.entries(stockAliases)
        .filter(([a]) => a.includes(' '))
        .sort((a, b) => b[0].length - a[0].length); // longest first

    for (const [alias, symbol] of multiWordAliases) {
        if (queryLower.includes(alias)) {
            if (!confident.includes(symbol)) confident.push(symbol);
            rewrittenQuery = rewrittenQuery.replace(new RegExp(alias, 'gi'), symbol);
        }
    }

    // 2. Check each word in the (possibly already rewritten) query
    const words = rewrittenQuery.split(/\s+/);
    for (const word of words) {
        const cleaned = word.replace(/[.,!?;:()'"/]/g, '');
        if (!cleaned) continue;
        const cleanedLower = cleaned.toLowerCase();

        // Alias match (single-word) → confident + rewrite
        if (stockAliases[cleanedLower] && !confident.includes(stockAliases[cleanedLower])) {
            confident.push(stockAliases[cleanedLower]);
            rewrittenQuery = rewrittenQuery.replace(
                new RegExp(`\\b${cleaned}\\b`, 'gi'),
                stockAliases[cleanedLower]
            );
            continue;
        }

        // NSE/BSE explicit format (SYMBOL.NS or SYMBOL.BO) → confident
        if (/^[A-Za-z]{1,20}\.(NS|BO)$/i.test(cleaned)) {
            const sym = cleaned.toUpperCase();
            if (!confident.includes(sym)) confident.push(sym);
            continue;
        }

        // User typed ALL-CAPS word that looks like a ticker → confident
        if (/^[A-Z][A-Z0-9&-]{1,19}$/.test(cleaned) && !SYMBOL_HINT_STOPWORDS.has(cleaned.toUpperCase())) {
            if (!confident.includes(cleaned.toUpperCase())) confident.push(cleaned.toUpperCase());
            continue;
        }

        // Mixed/lowercase word → raw (may be part of a company name, don't send as symbol)
        if (/^[A-Za-z]{2,15}$/.test(cleaned) && !SYMBOL_HINT_STOPWORDS.has(cleaned.toUpperCase())) {
            raw.push(cleaned.toUpperCase());
        }
    }

    return {
        confident: [...new Set(confident)].slice(0, 5),
        raw: [...new Set(raw)],
        rewrittenQuery,
    };
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

const _MODE_LABEL = { snap: 'Quick', analyst: 'Analyst' };

// Shown after the user flips Quick <-> Analyst with a prior question — offers to
// re-run that question in the new mode, or dismiss and ask something new.
// Non-blocking popover that floats just above the input bar after a mode switch.
// Tap "Run my last question" to re-fire it in the new mode, or just type a new
// question in the input below (sending anything dismisses it).
const ModeSwitchPrompt = ({ query, mode, onRun, onClose }) => {
    const label = _MODE_LABEL[mode] || mode;
    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-4 sm:px-6 md:px-8 z-30 pointer-events-none">
            <div className="max-w-4xl mx-auto flex justify-center sm:justify-start">
                <div className="pointer-events-auto w-full max-w-sm rounded-2xl border bg-white border-zinc-200 dark:bg-[#1b1a18] dark:border-zinc-700 shadow-xl">
                    <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
                        <p className="text-[11.5px] font-semibold text-zinc-600 dark:text-zinc-300">
                            Switched to <span className="text-zinc-900 dark:text-white font-bold">{label}</span> — run your last question, or type a new one below.
                        </p>
                        <button onClick={onClose} aria-label="Dismiss"
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-[13px] leading-none flex-shrink-0 mt-0.5">✕</button>
                    </div>
                    <button onClick={onRun}
                        className="m-3 mt-2 w-[calc(100%-1.5rem)] flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-[#FDD405] hover:bg-amber-50/60 dark:hover:bg-white/[0.04] transition-colors group">
                        <span className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 group-hover:border-[#FDD405] flex-shrink-0" />
                        <span className="min-w-0">
                            <span className="block text-[12px] font-semibold text-zinc-900 dark:text-white">Run my last question</span>
                            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate">“{query}”</span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Stable unique ID generator — avoids Date.now() collisions
const genId = () =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** Strip exchange suffix to get bare NSE ticker */
const cleanSymbol = (s) =>
    s ? String(s).replace(/\.(NS|BO|BSE)$/i, '').replace(/^(NSE:|BSE:)/i, '').toUpperCase().trim() : null;

/**
 * Extract the authoritative stock symbol from a backend response.
 * Checks every known field the backend may populate, most reliable first.
 */
const extractSymbolFromResponse = (responseData, metadata, chartData, extractedSymbols) => {
    const candidates = [
        metadata?.at_a_glance?.symbol,
        metadata?.resolved_symbol,
        Array.isArray(metadata?.symbols) ? metadata.symbols[0] : metadata?.symbols,
        responseData?.resolved_symbol,
        responseData?.symbol,
        !Array.isArray(chartData) && chartData?.chart_metadata?.symbol,
        Array.isArray(chartData) && chartData[0]?.chart_metadata?.symbol,
        responseData?.signal?.symbol,
        responseData?.technical_summary?.symbol,
        responseData?.score_card?.symbol,
        // Only use client-extracted as last resort when unambiguous (single word)
        extractedSymbols?.length === 1 ? extractedSymbols[0] : null,
    ];
    for (const s of candidates) {
        const c = cleanSymbol(s);
        if (c && c.length >= 2 && c.length <= 20) return c;
    }
    return null;
};

/**
 * Derive the discussed stock from a STORED chat message (message shape, not
 * response shape). Lets a reopened chat restore its follow-up context.
 */
const deriveSymbolFromMessage = (m) => {
    if (!m || m.role === 'user') return null;
    const md = m.metadata || {};
    const cd = m.chartData;
    const candidates = [
        md._contextSymbol, // persisted authoritative value (set on message save)
        md.at_a_glance?.symbol,
        md.resolved_symbol,
        Array.isArray(md.symbols) ? md.symbols[0] : md.symbols,
        !Array.isArray(cd) ? cd?.chart_metadata?.symbol : cd?.[0]?.chart_metadata?.symbol,
        m.signal?.symbol,
        m.technicalSummary?.symbol,
        m.scoreCard?.symbol,
    ];
    for (const s of candidates) {
        const c = cleanSymbol(s);
        if (c && c.length >= 2 && c.length <= 20) return c;
    }
    return null;
};

const ChatContainer = ({ sidebarOpen, routeChatId }) => {
    const { chatId: routeChatIdParam } = useParams();
    const { accessToken, refreshSession } = useAuth();
    const { theme } = useTheme();
    const { setChatActive } = useChatMode();
    const { messages, setMessages, ensureCurrentChat, loadChat, currentChatId, currentChatIdRef, isChatLoading, chatLoadError, setChatLoadError } = useChatHistory();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [streamingMessageId, setStreamingMessageId] = useState(null); // Track which message is streaming
    const [dismissedDisambigId, setDismissedDisambigId] = useState(null); // AI message id whose clarification popup the user dismissed
    const [freshDisambigId, setFreshDisambigId] = useState(null); // AI message id of a disambiguation received THIS session (popup auto-shows only for these, never for reloaded history)
    const [showThinking, setShowThinking] = useState(false); // Show thinking paths
    const [thinkingSteps, setThinkingSteps] = useState([]); // Store thinking steps
    const [startTime, setStartTime] = useState(null); // Track request start time
    const [processingTime, setProcessingTime] = useState(0); // Track processing time
    const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll-to-bottom button
    const [responseMode, setResponseModeState] = useState(
        () => localStorage.getItem('kuberai_mode') || 'snap'
    );
    const [lastQuery, setLastQuery] = useState('');                  // last question fired (for the mode-switch prompt)
    const [modeSwitchPrompt, setModeSwitchPrompt] = useState(null);  // { query, mode } | null — shown after a mode flip
    const [scannerDrawer, setScannerDrawer] = useState(null);
    // Collapse state lives here (not in ScannerDrawer) so the chat's right-padding
    // tracks the drawer's actual width (300 expanded / 48 collapsed) and re-centers.
    const [scannerCollapsed, setScannerCollapsed] = useState(() => {
        try { return localStorage.getItem('scannerDrawerCollapsed') === '1'; } catch { return false; }
    });
    const toggleScannerCollapsed = () => setScannerCollapsed((c) => {
        const next = !c;
        try { localStorage.setItem('scannerDrawerCollapsed', next ? '1' : '0'); } catch { /* ignore */ }
        return next;
    });

    const setResponseMode = (mode) => {
        localStorage.setItem('kuberai_mode', mode);
        // Mode actually changed and there's a prior question → offer to re-run it.
        if (mode !== responseMode && lastQuery.trim()) {
            setModeSwitchPrompt({ query: lastQuery, mode });
        }
        setResponseModeState(mode);
    };

    const bottomRef = useRef(null);
    const chatContainerRef = useRef(null);
    const streamingTopRef = useRef(null); // marks top of the incoming AI message
    const abortControllerRef = useRef(null);
    const streamingTimeoutRef = useRef(null);
    const activeRequestIdRef = useRef(0);
    const isLoadingRef = useRef(false);
    const messagesRef = useRef(messages);
    const lastSendAtRef = useRef(0);
    const lastSendTextRef = useRef('');
    // Tracks the last stock discussed — used to resolve follow-up queries like "should i buy it?"
    const activeContextSymbolRef = useRef(null);

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Keep follow-up stock context in sync with the OPEN chat:
    // - switching to a new/other chat must not leak the previous chat's stock
    //   (stale ref used to send wrong `symbols` hints across chats)
    // - reopening a saved chat restores its last discussed stock
    useEffect(() => {
        let restored = null;
        for (let i = messages.length - 1; i >= 0; i--) {
            // Stop at a deliberate topic change ("best pharma stocks"). Walking
            // past it resurrects the stock discussed before the change, which is
            // exactly the leak K-056 set out to fix.
            if (messages[i]?._topicReset) break;
            restored = deriveSymbolFromMessage(messages[i]);
            if (restored) break;
        }
        activeContextSymbolRef.current = restored;
        if (import.meta.env.DEV) console.log('[Context] Active stock synced to:', restored);
    }, [currentChatId, messages]);

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

    // Keep the URL in sync with the active chat so a REFRESH restores it. A brand-new chat
    // started on the "/" route gets a currentChatId but the URL stays bare — so a refresh landed
    // on "/" and showed a fresh chat, "losing" the one the user was in. Sync it via
    // history.replaceState (NOT react-router navigate) so we don't remount ChatContainer or
    // reload the in-flight message. Only once there are messages (never a phantom empty chat).
    useEffect(() => {
        if (currentChatId && messages.length > 0) {
            const want = `/chat/${currentChatId}`;
            if (typeof window !== 'undefined' && window.location.pathname !== want) {
                window.history.replaceState(null, '', want);
            }
        }
    }, [currentChatId, messages.length]);

    // Reliable scroll helper — sets scrollTop directly on the container instead of
    // using scrollIntoView, which can scroll the wrong ancestor when nested inside
    // overflow:hidden parents.
    const scrollToBottomNow = useCallback((smooth = false) => {
        const el = chatContainerRef.current;
        if (!el) return;
        if (smooth) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } else {
            el.scrollTop = el.scrollHeight;
        }
    }, []);

    // When a new AI message starts streaming, scroll so its TOP is visible —
    // user reads top-to-bottom as content builds. No jumping to bottom.
    useEffect(() => {
        if (streamingMessageId && streamingTopRef.current) {
            streamingTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [streamingMessageId]);

    // When thinking starts (before response), scroll to bottom to show the spinner.
    useEffect(() => {
        if (showThinking) scrollToBottomNow(false);
    }, [showThinking, scrollToBottomNow]);

    // After streaming ends, scroll to bottom so the user sees the full response
    // including chips and the input bar.
    useEffect(() => {
        if (!streamingMessageId && !showThinking && messages.length > 0 && !isLoading) {
            scrollToBottomNow(true);
        }
    }, [streamingMessageId, showThinking, isLoading, scrollToBottomNow]);

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
        // Fire-and-forget for the user, but never swallow silently — log failures
        // so broken feedback delivery is observable instead of invisible.
        try {
            const res = await fetch(FEEDBACK_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: msgId, rating }),
            });
            if (!res.ok) {
                console.warn('Feedback submission failed:', res.status);
            }
        } catch (e) {
            console.warn('Feedback submission error:', e?.message || e);
        }
    }, []);

    const handleStartChat = (initialInput) => {
        // Do NOT setInput here — the text is added directly to messages,
        // and setting input then sending with manualInput bypasses the setInput('') clear.
        handleSend(initialInput);
    };

    // Scanner results open the slide-in drawer; fallback to chat for legacy plain-text results.
    const handleScannerResult = useCallback(async (data) => {
        if (data?.type === 'scanner_results') {
            setScannerDrawer(data);
        } else {
            const content = typeof data === 'string' ? data : (data?.formatted || '');
            await ensureCurrentChat();
            // role MUST be 'ai' — the whole app uses 'ai' for model turns and the
            // server mapping is `m.role === 'ai' ? 'assistant' : 'user'`. Using
            // 'assistant' here persisted scanner output as a USER message, so it
            // came back as a user bubble on reload and could become the chat title.
            setMessages(prev => [...prev, { id: genId(), role: 'ai', content, isScannerResult: true }]);
        }
    }, [ensureCurrentChat, setMessages]);

    const handleSend = async (manualInput = null) => {
        const textToSend = manualInput !== null ? manualInput : input;
        const normalized = textToSend.trim();
        const now = Date.now();

        if (!normalized) return;
        if (isLoadingRef.current || abortControllerRef.current) return;
        if ((now - lastSendAtRef.current) < 350 && lastSendTextRef.current === normalized) return;

        lastSendAtRef.current = now;
        lastSendTextRef.current = normalized;
        setLastQuery(normalized);   // remember for the mode-switch "re-run same question?" prompt
        setModeSwitchPrompt(null);  // any send dismisses the mode-switch popover
        const requestId = ++activeRequestIdRef.current;
        isLoadingRef.current = true;
        setShowScrollButton(false);

        // Clear the input bar immediately on send — before any async work — so the user
        // doesn't see their text sitting there during the network round-trip.
        // Follow-up chip clicks pass manualInput so we don't wipe whatever the user is typing.
        if (manualInput === null) setInput('');

        try {
            // The chat this send belongs to. Everything below is async, and the
            // user can switch chats mid-flight — `setMessages` writes to whichever
            // chat is open when it runs, not the one we started in. Without this
            // anchor, asking in chat A then clicking chat B appended A's answer to
            // B, persisted it there, and replayed it as B's context forever.
            const sendChatId = await ensureCurrentChat();
            const isSameChat = () => currentChatIdRef.current === sendChatId;
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

            // confident = alias-mapped or ALL-CAPS user-typed tickers (safe to send)
            // raw = lowercase words that may be parts of a company name (do NOT send)
            // rewrittenQuery = query with alias text replaced by ticker ("tell about sail" → "tell about SAIL")
            const { confident: confidentSymbols, rewrittenQuery } = extractStockSymbols(normalized);
            const chartResolution = extractChartResolution(normalized);
            const chartPeriod = extractChartPeriod(normalized);
            const queryIntent = extractQueryIntent(normalized);

            const activeStock = activeContextSymbolRef.current; // last backend-validated symbol

            // ── Follow-up detection ──────────────────────────────────────────────────────
            // A query is a follow-up ONLY when it explicitly references the previous stock
            // via pronouns ("it", "this stock") or relative sector phrases ("same sector").
            // New-topic queries like "which steel stock should i buy" or "should i buy oswal
            // pumps" must NOT inherit the previous active stock — that causes context pollution
            // where NIFTY50 bleeds into completely unrelated answers.

            const wordCount = normalized.trim().split(/\s+/).length;

            // Explicit pronoun references to the previous stock
            const hasPronounRef =
                // Named stock references
                /\b(its|this stock|that stock|the stock|this company|the company|that company|same stock)\b/i.test(normalized)
                // "should I buy/sell/hold it"
                || /\bshould i (buy|sell|hold) it\b/i.test(normalized)
                // "what about it", "tell me about it", "analyze it" etc.
                || /\b(what about it|tell me (more )?about it|analyze it|performance of it)\b/i.test(normalized)
                // Short queries (≤6 words) containing a bare "it" pronoun — catches
                // "is it good", "will it go up", "can I buy it", "is it safe".
                // Case-sensitive (it|It) NOT /i: all-caps "IT" is the sector, so
                // "top IT companies"/"IT sector outlook" must NOT read as the pronoun.
                || (/\b(it|It)\b/.test(normalized) && wordCount <= 6);

            // Relative sector / entity references that need the active stock for context
            const hasSameRef = /\b(same sector|same segment|in the same|its sector|that sector|in this sector|same (peers?|companies|stocks?))\b/i.test(normalized);

            // Screener / discovery queries are always new topics — never inherit active stock.
            // Robust: a plural stocks/companies ask paired with a discovery verb/adjective,
            // OR "which … stock/company", OR a "best/top … sector" ask. Catches
            // "which high dividend stocks", "best pharma stocks", "top IT companies".
            const isScreenerQuery =
                (/\b(stocks|shares|companies|scrips|etfs)\b/i.test(normalized)
                    && /\b(which|what|list|show|find|give|suggest|recommend|best|top|cheap|undervalued|dividend|multibagger|penny|good|under|below|high[-\s]?growth)\b/i.test(normalized))
                || /\bwhich\s+[\w\s]{0,30}\b(stock|company|share|etf)\b/i.test(normalized)
                || /\b(best|top|which)\s+sectors?\b/i.test(normalized);

            // Market / index queries are also new topics (unless a pronoun ties them to the
            // active stock) — "how is the market", "nifty today" must not inherit a prior stock.
            const isMarketOrIndexQuery = /\b(nifty|sensex|bank\s?nifty|fin\s?nifty|indices|market mood|how is the market|market today|sector performance)\b/i.test(normalized);

            // A pronoun / relative-sector reference always ties the query to the active stock,
            // and WINS over screener/market detection (e.g. "what about its stock price").
            const refersToPrev = hasPronounRef || hasSameRef;

            // True follow-up: explicitly references the previous stock, OR is a very short
            // (≤3 word) bare question that isn't a screener/market ask ("buy or sell", "is it good").
            const isFollowUp = confidentSymbols.length === 0 && !!activeStock
                && (refersToPrev || (wordCount <= 3 && !isScreenerQuery && !isMarketOrIndexQuery));

            // K-056: a clear topic change (screener / market / index with no pronoun tie)
            // must DROP the stale active stock, so it can't leak into this or later queries.
            //
            // Nulling the ref alone is not enough: the sync effect re-derives the ref
            // from message history on every `messages` change, walking backwards past
            // the symbol-less screener answer until it finds the OLD stock and restores
            // it — so the drop survived only until the next render. Mark the boundary on
            // the message itself so the effect stops walking there.
            if (confidentSymbols.length === 0 && (isScreenerQuery || isMarketOrIndexQuery) && !refersToPrev) {
                activeContextSymbolRef.current = null;
                if (isSameChat()) {
                    setMessages(prev => prev.map(m => (m.id === userMsgId ? { ...m, _topicReset: true } : m)));
                }
            }

            // context_stock is a follow-up hint for the backend. Send it for genuine or
            // ambiguous follow-ups, but NEVER when the user named a new stock or asked a
            // screener/market/index question — otherwise an unrelated query is answered as
            // a follow-up on the old stock (the core K-056 leak).
            const isNewTopic = confidentSymbols.length > 0
                || ((isScreenerQuery || isMarketOrIndexQuery) && !refersToPrev);
            const sendContextStock = !!activeStock && !isNewTopic;

            // Only send the previous stock as a hint for genuine follow-ups.
            // For new-topic queries (screeners, explicit company names, sector switches)
            // send nothing — let the backend resolve the symbol from the query text.
            const symbolsToSend = confidentSymbols.length > 0
                ? confidentSymbols
                : (isFollowUp ? [activeStock] : []);

            // effectiveQuery is the string actually sent to the backend.
            // For direct queries: use rewrittenQuery (alias text → ticker, e.g. "tell about SAIL")
            // For follow-ups: replace pronouns with the active stock ticker
            //   "should i buy it"   → "should i buy TATAELXSI"
            //   "what is the target" → "what is the target for TATAELXSI"
            //   "tell me more"      → "tell me more for TATAELXSI"  (≤4 words, appended)
            //   "in the same sector…" → sent as-is (symbolsToSend provides context)
            let effectiveQuery = rewrittenQuery;
            // Bare one-token stock query ("dtl" → "DTL"): send "analyze DTL" instead.
            // The backend demotes a keyword-less STOCK_QUERY to UNKNOWN when it can't
            // resolve the symbol in its name master (SME/Emerge listings like DTL),
            // replying with a generic help message — or worse, a fuzzy fake-group
            // popup. "analyze X" passes its financial-keyword gate so the symbol
            // hint is honored and real stock data comes back.
            const bareToken = rewrittenQuery.trim().replace(/[.,!?;:()'"]/g, '');
            if (confidentSymbols.length === 1 && bareToken.toUpperCase() === confidentSymbols[0]) {
                effectiveQuery = `analyze ${confidentSymbols[0]}`;
            }
            if (isFollowUp) {
                const withPronouns = normalized.replace(
                    /\b(it|this|that|them|those|the stock|that stock|the company|this stock)\b/gi,
                    activeStock
                );
                if (withPronouns !== normalized) {
                    // Pronouns were substituted — use the rewritten string
                    effectiveQuery = withPronouns;
                } else if (wordCount <= 4) {
                    // Very short contextual question — append active stock so backend has context
                    effectiveQuery = `${normalized} for ${activeStock}`;
                }
                // Longer relative-ref queries ("in the same sector…") go as-is;
                // the symbolsToSend already gives the backend the context it needs.
            }

            const dynamicSteps = generateThinkingSteps(normalized, symbolsToSend);

            // Last 8 turns for conversation continuity, with each message CAPPED in length.
            // Analyst answers run ~2,500 words each; sending them in full made chat_history
            // balloon to 100 KB+ after a few turns and overflow the backend's LLM context —
            // which surfaced as an intermittent "Something went wrong" that worsened the longer
            // the chat ran. Capping each message keeps enough context for continuity without
            // the bloat. Assistant answers are trimmed harder (the opening verdict is the gist).
            const _cap = (text, n) => {
                const t = typeof text === 'string' ? text : '';
                return t.length > n ? t.slice(0, n).trimEnd() + ' …' : t;
            };
            const conversationHistory = messagesRef.current
                // Error bubbles ("⚠️ Something went wrong", "⏱️ Request timed out")
                // are client-authored — the assistant never said them. Replaying
                // them as assistant turns taught the model it had just failed, and
                // every retry burned another of the 8 history slots.
                .filter((m) => !m.isError && !m.isClientNotice)
                .slice(-8)
                .map((m) => {
                    const isUser = m.role === 'user';
                    const entry = {
                        role: isUser ? 'user' : 'assistant',
                        content: isUser ? _cap(m.content, 600) : _cap(m.content, 1200),
                    };
                    // Hand the backend the symbols it itself resolved for this turn.
                    // Without them it has to re-derive the subject by scraping prose,
                    // which is how "EBITDA margin…" became the active stock.
                    if (!isUser) {
                        const sym = deriveSymbolFromMessage(m);
                        if (sym) entry.symbols = [sym];
                    }
                    return entry;
                })
                .filter((m) => m.content.trim());

            const hasStockContext = symbolsToSend.length > 0;

            // Build payload — stock-specific fields (timeframe, risk_level, symbols) are
            // omitted for general market queries to avoid confusing the backend's LLM chain.
            const payload = {
                query: effectiveQuery,
                response_mode: responseMode,
                query_intent: queryIntent,
                ...(hasStockContext && {
                    timeframe: 'medium_term',
                    risk_level: 'medium',
                    symbols: symbolsToSend,
                }),
                ...(sendContextStock && { context_stock: activeStock }),
                ...(chartResolution && { chart_resolution: chartResolution }),
                ...(chartPeriod && { chart_period: chartPeriod }),
                ...(conversationHistory.length > 0 && { chat_history: conversationHistory }),
            };

            // Dev only — this payload carries the user's full chat history.
            if (import.meta.env.DEV) {
                console.log('[KuberAI] Request payload:', JSON.stringify(payload, null, 2));
            }

            const headers = { 'Content-Type': 'application/json' };
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }
            const doFetch = async () => {
                const controller = new AbortController();
                abortControllerRef.current = controller;
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
                try {
                    return await fetch(API_ENDPOINT, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload),
                        signal: controller.signal,
                    });
                } finally {
                    clearTimeout(timeoutId);
                }
            };

            // Resilient fetch: backend deploy restarts (~30s) and gateway blips
            // surface as dropped connections or 502/503/504. Retry ONCE after a
            // short pause instead of instantly failing the user's query. A
            // user-initiated Stop bumps activeRequestIdRef, so it never retries.
            let response;
            try {
                response = await doFetch();
            } catch (e) {
                if (requestId !== activeRequestIdRef.current) return;
                if (e.name === 'AbortError') {
                    throw new Error('The request timed out — the server may be busy. Please retry.');
                }
                await new Promise(r => setTimeout(r, 2500));
                if (requestId !== activeRequestIdRef.current) return;
                response = await doFetch();
            }
            if ([502, 503, 504].includes(response.status)) {
                await new Promise(r => setTimeout(r, 2500));
                if (requestId !== activeRequestIdRef.current) return;
                response = await doFetch();
            }

            // On 401, the access token has likely expired. Force a single refresh
            // and retry once before surfacing "session expired" to the user.
            if (response.status === 401 && accessToken && typeof refreshSession === 'function') {
                const freshToken = await refreshSession();
                if (requestId !== activeRequestIdRef.current) return;
                if (freshToken) {
                    headers.Authorization = `Bearer ${freshToken}`;
                    response = await doFetch();
                }
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

            // The user switched chats while this was in flight. Committing now
            // would append this answer to a different conversation.
            if (!isSameChat()) {
                if (import.meta.env.DEV) console.warn('[Context] Dropping response — chat switched mid-request');
                setShowThinking(false);
                setThinkingSteps([]);
                isLoadingRef.current = false;
                setIsLoading(false);
                return;
            }

            if (import.meta.env.DEV) {
                console.log('[KuberAI] Response content:', responseData?.content || responseData?.answer);
                console.log('[KuberAI] Intent / confidence:', responseData?.intent, '/', responseData?.confidence);
            }

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
            
            const rawResponseText = responseData.content || responseData.answer || '';
            // Detect backend-side error responses and substitute a helpful message.
            // The substituted text is OURS, not the model's — it is flagged as a
            // client notice so it is never replayed to the backend as an assistant
            // turn, and so the user gets a Retry affordance.
            const isBackendError = /^something went wrong|^an error occurred|^i('m| am) unable|^sorry,? (i|we) (could|can't|cannot)/i.test(rawResponseText.trim());
            const aiResponseText = isBackendError
                ? "I wasn't able to process this query. If you're looking for a market scan or sector screener, try the **Scanners** tab, or ask about a specific stock like *\"Tell me about SAIL\"*."
                : (rawResponseText || "No response content received.");

            // Validate chart data structure before passing to MessageBubble
            const rawChartData = responseData.chart_data || null;
            const chartData = (() => {
                if (!rawChartData || typeof rawChartData !== 'object') return null;
                // Accept both old format (ohlcv/candles/data key) and new array-of-arrays format (dates/close arrays)
                const hasOhlcv = (d) => d && (d.ohlcv || d.candles || d.data || (Array.isArray(d.dates) && d.dates.length > 0) || (Array.isArray(d.close) && d.close.length > 0));
                if (Array.isArray(rawChartData)) return rawChartData.every(hasOhlcv) ? rawChartData : null;
                return hasOhlcv(rawChartData) ? rawChartData : null;
            })();
            const metadata = responseData.metadata || { symbols: confidentSymbols };

            // Update active stock context from the backend's authoritative response.
            // Uses every possible field the backend might put the symbol in.
            const resolvedSym = extractSymbolFromResponse(responseData, metadata, chartData, confidentSymbols);
            if (resolvedSym) {
                activeContextSymbolRef.current = resolvedSym;
                // Persist on the message so reopening this chat restores the context
                // (deriveSymbolFromMessage reads _contextSymbol first).
                metadata._contextSymbol = resolvedSym;
                if (import.meta.env.DEV) console.log('[Context] Active stock set to:', resolvedSym);
            }

            const signal = responseData.signal || null;
            const patternSummary = responseData.pattern_summary || null;
            const technicalSummary = responseData.technical_summary || null;
            const indicatorsTable = responseData.indicators_table || null;
            const scoreCard = responseData.score_card || null;
            const managementSentiment = responseData.management_sentiment || null;
            const annualReportIntelligence = responseData.annual_report_intelligence || null;
            const companyFilings = responseData.company_filings || null;
            const recentDevelopments = responseData.recent_developments || null;
            const aiTake = responseData.ai_take || null;
            const suggestedFollowUps = Array.isArray(responseData.suggested_follow_ups) ? responseData.suggested_follow_ups : null;
            const newsHeadlines = responseData.news_headlines || null;

            // Create AI message with streaming
            const aiMessageId = genId();
            setStreamingMessageId(aiMessageId); // Mark this message as streaming
            
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: aiResponseText,
                // Client-authored substitute text — excluded from chat_history and
                // offered a Retry button, like the other error paths.
                ...(isBackendError && { isClientNotice: true, failedQuery: normalized }),
                chartData,
                metadata,
                signal,
                patternSummary,
                technicalSummary,
                indicatorsTable,
                scoreCard,
                managementSentiment,
                annualReportIntelligence,
                companyFilings,
                recentDevelopments,
                aiTake,
                suggestedFollowUps,
                newsHeadlines,
                queryIntent,
                thinkingSteps: (responseData.retrieval_steps && responseData.retrieval_steps.length > 0) ? responseData.retrieval_steps : dynamicSteps,
                sourceDocuments: responseData.source_documents || [],
                processingTime: timeTaken,
                responseMode,
            }]);

            // Auto-show the group-clarification picker only for THIS freshly-received
            // disambiguation. On a page reload the last message may still be a
            // disambiguation, but freshDisambigId resets to null on mount, so the popup
            // never flashes over the loading screen — the restored bubble just shows the
            // trimmed question instead.
            if (metadata?.disambiguation?.suggestions?.length) {
                setFreshDisambigId(aiMessageId);
            }

            // MessageBubble calls onStreamingDone when its animation finishes.
            // Safety fallback clears streaming state if the callback never fires (45s max).
            clearStreamingTimeout();
            streamingTimeoutRef.current = setTimeout(() => {
                setStreamingMessageId(null);
            }, 45000);

        } catch (err) {
            if (requestId !== activeRequestIdRef.current) return;
            // A chat switch or route unmount aborts the request. Without this
            // guard the AbortError below appended a bogus "timed out" bubble to
            // whichever chat the user had just opened.
            if (!isSameChat()) {
                setShowThinking(false);
                setThinkingSteps([]);
                isLoadingRef.current = false;
                setIsLoading(false);
                return;
            }
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
                    isError: true,
                    failedQuery: normalized,
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
                const safe = /session expired|too many requests|not found|server encountered|request failed|timed out/i.test(err.message);
                if (safe) userErrorMsg = err.message;
                else if (/network|fetch|failed to fetch|load failed|networkerror/i.test(err.message)) {
                    userErrorMsg = "Network error — check your connection and try again.";
                }
            }
            const errorMessageId = genId();
            setMessages(prev => [...prev, {
                id: errorMessageId,
                role: 'ai',
                content: `⚠️ ${userErrorMsg}`,
                isError: true,
                failedQuery: normalized,
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
        return (
            <>
                <div
                    className="h-full"
                    style={{
                        paddingRight: scannerDrawer ? (scannerCollapsed ? '48px' : '300px') : '0',
                        transition: 'padding-right 0.28s cubic-bezier(0.22,1,0.36,1)',
                    }}
                >
                    <StartScreen onStartChat={handleStartChat} onScannerResult={handleScannerResult} responseMode={responseMode} setResponseMode={setResponseMode} />
                </div>
                {scannerDrawer && (
                    <ScannerDrawer
                        data={scannerDrawer}
                        collapsed={scannerCollapsed}
                        onToggleCollapsed={toggleScannerCollapsed}
                        onAnalyze={(sym) => handleSend(`Analyze ${sym}`)}
                        onClose={() => setScannerDrawer(null)}
                    />
                )}
            </>
        );
    }

    // Which AI message should show the interactive clarification picker right now:
    // the latest AI reply that is a disambiguation, was received THIS session
    // (freshDisambigId — never a reloaded one), and hasn't been dismissed. The
    // redundant numbered list in the bubble text is trimmed by MessageBubble in all
    // cases, independent of this.
    const activeClarificationId = (() => {
        if (isLoading) return null;
        const lastAI = [...messages].reverse().find(m => m.role === 'ai');
        if (!lastAI || lastAI.id !== freshDisambigId) return null;
        const d = lastAI?.metadata?.disambiguation;
        if (!d || !d.ambiguous || !Array.isArray(d.suggestions) || d.suggestions.length === 0) return null;
        if (dismissedDisambigId === lastAI.id) return null;
        return lastAI.id;
    })();

    return (
        <>
        {scannerDrawer && (
            <ScannerDrawer
                data={scannerDrawer}
                collapsed={scannerCollapsed}
                onToggleCollapsed={toggleScannerCollapsed}
                onAnalyze={(sym) => handleSend(`Analyze ${sym}`)}
                onClose={() => setScannerDrawer(null)}
            />
        )}
        <div
            className="flex flex-col h-full relative"
            style={{
                paddingRight: scannerDrawer ? (scannerCollapsed ? '48px' : '300px') : '0',
                transition: 'padding-right 0.28s cubic-bezier(0.22,1,0.36,1)',
            }}
        >
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
                    {messages.filter(msg => msg && msg.role).map((msg) => (
                        <React.Fragment key={msg.id}>
                            {/* Anchor scrolled-to when this message starts streaming */}
                            {msg.role === 'ai' && msg.id === streamingMessageId && (
                                <div ref={streamingTopRef} />
                            )}
                            {msg.role === 'ai' && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pb-2">
                                    <ThinkingPaths
                                        steps={msg.thinkingSteps}
                                        isThinking={false}
                                        processingTime={msg.processingTime || 0}
                                    />
                                </div>
                            )}

                            {msg.role === 'ai' && (
                                <SourcesPanel sourceDocuments={msg.sourceDocuments || []} />
                            )}

                            <MessageBubble
                                role={msg.role}
                                content={typeof msg.content === 'string' ? msg.content : String(msg.content ?? '')}
                                isScannerResult={msg.isScannerResult || false}
                                isStreaming={msg.id === streamingMessageId}
                                isLoading={isLoading}
                                chartData={msg.chartData}
                                metadata={msg.metadata}
                                signal={msg.signal}
                                patternSummary={msg.patternSummary}
                                technicalSummary={msg.technicalSummary}
                                indicatorsTable={msg.indicatorsTable}
                                scoreCard={msg.scoreCard}
                                managementSentiment={msg.managementSentiment}
                                annualReportIntelligence={msg.annualReportIntelligence}
                                companyFilings={msg.companyFilings}
                                recentDevelopments={msg.recentDevelopments}
                                aiTake={msg.aiTake}
                                suggestedFollowUps={msg.suggestedFollowUps}
                                newsHeadlines={msg.newsHeadlines}
                                queryIntent={msg.queryIntent || 'full'}
                                onFollowUpClick={(text) => handleSend(text)}
                                onStreamingDone={msg.id === streamingMessageId ? handleStreamingDone : undefined}
                                messageId={msg.role === 'ai' ? msg.id : null}
                                onFeedback={msg.role === 'ai' ? handleFeedback : null}
                                responseMode={msg.role === 'ai' ? (msg.responseMode || null) : null}
                            />

                            {/* Retry — re-send the failed query so the user never loses it */}
                            {msg.role === 'ai' && (msg.isError || msg.isClientNotice) && msg.failedQuery && (
                                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 -mt-1 mb-2">
                                    <button
                                        onClick={() => handleSend(msg.failedQuery)}
                                        disabled={isLoading}
                                        aria-label="Retry the failed request"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                                                   bg-[#FDD405] text-black hover:brightness-95
                                                   disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <span className="text-base leading-none">↻</span> Retry
                                    </button>
                                </div>
                            )}
                        </React.Fragment>
                    ))}

                    {showThinking && (
                        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pb-2">
                            <ThinkingPaths isThinking={true} />
                        </div>
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
                {/* ── Input bar — with the mode-switch popover / disambiguation picker anchored just above it ── */}
                <div className="relative">
                    {modeSwitchPrompt && (
                        <ModeSwitchPrompt
                            query={modeSwitchPrompt.query}
                            mode={modeSwitchPrompt.mode}
                            onRun={() => { const q = modeSwitchPrompt.query; setModeSwitchPrompt(null); handleSend(q); }}
                            onClose={() => setModeSwitchPrompt(null)}
                        />
                    )}
                    {/* Group disambiguation picker — anchored to the top of the composer so it
                        reads as rising out of the input box (matches its max-w-3xl width). */}
                    {(() => {
                        if (!activeClarificationId) return null;
                        const lastAI = messages.find(m => m.id === activeClarificationId);
                        const d = lastAI?.metadata?.disambiguation;
                        if (!d) return null;
                        return (
                            <div className="absolute bottom-full inset-x-0 z-40 px-4 mb-2 pointer-events-none">
                                <div className="w-full max-w-3xl mx-auto pointer-events-auto">
                                    <GroupClarificationPopup
                                        groupName={d.group_name}
                                        candidates={d.suggestions}
                                        disabled={isLoading}
                                        onSelect={(ticker) => { setDismissedDisambigId(lastAI.id); handleSend(ticker); }}
                                        onDismiss={() => setDismissedDisambigId(lastAI.id)}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                <InputBar
                    input={input}
                    setInput={setInput}
                    handleSend={() => handleSend()}
                    onStopRequest={handleStopRequest}
                    isLoading={isLoading}
                    responseMode={responseMode}
                    setResponseMode={setResponseMode}
                    onScannerResult={handleScannerResult}

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
        </div>
        </>
    );
};

export default ChatContainer;
