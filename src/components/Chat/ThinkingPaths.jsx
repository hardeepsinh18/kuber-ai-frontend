import { useState, useEffect, useRef } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../../context/ThemeContext';

const ThinkingPaths = ({ steps = [], isThinking = true, className = '', processingTime = 0, noPadding = false }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleSteps, setVisibleSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
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

    // Step index advances while thinking
    useEffect(() => {
        if (isThinking && steps.length > 0) {
            setCurrentStepIndex(0);
            const interval = setInterval(() => {
                setCurrentStepIndex(prev => prev < steps.length - 1 ? prev + 1 : prev);
            }, 800);
            return () => clearInterval(interval);
        }
    }, [isThinking, steps.length]);

    // Reveal completed steps one by one
    useEffect(() => {
        revealTimeoutsRef.current.forEach(clearTimeout);
        revealTimeoutsRef.current = [];
        if (!isThinking && steps.length > 0) {
            setVisibleSteps([]);
            revealTimeoutsRef.current = steps.map((step, index) =>
                setTimeout(() => setVisibleSteps(prev => [...prev, step]), index * 80)
            );
        } else if (isThinking) {
            setVisibleSteps([]);
        }
        return () => { revealTimeoutsRef.current.forEach(clearTimeout); revealTimeoutsRef.current = []; };
    }, [steps, isThinking]);

    const defaultThinkingSteps = [
        'Analyzing query...',
        'Extracting stock symbols...',
        'Fetching market data...',
        'Running technical analysis...',
        'Calculating indicators...',
        'Retrieving analyst views...',
        'Compiling insights...',
        'Finalizing response...',
    ];

    const activeSteps = isThinking ? defaultThinkingSteps : steps;
    const currentStep = isThinking ? activeSteps[currentStepIndex] : null;
    const displayTime = isThinking ? (elapsed / 1000).toFixed(1) : processingTime.toFixed(1);

    if (!isThinking && steps.length === 0) return null;

    return (
        <div className={clsx('animate-in fade-in slide-in-from-bottom-2 duration-300', className)}>

                {isThinking ? (
                    /* ── Thinking state card ── */
                    <div className="rounded-xl" style={{
                        background: isDark ? 'rgba(253,212,5,0.07)' : 'rgba(253,212,5,0.15)',
                        border: isDark ? '1px solid rgba(253,212,5,0.28)' : '1px solid rgba(253,212,5,0.55)',
                    }}>
                        {/* Header */}
                        <div className="flex items-center gap-2.5 px-4 py-2.5">
                            <Cpu size={13} style={{ color: isDark ? '#FDD405' : '#111', flexShrink: 0 }} />
                            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: isDark ? '#FDD405' : '#111' }}>
                                Analyzing
                                <span className="flex gap-[3px]">
                                    {['-0.3s', '-0.15s', '0s'].map((delay, i) => (
                                        <span key={i} className="w-[5px] h-[5px] rounded-full animate-bounce"
                                            style={{ backgroundColor: '#FDD405', animationDelay: delay }} />
                                    ))}
                                </span>
                            </span>
                            <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: isDark ? '#FDD405' : '#111' }}>
                                {displayTime}s
                            </span>
                        </div>
                        {/* Current step */}
                        {currentStep && (
                            <div className="px-4 pb-3" style={{ borderTop: isDark ? '1px solid rgba(253,212,5,0.15)' : '1px solid rgba(253,212,5,0.3)' }}>
                                <p className="pt-2.5 text-xs leading-relaxed" style={{ color: isDark ? 'rgba(253,212,5,0.65)' : '#444' }}>
                                    {currentStep}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Done state: theme-aware collapsible card ── */
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
                                        className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 animate-in fade-in slide-in-from-left-2"
                                        style={{ animationDelay: `${index * 25}ms` }}>
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
