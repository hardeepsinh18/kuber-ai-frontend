import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { lookupTerm } from '../../../utils/glossaryLookup';

/**
 * Glossary tooltips. Two presentations over one shared behaviour:
 *
 *   <InfoTip text="..." />            legacy: a 14px "i" beside a label
 *   <InfoTip term="ROCE" />           the "i", filled from the VENTY glossary
 *   <InfoTip term="RSI" text="..." /> glossary body, then the caller's detail
 *   <GlossaryTerm term="MACD">MACD</GlossaryTerm>
 *                                     inline: the word itself, dotted-underlined,
 *                                     for jargon found inside generated prose
 *
 * An unknown term contributes nothing, so anything the sheet doesn't cover
 * renders exactly as it did before.
 *
 * Interaction: hover is an enhancement, never the only way in. Both forms are
 * real buttons that open on tap/click and close on Escape or outside click, so
 * the glossary is reachable on phones, where most of this audience is.
 */

/* Shared open/close/position behaviour for both presentations. */
const useTipBehaviour = (wide) => {
    const [vis, setVis] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
    const btnRef = useRef(null);
    const popRef = useRef(null);
    // Set while we return focus to the trigger after an Escape/close, so the
    // trigger's own onFocus doesn't immediately reopen the panel we just shut.
    const suppressRef = useRef(false);
    // Latches on the first touch so the synthetic mouse events a tap generates
    // don't fight the click handler. Never reset — a touch device stays one.
    const touchedRef = useRef(false);
    const suppressTimer = useRef(null);
    const panelId = useId();

    const closeAndRefocus = () => {
        setVis(false);
        suppressRef.current = true;
        btnRef.current?.focus();
        clearTimeout(suppressTimer.current);
        suppressTimer.current = setTimeout(() => { suppressRef.current = false; }, 0);
    };
    useEffect(() => () => clearTimeout(suppressTimer.current), []);

    const calcPos = () => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        const w = wide ? 260 : 224;
        const half = w / 2;
        const left = Math.max(half + 8, Math.min(r.left + r.width / 2, window.innerWidth - half - 8));
        const flip = r.top < (wide ? 210 : 140);
        setPos({ top: flip ? r.bottom : r.top, left, flip });
    };

    useEffect(() => {
        if (!vis) return;
        const onKey = (e) => { if (e.key === 'Escape') closeAndRefocus(); };
        const onDocPointer = (e) => {
            if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
            setVis(false);
        };
        const onReflow = () => setVis(false);
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDocPointer);
        document.addEventListener('touchstart', onDocPointer, { passive: true });
        window.addEventListener('scroll', onReflow, true);
        window.addEventListener('resize', onReflow);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDocPointer);
            document.removeEventListener('touchstart', onDocPointer);
            window.removeEventListener('scroll', onReflow, true);
            window.removeEventListener('resize', onReflow);
        };
    }, [vis]);   // eslint-disable-line react-hooks/exhaustive-deps

    /* Handlers every trigger shares. */
    const triggerProps = {
        ref: btnRef,
        type: 'button',
        'aria-expanded': vis,
        'aria-controls': vis ? panelId : undefined,
        onClick: (e) => { e.stopPropagation(); calcPos(); setVis(v => !v); },
        onFocus: () => {
            // Keyboard focus opens it; a tap's incidental focus must not, or the
            // click that follows would toggle it straight shut.
            if (suppressRef.current || touchedRef.current) return;
            calcPos(); setVis(true);
        },
        onBlur: () => { if (touchedRef.current) return; setVis(false); },
    };
    const wrapProps = {
        onTouchStart: () => { touchedRef.current = true; },
        onMouseEnter: () => { if (touchedRef.current) return; calcPos(); setVis(true); },
        onMouseLeave: () => { if (touchedRef.current) return; setVis(false); },
    };

    return { vis, pos, popRef, panelId, triggerProps, wrapProps };
};

