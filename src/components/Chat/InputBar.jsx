import { useRef, useEffect, useCallback, useState } from 'react';
import { Square, ScanLine, Rocket } from 'lucide-react';
import { clsx } from 'clsx';
import ScannerPanel from './ScannerPanel';
import IpoPanel from './IpoPanel';
import CompanySuggest from './CompanySuggest';
import ClarifyDropdown from './ClarifyDropdown';
import { useCompanySuggest } from '../../hooks/useCompanySuggest';

const QUERIES = [
    'Show me TCS fundamentals and valuation',
    'Is Reliance a good buy right now?',
    'Show Nifty 50 chart for last 6 months',
    'Compare HDFC Bank vs ICICI Bank on financials',
    'Which mid-cap stocks have best ROE on NSE?',
    'Top PSU stocks by dividend yield',
];

const MODES = [
    { key: 'snap', label: 'Quick' },
    { key: 'analyst', label: 'Analyst' },
];

const MODE_LABEL = { snap: 'Quick', analyst: 'Analyst' };

const InputBar = ({ input, setInput, handleSend, onStopRequest, isLoading, horizonQuestion = false, horizonSymbol = '', onHorizonChoice, onHorizonDismiss, companyChoices = null, onCompanyChoice, onCompanyDismiss, modeSwitch = null, onModeSwitchRun, onModeSwitchDismiss, responseMode, setResponseMode, onScannerResult }) => {
    const inputRef = useRef(null);
    const boxRef = useRef(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [ipoOpen, setIpoOpen] = useState(false);

    const autoResize = useCallback((el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }, []);

    const suggest = useCompanySuggest({
        value: input,
        anchorRef: boxRef,
        onSelect: (newValue) => {
            setInput(newValue);
            setTimeout(() => inputRef.current?.focus(), 0);
        },
    });

    useEffect(() => {
        if (!isLoading && inputRef.current) inputRef.current.focus();
    }, [isLoading]);

    useEffect(() => {
        if (!input && inputRef.current) inputRef.current.style.height = 'auto';
    }, [input]);

    const handleKeyDown = (e) => {
        if (suggest.onKeyDown(e)) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleChipClick = (query) => {
        setInput(query);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <>
        {/* The composer used to sit on an opaque strip the same height as its
            padding, which read as a second panel butted against the transcript —
            a hard horizontal seam right above the input. Now the strip is a
            gradient that starts fully transparent and eases into the page colour
            so a message scrolling underneath fades out instead of hitting an edge.
            pointer-events stay off the fade layer so the transcript below it is
            still clickable.

            The colours MUST match BackgroundEffect's chat-active background
            (#121315 dark / #F0EDE4 light). They previously ended at #0A0A0A /
            #F5F2E8 — the START-SCREEN colours — so once a chat was open the fade
            resolved to a slightly different shade than the page behind it, and the
            seam came back as a faint band between the answer and the input box.

            Taller ramp (-top-24) and a lighter midpoint so the transition reads as
            gradual rather than a step. */}
        {/* absolute, not in-flow: the parent is `relative`, so this floats OVER the
            scroller. In the flow it was a solid row and the transcript stopped dead
            at its top edge — the clipped-mid-sentence disclaimer in the report. The
            scroller carries pb-40 to reserve this height so nothing ends up
            permanently hidden underneath. */}
        {/* NO horizontal padding here — it belongs on the max-w-4xl element below.
            The gradient layers underneath must stay full-bleed, so this wrapper only
            positions; see the comment on that element for why the pairing matters.

            The right inset mirrors the strip that scrollbar-gutter: stable reserves
            inside the transcript scroller (6px, 4px under 640px — see
            ::-webkit-scrollbar in index.css). This bar is a sibling OUTSIDE that
            scroller, so it spans the full width while the answer column centres in
            the width minus that gutter; measured, the composer sat 3px right of the
            answer card without this. */}
        <div className="absolute left-0 right-[4px] sm:right-[6px] bottom-0 z-20 pb-10 pt-2 pointer-events-none">
            {/* Tall, multi-stop ramp. A 2-stop gradient still shows a faint edge where
                it meets the page; going transparent -> 40% -> 85% -> solid over ~14rem
                spreads the transition far enough that there is no perceptible seam. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 -top-56 z-0 dark:hidden"
                style={{
                    background:
                        'linear-gradient(to bottom, rgba(240,237,228,0) 0%, rgba(240,237,228,0.40) 35%, rgba(240,237,228,0.85) 65%, rgb(240,237,228) 88%)',
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 -top-56 z-0 hidden dark:block"
                style={{
                    background:
                        'linear-gradient(to bottom, rgba(18,19,21,0) 0%, rgba(18,19,21,0.40) 35%, rgba(18,19,21,0.85) 65%, rgb(18,19,21) 88%)',
                }}
            />
            {/* pointer-events re-enabled here: the wrapper disables them so clicks pass
                THROUGH the fade to the transcript underneath, but the composer itself
                must stay interactive.

                max-w-4xl and px-4 sm:px-6 md:px-8 MUST sit on the SAME element, exactly
                as the answer column does it in MessageBubble. With the padding on the
                parent instead, max-w-4xl caps a box that still has room for it, so the
                gutters never come out of the 896px — measured 896 wide against the
                answer column's 832 (= 896 - 2*32), i.e. 64px too wide at md and up,
                and 4-6px too wide below it. Keeping the pair together is what makes
                the composer line up with the card above it. */}
            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pointer-events-auto">

                <div ref={boxRef} className="w-full relative group">

                    <CompanySuggest {...suggest.dropdownProps} direction="up" />

                    {/* Clarifying-question dropdowns. Anchored here, over the composer,
                        because the answer to a clarifying question IS the user's next
                        input. Only one can be open at a time: the company picker takes
                        precedence, since it is the more specific question. The company
                        typeahead above only opens while the user is typing, and these
                        only open when the user has NOT started typing, so they cannot
                        collide. */}
                    {companyChoices?.length > 0 ? (
                        <ClarifyDropdown
                            title="Select a company"
                            options={companyChoices}
                            onPick={onCompanyChoice}
                            onDismiss={onCompanyDismiss}
                            disabled={isLoading}
                        />
                    ) : horizonQuestion ? (
                        <ClarifyDropdown
                            title="Select a time horizon"
                            options={[
                                {
                                    key: 'short',
                                    label: 'Short Term',
                                    hint: 'Entry, target, stop loss',
                                    value: `${horizonSymbol ? `${horizonSymbol} ` : ''}short term trading — entry, target, stop loss`,
                                },
                                {
                                    key: 'long',
                                    label: 'Long Term',
                                    hint: 'Fundamentals, growth outlook',
                                    value: `${horizonSymbol ? `${horizonSymbol} ` : ''}long term investment — fundamentals, growth outlook`,
                                },
                            ]}
                            onPick={onHorizonChoice}
                            onDismiss={onHorizonDismiss}
                            disabled={isLoading}
                        />
                    ) : modeSwitch ? (
                        <ClarifyDropdown
                            title={`Switched to ${MODE_LABEL[modeSwitch.mode] || modeSwitch.mode}`}
                            options={[{
                                key: 'rerun',
                                label: 'Run my last question',
                                hint: modeSwitch.query,
                                value: modeSwitch.query,
                            }]}
                            onPick={onModeSwitchRun}
                            onDismiss={onModeSwitchDismiss}
                            disabled={isLoading}
                        />
                    ) : null}

                    {/* Thin amber border + outer glow */}
                    <div className="p-[1px] rounded-xl transition-all duration-300"
                         style={{
                             background: 'linear-gradient(135deg, rgba(253,212,5,0.55) 0%, rgba(253,212,5,0.25) 50%, rgba(253,212,5,0.55) 100%)',
                             boxShadow: '0 0 20px rgba(253,212,5,0.12), 0 0 50px rgba(253,212,5,0.06)'
                         }}>

                    {/* Card — a soft top-to-bottom gradient instead of one flat
                        fill. #1a1a1a everywhere made the card a visibly lighter
                        rectangle pasted on the page; easing #171717 → #101010
                        lets its lower edge settle into the page colour so the
                        card and the strip below it read as one surface. */}
                    <div className="relative flex flex-col rounded-[11px] overflow-hidden transition-all duration-300
                                    bg-gradient-to-b
                                    from-white to-[#FBF9F2]
                                    dark:from-[#171717] dark:to-[#101010]">

                        {/* Short / Long term quick-reply buttons moved into the chat:
                            MessageBubble renders the highlighted HorizonChoice directly
                            below the "short term or long term?" question. */}

                        {/* Textarea row */}
                        <div className="px-4 pt-3 pb-1">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Venty anything finance..."
                                disabled={isLoading}
                                /* QA-C-010: bound the input to what the API actually
                                   accepts (ChatRequest.query max_length=2000). Without
                                   it a paste of tens of thousands of characters was
                                   accepted, re-laid-out on every keystroke, and only
                                   rejected server-side after submit. */
                                maxLength={2000}
                                style={{ resize: 'none', overflow: 'hidden', minHeight: '24px' }}
                                className="w-full bg-transparent border-none outline-none text-[13px] leading-relaxed py-0.5
                                           text-zinc-900 placeholder:text-zinc-400
                                           dark:text-white dark:placeholder:text-zinc-500"
                                autoFocus
                            />
                        </div>

                        {/* Bottom row: [mode toggle + scanner] left, send right */}
                        <div className="flex items-center justify-between gap-2 px-2 pb-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                {responseMode !== undefined && setResponseMode ? (
                                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-900 flex-shrink-0">
                                        {MODES.map((mode) => {
                                            const isActive = responseMode === mode.key;
                                            return (
                                                <button key={mode.key} type="button" onClick={() => setResponseMode(mode.key)}
                                                    className={clsx(
                                                        'px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 select-none',
                                                        isActive ? 'text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                    )}
                                                    style={isActive ? { backgroundColor: '#FDD405' } : {}}>
                                                    {mode.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}

                                {/* Scanner button — grouped with mode toggle */}
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

                                {/* IPO button — opens the IPO Corner panel */}
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

                            {/* Send / Stop */}
                            <div className="flex-shrink-0">
                                {isLoading ? (
                                    <button onClick={onStopRequest} aria-label="Stop"
                                        className="w-7 h-7 flex items-center justify-center rounded-full
                                                   transition-all active:scale-95 text-black
                                                   hover:brightness-110"
                                        style={{
                                            backgroundColor: '#ffffff',
                                            boxShadow: '0 2px 8px rgba(255,255,255,0.20)'
                                        }}>
                                        <Square size={10} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button onClick={handleSend} disabled={!input.trim()} aria-label="Send"
                                        className="w-9 h-9 flex items-center justify-center rounded-full
                                                   bg-white dark:bg-[#111111]
                                                   transition-all duration-200 active:scale-95
                                                   disabled:opacity-25 disabled:cursor-not-allowed
                                                   hover:scale-105 disabled:hover:scale-100"
                                        style={{
                                            border: '1px solid rgba(253,212,5,0.75)',
                                            boxShadow: '0 0 6px 1px rgba(253,212,5,0.2)',
                                            color: '#FDD405'
                                        }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="19" x2="19" y2="5"/>
                                            <polyline points="8 5 19 5 19 16"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>{/* gradient border */}
                </div>

            </div>
        </div>

        {scannerOpen && (
            <ScannerPanel
                onSelectScanner={onScannerResult}
                onClose={() => setScannerOpen(false)}
            />
        )}

        {ipoOpen && (
            <IpoPanel onClose={() => setIpoOpen(false)} />
        )}
        </>
    );
};

export default InputBar;
