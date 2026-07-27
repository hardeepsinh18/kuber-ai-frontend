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
    const [dbg, setDbg] = useState('');
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        // TEMP diagnostic — reports the real device viewport vs the splash box so
        // the off-centre logo can be pinpointed. Removed once confirmed on device.
        const box = document.getElementById('splash-box')?.getBoundingClientRect();
        setDbg(
            `iH${window.innerHeight} cH${document.documentElement.clientHeight} vv${Math.round(window.visualViewport?.height || 0)} ` +
            `sc${window.screen?.height || 0} | box t${Math.round(box?.top || 0)} h${Math.round(box?.height || 0)}`
        );
        const fadeTimer = setTimeout(() => setFading(true), 1600);
        const doneTimer = setTimeout(() => onDone(), 2200);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
        };
    }, [onDone]);

    return (
        <div
            id="splash-box"
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
                background: isDark ? '#121315' : '#ffffff',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.6s ease',
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <KuberLogo size={200} variant={isDark ? 'full' : 'full-light'} alt="Venty — say Venty to the market" />
            <span className="fixed left-1/2 -translate-x-1/2 bottom-3 text-[9px] tracking-wide"
                  style={{ color: isDark ? 'rgba(253,212,5,0.5)' : 'rgba(120,120,120,0.6)' }}>
                {dbg}
            </span>
        </div>
    );
};

export default SplashScreen;
