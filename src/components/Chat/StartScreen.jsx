import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ScanLine, Rocket, BarChart3, TrendingUp, LineChart, GitCompareArrows,
         Trophy, Coins } from 'lucide-react';
import ScannerPanel from './ScannerPanel';
import IpoPanel from './IpoPanel';
import CompanySuggest from './CompanySuggest';
import { useCompanySuggest } from '../../hooks/useCompanySuggest';
import { INNER_CARD_DARK } from './answerKit';

// The same six starters, each tagged with the KIND of question it is. Tag +
// icon turn a flat wall of similar-looking sentences into a scannable menu:
// the eye lands on "Fundamentals" / "Compare" / "Screener" first and only then
// reads the sentence. Query strings are unchanged — this is presentation.
const QUERIES = [
    { tag: 'Fundamentals', Icon: BarChart3,        q: 'Show me TCS fundamentals and valuation',      short: 'TCS fundamentals & valuation' },
    { tag: 'Verdict',      Icon: TrendingUp,       q: 'Should I buy Reliance?',                       short: 'Should I buy Reliance?' },
    { tag: 'Chart',        Icon: LineChart,        q: 'Show Nifty 50 chart for last 6 months',        short: 'Nifty 50 chart, 6 months' },
    { tag: 'Compare',      Icon: GitCompareArrows, q: 'Compare HDFC Bank vs ICICI Bank on financials', short: 'HDFC Bank vs ICICI Bank' },
    { tag: 'Screener',     Icon: Trophy,           q: 'Which mid-cap stocks have best ROE on NSE?',   short: 'Best mid-cap ROE on NSE' },
    { tag: 'Dividends',    Icon: Coins,            q: 'Top PSU stocks by dividend yield',             short: 'Top PSU dividend yields' },
];

const MODES = [
    { key: 'analyst', label: 'Analyst' },
    { key: 'snap',    label: 'Quick'   },
];

const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

