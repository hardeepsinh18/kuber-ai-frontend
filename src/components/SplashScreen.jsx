import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Splash overlay. A requestAnimationFrame loop keeps the container height exactly
 * equal to the current visible viewport height every frame, so as the mobile
 * address bar shows/hides the container tracks it and flexbox keeps the logo
 * centred — it can never drift off-centre. Falls back to 100dvh before the first
 * frame / on browsers without JS timing.
 */
const SplashScreen = ({ onDone }) => {
    const [fading, setFading] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        let raf;
        const sync = () => {
            // Use the LARGEST available viewport measure. visualViewport.height alone
            // can report a value smaller than the actual rendered viewport (seen in
            // devtools + iOS with the address bar), which made the container too short
            // and pushed the logo above centre. documentElement.clientHeight is the
            // full, stable viewport height.
            const h = Math.max(
                document.documentElement.clientHeight || 0,
                window.innerHeight || 0,
                window.visualViewport?.height || 0,
            );
            document.documentElement.style.setProperty('--splash-vh', `${h}px`);
            raf = requestAnimationFrame(sync);
        };
        sync();
        const fadeTimer = setTimeout(() => setFading(true), 1600);
        const doneTimer = setTimeout(() => onDone(), 2200);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
            document.documentElement.style.removeProperty('--splash-vh');
        };
    }, [onDone]);

    return (
        <div
            className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center"
            style={{
                height: 'var(--splash-vh, 100dvh)',
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
                build v10 · centered
            </span>
        </div>
    );
};

export default SplashScreen;
