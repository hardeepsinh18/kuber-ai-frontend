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
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{
                background: isDark ? '#1A1A18' : '#F5F2E8',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.6s ease',
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <div className="flex flex-col items-center gap-6">
                <KuberLogo size={110} className="text-[#FDD405]" />
                <span
                    className="font-bold tracking-[0.22em] text-2xl"
                    style={{ letterSpacing: '0.22em', color: isDark ? '#fff' : '#111' }}
                >
                    KUBER AI
                </span>
            </div>
        </div>
    );
};

export default SplashScreen;
