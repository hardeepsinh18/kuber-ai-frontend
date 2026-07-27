import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Splash overlay. `position: fixed; inset: 0` pins all four edges to the viewport
 * so the box is exactly the viewport rectangle (no measured height to get wrong),
 * and flexbox centres the logo. The logo is nudged down a touch because the full
 * mark is top-heavy (robot + VENTY carry the weight, the tagline is light) — this
 * puts the robot+wordmark at the optical centre so it reads as centred.
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
                background: isDark ? '#121315' : '#ffffff',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.6s ease',
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <div style={{ transform: 'translateY(30px)' }}>
                <KuberLogo size={200} variant={isDark ? 'full' : 'full-light'} alt="Venty — say Venty to the market" />
            </div>
        </div>
    );
};

export default SplashScreen;
