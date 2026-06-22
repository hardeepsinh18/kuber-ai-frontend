import { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, BarChart2, CandlestickChart, LineChart, BookOpen, Loader2 } from 'lucide-react';

const _raw = import.meta.env.VITE_API_BASE || import.meta.env.NEXT_PUBLIC_API_URL;
const API_BASE = (_raw && _raw.startsWith('http')) ? _raw.replace(/\/$/, '') : '';
const SCANNER_ENDPOINT = API_BASE ? `${API_BASE}/api/v1/scanner` : '/api/v1/scanner';

const TECHNICAL_SCANNERS = {
    'Breakout & Trend': [
        { name: 'Short Term Breakouts'  },
        { name: '52-Week High Breakout' },
        { name: 'Inside Bar Breakout'   },
        { name: 'SMA 200 Reclaim'       },
        { name: 'Golden Cross'          },
        { name: 'Death Cross'           },
    ],
    'Momentum Indicators': [
        { name: 'RSI Oversold'          },
        { name: 'RSI Overbought'        },
        { name: 'MACD Bullish Crossover'},
        { name: 'MACD Bearish Crossover'},
        { name: 'Supertrend Buy'        },
        { name: 'Supertrend Sell'       },
        { name: 'BB Breakout Bullish'   },
        { name: 'BB Squeeze'            },
        { name: 'Volume Surge'          },
    ],
    'Bullish Candlestick Patterns': [
        { name: 'Morning Star'          },
        { name: 'Bullish Engulfing'     },
        { name: 'Hammer'                },
        { name: 'Three White Soldiers'  },
    ],
    'Bearish Candlestick Patterns': [
        { name: 'Hanging Man'           },
        { name: 'Shooting Star'         },
        { name: 'Evening Star'          },
        { name: 'Bearish Engulfing'     },
        { name: 'Three Black Crows'     },
        { name: 'Doji'                  },
    ],
};

const FUNDAMENTAL_SCANNER_NAMES = [
    'Low P/E', 'High ROE', 'Low Debt', 'Revenue Growth',
    'EPS Growth', 'High Dividend', 'Value Pick', 'Growth Pick', 'Quality Pick',
];

const CATEGORY_ICONS = {
    'Breakout & Trend':             TrendingUp,
    'Momentum Indicators':          BarChart2,
    'Bullish Candlestick Patterns': CandlestickChart,
    'Bearish Candlestick Patterns': LineChart,
};

const CATEGORY_COLORS = {
    'Breakout & Trend':             'text-indigo-400',
    'Momentum Indicators':          'text-purple-400',
    'Bullish Candlestick Patterns': 'text-emerald-400',
    'Bearish Candlestick Patterns': 'text-rose-400',
};

const SCANNER_EMOJI = {
    'Short Term Breakouts':      '🚀',
    '52-Week High Breakout':     '🏆',
    'Inside Bar Breakout':       '📦',
    'SMA 200 Reclaim':           '📊',
    'Golden Cross':              '✨',
    'Death Cross':               '☠️',
    'RSI Oversold':              '📉',
    'RSI Overbought':            '📈',
    'MACD Bullish Crossover':    '⚡',
    'MACD Bearish Crossover':    '⬇️',
    'Supertrend Buy':            '🟢',
    'Supertrend Sell':           '🔴',
    'BB Breakout Bullish':       '💥',
    'BB Squeeze':                '🤏',
    'Volume Surge':              '🔊',
    'Morning Star':              '🌅',
    'Bullish Engulfing':         '📈',
    'Hammer':                    '🔨',
    'Three White Soldiers':      '⚔️',
    'Hanging Man':               '🪝',
    'Shooting Star':             '🌠',
    'Evening Star':              '🌙',
    'Bearish Engulfing':         '📉',
    'Three Black Crows':         '🐦',
    'Doji':                      '⚖️',
    'Low P/E':                   '💰',
    'High ROE':                  '💎',
    'Low Debt':                  '🏦',
    'Revenue Growth':            '📊',
    'EPS Growth':                '📈',
    'High Dividend':             '🎯',
    'Value Pick':                '🔍',
    'Growth Pick':               '🌱',
    'Quality Pick':              '⭐',
};

