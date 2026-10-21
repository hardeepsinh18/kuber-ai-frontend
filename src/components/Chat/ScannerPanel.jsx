import { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, BarChart2, BookOpen, Check, Star, X, AlertTriangle, Bookmark } from 'lucide-react';
import { getApiBase } from '../../lib/apiBase';
import { formatResults, formatComboResults } from '../../lib/formatScanResults';
import {
    MAX_SCANNERS, MIN_COMBO, MODES, conflictPairs, comboLabel, comboSummary,
    loadSavedCombos, saveCombo, deleteCombo, isComboSaved,
} from '../../lib/scannerCombos';
import { useAuth } from '../../context/AuthContext';
import SlideUpModal from './SlideUpModal';

const API_BASE = getApiBase();
const SCANNER_ENDPOINT = `${API_BASE}/api/v1/scanner`;
// 2-3 scanners are combined server-side over their FULL match lists. The single
// endpoint caps output at 10-15, so intersecting its results here dropped real
// overlaps and was almost always empty.
const COMBO_ENDPOINT   = `${SCANNER_ENDPOINT}/combo`;

const CANDLESTICK_PATTERNS = [
    { name: 'Morning Star'           },
    { name: 'Bearish Engulfing'      },
    { name: 'Hammer'                 },
    { name: 'Hanging Man'            },
    { name: 'Shooting Star'          },
    { name: 'Evening Star'           },
    { name: 'Doji'                   },
];

const MOMENTUM_SCANNERS = [
    { name: 'RSI Oversold'           },
    { name: 'RSI Overbought'         },
    { name: 'MACD Bullish Crossover' },
    { name: 'MACD Bearish Crossover' },
    { name: 'Supertrend Buy'         },
    { name: 'Supertrend Sell'        },
    { name: 'BB Breakout Bullish'    },
    { name: 'BB Squeeze'             },
    { name: 'Volume Surge'           },
    { name: 'Short Term Breakouts'   },
    { name: '52-Week High Breakout'  },
];

const FUNDAMENTAL_SCANNER_NAMES = [
    'Low P/E', 'High ROE', 'Low Debt', 'Revenue Growth',
    'EPS Growth', 'High Dividend', 'Value Pick', 'Growth Pick', 'Quality Pick',
];