const StartScreen = ({ onStartChat, onScannerResult, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [ipoOpen, setIpoOpen] = useState(false);
    const inputRef = useRef(null);
    const boxRef = useRef(null);

    const autoResize = useCallback((el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }, []);

    const suggest = useCompanySuggest({
        value: input,
        anchorRef: boxRef,
        onSelect: (newValue) => {
            setInput(newValue);
            setTimeout(() => inputRef.current?.focus(), 0);
        },
    });

    const send = () => { if (input.trim()) onStartChat(input, 'stock'); };
    const onKey = (e) => {
        if (suggest.onKeyDown(e)) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <>
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto
                            py-6 sm:py-8 gap-5 sm:gap-6">
                <div className="w-full flex flex-col items-center gap-5 sm:gap-6 my-auto">

                {/* Headline + Input card — narrower container */}
                <div className="w-full max-w-[660px] px-4 sm:px-6">

                    {/* Headline */}
                    <motion.h1 {...fadeUp(0)}
                        className="text-center font-bold tracking-[-0.025em] leading-[1.2]
                                   mb-6 sm:mb-8 px-2 sm:px-0"
                        style={{ fontSize: 'clamp(1.15rem, 2.8vw, 2.6rem)' }}>
                        <span className="text-zinc-900 dark:text-white">Got a question about markets</span><br />
                        <span className="text-zinc-500 dark:text-zinc-400">or stocks?</span>
                    </motion.h1>

                    {/* Input card */}
                    <motion.div {...fadeUp(0.08)}>
                        <div ref={boxRef} className="group relative p-[1px] rounded-2xl transition-all duration-300"
                             style={{
                                 background: 'linear-gradient(135deg, rgba(253,212,5,0.55) 0%, rgba(253,212,5,0.25) 50%, rgba(253,212,5,0.55) 100%)',
                                 boxShadow: '0 0 20px rgba(253,212,5,0.12), 0 0 50px rgba(253,212,5,0.06)'
                             }}>
                            <CompanySuggest {...suggest.dropdownProps} direction="down" />
                            {/* Same soft gradient fill as the chat composer (InputBar)
                                so the two never read as different surfaces. */}
                            <div className="rounded-[15px] overflow-hidden
                                            bg-gradient-to-b
                                            from-white to-[#FBF9F2]
                                            dark:from-[#171717] dark:to-[#101010]">

                                <textarea
                                    ref={inputRef}
                                    rows={2}
                                    value={input}
                                    onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                                    onKeyDown={onKey}
                                    placeholder="Ask VentyAI anything finance..."
                                    /* QA-C-010: match the API's own ceiling
                                       (ChatRequest.query max_length=2000). */
                                    maxLength={2000}
                                    style={{ resize: 'none', overflow: 'hidden', minHeight: '48px' }}
                                    className="w-full px-4 pt-3.5 pb-2 bg-transparent outline-none border-none
                                               text-[13.5px] text-zinc-900 dark:text-zinc-100
                                               placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                    autoFocus
                                />


                                <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                                    {/* Left group: mode toggle + scanner */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-900 flex-shrink-0">
                                            {MODES.map((mode) => {
                                                const isActive = responseMode === mode.key;
                                                return (
                                                    <button
                                                        key={mode.key}
                                                        type="button"
                                                        onClick={() => setResponseMode(mode.key)}
                                                        className={clsx(
                                                            'px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 select-none',
                                                            isActive
                                                                ? 'text-zinc-900 shadow-sm'
                                                                : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                        )}
                                                        style={isActive ? { backgroundColor: '#FDD405' } : {}}
                                                    >
                                                        {mode.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setScannerOpen(true)}
                                            title="Scanners"
                                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0
                                                       text-zinc-500 dark:text-zinc-400
                                                       hover:text-zinc-900 dark:hover:text-zinc-100
                                                       border border-zinc-300/60 dark:border-zinc-700/60
                                                       hover:border-[#FDD405]/60 dark:hover:border-[#FDD405]/50
                                                       hover:bg-amber-50/40 dark:hover:bg-amber-950/15
                                                       transition-all duration-150">
                                            <ScanLine size={12} />
                                            <span className="hidden sm:inline">Scanners</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIpoOpen(true)}
                                            title="IPOs"
                                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0
                                                       text-zinc-500 dark:text-zinc-400
                                                       hover:text-zinc-900 dark:hover:text-zinc-100
                                                       border border-zinc-300/60 dark:border-zinc-700/60
                                                       hover:border-[#FDD405]/60 dark:hover:border-[#FDD405]/50
                                                       hover:bg-amber-50/40 dark:hover:bg-amber-950/15
                                                       transition-all duration-150">
                                            <Rocket size={12} />
                                            <span className="hidden sm:inline">IPOs</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={send}
                                        disabled={!input.trim()}
                                        aria-label="Send"
                                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                                                   bg-white dark:bg-[#111111]
                                                   disabled:opacity-20 disabled:cursor-not-allowed
                                                   hover:scale-105 active:scale-95 disabled:hover:scale-100
                                                   transition-all duration-150"
                                        style={{ border: '1px solid rgba(253,212,5,0.75)', boxShadow: '0 0 6px 1px rgba(253,212,5,0.2)', color: '#FDD405' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="19" x2="19" y2="5"/>
                                            <polyline points="8 5 19 5 19 16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Starter cards. A uniform grid instead of centre-aligned pills of six
                    different widths, which left both edges ragged and read as a wall of
                    similar sentences. Cards share the answer-card surface, so the start
                    screen and the answers look like one product.
                    1 column on phones, 2 from sm, 3 from lg — the sentences are long
                    enough that 3 columns only stop wrapping on a wide screen. */}
                <motion.div {...fadeUp(0.14)}
                    className="w-full max-w-[900px] px-4 sm:px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                        {/* eslint-disable-next-line no-unused-vars -- Icon IS used below
                            as <Icon />; the rule does not track JSX component usage from
                            a destructured binding (same false positive as `motion` here). */}
                        {QUERIES.map(({ tag, Icon, q, short }, i) => (
                            <motion.button
                                key={q}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18 + i * 0.04, duration: 0.30 }}
                                onClick={() => onStartChat(q, 'stock')}
                                className={`group h-full text-left rounded-xl
                                           flex items-center gap-2.5 px-3 py-2.5
                                           sm:flex-col sm:items-stretch sm:gap-0 sm:p-3
                                           border border-zinc-200 bg-zinc-50/60
                                           dark:border-zinc-800/80 dark:bg-[${INNER_CARD_DARK}]
                                           hover:border-[#FDD405]/60 hover:bg-[#FDD405]/[0.05]
                                           dark:hover:border-[#FDD405]/50 dark:hover:bg-[#FDD405]/[0.05]
                                           transition-colors duration-150`}>
                                {/* Icon chip carries the category on mobile, where the
                                    text tag is hidden — the row would otherwise lose its
                                    scanning cue entirely. */}
                                <span className="flex items-center gap-1.5 flex-shrink-0">
                                    <Icon size={13} className="flex-shrink-0 text-zinc-400
                                                               dark:text-zinc-500
                                                               group-hover:text-[#FDD405]
                                                               dark:group-hover:text-[#FDD405]
                                                               transition-colors sm:w-[11px] sm:h-[11px]" />
                                    <span className="hidden sm:inline text-[9px] font-extrabold uppercase
                                                     tracking-[0.14em]
                                                     text-zinc-500 dark:text-zinc-500
                                                     group-hover:text-zinc-700 dark:group-hover:text-[#FDD405]
                                                     transition-colors">
                                        {tag}
                                    </span>
                                </span>
                                {/* truncate on mobile only. Two of the six questions wrap
                                    to a second line at 360-375px, which made those cards
                                    56px against the others' 39px — the uneven look in the
                                    report. One line each keeps the column symmetrical; the
                                    full text is still sent on tap, and from sm: up there is
                                    width to wrap normally. */}
                                <span className="block min-w-0 text-[12.5px] leading-snug font-medium
                                                 sm:mt-1.5
                                                 text-zinc-700 dark:text-zinc-300
                                                 group-hover:text-zinc-900 dark:group-hover:text-white
                                                 transition-colors">
                                    {/* Short label on a phone so every row is ONE line and the
                                        six cards share a height — two of the full sentences wrap
                                        at 360-375px, which is the uneven look being fixed. The
                                        full sentence is still what gets SENT on tap; only the
                                        label differs. */}
                                    <span className="sm:hidden">{short}</span>
                                    <span className="hidden sm:inline">{q}</span>
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
                </div>

            </div>
        </div>

        {scannerOpen && (
            <ScannerPanel
                onSelectScanner={onScannerResult || ((msg) => onStartChat(msg, 'stock'))}
                onClose={() => setScannerOpen(false)}
            />
        )}

        {ipoOpen && (
            <IpoPanel onClose={() => setIpoOpen(false)} />
        )}
    </>
    );
};

export default StartScreen;