/* The floating panel, portalled so overflow:hidden ancestors can't clip it. */
const TipPanel = ({ entry, text, pos, popRef, panelId }) => createPortal(
    <div
        ref={popRef}
        id={panelId}
        role="tooltip"
        style={{
            position: 'fixed',
            top: pos.flip ? pos.top + 10 : pos.top - 10,
            left: pos.left,
            transform: pos.flip ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            zIndex: 99999,
            width: entry ? 260 : undefined,
        }}
        className={`${entry ? '' : 'w-56 '}p-3 bg-zinc-900 border border-zinc-600 rounded-xl shadow-2xl text-[10px] text-zinc-300 leading-relaxed`}
    >
        {entry && (
            <>
                <div className="text-[8px] uppercase tracking-[0.13em] text-street-yellow font-semibold">
                    {entry.category}
                </div>
                <div className="text-[12px] font-bold text-zinc-100 mt-0.5 mb-1.5 font-display tracking-wide">
                    {entry.term}
                </div>
                <p className="text-[10px] text-zinc-300">{entry.definition}</p>
                <p className="mt-2 pt-2 border-t border-zinc-700 text-[10px] text-zinc-400 italic">
                    <span className="not-italic block text-[8px] uppercase tracking-[0.13em] text-street-yellow font-semibold mb-0.5">
                        Like this
                    </span>
                    {entry.example}
                </p>
            </>
        )}
        {text && text.split('\n\n').map((part, i) => (
            <p key={i}
               className={entry
                   ? 'mt-2 pt-2 border-t border-zinc-700 text-zinc-300'
                   : (i > 0 ? 'mt-2 font-semibold text-zinc-200' : '')}>
                {part}
            </p>
        ))}
        <div style={{
            position: 'absolute',
            [pos.flip ? 'bottom' : 'top']: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            [pos.flip ? 'borderBottom' : 'borderTop']: '5px solid #3f3f46',
        }} />
    </div>,
    document.body
);

export const InfoTip = ({ text, term }) => {
    const entry = term ? lookupTerm(term) : null;
    const { vis, pos, popRef, panelId, triggerProps, wrapProps } = useTipBehaviour(!!entry);

    if (!text && !entry) return null;

    return (
        /* <span>, not <div>: this renders inside <p> elements (metric-card
           subtitles), where a block-level child is invalid HTML and React flags
           it as a hydration error. */
        <span className="inline-flex flex-shrink-0 align-middle" {...wrapProps}>
            <button
                {...triggerProps}
                aria-label={entry ? `What does ${entry.term} mean?` : 'More information'}
                className="w-[14px] h-[14px] rounded-full border border-zinc-500 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 text-[8px] font-bold flex items-center justify-center hover:border-street-yellow hover:text-street-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-street-yellow transition-colors leading-none"
                style={{ fontFamily: 'serif' }}
            >i</button>
            {vis && <TipPanel entry={entry} text={text} pos={pos} popRef={popRef} panelId={panelId} />}
        </span>
    );
};

/**
 * Inline jargon inside prose. Renders the word itself as the trigger, with a
 * quiet dotted brand underline — no icon, no recolouring — so a reader who
 * knows the term reads straight past it.
 */
export const GlossaryTerm = ({ term, children }) => {
    const entry = term ? lookupTerm(term) : null;
    const { vis, pos, popRef, panelId, triggerProps, wrapProps } = useTipBehaviour(true);

    if (!entry) return children ?? null;

    return (
        <span className="inline" {...wrapProps}>
            <button
                {...triggerProps}
                aria-label={`What does ${entry.term} mean?`}
                className="inline p-0 m-0 bg-transparent border-0 font-inherit text-inherit text-left cursor-help
                           underline decoration-dotted decoration-street-yellow/70 underline-offset-2
                           hover:decoration-solid hover:decoration-street-yellow
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-street-yellow"
            >{children}</button>
            {vis && <TipPanel entry={entry} text={null} pos={pos} popRef={popRef} panelId={panelId} />}
        </span>
    );
};