const SCANNER_EMOJI = {
    // Candlestick patterns
    'Morning Star':              '🌄',
    'Bearish Engulfing':         '📉',
    'Hammer':                    '🔨',
    'Hanging Man':               '🪝',
    'Shooting Star':             '🌠',
    'Evening Star':              '🌙',
    'Doji':                      '⚖️',
    // Momentum
    'RSI Oversold':              '📉',
    'RSI Overbought':            '📈',
    'MACD Bullish Crossover':    '⚡',
    'MACD Bearish Crossover':    '⬇️',
    'Supertrend Buy':            '🟢',
    'Supertrend Sell':           '🔴',
    'BB Breakout Bullish':       '💥',
    'BB Squeeze':                '🤏',
    'Volume Surge':              '🔊',
    'Short Term Breakouts':      '🚀',
    '52-Week High Breakout':     '🏆',
    'Inside Bar Breakout':       '📦',
    'SMA 200 Reclaim':           '📊',
    'Golden Cross':              '✨',
    'Death Cross':               '☠️',
    // Fundamentals
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

const HOVER_CLASS = 'hover:border-[#FDD405]/50 hover:bg-[#FDD405]/8 hover:text-zinc-900 dark:hover:bg-[#FDD405]/8 dark:hover:border-[#FDD405]/50 dark:hover:text-white';

const ScannerPanel = ({ onSelectScanner, onClose }) => {
    const { accessToken, user } = useAuth();
    const userId   = user?.id || null;
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
    const [progress, setProgress]           = useState(null);   // combo: { done, total }

    // Multi-select, up to MAX_SCANNERS. A Set keeps insertion order, which is the
    // order the scanners appear in the label and in each result row.
    const [selected, setSelected] = useState(new Set());
    const [mode, setMode]         = useState('all');            // all | any | exclude
    const [exclude, setExclude]   = useState(null);             // exclude mode only
    const [saved, setSaved]       = useState(() => loadSavedCombos(userId));

    useEffect(() => { setSaved(loadSavedCombos(userId)); }, [userId]);

    const names   = useMemo(() => [...selected], [selected]);
    const isCombo = names.length >= MIN_COMBO;
    const atMax   = names.length >= MAX_SCANNERS;
    // The excluded scanner must always be one of the selected ones; default to the
    // most recently added.
    const excludeEff = mode === 'exclude' && isCombo
        ? (selected.has(exclude) ? exclude : names[names.length - 1])
        : null;
    // In "Match all" a contradictory pair can never fully match, so warn. Never
    // disable: the same pair is meaningful under ANY / EXCLUDE.
    const conflicts    = mode === 'all' && isCombo ? conflictPairs(names) : [];
    const currentCombo = isCombo ? { scanners: names, mode, exclude: excludeEff, universe } : null;
    const alreadySaved = isComboSaved(saved, currentCombo);

    // Click to add, click again to remove. Once MAX_SCANNERS are picked the rest
    // are disabled until one is removed.
    const toggleScanner = (name) => {
        if (scanning) return;
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else if (next.size < MAX_SCANNERS) next.add(name);
            return next;
        });
    };

    const applySaved = (c) => {
        if (scanning) return;
        setSelected(new Set(c.scanners));
        setMode(c.mode);
        setExclude(c.exclude || null);
        setUniverse(c.universe || 'nifty500');
        setError('');
    };

    const handleSave = () => {
        if (!currentCombo || alreadySaved) return;
        setSaved(saveCombo(userId, currentCombo));
    };

    const handleDeleteSaved = (id) => setSaved(deleteCombo(userId, id));

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

    // POST a job and return its id. Throws with a user-facing message.
    const startJob = async (url, body) => {
        const r = await fetch(url, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(body),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.job_id) {
            if (url === COMBO_ENDPOINT && (r.status === 404 || r.status === 405)) {
                throw new Error('Combined scans are not available yet. Try a single scanner.');
            }
            const detail = data?.detail;
            const msg = typeof detail === 'string' ? detail
                : detail?.message || `HTTP ${r.status}`;
            throw new Error(msg);
        }
        return data.job_id;
    };

    // Poll a job until done. Rejects on error / stale / expired / timeout.
    // pollRef is cleared on unmount, which is what Cancel relies on.
    const pollJob = (jobId) => new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const fail = (msg) => { clearInterval(pollRef.current); reject(new Error(msg)); };
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            const waited = Date.now() - startedAt;
            setElapsed(Math.round(waited / 1000));
            if (waited > MAX_WAIT_MS) {
                fail('Scan timed out after 3 minutes. Please try again.');
                return;
            }
            try {
                const r = await fetch(`${SCANNER_ENDPOINT}/status/${jobId}`);
                const data = await r.json().catch(() => ({}));
                // Job expired/missing (404/410): a hard error instead of polling a
                // dead id for 3 minutes.
                if (!r.ok) {
                    const d = data?.detail;
                    fail(typeof d === 'string' ? d : `HTTP ${r.status}`);
                    return;
                }
                if (data.progress) setProgress(data.progress);
                if (data.status === 'done') {
                    clearInterval(pollRef.current);
                    resolve(data);
                    return;
                }
                if (['error', 'stale', 'rejected'].includes(data.status)) {
                    fail(data.error || 'The scan could not finish. Please run it again.');
                }
            } catch {
                // network blip — keep polling
            }
        }, POLL_INTERVAL);
    });

    const finish = (payload, flash) => {
        setScanning(false);
        setScanDone(flash);
        setTimeout(() => {
            onSelectScanner(payload);
            onClose();
        }, 1200);
    };

    const handleRunScan = async () => {
        if (names.length === 0) return;
        const combo = names.length >= MIN_COMBO;
        const label = combo ? comboLabel(names, mode, excludeEff) : names[0];

        setScanning(true);
        setScannerName(label);
        setElapsed(0);
        setProgress(combo ? { done: 0, total: names.length } : null);
        setError('');

        let job;
        try {
            const jobId = combo
                ? await startJob(COMBO_ENDPOINT, { scanners: names, mode, exclude: excludeEff, universe })
                : await startJob(SCANNER_ENDPOINT, { scanner: names[0], universe });
            job = await pollJob(jobId);
        } catch (e) {
            setError(/^Scan timed out/.test(e.message) ? e.message : `Scan failed: ${e.message}`);
            setScanning(false);
            return;
        }

        const universe_ = job.universe || universe;
        const date      = job.scan_date || new Date().toISOString().split('T')[0];

        if (!combo) {
            // Single scanner: same payload shape as before.
            const rows = (job.results || []).map(r => ({ ...r, matched_scanners: names }));
            finish({
                type:            'scanner_results',
                raw:             rows,
                formatted:       formatResults(label, names, rows, universe_, job.duration_seconds || 0),
                scanner:         label,
                emoji:           SCANNER_EMOJI[names[0]] || '🔍',
                universe:        universe_,
                count:           rows.length,
                date,
                matchedScanners: names,
            }, { count: rows.length, combo: false });
            return;
        }

        const rows      = job.results || [];
        const jobMode   = job.mode || mode;
        const scanners_ = job.scanners || names;
        finish({
            type:            'scanner_results',
            raw:             rows,
            formatted:       formatComboResults(job),
            scanner:         job.scanner || label,
            emoji:           '🎯',
            universe:        universe_,
            count:           rows.length,
            date,
            matchedScanners: scanners_,
            combo: {
                scanners:         scanners_,
                mode:             jobMode,
                exclude:          job.exclude ?? excludeEff,
                fallback:         !!job.fallback,
                required:         job.required,
                totalMatches:     job.total_matches ?? rows.length,
                perScannerCounts: job.per_scanner_counts || {},
            },
        }, { count: rows.length, combo: true, mode: jobMode, fallback: !!job.fallback, n: scanners_.length });
    };

    const doneHeadline = (d) => {
        if (!d.combo) {
            return d.count > 0
                ? <><span style={{ color: '#FDD405' }}>{d.count} stock{d.count > 1 ? 's' : ''}</span> matched!</>
                : 'No stocks matched today';
        }
        if (d.count === 0) return 'No stocks matched this combination';
        if (d.fallback) {
            return <>None matched all {d.n} · <span style={{ color: '#FDD405' }}>{d.count}</span> matched 2 of {d.n}</>;
        }
        const tail = d.mode === 'any' ? 'matched at least one' : d.mode === 'exclude' ? 'passed the filter' : `matched all ${d.n}`;
        return <><span style={{ color: '#FDD405' }}>{d.count} stock{d.count > 1 ? 's' : ''}</span> {tail}!</>;
    };

    // Render a scanner button. Selected = yellow outline + badge (a check for a
    // single pick, the pick order 1-3 in a combo). Once 3 are picked the rest keep
    // their normal look but can't be selected until one is removed.
    const ScannerBtn = ({ name }) => {
        const isSel   = selected.has(name);
        const isMaxed = !isSel && atMax;

        return (
            <button
                key={name}
                disabled={scanning || isMaxed}
                title={isMaxed ? `You can combine up to ${MAX_SCANNERS} scanners` : undefined}
                aria-pressed={isSel}
                onClick={() => toggleScanner(name)}
                className={`relative px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all
                            ${isMaxed
                                // Same resting look as any unpicked scanner (no grey-out),
                                // just unclickable and with no hover highlight.
                                ? `cursor-not-allowed select-none bg-zinc-50 border-zinc-200 text-zinc-600
                                   dark:bg-zinc-800/60 dark:border-white/8 dark:text-zinc-300`
                                : scanning
                                ? 'opacity-40 cursor-not-allowed'
                                : isSel
                                ? 'cursor-pointer border-[#FDD405] bg-[#FDD405]/10 text-zinc-900 dark:text-white'
                                : `cursor-pointer bg-zinc-50 border-zinc-200 text-zinc-600
                                   dark:bg-zinc-800/60 dark:border-white/8 dark:text-zinc-300
                                   ${HOVER_CLASS}`
                            }`}
            >
                {isSel && (
                    <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
                          style={{ backgroundColor: '#FDD405' }}>
                        {isCombo ? names.indexOf(name) + 1 : <Check size={9} strokeWidth={3} className="text-black" />}
                    </span>
                )}
                {name}
            </button>
        );
    };

    return (
        <SlideUpModal
            panelRef={panelRef}
            darkPanelClass="dark:bg-[#161616] dark:border-white/10"
            headerBorderClass="border-zinc-100 dark:border-white/8"
            onClose={onClose}
            closeDisabled={scanning}
            titleBlock={
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">Stock Scanners</h2>
                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        Pick up to {MAX_SCANNERS} · combine · run scan
                    </p>
                </div>
            }
            tabGroup={
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex-1 sm:flex-none">
                    {[{ key: 'nifty500', label: 'Nifty 500' }, { key: 'all_nse', label: 'All NSE' }].map(({ key, label }) => (
                        <button
                            key={key}
                            disabled={scanning}
                            onClick={() => setUniverse(key)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-200 select-none disabled:opacity-50
                                ${universe === key
                                    ? 'text-zinc-900 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
                            style={universe === key ? { backgroundColor: '#FDD405' } : {}}
                        >{label}</button>
                    ))}
                </div>
            }
        >

                {/* Loading overlay */}
                {scanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white dark:bg-[#1a1a1a]">
                        <div className="text-5xl" style={{ animation: 'bounce 2s infinite' }}>
                            {isCombo ? '🎯' : (SCANNER_EMOJI[scannerName] || '🔍')}
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-center px-6">
                            <p className="text-[16px] font-bold text-zinc-900 dark:text-white">
                                {isCombo
                                    ? <>Running <span style={{ color: '#FDD405' }}>{scannerName}</span></>
                                    : <>Scanning for <span style={{ color: '#FDD405' }}>{scannerName}</span></>}
                            </p>
                            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                                {universe === 'nifty500' ? 'Nifty 500' : 'All NSE'} stocks
                                {isCombo && progress && ` · ${progress.done} of ${progress.total} scanners done`}
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
                        <button
                            onClick={onClose}
                            className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium
                                text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                                border border-zinc-200 dark:border-zinc-700
                                hover:bg-zinc-100 dark:hover:bg-zinc-800
                                transition-all duration-150">
                            Cancel
                        </button>
                    </div>
                )}

                {/* Scan-complete flash */}
                {scanDone && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white dark:bg-[#1a1a1a] px-6 text-center"
                         style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div className="text-5xl" style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                            {scanDone.count > 0 ? '🎯' : '🔍'}
                        </div>
                        <p className="text-[18px] font-bold text-zinc-900 dark:text-white" style={{ animation: 'fadeIn 0.3s 0.15s ease-out both' }}>
                            {doneHeadline(scanDone)}
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
                <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

                    {/* ── SAVED COMBOS ── */}
                    {saved.length > 0 && (
                        <>
                            <div data-testid="scanner-saved-combos">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: '#FDD405' }} />
                                    <Bookmark size={13} style={{ color: '#FDD405' }} />
                                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#FDD405' }}>Saved Combos</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pl-3">
                                    {saved.map(c => (
                                        <span key={c.id}
                                              className="group inline-flex items-center max-w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:border-white/8 dark:bg-zinc-800/60">
                                            <button
                                                disabled={scanning}
                                                onClick={() => applySaved(c)}
                                                title={`${c.name} · ${c.universe === 'all_nse' ? 'All NSE' : 'Nifty 500'}`}
                                                className="min-w-0 truncate pl-3 pr-1.5 py-1.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white disabled:opacity-40"
                                            >
                                                <span className="mr-1 text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                                                    {MODES.find(m => m.key === c.mode)?.short}
                                                </span>
                                                {c.name}
                                            </button>
                                            <button
                                                disabled={scanning}
                                                onClick={() => handleDeleteSaved(c.id)}
                                                aria-label={`Delete saved combo ${c.name}`}
                                                className="pr-2 pl-0.5 py-1.5 text-zinc-400 hover:text-red-500 disabled:opacity-40"
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-zinc-100 dark:border-white/8" />
                        </>
                    )}

                    {/* ── TECHNICAL PATTERNS ── */}
                    <div>
                        {/* Main header */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: '#FDD405' }} />
                            <TrendingUp size={13} style={{ color: '#FDD405' }} />
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#FDD405' }}>Technical Patterns</span>
                        </div>

                        <div className="space-y-4 pl-3">
                            {/* Candlestick Patterns sub-header */}
                            <div>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <BarChart2 size={12} className="text-zinc-500 dark:text-zinc-300" />
                                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-300">Candlestick Patterns</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {CANDLESTICK_PATTERNS.map(s => <ScannerBtn key={s.name} name={s.name} />)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section divider */}
                    <div className="border-t border-zinc-100 dark:border-white/8" />

                    {/* ── MOMENTUM INDICATORS ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: '#FDD405' }} />
                            <BarChart2 size={13} style={{ color: '#FDD405' }} />
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#FDD405' }}>Momentum Indicators</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-3">
                            {MOMENTUM_SCANNERS.map(s => <ScannerBtn key={s.name} name={s.name} />)}
                        </div>
                    </div>

                    {/* Section divider */}
                    <div className="border-t border-zinc-100 dark:border-white/8" />

                    {/* ── FUNDAMENTAL SCREENS ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: '#FDD405' }} />
                            <BookOpen size={13} style={{ color: '#FDD405' }} />
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#FDD405' }}>Fundamental Screens</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-3">
                            {FUNDAMENTAL_SCANNER_NAMES.map(name => <ScannerBtn key={name} name={name} />)}
                        </div>
                    </div>

                </div>

                {/* Run bar — appears when anything is selected */}
                {selected.size > 0 && !scanning && !scanDone && (
                    <div className="px-4 py-3 border-t flex-shrink-0 space-y-2.5"
                         style={{ borderColor: 'rgba(253,212,5,0.3)', background: 'rgba(253,212,5,0.06)' }}>

                        {/* Combine mode — only meaningful with 2+ scanners */}
                        {isCombo && (
                            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900" role="radiogroup" aria-label="Combine mode">
                                {MODES.map(m => (
                                    <button
                                        key={m.key}
                                        role="radio"
                                        aria-checked={mode === m.key}
                                        data-testid={`scanner-mode-${m.key}`}
                                        onClick={() => setMode(m.key)}
                                        className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all
                                            ${mode === m.key
                                                ? 'text-zinc-900 shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                                        style={mode === m.key ? { backgroundColor: '#FDD405' } : {}}
                                    >{m.label}</button>
                                ))}
                            </div>
                        )}

                        {/* Exclude target — which selected scanner is the NOT */}
                        {isCombo && mode === 'exclude' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Exclude:</span>
                                {names.map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setExclude(n)}
                                        aria-pressed={excludeEff === n}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all
                                            ${excludeEff === n
                                                ? 'border-red-400/60 bg-red-500/10 text-red-600 line-through dark:text-red-400'
                                                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300'}`}
                                    >{n}</button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-zinc-900 dark:text-white leading-tight truncate"
                                   title={isCombo ? comboLabel(names, mode, excludeEff) : names[0]}>
                                    {isCombo ? comboLabel(names, mode, excludeEff) : names[0]}
                                </p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                                    {isCombo
                                        ? comboSummary(names, mode, excludeEff)
                                        : `Add up to ${MAX_SCANNERS - 1} more to combine`}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelected(new Set())}
                                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors px-1 py-1 flex-shrink-0"
                            >
                                Clear
                            </button>
                            {isCombo && (
                                <button
                                    onClick={handleSave}
                                    disabled={alreadySaved || !userId}
                                    data-testid="scanner-save-combo"
                                    title={alreadySaved ? 'Saved' : 'Save this combination'}
                                    aria-label={alreadySaved ? 'Combination saved' : 'Save this combination'}
                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:cursor-default transition-colors"
                                >
                                    <Star size={13} fill={alreadySaved ? '#FDD405' : 'none'} style={alreadySaved ? { color: '#FDD405' } : {}} />
                                </button>
                            )}
                            <button
                                onClick={handleRunScan}
                                data-testid="scanner-run-button"
                                className="flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold text-zinc-900 transition-all hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: '#FDD405' }}
                            >
                                Run Scan →
                            </button>
                        </div>

                        {conflicts.length > 0 && (
                            <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-amber-700 dark:text-amber-400">
                                <AlertTriangle size={11} className="mt-[1px] flex-shrink-0" />
                                <span>
                                    {conflicts.map(([a, b]) => `${a} and ${b}`).join('; ')} can't fire on the same stock.
                                    {' '}Try “Match any” or “Exclude one”.
                                </span>
                            </p>
                        )}
                    </div>
                )}

                {/* Footer */}
                {selected.size === 0 && (
                    <div className="px-5 py-3 border-t border-zinc-100 dark:border-white/8 flex-shrink-0">
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center">
                            Combine up to {MAX_SCANNERS} scanners · Nifty 500 or All NSE · Real market data
                        </p>
                    </div>
                )}
        </SlideUpModal>
    );
};

export default ScannerPanel;
