import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Splash overlay. `position: fixed; inset: 0` pins all four edges to the
 * viewport, so the box is exactly the viewport rectangle — no measured/derived
 * height that can come out wrong (devtools scrollbar, iOS address bar). Flexbox
 * then centres the logo. `100dvh` min-height is a belt-and-suspenders fallback.
 */
const SplashScreen = ({ onDone }) => {
    const [fading, setFading] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const fadeTimer = setTimeout(() => setFading(true), 1600);
        const doneTimer = setTimeout(() => onDone(), 2200);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
        };
    }, [onDone]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
                minHeight: '100dvh',
                background: isDark ? '#121315' : '#ffffff',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.6s ease',
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <KuberLogo size={200} variant={isDark ? 'full' : 'full-light'} alt="Venty — say Venty to the market" />
            {/* Temporary build tag — lets us confirm the latest bundle actually loaded
                (remove once the splash-centring is confirmed on device). */}
            <span
                className="fixed left-1/2 -translate-x-1/2 text-[10px] tracking-widest"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', color: isDark ? 'rgba(253,212,5,0.6)' : 'rgba(120,120,120,0.7)' }}
            >
                build v11 · centered
            </span>
        </div>
    );
};

export default SplashScreen;
