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
            const h = window.visualViewport?.height || window.innerHeight;
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
        </div>
    );
};

export default SplashScreen;
