import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { lookupTerm } from '../../../utils/glossaryLookup';

/**
 * Hover/tap tooltip — uses a portal so overflow:hidden on ancestors can't clip it.
 *
 * Two ways to fill it, and they compose:
 *   <InfoTip text="..." />            unchanged legacy behaviour
 *   <InfoTip term="ROCE" />           pulls the plain-English definition + the
 *                                     real-life analogy from the VENTY glossary
 *   <InfoTip term="RSI" text="..." /> glossary first, then the caller's detail
 *
 * An unknown `term` contributes nothing, so a label the sheet doesn't cover
 * renders exactly as it did before.
 *
 * Interaction notes: hover is an enhancement, not the only way in — the control
 * is a real button that opens on tap/click and closes on Escape or outside
 * click, so the glossary is reachable on phones, where most of this audience is.
 */
export const InfoTip = ({ text, term }) => {
    const [vis, setVis] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
    const btnRef  = useRef(null);
    const popRef  = useRef(null);
    // Set while we return focus to the button after an Escape/close, so the
    // button's own onFocus doesn't immediately reopen the panel we just shut.
    const suppressRef = useRef(false);
    // Latches on the first touch so the synthetic mouse events a tap generates
    // don't fight the click handler. Never reset — a touch device stays a touch device.
    const touchedRef = useRef(false);
    const panelId = useId();

    const suppressTimer = useRef(null);
    const closeAndRefocus = () => {
        setVis(false);
        suppressRef.current = true;
        btnRef.current?.focus();
        // Release on the next tick, once the focus event has been dispatched.
        clearTimeout(suppressTimer.current);
        suppressTimer.current = setTimeout(() => { suppressRef.current = false; }, 0);
    };
    useEffect(() => () => clearTimeout(suppressTimer.current), []);

    const entry = term ? lookupTerm(term) : null;

    const calcPos = () => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        // Panel is 224px (w-56) or 260px when it carries the glossary body.
        const w = entry ? 260 : 224;
        const half = w / 2;
        const left = Math.max(half + 8, Math.min(r.left + r.width / 2, window.innerWidth - half - 8));
        // Flip below when there isn't room above (glossary panels are taller).
        const flip = r.top < (entry ? 210 : 140);
        setPos({ top: flip ? r.bottom : r.top, left, flip });
    };

    // Close on Escape, outside click, scroll or resize while open.
    useEffect(() => {
        if (!vis) return;
        const onKey = (e) => {
            if (e.key === 'Escape') closeAndRefocus();
        };
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
    }, [vis]);

    // Nothing to say — render nothing, exactly as before.
    if (!text && !entry) return null;

    const label = entry ? `What does ${entry.term} mean?` : 'More information';

    return (
        /* <span>, not <div>: this control renders inside <p> elements (metric-card
           subtitles), where a block-level child is invalid HTML and React flags it
           as a hydration error. */
        /* Hover is a pointer-device enhancement only. On touch the browser fires a
           synthetic mouseenter just before click, which would open the panel and
           let the click immediately toggle it shut — so ignore hover once a touch
           interaction has started. */
        <span className="inline-flex flex-shrink-0 align-middle"
              onTouchStart={() => { touchedRef.current = true; }}
              onMouseEnter={() => { if (touchedRef.current) return; calcPos(); setVis(true); }}
              onMouseLeave={() => { if (touchedRef.current) return; setVis(false); }}>
            <button
                ref={btnRef}
                type="button"
                aria-label={label}
                aria-expanded={vis}
                aria-controls={vis ? panelId : undefined}
                onClick={e => { e.stopPropagation(); calcPos(); setVis(v => !v); }}
                onFocus={() => {
                    // Keyboard focus opens it; a tap's incidental focus must not,
                    // or the click that follows would toggle it straight shut.
                    if (suppressRef.current || touchedRef.current) return;
                    calcPos(); setVis(true);
                }}
                onBlur={() => { if (touchedRef.current) return; setVis(false); }}
                className="w-[14px] h-[14px] rounded-full border border-zinc-500 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 text-[8px] font-bold flex items-center justify-center hover:border-street-yellow hover:text-street-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-street-yellow transition-colors leading-none"
                style={{ fontFamily: 'serif' }}
            >i</button>
            {vis && createPortal(
                <div
                    ref={popRef}
                    id={panelId}
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top:  pos.flip ? pos.top + 10 : pos.top - 10,
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
                           className={
                               entry
                                   ? 'mt-2 pt-2 border-t border-zinc-700 text-zinc-300'
                                   : (i > 0 ? 'mt-2 font-semibold text-zinc-200' : '')
                           }>
                            {part}
                        </p>
                    ))}
                    {/* caret — points back at the button from whichever side we opened */}
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
            )}
        </span>
    );
};
