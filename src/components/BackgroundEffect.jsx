import { memo } from 'react';
import { useTheme } from '../context/ThemeContext';

const BackgroundEffect = memo(() => {
    const { theme } = useTheme();
    const src = theme === 'dark' ? '/bg-dark.mp4' : '/bg-light.mp4';

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Base background so layout div color still anchors the palette */}
            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#F5F2E8]'}`} />

            {/* Video — subtle motion layer */}
            <video
                key={src}
                src={src}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: theme === 'dark' ? 0.50 : 0.60 }}
            />

            {/* Readability overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: theme === 'dark'
                        ? 'rgba(10,10,10,0.25)'
                        : 'rgba(245,242,232,0.20)'
                }}
            />
        </div>
    );
});

BackgroundEffect.displayName = 'BackgroundEffect';
export default BackgroundEffect;