// Format scanner results as a plain numbered list — no LLM follow-up
function formatResults(name, results, universe, seconds) {
    if (results.length === 0) {
        return `**${name}** found no matching stocks in ${universe} today (scanned in ${seconds}s).`;
    }

    const keyMetric = (r) => {
        if (r['Breakout_%'] != null)   return ` +${r['Breakout_%']}%`;
        if (r['Gap_Up_%'] != null)     return ` gap +${r['Gap_Up_%']}%`;
        if (r['Gap_Down_%'] != null)   return ` gap -${r['Gap_Down_%']}%`;
        if (r['Chg_%'] != null)        return ` ${r['Chg_%'] >= 0 ? '+' : ''}${r['Chg_%']}%`;
        if (r['RSI'] != null)          return ` RSI ${r['RSI']}`;
        if (r['PE'] != null)           return ` P/E ${r['PE']}`;
        if (r['ROE_%'] != null)        return ` ROE ${r['ROE_%']}%`;
        if (r['EPS_Growth_%'] != null) return ` EPS +${r['EPS_Growth_%']}%`;
        if (r['Div_Yield_%'] != null)  return ` yield ${r['Div_Yield_%']}%`;
        if (r['Vol_Ratio'] != null)    return ` vol ×${r['Vol_Ratio']}`;
        if (r['Close'] != null)        return ` ₹${r['Close']}`;
        return '';
    };

    const rows = results.map((r, i) => `${i + 1}. **${r.Symbol}**${keyMetric(r)}`).join('\n');

    return [
        `## ${name} — ${results.length} stocks found`,
        `_${universe} · scanned in ${seconds}s_`,
        '',
        rows,
    ].join('\n');
}

const POLL_INTERVAL = 4000;   // poll every 4s
const MAX_WAIT_MS   = 180_000; // give up after 3 minutes

const SCAN_MESSAGES = [
    'Crunching price action across every candle…',
    'Checking open, high, low, close patterns…',
    'Comparing today vs yesterday vs last week…',
    'Filtering out the noise, keeping the signal…',
    'Running pattern logic on each symbol…',
    'Almost there — sorting results by strength…',
    'Cross-checking volume with price moves…',
    'Scanning for momentum shifts…',
    'Looking for clean setups in the data…',
    'Validating breakout conditions…',
    'Ranking stocks by pattern quality…',
    'Fetching the freshest market data…',
];

