import { useEffect, useState } from 'react';
import KuberLogo from './KuberLogo';

const SplashScreen = ({ onDone }) => {
    const [fading, setFading] = useState(false);

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
                background: '#1A1A18',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.6s ease',
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <div className="flex flex-col items-center gap-6">
                <KuberLogo size={110} className="text-amber-400" />
                <span
                    className="text-white font-bold tracking-[0.22em] text-2xl"
                    style={{ letterSpacing: '0.22em' }}
                >
                    KUBER AI
                </span>
            </div>
        </div>
    );
};

export default SplashScreen;
