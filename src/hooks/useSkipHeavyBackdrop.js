import { useEffect, useState } from 'react';

/**
 * QA-C-005: decide whether to skip the ~7 MB background video entirely.
 *
 * `bg-dark.mp4` is 6.8 MB and `bg-light.mp4` is 5.7 MB — a purely decorative backdrop,
 * so on a metered connection it is bandwidth the user pays for and gets nothing back
 * from.
 *
 * The skip is now driven ONLY by explicit user signals:
 *
 *   1. `navigator.connection.saveData` — the user has told the browser to conserve
 *      data. Honouring that is the entire point of the flag.
 *   2. (In the callers) prefers-reduced-motion, for the same reason.
 *
 * The viewport-width rule was REMOVED (product decision, 2026-08-07): the backdrop is
 * part of the brand impression and was wanted on phones too. Screen size is a guess
 * about what someone wants; saveData is them saying it. Guessing "this is a phone so
 * they must not want it" made the product look different on mobile for a cost the user
 * never actually declined.
 *
 * If the mobile payload becomes a problem, the fix is a smaller mobile encode served by
 * the caller — not silently removing the backdrop, which is what this used to do.
 *
 * Deliberately NOT a media query inside CSS: the goal is to never START the download,
 * and a `<video>` element that exists in the DOM has already begun fetching. The decision
 * has to happen before render, which is why this is a hook and not a stylesheet rule.
 *
 * SSR-safe and defensive: `navigator.connection` is not in Safari or Firefox, so it is
 * feature-detected. `minWidth` is retained in the signature for callers that pass it,
 * but is no longer consulted.
 */
export default function useSkipHeavyBackdrop(minWidth = 768) {
    const [skip, setSkip] = useState(() => evaluate(minWidth));

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const update = () => setSkip(evaluate(minWidth));
        update();

        window.addEventListener('resize', update);

        // saveData can be toggled mid-session; connection may be absent entirely.
        // Reading it is wrapped because `navigator.connection` is a getter, and a
        // hostile or stubbed one can throw — which would otherwise escape the hook and
        // take down every screen that renders a backdrop.
        let conn = null;
        try {
            conn = navigator?.connection ?? null;
            if (conn && typeof conn.addEventListener === 'function') {
                conn.addEventListener('change', update);
            }
        } catch {
            conn = null;
        }

        return () => {
            window.removeEventListener('resize', update);
            try {
                if (conn && typeof conn.removeEventListener === 'function') {
                    conn.removeEventListener('change', update);
                }
            } catch { /* nothing to clean up */ }
        };
    }, [minWidth]);

    return skip;
}

// eslint-disable-next-line no-unused-vars -- kept for call-site compatibility
function evaluate(minWidth) {
    if (typeof window === 'undefined') return true; // SSR: skip rather than ship 7 MB
    try {
        // saveData is the only skip signal now — see the note above on why viewport
        // width is not one.
        return navigator?.connection?.saveData === true;
    } catch {
        return false;
    }
}
