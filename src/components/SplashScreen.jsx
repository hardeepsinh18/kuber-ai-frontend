import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Splash overlay. Rather than trust 100vh/100dvh (which iOS Safari mis-sizes
 * around the address bar), we pin the logo to the EXACT centre of the visible
 * viewport using the visualViewport API: centreY = offsetTop + height/2, in
 * layout-viewport coordinates that a position:fixed element uses. A separate
 * full-bleed layer paints the background (no centring needed there).
 */
const getCenterY = () => {
    if (typeof window === 'undefined') return 0;
    const v = window.visualViewport;
    const h = v?.height || window.innerHeight;
    return (v?.offsetTop || 0) + h / 2;
};

const SplashScreen = ({ onDone }) => {
    const [fading, setFading] = useState(false);
    const [centerY, setCenterY] = useState(getCenterY);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const measure = () => setCenterY(getCenterY());
        measure();
        // iOS can report a stale viewport on first paint (before the address bar
        // settles) — re-measure a few times so the logo lands dead-centre.
        const timers = [50, 200, 500].map((ms) => setTimeout(measure, ms));
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        window.visualViewport?.addEventListener('resize', measure);
        window.visualViewport?.addEventListener('scroll', measure);
        const fadeTimer = setTimeout(() => setFading(true), 1600);
        const doneTimer = setTimeout(() => onDone(), 2200);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
            timers.forEach(clearTimeout);
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
            window.visualViewport?.removeEventListener('resize', measure);
            window.visualViewport?.removeEventListener('scroll', measure);
        };
    }, [onDone]);

    const fade = { opacity: fading ? 0 : 1, transition: 'opacity 0.6s ease' };

    return (
        <>
            {/* Background layer — full bleed, no centring required */}
            <div
                className="fixed inset-0 z-[9998]"
                style={{
                    background: isDark ? '#121315' : '#ffffff',
                    pointerEvents: fading ? 'none' : 'auto',
                    ...fade,
                }}
            />
            {/* Logo — pinned to the true visible centre */}
            <div
                className="fixed left-1/2 z-[9999] flex flex-col items-center pointer-events-none"
                style={{ top: `${centerY}px`, transform: 'translate(-50%, -50%)', ...fade }}
            >
                <KuberLogo size={200} variant={isDark ? 'full' : 'full-light'} alt="Venty — say Venty to the market" />
            </div>
        </>
    );
};

export default SplashScreen;
