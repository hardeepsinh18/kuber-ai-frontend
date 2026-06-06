import { useState, useEffect, useRef } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

const ThinkingPaths = ({ steps = [], isThinking = true, className = '', processingTime = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleSteps, setVisibleSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    // Track reveal timeouts so we can clean up on unmount
    const revealTimeoutsRef = useRef([]);

    // Elapsed timer — 500ms tick is plenty for a "X.Xs" display
    useEffect(() => {
        if (isThinking) {
            setElapsedTime(0);
            const interval = setInterval(() => {
                setElapsedTime(prev => prev + 0.5);
            }, 500);
            return () => clearInterval(interval);
        }
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

    // Reveal completed steps one by one — clean up all timeouts on unmount
    useEffect(() => {
        // Clear any pending reveals from the previous run
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
    const displayTime = isThinking ? elapsedTime.toFixed(1) : processingTime.toFixed(1);

    if (!isThinking && steps.length === 0) return null;

    return (
        <div className={clsx('w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300', className)}>
            <div className="w-full max-w-4xl mx-auto px-6">
                <div
                    className={clsx(
                        'rounded-xl border transition-all duration-200',
                        isThinking
                            ? 'bg-amber-950/20 border-amber-800/30'
                            : 'bg-zinc-900/30 border-zinc-700/40 cursor-pointer hover:bg-zinc-800/30'
                    )}
                    onClick={() => !isThinking && setIsExpanded(!isExpanded)}
                    role={!isThinking ? 'button' : undefined}
                    tabIndex={!isThinking ? 0 : undefined}
                    onKeyDown={!isThinking ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } } : undefined}
                    aria-expanded={!isThinking ? isExpanded : undefined}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                            <Cpu size={13} className={isThinking ? 'text-amber-500' : 'text-zinc-500'} />
                            <span className={clsx(
                                'text-xs font-medium',
                                isThinking ? 'text-amber-400' : 'text-zinc-500'
                            )}>
                                {isThinking ? (
                                    <span className="flex items-center gap-1.5">
                                        Analyzing
                                        <span className="flex gap-0.5">
                                            <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" />
                                        </span>
                                    </span>
                                ) : 'Analysis steps'}
                            </span>
                            {!isThinking && processingTime > 0 && (
                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400">
                                    {displayTime}s
                                </span>
                            )}
                        </div>
                        {!isThinking && (
                            <ChevronDown
                                size={14}
                                className={clsx(
                                    'text-zinc-400 dark:text-zinc-500 transition-transform duration-200',
                                    isExpanded && 'rotate-180'
                                )}
                            />
                        )}
                    </div>

                    {/* Active step while thinking */}
                    {isThinking && currentStep && (
                        <div className="px-4 pb-3 border-t border-amber-900/30">
                            <p className="pt-2.5 text-xs text-amber-400/80 leading-relaxed">
                                {currentStep}
                            </p>
                        </div>
                    )}

                    {/* Steps list when expanded */}
                    {isExpanded && !isThinking && visibleSteps.length > 0 && (
                        <ul className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800/40 pt-2.5 space-y-1.5">
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
