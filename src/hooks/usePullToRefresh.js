import { useEffect, useRef, useState, useCallback } from 'react';

// Pull-to-refresh gesture for a scrollable container (Bug 8, UAT). Native
// mobile browsers/webviews already provide their own pull-to-refresh at the
// OS/WebView chrome level in many cases -- this is the JS-level fallback for
// contexts (like an app's own WebView shell) where that's disabled or absent.
//
// Only arms when the container is scrolled to the very top: starting the
// drag anywhere else would fight with normal scrolling. Triggers `onRefresh`
// once the user drags past THRESHOLD_PX and releases; the indicator resists
// past that point (rubber-band) so it doesn't feel like it's growing forever.
const THRESHOLD_PX = 70;
const MAX_PULL_PX = 120;

export function usePullToRefresh(containerRef, onRefresh) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startYRef = useRef(null);
    const draggingRef = useRef(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await onRefresh?.();
        } finally {
            setIsRefreshing(false);
            setPullDistance(0);
        }
    }, [onRefresh]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        const onTouchStart = (e) => {
            if (el.scrollTop > 0 || isRefreshing) return;
            startYRef.current = e.touches[0].clientY;
            draggingRef.current = true;
        };

        const onTouchMove = (e) => {
            if (!draggingRef.current || startYRef.current == null) return;
            const delta = e.touches[0].clientY - startYRef.current;
            if (delta <= 0) {
                setPullDistance(0);
                return;
            }
            // Only take over the gesture once it's clearly a downward pull from
            // the top -- otherwise this would swallow ordinary taps/scrolls.
            if (el.scrollTop > 0) {
                draggingRef.current = false;
                setPullDistance(0);
                return;
            }
            e.preventDefault();
            // Rubber-band past the threshold instead of growing linearly forever.
            const resisted = delta < MAX_PULL_PX ? delta : MAX_PULL_PX + (delta - MAX_PULL_PX) * 0.2;
            setPullDistance(resisted);
        };

        const onTouchEnd = () => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            startYRef.current = null;
            if (pullDistance >= THRESHOLD_PX) {
                handleRefresh();
            } else {
                setPullDistance(0);
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchEnd);
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
        // pullDistance intentionally omitted -- onTouchEnd reads it via closure
        // per-gesture, and including it would re-bind listeners on every pixel
        // of drag movement.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerRef, isRefreshing, handleRefresh]);

    return { pullDistance, isRefreshing, threshold: THRESHOLD_PX };
}
