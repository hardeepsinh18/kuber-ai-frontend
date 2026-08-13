/**
 * Extract chart resolution from user query for Fyers API
 * Returns: 'intraday' | 'daily' | 'weekly' | 'monthly' | null (null = no chart)
 * FYERS: 1min/5min/15min/30min/60min → intraday, D → daily, W → weekly, M → monthly
 *
 * Key distinction: "1 month chart" = daily candles for 1 month (NOT monthly candles).
 * Only "monthly chart/data/performance" explicitly requests monthly (M) candles.
 */
export const extractChartResolution = (query) => {
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
export const extractChartPeriod = (query) => {
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
export const extractQueryIntent = (query) => {
    const q = query.toLowerCase();

    // Horizon-qualified queries (the Short/Long Term chip text, or any "long term"/
    // "short term" framed question) are always meant for the full analysis — never
    // the narrow single-aspect view, even when they happen to mention "fundamentals"
    // (e.g. the Long Term chip's own "...— fundamentals, growth outlook" text, which
    // was otherwise classified as the single-aspect 'fundamentals' intent and hid the
    // chart/technical/sentiment/verdict sections). Mirrors the backend's
    // _detect_horizon check in response_pipeline.py so client and server agree.
    if (/\b(long[\s-]term|short[\s-]term)\b/i.test(q)) return 'full';

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
    // Typo-tolerant on the modal only. "shoukd i buy tata" is the same question as
    // "should i buy tata", and requiring the exact spelling dropped it to the
    // generic path — no verdict, no short/long-term follow-up. The MODAL is matched
    // loosely (any s-h/s-o word of 3-6 letters, covering should/shoud/shold/shuld/
    // sould/shd, plus can/shall/could/must), while the VERB list stays strict:
    // buy/sell/invest are short and unambiguous, and loosening those would swallow
    // unrelated queries.
    const MODAL = '(?:s[hou][a-z]{1,4}|can|could|shall|must|shud)';
    const VERB = '(?:buy|sell|invest|bye|by)';
    if (new RegExp(`\\b${MODAL}\\s+(?:i|we|you)\\s+${VERB}\\b`, 'i').test(q)
        || /worth (buying|investing|it)|good (buy|investment)|buy or sell|\bgood stock\b/i.test(q)) {
        return 'verdict';
    }

    // Single fundamental metric queries — only show price header + text answer
    if (/\bp\s*[/-]\s*e\b|\bpe\b|pe ratio|price.{0,6}earn|price to earn/i.test(q)) return 'pe_ratio';
    // Separators vary: "debt / equity", "debt to equity", "debt-equity", "d/e", "d / e".
    if (/\b(roe|return on equity|roce|return on capital|eps|earnings per share|debt[\s/.-]*(?:to[\s/.-]+)?equity|\bd\s*\/\s*e\b|leverage|margins?|net margin|profit margin|operating margin|profitability|revenue growth|profit growth|dividend yield|dividend|book value|pb ratio|price.book|peg ratio|ebitda|fcf|free cash flow|cash flow|market cap|mcap)\b/i.test(q)) return 'pe_ratio';

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
    // Financial metric WORDS — "DEBT / EQUITY of TCS" must not send DEBT+EQUITY as
    // symbol hints ("3 stocks: DEBT, EQUITY, TCS"). None of these are NSE tickers.
    'DEBT', 'EQUITY', 'REVENUE', 'SALES', 'PROFIT', 'EARNINGS', 'NET', 'GROSS',
    'OPERATING', 'PROFITABILITY', 'CASH', 'FLOW', 'FREE', 'VALUE', 'CAP', 'MCAP',
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
// Exported for tests: the alias table is the single point where a typed company
// name becomes a confident ticker hint, and a wrong hint here overrides the
// backend entirely (see ChatContainer.aliases.test.js). The rule below is a
// hot-reload ergonomics warning, not a correctness one — a pure helper next to
// the component that uses it is worth more than a marginally faster HMR tick.
export const extractStockSymbols = (query) => {
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
        // ICICI/Bajaj/Godrej group companies. Without these the bare-prefix
        // aliases below ('icici', 'bajaj', 'godrej') swallowed the whole group:
        // "icici lombard" resolved to ICICIBANK and the card rendered the BANK's
        // price, chart and verdict under an insurance question.
        // Tickers verified against the live symbol-search master list.
        'icici lombard': 'ICICIGI',
        'icici general': 'ICICIGI',
        'icici general insurance': 'ICICIGI',
        'icici prudential': 'ICICIPRULI',
        'icici pru': 'ICICIPRULI',
        'icici prudential life': 'ICICIPRULI',
        'bajaj holdings': 'BAJAJHLDNG',
        'godrej consumer': 'GODREJCP',
        'godrej industries': 'GODREJIND',
        'godrej agrovet': 'GODREJAGRO',
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

    // House names shared by multiple listed companies. A bare head resolves to the
    // flagship ("icici" → ICICIBANK), but the head followed by another company word
    // must NOT, or the whole group collapses onto the flagship.
    const GROUP_HEADS = new Set(['icici', 'bajaj', 'godrej', 'tata', 'aditya', 'kotak', 'hdfc']);
    // Words that may legitimately follow a head while still meaning the flagship —
    // "icici bank share price", "hdfc bank today". These keep the normal behaviour.
    const GROUP_HEAD_OK_NEXT = new Set([
        'share', 'shares', 'stock', 'stocks', 'price', 'today', 'now', 'chart',
        'analysis', 'fundamentals', 'technicals', 'target', 'view', 'outlook',
        'buy', 'sell', 'hold', 'vs', 'and', 'or', 'is', 'has', 'was',
    ]);

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
            // Only rewrite when the alias is NOT the head of a longer company name the
            // user actually typed. Replacing "tata consultancy" inside the full legal
            // name "tata consultancy services limited" produced the Frankenstein query
            // "TCS Services Limited", which the backend then fuzzy-matched to an unrelated
            // "… Services Limited" company (IMEC Services). The confident hint above
            // already carries the ticker, so the query rewrite is only a cosmetic aid —
            // skip it whenever another word immediately follows the alias.
            const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            rewrittenQuery = rewrittenQuery.replace(
                new RegExp(`${escaped}\\b(?!\\s+[a-z0-9&])`, 'gi'),
                symbol
            );
        }
    }

    // 2. Check each word in the (possibly already rewritten) query
    const words = rewrittenQuery.split(/\s+/);
    for (const word of words) {
        const cleaned = word.replace(/[.,!?;:()'"/]/g, '');
        if (!cleaned) continue;
        const cleanedLower = cleaned.toLowerCase();

        // Alias match (single-word) → confident + rewrite.
        //
        // GROUP_HEADS are house names shared by several listed companies. Bare
        // "icici" means ICICIBANK, but "icici lombard" is a DIFFERENT company —
        // and the word pass used to force-resolve the head anyway, so the answer
        // card showed ICICIBANK's price and verdict for an insurance question.
        // The multi-word pass above already caught the combinations we know
        // (icici lombard, godrej consumer, …). Reaching here with a following
        // word means it is a group company we have no mapping for, so we send NO
        // hint and let the backend resolve it against the full NSE master list —
        // silence is recoverable, a confidently wrong ticker is not.
        const isGroupHead = GROUP_HEADS.has(cleanedLower);
        const nextWord = (words[words.indexOf(word) + 1] || '')
            .replace(/[.,!?;:()'"/]/g, '').toLowerCase();
        const headSwallowsNext = isGroupHead
            && nextWord
            && !GROUP_HEAD_OK_NEXT.has(nextWord);

        if (stockAliases[cleanedLower] && !headSwallowsNext
            && !confident.includes(stockAliases[cleanedLower])) {
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
