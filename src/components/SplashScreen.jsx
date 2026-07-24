import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

const SplashScreen = ({ onDone }) => {
    const [fading, setFading] = useState(false);
    // Measure the ACTUAL visible viewport height. iOS Safari can mis-size 100vh/100dvh
    // on first paint (address bar), leaving the logo above centre — window.innerHeight
    // is the real visible height on every device, so centring is exact.
    const [vh, setVh] = useState(() =>
        typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 0
    );
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const measure = () => setVh(window.visualViewport?.height || window.innerHeight);
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        window.visualViewport?.addEventListener('resize', measure);
        const fadeTimer = setTimeout(() => setFading(true), 1600);
        const doneTimer = setTimeout(() => onDone(), 2200);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
            window.visualViewport?.removeEventListener('resize', measure);
        };
    }, [onDone]);

    return (
        <div
            className="fixed inset-x-0 top-0 z-[9999] flex flex-col items-center justify-center"
            style={{
                height: vh ? `${vh}px` : '100dvh',
                background: isDark ? '#121315' : '#ffffff',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.6s ease',
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <div className="flex flex-col items-center">
                <KuberLogo size={200} variant={isDark ? 'full' : 'full-light'} alt="Venty — say Venty to the market" />
            </div>
        </div>
    );
};

export default SplashScreen;
