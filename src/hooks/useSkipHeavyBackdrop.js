import { useEffect, useState } from 'react';

/**
 * QA-C-005: decide whether to skip the ~7 MB background video entirely.
 *
 * `bg-dark.mp4` is 6.8 MB and `bg-light.mp4` is 5.7 MB. That is a purely decorative
 * backdrop, so on a metered or narrow connection it is bandwidth the user pays for and
 * gets nothing back from. Two cases are skipped on top of the reduced-motion skip that
 * QA-C-004 already added:
 *
 *   1. Narrow viewports. A 6.8 MB backdrop behind a 375px-wide phone screen is never
 *      justified — the video is `object-fit: cover` at 40-60% opacity, so on a small
 *      screen almost none of the detail being paid for is even visible.
 *   2. `navigator.connection.saveData` — the user has explicitly asked the browser to
 *      conserve data. Honouring that is the entire point of the flag.
 *
 * Deliberately NOT a media query inside CSS: the goal is to never START the download,
 * and a `<video>` element that exists in the DOM has already begun fetching. The decision
 * has to happen before render, which is why this is a hook and not a stylesheet rule.
 *
 * SSR-safe and defensive: `navigator.connection` is not in Safari or Firefox, and
 * `matchMedia` is absent in some test environments, so both are feature-detected.
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

function evaluate(minWidth) {
    if (typeof window === 'undefined') return true; // SSR: skip rather than ship 7 MB
    try {
        if (navigator?.connection?.saveData === true) return true;
        const width = window.innerWidth
            || document?.documentElement?.clientWidth
            || 0;
        // width 0 means we genuinely could not measure — do not skip on a bad read,
        // or a measurement quirk would silently remove the backdrop for everyone.
        if (width > 0 && width < minWidth) return true;
        return false;
    } catch {
        return false;
    }
}
