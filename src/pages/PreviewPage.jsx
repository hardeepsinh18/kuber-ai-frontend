import MessageBubble from '../components/Chat/MessageBubble';

const MOCK_METADATA = {
    symbols: ['TCS'],
    at_a_glance: {
        symbol: 'TCS',
        company_name: 'Tata Consultancy Services Ltd',
        price: 2328.30,
        change_percent: 0.11,
        pe_ratio: 27.4,
        high: 2342,
        low: 2318,
        volume: 1630000,
        '52w_high': 3580,
        '52w_low': 2246,
        market_cap: 8450000000000,
    },
    data_sources: 'FYERS (live price); fundamentals when available',
    fundamentals_as_of: 'Jun 2026',
    data_fetched_at: new Date().toISOString(),
    metrics_available: '1/1 symbols with fundamentals',
};

const MOCK_CHART = {
    dates: ['2025-05-27','2025-06-27','2025-07-27','2025-08-27','2025-09-27','2025-10-27','2025-11-27'],
    open:  [2280, 2290, 2300, 2310, 2295, 2305, 2318],
    high:  [2310, 2320, 2330, 2340, 2330, 2340, 2342],
    low:   [2260, 2270, 2280, 2290, 2280, 2295, 2318],
    close: [2290, 2300, 2320, 2310, 2310, 2325, 2328],
    volume:[1200000,1100000,1300000,980000,1050000,1400000,1630000],
    timeframe: 'daily',
    resolution: 'D',
    chart_metadata: { symbol: 'TCS', description: 'daily chart', data_points: 7, start_date: '2025-05-27', end_date: '2025-11-27' },
};

const MOCK_SIGNAL = {
    recommendation: 'HOLD',
    confidence_pct: 62,
    risk: 'medium',
    ideal_entry: 2310,
    target: 2520,
    stop_loss: 2180,
    upside_pct: 9.1,
    downside_pct: 5.6,
    risk_reward: 1.6,
    why: [
        'Bullish structure intact with price holding above key EMAs.',
        'RSI at 40 — neutral momentum, no clear trend.',
        'Low volume — caution on breakout validity.',
        'Fundamental strength: ROE 46%, DY 3.4%.',
    ],
};

const MOCK_TECHNICAL_SUMMARY = { rsi: 40.3, macd_line: -28.5, bb_pct_b: 0.42, volatility_30d_pct: 18.2 };
const MOCK_PATTERN = { support: 2246, resistance: 2378, candlestick: ['Doji', 'Inside Bar'], summary: 'Consolidation range — watch for breakout.' };

const MOCK_INDICATORS = [
    { indicator: 'RSI', value: '40.3', signal: 'Neutral', bullish: null },
    { indicator: 'MACD', value: '-28.522', signal: 'Bullish momentum', bullish: true },
    { indicator: 'EMA 20', value: '2,298', signal: 'Price above EMA', bullish: true },
    { indicator: 'Bollinger %B', value: '42%', signal: 'Mid-range', bullish: null },
    { indicator: 'Volume Ratio', value: '0.8x', signal: 'Below average', bullish: false },
];

const MOCK_SCORE_CARD = {
    technical: {
        score: 47,
        label: 'Neutral',
        commentary: [
            'No breakout present. Price remains within established range.',
            'RSI 40 (neutral momentum) — watch for directional move.',
        ],
    },
    fundamental: {
        score: 82,
        label: 'Healthy',
        summary: 'Healthy company. Cheap vs sector, growth a bit slow.',
        ratings_summary: { strong: 5, watch: 2, risk: 0 },
        ratios: {
            pe_ratio:       [16.8, 28, 'CHEAP'],
            roe:            [65,   15, 'ELITE'],
            roce:           [77,   15, 'RISING · ELITE'],
            net_margin:     [22.2, 15, 'ABOVE AVG'],
            debt_equity:    [0.00, 1.0, 'ZERO DEBT'],
            revenue_growth: [8.3,  10, 'MODERATE'],
            profit_growth:  [6.5,  10, 'MODERATE'],
            dividend_yield: [2.83,  2, 'ATTRACTIVE'],
        },
        historical: {
            years:             ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'],
            revenue_cr:        [160000, 175000, 192000, 208000, 221000],
            net_profit_cr:     [38187,  42000,  45000,  47000,  49096],
            eps:               [104.36, 115,    122,    130,    135.70],
            roce_pct:          [62,     65,     70,     75,     77],
            roe_pct:           [52,     56,     60,     62,     65],
            net_margin_pct:    [20,     21,     21.5,   22,     22.2],
            dividend_yield_pct:[null,   null,   null,   2.45,   2.83],
            fcf_crore:         42123,
            revenue_cagr:      8.3,
            profit_cagr:       6.5,
            eps_cagr:          6.8,
            roce_label:        'RISING · ELITE',
            roe_label:         'STABLE HIGH',
            margin_label:      'STABILIZING',
            divyld_label:      'ATTRACTIVE',
        },
        peers: [
            { name: 'TCS',        score: 82, is_self: true },
            { name: 'INFOSYS',    score: 71 },
            { name: 'HCL TECH',   score: 63 },
            { name: 'LTIMINDTREE',score: 52 },
            { name: 'WIPRO',      score: 45 },
        ],
        peer_group: 'INDIAN IT',
        peer_rank:  1,
    },
};

const MOCK_NEWS = [
    { title: 'Reliance, TCS, HDFC Bank witness biggest FPI selling since 2022; Eternal, Paytm, Polycab see foreign buying', source: 'mint - markets', url: '#', sentiment: 'bearish' },
    { title: 'TCS Q1FY27 results preview: Revenue growth expected at 3–5% in constant currency terms', source: 'NDTV Profit', url: '#', sentiment: 'bullish' },
];

