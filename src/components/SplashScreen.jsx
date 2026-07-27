import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Splash overlay. `position: fixed; inset: 0` pins all four edges to the viewport
 * so the box is exactly the viewport rectangle (no measured height to get wrong),
 * and flexbox centres the logo.
 *
 * No manual translate: the logo asset has zero vertical padding (artwork fills the
 * frame edge to edge, verified on both the dark and light PNGs), so the flexbox
 * centre IS the visual centre. A hardcoded nudge here shifts the logo off-centre
 * on every viewport — px offsets don't scale with screen height.
 */
// Full logo aspect ≈ 1.64 (wide), so size by height keeps the WIDTH ~50% of the
// screen on phones and caps at 200px on tablet/desktop.
const logoSize = () =>
    typeof window === 'undefined'
        ? 168
        : Math.max(104, Math.min(200, Math.round(window.innerWidth * 0.30)));

const SplashScreen = ({ onDone }) => {
    const [fading, setFading] = useState(false);
    const [size, setSize] = useState(logoSize);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const onResize = () => setSize(logoSize());
        onResize();
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        const fadeTimer = setTimeout(() => setFading(true), 1600);
        const doneTimer = setTimeout(() => onDone(), 2200);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
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
            <KuberLogo size={size} variant={isDark ? 'full' : 'full-light'} alt="Venty — say Venty to the market" />
        </div>
    );
};

export default SplashScreen;
