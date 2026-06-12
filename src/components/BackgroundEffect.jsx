import { memo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useChatMode } from '../context/ChatModeContext';

const BackgroundEffect = memo(() => {
    const { theme } = useTheme();
    const { isChatActive } = useChatMode();
    const isDark = theme === 'dark';
    const src = isDark ? '/bg-dark.mp4' : '/bg-light.mp4';

    // Chat active: solid bg with subtle yellow tint, no video
    const solidBg = isDark
        ? 'linear-gradient(160deg, rgba(253,212,5,0.04) 0%, transparent 45%), #121315'
        : 'linear-gradient(160deg, rgba(253,212,5,0.06) 0%, transparent 45%), #F0EDE4';

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
             style={{ background: isChatActive ? solidBg : (isDark ? '#0A0A0A' : '#F5F2E8') }}>

            {/* Video — only shown on start screen */}
            {!isChatActive && (
                <video
                    key={src}
                    src={src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: isDark ? 0.50 : 0.60 }}
                />
            )}

            {/* Readability overlay — only with video */}
            {!isChatActive && (
                <div className="absolute inset-0"
                     style={{ background: isDark ? 'rgba(10,10,10,0.25)' : 'rgba(245,242,232,0.20)' }} />
            )}
        </div>
    );
});

BackgroundEffect.displayName = 'BackgroundEffect';
export default BackgroundEffect;
