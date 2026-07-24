import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

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
            className="fixed inset-x-0 top-0 h-[100dvh] z-[9999] flex flex-col items-center justify-center"
            style={{
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
