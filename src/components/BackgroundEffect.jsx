import { memo } from 'react';
import { useTheme } from '../context/ThemeContext';

const BackgroundEffect = memo(() => {
    const { theme } = useTheme();
    if (theme !== 'dark') return null;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[#0A0A0A]" />
            <div className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse 65% 55% at 55% 48%, rgba(212,160,23,0.06) 0%, transparent 68%)'
                }} />
        </div>
    );
});

BackgroundEffect.displayName = 'BackgroundEffect';
export default BackgroundEffect;
