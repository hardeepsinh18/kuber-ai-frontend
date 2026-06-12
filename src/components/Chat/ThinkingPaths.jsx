import { useState, useEffect, useRef } from 'react';
import { BarChart2, ChevronDown, Cpu } from 'lucide-react';
import { clsx } from 'clsx';

const ThinkingPaths = ({ steps = [], isThinking = true, className = '', processingTime = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleSteps, setVisibleSteps] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const revealTimeoutsRef = useRef([]);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    // Live timer while thinking
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

    // Reveal completed steps one by one
    useEffect(() => {
        revealTimeoutsRef.current.forEach(clearTimeout);
        revealTimeoutsRef.current = [];

        if (!isThinking && steps.length > 0) {
            setVisibleSteps([]);
            revealTimeoutsRef.current = steps.map((step, index) =>
                setTimeout(() => {
                    setVisibleSteps(prev => [...prev, step]);
                }, index * 80)
            );
        } else if (isThinking) {
            setVisibleSteps([]);
        }

        return () => {
            revealTimeoutsRef.current.forEach(clearTimeout);
            revealTimeoutsRef.current = [];
        };
    }, [steps, isThinking]);

    if (!isThinking && steps.length === 0) return null;

    // While thinking — Analyzing card with live timer
    if (isThinking) {
        const secs = (elapsed / 1000).toFixed(1);
        return (
            <div className={clsx('w-full mb-4', className)}>
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
                    <div className="inline-flex flex-col gap-1.5 px-4 py-3 rounded-xl
                                    bg-zinc-50 border border-zinc-200
                                    dark:bg-white/[0.04] dark:border-zinc-700/30">
                        {/* Top row: icon + Analyzing + dots + timer */}
                        <div className="flex items-center gap-2.5">
                            <Cpu size={14} className="text-[#FDD405] flex-shrink-0" />
                            <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
                                Analyzing
                            </span>
                            {/* Animated dots */}
                            <span className="flex items-center gap-[3px]">
                                {[0, 1, 2].map(i => (
                                    <span key={i}
                                        className="w-[4px] h-[4px] rounded-full bg-[#FDD405]"
                                        style={{
                                            animation: 'dotBounce 1.2s ease-in-out infinite',
                                            animationDelay: `${i * 0.2}s`,
                                        }}
                                    />
                                ))}
                            </span>
                            {/* Live timer */}
                            <span className="ml-1 text-[12px] font-mono font-medium tabular-nums"
                                  style={{ color: '#FDD405' }}>
                                {secs}s
                            </span>
                        </div>
                        {/* Subtext */}
                        <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 pl-[22px]">
                            Analyzing query...
                        </p>
                    </div>
                </div>
                <style>{`
                    @keyframes dotBounce {
                        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                        40% { transform: translateY(-4px); opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    // After response — collapsible "Analysis steps" header
    const displayTime = processingTime.toFixed(1);

    return (
        <div className={clsx('w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300', className)}>
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
                <div
                    className="rounded-xl border cursor-pointer transition-all duration-200
                                bg-zinc-50 border-zinc-200 hover:bg-zinc-100
                                dark:bg-white/[0.04] dark:border-zinc-700/30 dark:hover:bg-white/[0.07]"
                    onClick={() => setIsExpanded(!isExpanded)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
                    aria-expanded={isExpanded}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                            <BarChart2 size={13} className="text-zinc-400 dark:text-zinc-500" />
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                                Analysis steps
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md
                                             bg-amber-100 text-amber-700
                                             dark:bg-amber-950/40 dark:text-[#FDD405]">
                                Answered in {displayTime}s
                            </span>
                        </div>
                        <ChevronDown
                            size={14}
                            className={clsx(
                                'text-zinc-400 dark:text-zinc-500 transition-transform duration-200',
                                isExpanded && 'rotate-180'
                            )}
                        />
                    </div>

                    {/* Steps list when expanded */}
                    {isExpanded && visibleSteps.length > 0 && (
                        <ul className="px-4 pb-3 border-t border-zinc-200 dark:border-zinc-700/25 pt-2.5 space-y-1.5">
                            {visibleSteps.map((step, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 animate-in fade-in slide-in-from-left-2"
                                    style={{ animationDelay: `${index * 25}ms` }}
                                >
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
                                    <span className="leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThinkingPaths;
