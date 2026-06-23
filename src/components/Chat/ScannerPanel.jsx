import { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, BarChart2, CandlestickChart, LineChart, BookOpen, Loader2, Check } from 'lucide-react';

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

// Hard contradictions — scanners that physically cannot fire on the same stock simultaneously.
// Key = selected scanner → Value = set of scanners that must be disabled.
const CONFLICTS = {
    'RSI Oversold':           new Set(['RSI Overbought']),
    'RSI Overbought':         new Set(['RSI Oversold']),
    'MACD Bullish Crossover': new Set(['MACD Bearish Crossover']),
    'MACD Bearish Crossover': new Set(['MACD Bullish Crossover']),
    'Supertrend Buy':         new Set(['Supertrend Sell']),
    'Supertrend Sell':        new Set(['Supertrend Buy']),
    'Golden Cross':           new Set(['Death Cross']),
    'Death Cross':            new Set(['Golden Cross']),
    'BB Breakout Bullish':    new Set(['BB Squeeze']),
    // BB Squeeze = bands contracting → breakouts/new highs are impossible
    'BB Squeeze':             new Set(['BB Breakout Bullish', 'Short Term Breakouts', '52-Week High Breakout']),
    'Short Term Breakouts':   new Set(['BB Squeeze']),
    '52-Week High Breakout':  new Set(['BB Squeeze']),
    // Candlestick direct opposites
    'Bullish Engulfing':      new Set(['Bearish Engulfing']),
    'Bearish Engulfing':      new Set(['Bullish Engulfing']),
    'Morning Star':           new Set(['Evening Star']),
    'Evening Star':           new Set(['Morning Star']),
    'Three White Soldiers':   new Set(['Three Black Crows']),
    'Three Black Crows':      new Set(['Three White Soldiers']),
    // Hammer = bottom reversal bullish; Hanging Man / Shooting Star = top reversal bearish
    'Hammer':                 new Set(['Hanging Man', 'Shooting Star']),
    'Hanging Man':            new Set(['Hammer']),
    'Shooting Star':          new Set(['Hammer']),
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
    return [`## ${name} — ${results.length} stocks found`, `_${universe} · scanned in ${seconds}s_`, '', rows].join('\n');
}

