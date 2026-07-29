import { useEffect, useState } from 'react';

/**
 * QA-C-004: true when the user has asked the OS for reduced motion.
 *
 * The decorative background video is ~7 MB and plays automatically. Users who set
 * "reduce motion" are asking not to be shown looping animation — a vestibular
 * accessibility need, not a preference — and skipping the element entirely also
 * spares them the download.
 *
 * Returns false during SSR / when matchMedia is unavailable, so the default
 * behaviour is unchanged for everyone who has not expressed the preference.
 */
export default function usePrefersReducedMotion() {
    const query = '(prefers-reduced-motion: reduce)';
    const [reduced, setReduced] = useState(
        () => typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia(query).matches
    );

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia(query);
        const onChange = (e) => setReduced(e.matches);
        // Safari < 14 only supports the deprecated addListener form.
        if (mql.addEventListener) mql.addEventListener('change', onChange);
        else mql.addListener(onChange);
        return () => {
            if (mql.removeEventListener) mql.removeEventListener('change', onChange);
            else mql.removeListener(onChange);
        };
    }, []);

    return reduced;
}
