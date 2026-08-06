import { useState, useEffect, useRef } from 'react';
import { Cpu, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../../context/ThemeContext';

/**
 * Provenance panel — shows the work the backend actually did.
 *
 * Two sources, one component:
 *  - `liveSteps` arrive over SSE while the request is in flight, each as a
 *    present-tense label that RESOLVES IN PLACE into its factual result
 *    ({id, phase:'start'|'done', text, ok}).
 *  - `steps` is the settled list from `trace.steps`, used for the non-streaming
 *    fallback and when re-reading a chat from history.
 *
 * Nothing here invents a step. No steps means no panel.
 */

const ROLLING_WINDOW = 3;   // in-flight lines kept on screen at once
const REVEAL_STAGGER_MS = 60;

// Shared frozen default. A `= []` default literal allocates a new array on every
// render, and the reveal effect below keys off `steps` identity — with an omitted
// prop that means effect → setState → render → new [] → effect, forever. The
// thinking card renders without a `steps` prop, so this is a live path.
const NO_STEPS = Object.freeze([]);

// Header phrasing.
//
// A PHASE phrase is shown only while that kind of work is actually running, so
// the header describes the pipeline rather than decorating it — "Digging through
// filings" appears when, and only when, the document search is open.
const PHASE_PHRASES = {
    intent: 'Reading the question',
    symbol: 'Identifying the company',
    quote: 'Connecting market signals',
    ohlcv: 'Reading the price action',
    fundamentals: 'Validating evidence',
    documents: 'Digging through filings',
    news: 'Searching for catalysts',
    screen: 'Ranking opportunities',
    compose: 'Synthesizing research',
    note: 'Checking what we already know',
};

// AMBIENT phrases cover the gap before the first step lands and the pauses
// between steps. They are deliberately non-specific: each describes a posture,
// never a source. None of them may imply data we haven't touched — that is the
// same rule the step list follows.
const AMBIENT_PHRASES = [
    'Hunting for signals',
    'Connecting the dots',
    'Separating signal from noise',
    'Looking beneath the numbers',
    'Reading between the lines',
    'Finding opportunities',
    'Weighing risks',
    'Building investment thesis',
    'Measuring conviction',
    'Stress-testing assumptions',
];

const AMBIENT_ROTATE_MS = 2400;
const PHRASE_MIN_HOLD_MS = 800;   // stops fast steps strobing the header

const ThinkingPaths = ({
    steps = NO_STEPS,
    liveSteps = NO_STEPS,
    isThinking = true,
    className = '',
    processingTime = 0,
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleSteps, setVisibleSteps] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const revealTimeoutsRef = useRef([]);
    const startTimeRef = useRef(null);
    const timerRef = useRef(null);

    // Continuous timer — updates every 50ms
    useEffect(() => {
        if (isThinking) {
            startTimeRef.current = performance.now();
            setElapsed(0);
            timerRef.current = setInterval(() => {
                setElapsed(performance.now() - startTimeRef.current);
            }, 50);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isThinking]);

    // Settled list reveals on a light stagger so it reads as a list, not a dump.
    useEffect(() => {
        revealTimeoutsRef.current.forEach(clearTimeout);
        revealTimeoutsRef.current = [];
        if (!isThinking && steps.length > 0) {
            setVisibleSteps([]);
            revealTimeoutsRef.current = steps.map((step, index) =>
                setTimeout(() => setVisibleSteps(prev => [...prev, step]), index * REVEAL_STAGGER_MS)
            );
        } else if (isThinking) {
            // Functional no-op when already empty: never hand React a fresh []
            // it will treat as a state change and re-render for.
            setVisibleSteps(prev => (prev.length ? [] : prev));
        }
        return () => { revealTimeoutsRef.current.forEach(clearTimeout); revealTimeoutsRef.current = []; };
    }, [steps, isThinking]);

    // Rotate the ambient phrase, starting somewhere random so two queries in a
    // row don't open with the same word.
    const ambientSeedRef = useRef(Math.floor(Math.random() * AMBIENT_PHRASES.length));
    const [ambientTick, setAmbientTick] = useState(0);
    useEffect(() => {
        if (!isThinking) return undefined;
        const id = setInterval(() => setAmbientTick(t => t + 1), AMBIENT_ROTATE_MS);
        return () => clearInterval(id);
    }, [isThinking]);

    // The newest still-running step decides the phrase; otherwise we're between
    // steps (or haven't had one yet) and the ambient rotation carries it.
    let phraseTarget = AMBIENT_PHRASES[(ambientSeedRef.current + ambientTick) % AMBIENT_PHRASES.length];
    for (let i = liveSteps.length - 1; i >= 0; i -= 1) {
        if (liveSteps[i].phase === 'start') {
            phraseTarget = PHASE_PHRASES[liveSteps[i].kind] || phraseTarget;
            break;
        }
    }

    // Hold each phrase briefly. Some steps finish in milliseconds and without
    // this the header flickers through three words in one blink.
    const [phrase, setPhrase] = useState(phraseTarget);
    const lastPhraseAtRef = useRef(0);
    useEffect(() => {
        if (phraseTarget === phrase) return undefined;
        const wait = Math.max(0, PHRASE_MIN_HOLD_MS - (performance.now() - lastPhraseAtRef.current));
        const id = setTimeout(() => {
            setPhrase(phraseTarget);
            lastPhraseAtRef.current = performance.now();
        }, wait);
        return () => clearTimeout(id);
    }, [phraseTarget, phrase]);

    const displayTime = isThinking ? (elapsed / 1000).toFixed(1) : processingTime.toFixed(1);

    // Nothing verified to show — render nothing rather than a placeholder.
    if (!isThinking && steps.length === 0) return null;

    // Only the newest few in-flight lines stay on screen, so the card doesn't
    // grow to a wall of text while the answer is still being worked out.
    const windowed = liveSteps.slice(-ROLLING_WINDOW);
    const accent = isDark ? '#FDD405' : '#111';

    return (
        <div className={clsx('animate-in fade-in slide-in-from-bottom-2 duration-300', className)}>
            <style>{`
                @keyframes kb-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
                @keyframes kb-pop { 0% { transform: scale(1) } 45% { transform: scale(1.45) } 100% { transform: scale(1) } }
                .kb-live-text {
                    background: linear-gradient(90deg,
                        var(--kb-dim) 0%, var(--kb-dim) 35%,
                        var(--kb-bright) 50%,
                        var(--kb-dim) 65%, var(--kb-dim) 100%);
                    background-size: 200% 100%;
                    -webkit-background-clip: text; background-clip: text;
                    color: transparent;
                    animation: kb-shimmer 1.6s linear infinite;
                }
                .kb-dot-done { animation: kb-pop 260ms cubic-bezier(.16,1,.3,1); }
                .kb-row { animation: kb-rise 200ms cubic-bezier(.16,1,.3,1) both; }
                @keyframes kb-rise { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
                .kb-phrase { animation: kb-swap 320ms cubic-bezier(.16,1,.3,1) both; }
                @keyframes kb-swap { from { opacity: 0; transform: translateY(-3px) } to { opacity: 1; transform: none } }
                @media (prefers-reduced-motion: reduce) {
                    .kb-live-text { animation: none; color: var(--kb-bright); background: none; -webkit-text-fill-color: currentColor; }
                    .kb-dot-done, .kb-row, .kb-phrase { animation: none; }
                }
            `}</style>

            {isThinking ? (
                /* ── Working: steps stream in and resolve in place ── */
                <div className="rounded-xl overflow-hidden transition-all duration-300" style={{
                    background: isDark ? 'rgba(253,212,5,0.07)' : 'rgba(253,212,5,0.15)',
                    border: isDark ? '1px solid rgba(253,212,5,0.28)' : '1px solid rgba(253,212,5,0.55)',
                }}>
                    <div className="flex items-center gap-2.5 px-4 py-2.5">
                        <Cpu size={13} style={{ color: accent, flexShrink: 0 }} />
                        <span className="flex items-center gap-1.5 text-xs font-medium flex-1 min-w-0"
                              style={{ color: accent }}>
                            {/* Keyed so each new phrase re-mounts and plays the swap. */}
                            <span key={phrase} className="kb-phrase truncate" aria-live="polite">
                                {phrase}
                            </span>
                            <span className="flex gap-[3px] flex-shrink-0" aria-hidden="true">
                                {['-0.3s', '-0.15s', '0s'].map((delay, i) => (
                                    <span key={i} className="w-[5px] h-[5px] rounded-full animate-bounce"
                                        style={{ backgroundColor: '#FDD405', animationDelay: delay }} />
                                ))}
                            </span>
                        </span>
                        <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: accent }}>
                            {displayTime}s
                        </span>
                    </div>

                    {windowed.length > 0 && (
                        <ul className="px-4 pb-3 space-y-1.5"
                            style={{ borderTop: isDark ? '1px solid rgba(253,212,5,0.15)' : '1px solid rgba(253,212,5,0.3)' }}
                            aria-live="polite">
                            {windowed.map((step) => {
                                const running = step.phase === 'start';
                                const failed = step.phase === 'done' && step.ok === false;
                                return (
                                    <li key={step.id}
                                        className="kb-row flex items-start gap-2 text-xs leading-relaxed pt-2.5 first:pt-2.5">
                                        <span className="mt-[5px] flex-shrink-0" aria-hidden="true">
                                            {running ? (
                                                <span className="block w-[5px] h-[5px] rounded-full animate-pulse"
                                                      style={{ backgroundColor: '#FDD405' }} />
                                            ) : failed ? (
                                                <AlertCircle size={9} className="kb-dot-done"
                                                             style={{ color: isDark ? 'rgba(253,212,5,0.5)' : '#8a6d00' }} />
                                            ) : (
                                                <Check size={9} className="kb-dot-done"
                                                       style={{ color: isDark ? 'rgba(253,212,5,0.75)' : '#3f3f46' }} />
                                            )}
                                        </span>
                                        <span
                                            className={clsx('min-w-0', running && 'kb-live-text')}
                                            style={{
                                                '--kb-dim': isDark ? 'rgba(253,212,5,0.40)' : 'rgba(60,60,60,0.55)',
                                                '--kb-bright': isDark ? 'rgba(253,212,5,0.95)' : '#111',
                                                color: running ? undefined : (isDark ? 'rgba(253,212,5,0.62)' : '#444'),
                                            }}
                                        >
                                            {step.text}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            ) : (
                /* ── Settled: collapsible summary ── */
                <div
                    className="rounded-xl border cursor-pointer transition-all duration-200
                               bg-white/80 border-[#FDD405]/50 hover:bg-white hover:border-[#FDD405]
                               dark:bg-zinc-900/30 dark:border-zinc-700/40 dark:hover:bg-zinc-800/30 dark:hover:border-zinc-700/40"
                    onClick={() => setIsExpanded(!isExpanded)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
                    aria-expanded={isExpanded}
                >
                    <div className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                            <Cpu size={13} className="text-zinc-600 dark:text-zinc-500" />
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-500">Analysis steps</span>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                {steps.length} step{steps.length === 1 ? '' : 's'}
                            </span>
                            {processingTime > 0 && (
                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#FDD405]/25 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-400">
                                    {displayTime}s
                                </span>
                            )}
                        </div>
                        <ChevronDown size={14}
                            className={clsx('text-zinc-500 dark:text-zinc-500 transition-transform duration-200', isExpanded && 'rotate-180')} />
                    </div>

                    {isExpanded && visibleSteps.length > 0 && (
                        <ul className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800/40 pt-2.5 space-y-1.5">
                            {visibleSteps.map((step, index) => (
                                <li key={index}
                                    className="kb-row flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
                                    <span className="leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThinkingPaths;