const POLL_INTERVAL = 4000;
const MAX_WAIT_MS   = 180_000;

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
    const panelRef = useRef(null);
    const pollRef  = useRef(null);
    const msgRef   = useRef(null);

    const [scanning, setScanning]           = useState(false);
    const [scannerName, setScannerName]     = useState('');
    const [elapsed, setElapsed]             = useState(0);
    const [error, setError]                 = useState('');
    const [universe, setUniverse]           = useState('nifty500');
    const [msgIdx, setMsgIdx]               = useState(0);
    const [scanDone, setScanDone]           = useState(null);

    // Multi-select state
    const [selected, setSelected] = useState(new Set());

    // Derive which scanners are blocked by the current selection
    const disabledByConflict = new Set();
    for (const sel of selected) {
        CONFLICTS[sel]?.forEach(c => disabledByConflict.add(c));
    }

    const conflictReasonFor = (name) => {
        const reasons = [];
        for (const sel of selected) {
            if (CONFLICTS[sel]?.has(name)) reasons.push(sel);
        }
        return reasons.length ? `Conflicts with: ${reasons.join(', ')}` : undefined;
    };

    const toggleScanner = (name) => {
        if (scanning) return;
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    // Rotate loading messages
    useEffect(() => {
        if (scanning) {
            setMsgIdx(0);
            msgRef.current = setInterval(() => setMsgIdx(i => (i + 1) % SCAN_MESSAGES.length), 2000);
        } else {
            clearInterval(msgRef.current);
        }
        return () => clearInterval(msgRef.current);
    }, [scanning]);

    useEffect(() => () => clearInterval(pollRef.current), []);

    useEffect(() => {
        const handler = (e) => {
            if (!scanning && panelRef.current && !panelRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, scanning]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && !scanning) onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, scanning]);

    // Start all selected scanners in parallel, intersect by Symbol
    const handleRunScan = async () => {
        const names = [...selected];
        if (names.length === 0) return;

        const displayName = names.length === 1
            ? names[0]
            : `${names.length}-Scanner Combo`;

        setScanning(true);
        setScannerName(displayName);
        setElapsed(0);
        setError('');

        // Launch all jobs in parallel
        let jobs;
        try {
            const launches = await Promise.all(
                names.map(name =>
                    fetch(SCANNER_ENDPOINT, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ scanner: name, universe }),
                    }).then(r => r.json())
                )
            );
            jobs = names.map((name, i) => ({ name, jobId: launches[i].job_id }));
        } catch (e) {
            setError(`Failed to start scan: ${e.message}`);
            setScanning(false);
            return;
        }

        // Poll until all jobs finish
        const startedAt = Date.now();
        const jobResults = new Map(); // name → job result

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
                const statuses = await Promise.all(
                    jobs
                        .filter(j => !jobResults.has(j.name))
                        .map(j =>
                            fetch(`${SCANNER_ENDPOINT}/status/${j.jobId}`)
                                .then(r => r.json())
                                .then(res => ({ ...res, _name: j.name }))
                        )
                );

                for (const res of statuses) {
                    if (res.status === 'done')  jobResults.set(res._name, res);
                    if (res.status === 'error') {
                        clearInterval(pollRef.current);
                        setError(`Scan error in ${res._name}: ${res.error || 'unknown'}`);
                        setScanning(false);
                        return;
                    }
                }

                if (jobResults.size < jobs.length) return; // still waiting

                // All done — intersect results by Symbol
                clearInterval(pollRef.current);

                const allResults = [...jobResults.values()];
                const symbolSets = allResults.map(r => new Set((r.results || []).map(s => s.Symbol)));

                // Start with first set, intersect with rest
                const intersection = new Set(symbolSets[0]);
                for (const s of symbolSets.slice(1)) {
                    for (const sym of [...intersection]) {
                        if (!s.has(sym)) intersection.delete(sym);
                    }
                }

                // Build result rows from first scanner, annotated with matched scanners
                const firstResults = allResults[0]?.results || [];
                const intersected  = firstResults
                    .filter(r => intersection.has(r.Symbol))
                    .map(r => ({ ...r, matched_scanners: names }));

                const universe_ = allResults[0]?.universe || universe;
                const dur       = allResults[0]?.duration_seconds || 0;

                const label = names.length === 1
                    ? names[0]
                    : `${names.join(' + ')}`;

                const msg = formatResults(label, intersected, universe_, dur);
                setScanning(false);
                setScanDone({ count: intersected.length, msg });
                setSelected(new Set());

                setTimeout(() => {
                    onSelectScanner({
                        type:            'scanner_results',
                        raw:             intersected,
                        formatted:       msg,
                        scanner:         label,
                        emoji:           names.length === 1 ? (SCANNER_EMOJI[names[0]] || '🔍') : '🎯',
                        universe:        universe_,
                        count:           intersected.length,
                        date:            allResults[0]?.scan_date || new Date().toISOString().split('T')[0],
                        matchedScanners: names,
                    });
                    onClose();
                }, 1200);

            } catch {
                // network blip — keep polling
            }
        }, POLL_INTERVAL);
    };

    // Render a scanner button (selected = yellow outline + checkmark, conflicted = greyed out)
    const ScannerBtn = ({ name, hoverClass = '' }) => {
        const isSel       = selected.has(name);
        const isConflict  = !isSel && disabledByConflict.has(name);
        const tipText     = isConflict ? conflictReasonFor(name) : undefined;

        return (
            <button
                key={name}
                disabled={scanning || isConflict}
                title={tipText}
                onClick={() => toggleScanner(name)}
                className={`relative px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all
                            ${isConflict
                                ? 'opacity-25 cursor-not-allowed select-none border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-600'
                                : scanning
                                ? 'opacity-40 cursor-not-allowed'
                                : isSel
                                ? 'cursor-pointer border-[#FDD405] bg-[#FDD405]/10 text-zinc-900 dark:text-white'
                                : `cursor-pointer bg-zinc-50 border-zinc-200 text-zinc-600
                                   dark:bg-zinc-800/60 dark:border-white/8 dark:text-zinc-300
                                   ${hoverClass}`
                            }`}
            >
                {isSel && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#FDD405' }}>
                        <Check size={9} strokeWidth={3} className="text-black" />
                    </span>
                )}
                {name}
            </button>
        );
    };

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
                        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">Stock Scanners</h2>
                        <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            Select one or more · combine signals · run scan
                        </p>
                    </div>

                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 mr-2">
                        {[{ key: 'nifty500', label: 'Nifty 500' }, { key: 'all_nse', label: 'All NSE' }].map(({ key, label }) => (
                            <button
                                key={key}
                                disabled={scanning}
                                onClick={() => setUniverse(key)}
                                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 select-none disabled:opacity-50
                                    ${universe === key
                                        ? 'text-zinc-900 shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
                                style={universe === key ? { backgroundColor: '#FDD405' } : {}}
                            >{label}</button>
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
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white dark:bg-[#1a1a1a]">
                        <div className="text-5xl" style={{ animation: 'bounce 2s infinite' }}>
                            {selected.size === 1 ? (SCANNER_EMOJI[scannerName] || '🔍') : '🎯'}
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-center px-6">
                            <p className="text-[16px] font-bold text-zinc-900 dark:text-white">
                                {selected.size > 1
                                    ? <>Running <span style={{ color: '#FDD405' }}>{scannerName}</span></>
                                    : <>Scanning for <span style={{ color: '#FDD405' }}>{scannerName}</span></>}
                            </p>
                            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                                {universe === 'nifty500' ? 'Nifty 500' : 'All NSE'} stocks
                                {[...selected].length > 1 && ` · will intersect ${[...selected].length} results`}
                            </p>
                            <p key={msgIdx} className="text-[12px] text-zinc-500 dark:text-zinc-400 italic" style={{ animation: 'fadeIn 0.4s ease-in' }}>
                                {SCAN_MESSAGES[msgIdx]}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {[0,1,2].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full"
                                     style={{ backgroundColor: '#FDD405', animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite` }} />
                            ))}
                        </div>
                        <p className="text-[11px] text-zinc-300 dark:text-zinc-600">
                            {elapsed > 0 ? `${elapsed}s elapsed` : 'starting…'}
                        </p>
                    </div>
                )}

                {/* Scan-complete flash */}
                {scanDone && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white dark:bg-[#1a1a1a]"
                         style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div className="text-5xl" style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                            {scanDone.count > 0 ? '🎯' : '🔍'}
                        </div>
                        <p className="text-[18px] font-bold text-zinc-900 dark:text-white" style={{ animation: 'fadeIn 0.3s 0.15s ease-out both' }}>
                            {scanDone.count > 0
                                ? <><span style={{ color: '#FDD405' }}>{scanDone.count} stocks</span> matched all signals!</>
                                : 'No stocks matched all criteria'}
                        </p>
                        <p className="text-[12px] text-zinc-400 dark:text-zinc-500" style={{ animation: 'fadeIn 0.3s 0.25s ease-out both' }}>
                            Opening results panel…
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
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400">Technical Patterns</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-1">25 scanners</span>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(TECHNICAL_SCANNERS).map(([category, scanners]) => {
                                const Icon  = CATEGORY_ICONS[category];
                                const color = CATEGORY_COLORS[category];
                                const hoverClasses = {
                                    'text-indigo-400':  'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300',
                                    'text-purple-400':  'hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/50 dark:hover:border-purple-500/40 dark:hover:text-purple-300',
                                    'text-emerald-400': 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300',
                                    'text-rose-400':    'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:border-rose-500/40 dark:hover:text-rose-300',
                                }[color] || '';
                                return (
                                    <div key={category}>
                                        <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
                                            {Icon && <Icon size={12} />}
                                            <span className="text-[11px] font-medium">{category}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {scanners.map(s => (
                                                <ScannerBtn key={s.name} name={s.name} hoverClass={hoverClasses} />
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
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">Fundamental Screens</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-1">9 scanners · Nifty 100</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {FUNDAMENTAL_SCANNER_NAMES.map(name => (
                                <ScannerBtn key={name} name={name}
                                    hoverClass="hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50 dark:hover:border-amber-500/40 dark:hover:text-amber-300"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Run bar — appears when anything is selected */}
                {selected.size > 0 && !scanning && !scanDone && (
                    <div className="px-4 py-3 border-t flex-shrink-0"
                         style={{ borderColor: 'rgba(253,212,5,0.3)', background: 'rgba(253,212,5,0.06)' }}>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-zinc-900 dark:text-white leading-tight">
                                    {selected.size === 1
                                        ? [...selected][0]
                                        : `${selected.size} signals selected — stocks must match ALL`}
                                </p>
                                {selected.size > 1 && (
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                                        {[...selected].join(' · ')}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelected(new Set())}
                                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors px-2 py-1 flex-shrink-0"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleRunScan}
                                className="flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold text-zinc-900 transition-all hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: '#FDD405' }}
                            >
                                Run Scan →
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {selected.size === 0 && (
                    <div className="px-5 py-3 border-t border-zinc-100 dark:border-white/8 flex-shrink-0">
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center">
                            Nifty 500 or All NSE · Real market data · Top results by signal strength
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScannerPanel;
