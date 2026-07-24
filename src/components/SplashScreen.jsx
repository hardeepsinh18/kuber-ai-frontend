import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Splash overlay. Centres with flexbox inside a container sized `h-screen`
 * (100vh fallback) then `h-[100dvh]` (dynamic viewport height). dvh tracks the
 * live visible height as the mobile address bar shows/hides, so flexbox keeps
 * the logo centred at all times — no JS measurement that can lag the address-bar
 * animation and leave the logo off-centre.
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
            className="fixed inset-x-0 top-0 h-screen h-[100dvh] z-[9999] flex items-center justify-center"
            style={{
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