const ScannerPanel = ({ onSelectScanner, onClose }) => {
    const panelRef   = useRef(null);
    const pollRef    = useRef(null);  // interval id for cleanup
    const msgRef     = useRef(null);  // interval id for message rotation
    const [scanning, setScanning]       = useState(false);
    const [scannerName, setScannerName] = useState('');
    const [elapsed, setElapsed]         = useState(0);
    const [error, setError]             = useState('');
    const [universe, setUniverse]       = useState('nifty500');  // "nifty500" | "all_nse"
    const [msgIdx, setMsgIdx]           = useState(0);
    const [scanDone, setScanDone]       = useState(null); // { count, msg } — shown briefly before close

    // Rotate loading message every 2s while scanning
    useEffect(() => {
        if (scanning) {
            setMsgIdx(0);
            msgRef.current = setInterval(() => {
                setMsgIdx(i => (i + 1) % SCAN_MESSAGES.length);
            }, 2000);
        } else {
            clearInterval(msgRef.current);
        }
        return () => clearInterval(msgRef.current);
    }, [scanning]);

    // Clean up poll interval on unmount
    useEffect(() => () => clearInterval(pollRef.current), []);

    // Close on outside click (disabled while scanning)
    useEffect(() => {
        const handler = (e) => {
            if (!scanning && panelRef.current && !panelRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, scanning]);

    // Close on Escape (disabled while scanning)
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && !scanning) onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, scanning]);

    const handleSelect = async (name) => {
        setScanning(true);
        setScannerName(name);
        setElapsed(0);
        setError('');

        // Step 1 — POST to start the job (returns immediately with job_id)
        let jobId;
        try {
            const resp = await fetch(SCANNER_ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ scanner: name, universe }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            jobId = data.job_id;
        } catch (e) {
            setError(`Failed to start scan: ${e.message}`);
            setScanning(false);
            return;
        }

        // Step 2 — Poll GET /scanner/status/{job_id} every 4s
        const startedAt = Date.now();
        const statusUrl = `${SCANNER_ENDPOINT}/status/${jobId}`;

        pollRef.current = setInterval(async () => {
            const waited = Date.now() - startedAt;
            setElapsed(Math.round(waited / 1000));

            if (waited > MAX_WAIT_MS) {
                clearInterval(pollRef.current);
                setError('Scan timed out after 3 minutes. Please try again.');
                setScanning(false);
                return;
            }

            try {
                const resp = await fetch(statusUrl);
                if (!resp.ok) return; // transient error — keep polling
                const job = await resp.json();

                if (job.status === 'done') {
                    clearInterval(pollRef.current);
                    const msg = formatResults(job.scanner, job.results, job.universe, job.duration_seconds);
                    setScanning(false);
                    setScanDone({ count: job.results.length, msg });
                    setTimeout(() => { onSelectScanner(msg); onClose(); }, 1200);
                } else if (job.status === 'error') {
                    clearInterval(pollRef.current);
                    setError(`Scan error: ${job.error || 'Unknown error'}`);
                    setScanning(false);
                }
                // status === 'running' → keep polling
            } catch (e) {
                // network blip — keep polling silently
            }
        }, POLL_INTERVAL);
    };

    const btnClass = (color) =>
        `px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
         bg-zinc-50 border-zinc-200 text-zinc-600
         hover:border-${color}-300 hover:bg-${color}-50 hover:text-${color}-700
         dark:bg-zinc-800/60 dark:border-white/8 dark:text-zinc-300
         dark:hover:bg-${color}-950/50 dark:hover:border-${color}-500/40 dark:hover:text-${color}-300`;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-2 sm:px-4 pb-4 sm:pb-0">
            <div
                ref={panelRef}
                className="relative w-full max-w-2xl max-h-[80vh] sm:max-h-[78vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden
                           bg-white border-zinc-200
                           dark:bg-[#161616] dark:border-white/10"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/8 flex-shrink-0">
                    <div>
                        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                            Stock Scanners
                        </h2>
                        <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            Live scans · real data, not AI guesses
                        </p>
                    </div>

                    {/* Universe toggle */}
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 mr-2">
                        {[
                            { key: 'nifty500', label: 'Nifty 500' },
                            { key: 'all_nse',  label: 'All NSE'   },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                disabled={scanning}
                                onClick={() => setUniverse(key)}
                                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 select-none disabled:opacity-50
                                    ${universe === key
                                        ? 'text-zinc-900 shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                    }`}
                                style={universe === key ? { backgroundColor: '#FDD405' } : {}}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        disabled={scanning}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Loading overlay */}
                {scanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl
                                    bg-white dark:bg-[#1a1a1a]">
                        {/* Scanner emoji */}
                        <div className="text-5xl" style={{ animation: 'bounce 2s infinite' }}>
                            {SCANNER_EMOJI[scannerName] || '🔍'}
                        </div>

                        {/* Title */}
                        <div className="flex flex-col items-center gap-1.5 text-center px-6">
                            <p className="text-[16px] font-bold text-zinc-900 dark:text-white">
                                Scanning for{' '}
                                <span style={{ color: '#FDD405' }}>{scannerName}</span>
                            </p>
                            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                                {universe === 'nifty500' ? 'Nifty 500' : 'All NSE'} stocks
                            </p>
                            {/* Rotating message */}
                            <p
                                key={msgIdx}
                                className="text-[12px] text-zinc-500 dark:text-zinc-400 italic"
                                style={{ animation: 'fadeIn 0.4s ease-in' }}
                            >
                                {SCAN_MESSAGES[msgIdx]}
                            </p>
                        </div>

                        {/* Animated dots */}
                        <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map(i => (
                                <div
                                    key={i}
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: '#FDD405',
                                        animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Timer */}
                        <p className="text-[11px] text-zinc-300 dark:text-zinc-600">
                            {elapsed > 0 ? `${elapsed}s elapsed` : 'starting…'}
                        </p>
                    </div>
                )}

                {/* Scan-complete flash overlay */}
                {scanDone && (
                    <div
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white dark:bg-[#1a1a1a]"
                        style={{ animation: 'fadeIn 0.3s ease-out' }}
                    >
                        <div className="text-5xl" style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                            {scanDone.count > 0 ? '🎯' : '🔍'}
                        </div>
                        <p className="text-[18px] font-bold text-zinc-900 dark:text-white" style={{ animation: 'fadeIn 0.3s 0.15s ease-out both' }}>
                            {scanDone.count > 0
                                ? <><span style={{ color: '#FDD405' }}>{scanDone.count} stocks</span> found!</>
                                : 'No matches today'}
                        </p>
                        <p className="text-[12px] text-zinc-400 dark:text-zinc-500" style={{ animation: 'fadeIn 0.3s 0.25s ease-out both' }}>
                            Adding to chat…
                        </p>
                    </div>
                )}

                {/* Error bar */}
                {error && (
                    <div className="px-5 py-2 text-[12px] text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border-b border-red-100 dark:border-red-900/40">
                        {error}
                    </div>
                )}

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6">

                    {/* Technical Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-indigo-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400">
                                Technical Patterns
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-1">25 scanners</span>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(TECHNICAL_SCANNERS).map(([category, scanners]) => {
                                const Icon  = CATEGORY_ICONS[category];
                                const color = CATEGORY_COLORS[category];
                                // For Tailwind JIT we need literal colour names in className strings:
                                const hoverClasses = {
                                    'text-indigo-400': 'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300',
                                    'text-purple-400': 'hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/50 dark:hover:border-purple-500/40 dark:hover:text-purple-300',
                                    'text-emerald-400': 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300',
                                    'text-rose-400': 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:border-rose-500/40 dark:hover:text-rose-300',
                                }[color] || '';
                                return (
                                    <div key={category}>
                                        <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
                                            {Icon && <Icon size={12} />}
                                            <span className="text-[11px] font-medium">{category}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {scanners.map((s) => (
                                                <button
                                                    key={s.name}
                                                    disabled={scanning}
                                                    onClick={() => handleSelect(s.name)}
                                                    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer
                                                                disabled:opacity-40 disabled:cursor-not-allowed
                                                                bg-zinc-50 border-zinc-200 text-zinc-600
                                                                dark:bg-zinc-800/60 dark:border-white/8 dark:text-zinc-300
                                                                ${hoverClasses}`}
                                                >
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fundamental Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={14} className="text-amber-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                                Fundamental Screens
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-1">9 scanners · Nifty 100</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {FUNDAMENTAL_SCANNER_NAMES.map((name) => (
                                <button
                                    key={name}
                                    disabled={scanning}
                                    onClick={() => handleSelect(name)}
                                    className="px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               bg-zinc-50 border-zinc-200 text-zinc-600
                                               hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700
                                               dark:bg-zinc-800/60 dark:border-white/8 dark:text-zinc-300
                                               dark:hover:bg-amber-950/50 dark:hover:border-amber-500/40 dark:hover:text-amber-300"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-zinc-100 dark:border-white/8 flex-shrink-0">
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center">
                        Top 200 NSE stocks · Live yfinance data · Results in 60–120 seconds
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ScannerPanel;