/* ── Quick (snap) mode mocks — mirrors the QUICK ANSWER reference design ── */
const MOCK_SCORE_CARD_QUICK = {
    ...MOCK_SCORE_CARD,
    overall: {
        score: 74,
        label: 'Strong',
        components: { technical: 78, financial: 65, management: 82 },
        method: 'Average of Technical, Financial and Management tone scores.',
    },
};

const MOCK_SIGNAL_QUICK = {
    recommendation: 'BUY',
    confidence_pct: 71,
    risk: 'medium',
    ideal_entry: 2320,
    target: 2520,
    stop_loss: 2240,
    upside_pct: 8.2,
    downside_pct: 3.8,
    risk_reward: 2.5,
    why: [
        'Breaking out of a five month base on volume **1.4x** the daily average.',
        'Trading above both the 50 and 200 day moving average, trend stays constructive.',
        'Valuation sits above its own five year average, so size the position accordingly.',
    ],
};

const MOCK_NEWS_QUICK = [
    { title: 'Board approves share buyback worth ₹18,000 crore, record date awaited', source: '2 days ago', url: '#', sentiment: 'bullish' },
    { title: 'Wins large multi year cloud transformation deal with a European bank', source: '4 days ago', url: '#', sentiment: 'bullish' },
    { title: 'Q1 operating margin beats street estimates despite currency headwinds', source: '1 week ago', url: '#', sentiment: 'bullish' },
];

const MOCK_FOLLOW_UPS = [
    'Should I buy TCS now?',
    'Technical analysis for TCS — support & resistance',
    'TCS 5-year performance and returns',
];

const MOCK_CONTENT = `⚠️ **WAIT** | High P/E, ROE, and DY • Technical: RSI 40 (Neutral) — no clear trend • Fundamental/Momentum: P/E 27.4, ROE 46.12%, DY 3.41% — strong fundamentals • Risk: Low volume 0.8x avg, MACD -28.5 (Bearish) — caution ⚡ Entry ₹2,310.`;

/* Real-world case: backend sends NO structured signal — entry/stop/target
   live only inside the answer text (the HDFC Bank quick-answer bug). */
const MOCK_CONTENT_NO_SIGNAL = `🟢 **BUY** — Price above key EMAs, bullish MACD crossover

- Technical: Trading above EMA21/50; MACD bullish, RSI neutral at 61
- Fundamental: Strong P/E (18.8), solid ROE (13.8%), large cap eligibility
- Risk: ATR ₹16.02 signals moderate volatility; watch for profit booking near highs

⚡ Entry ₹818 | 🛑 Stop ₹802 | 🎯 Target ₹850`;

const MOCK_METADATA_HDFC = {
    symbols: ['HDFCBANK'],
    at_a_glance: {
        symbol: 'HDFCBANK',
        price: 817.05,
        change_percent: 0.0,
        volume: 11000000,
    },
};

export default function PreviewPage() {
    return (
        <div className="min-h-screen bg-[#090A07] py-10">
            <div className="max-w-4xl mx-auto px-4">
                {/* ── QUICK ANSWER: no structured signal, levels parsed from text ── */}
                <MessageBubble role="user" content="hdfc bank" isStreaming={false} />
                <MessageBubble
                    role="assistant"
                    content={MOCK_CONTENT_NO_SIGNAL}
                    isStreaming={false}
                    metadata={MOCK_METADATA_HDFC}
                    responseMode="snap"
                    messageId="preview-quick-nosignal"
                    onFeedback={() => {}}
                />

                <div className="my-10 border-t border-zinc-800" />

                {/* ── QUICK ANSWER layout (snap mode) ── */}
                <MessageBubble role="user" content="Should I buy TCS?" isStreaming={false} />
                <MessageBubble
                    role="assistant"
                    content={MOCK_CONTENT}
                    isStreaming={false}
                    chartData={MOCK_CHART}
                    metadata={MOCK_METADATA}
                    signal={MOCK_SIGNAL_QUICK}
                    technicalSummary={MOCK_TECHNICAL_SUMMARY}
                    patternSummary={MOCK_PATTERN}
                    scoreCard={MOCK_SCORE_CARD_QUICK}
                    newsHeadlines={MOCK_NEWS_QUICK}
                    suggestedFollowUps={MOCK_FOLLOW_UPS}
                    onFollowUpClick={() => {}}
                    responseMode="snap"
                    messageId="preview-quick-1"
                    onFeedback={() => {}}
                />

                <div className="my-10 border-t border-zinc-800" />

                {/* ── Classic analyst layout ── */}
                <MessageBubble role="user" content="Show me TCS fundamentals and valuation" isStreaming={false} />
                <MessageBubble
                    role="assistant"
                    content={MOCK_CONTENT}
                    isStreaming={false}
                    chartData={MOCK_CHART}
                    metadata={MOCK_METADATA}
                    signal={MOCK_SIGNAL}
                    technicalSummary={MOCK_TECHNICAL_SUMMARY}
                    patternSummary={MOCK_PATTERN}
                    indicatorsTable={MOCK_INDICATORS}
                    scoreCard={MOCK_SCORE_CARD}
                    newsHeadlines={MOCK_NEWS}
                    suggestedFollowUps={MOCK_FOLLOW_UPS}
                    onFollowUpClick={() => {}}
                    responseMode="analyst"
                    messageId="preview-1"
                    onFeedback={() => {}}
                />
            </div>
        </div>
    );
}
