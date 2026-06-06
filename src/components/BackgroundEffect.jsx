import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// Gold circuit tile — dark mode
const DARK_CIRCUIT = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 30H30V0' stroke='%23D4A017' stroke-width='0.5' fill='none' opacity='0.6'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%23D4A017' opacity='0.6'/%3E%3Ccircle cx='0' cy='0' r='1.3' fill='%23D4A017' opacity='0.4'/%3E%3Ccircle cx='60' cy='0' r='1.3' fill='%23D4A017' opacity='0.4'/%3E%3Ccircle cx='0' cy='60' r='1.3' fill='%23D4A017' opacity='0.4'/%3E%3Ccircle cx='60' cy='60' r='1.3' fill='%23D4A017' opacity='0.4'/%3E%3C/svg%3E")`;

// Gold circuit tile — light mode
const LIGHT_CIRCUIT = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 30H30V0' stroke='%23B8860B' stroke-width='0.5' fill='none' opacity='0.25'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%23B8860B' opacity='0.28'/%3E%3Ccircle cx='0' cy='0' r='1.3' fill='%23B8860B' opacity='0.18'/%3E%3Ccircle cx='60' cy='0' r='1.3' fill='%23B8860B' opacity='0.18'/%3E%3Ccircle cx='0' cy='60' r='1.3' fill='%23B8860B' opacity='0.18'/%3E%3Ccircle cx='60' cy='60' r='1.3' fill='%23B8860B' opacity='0.18'/%3E%3C/svg%3E")`;

// Dot-grid overlay — gives a premium data-terminal feel
const DARK_DOTS = `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='0.8' fill='%23D4A017' opacity='0.35'/%3E%3C/svg%3E")`;
const LIGHT_DOTS = `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='0.8' fill='%23B8860B' opacity='0.18'/%3E%3C/svg%3E")`;

// Pre-defined particle positions — stable across renders
// [left%, top%, sizePx, durationS, delayS, driftX, driftY]
const PARTICLES = [
    [  8, 18, 3.5, 22,   0,  12, -16 ],
    [ 20, 70, 2.5, 28,  -7,  -9,  14 ],
    [ 37, 42, 3.5, 25, -13,  15, -10 ],
    [ 52, 85, 2.5, 31,  -4,  -8,  12 ],
    [ 66, 20, 2.5, 20, -18,  10, -14 ],
    [ 80, 57, 3.5, 23,  -3, -12,  10 ],
    [ 90, 10, 2.5, 29, -21,   8, -12 ],
    [ 14, 90, 2.5, 26,  -9, -10,   8 ],
    [ 45, 12, 3.5, 19, -16,  14,  -8 ],
    [ 72, 76, 2.5, 24, -11,  -8,  14 ],
    [ 30, 55, 2.5, 27,  -6,  10, -10 ],
    [ 60, 38, 3.5, 21, -14, -12,   8 ],
    [ 25, 30, 2,   33,  -5,   8, -12 ],
    [ 55, 60, 2,   17,  -9,  -6,  10 ],
    [ 82, 35, 2.5, 24, -12,  12,  -8 ],
    [ 10, 50, 2,   30,  -3,  -8,  14 ],
];

const blobA = {
    idle:    { scale: 1,    x: 0,  y: 0  },
    animate: {
        scale: [1, 1.12, 1],
        x:     [0, 30, -20, 0],
        y:     [0, -20, 25, 0],
        transition: { duration: 22, ease: 'linear', repeat: Infinity },
    },
};
const blobB = {
    idle:    { scale: 1.05, x: 0,  y: 0  },
    animate: {
        scale: [1.05, 1, 1.08],
        x:     [0, -28, 18, 0],
        y:     [0,  24, -20, 0],
        transition: { duration: 28, ease: 'linear', repeat: Infinity },
    },
};
const blobC = {
    idle:    { scale: 1, x: 0, y: 0 },
    animate: {
        scale: [1, 1.08, 0.96, 1],
        x:     [0, 20, -10, 0],
        y:     [0, -12, 20, 0],
        transition: { duration: 34, ease: 'linear', repeat: Infinity },
    },
};

const BackgroundEffect = React.memo(() => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [isTabVisible, setIsTabVisible] = useState(true);
    useEffect(() => {
        const h = () => setIsTabVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', h);
        return () => document.removeEventListener('visibilitychange', h);
    }, []);

    const anim = isTabVisible ? 'animate' : 'idle';

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transform-gpu">

            {/* ══════════ DARK MODE ══════════ */}
            {isDark && (
                <>
                    {/* Base */}
                    <div className="absolute inset-0" style={{ background: '#09090A' }} />

                    {/* Crown radial — warm gold spill from top */}
                    <div className="absolute inset-0" style={{
                        background:
                            'radial-gradient(ellipse 140% 55% at 50% -12%, rgba(212,160,23,0.32) 0%, rgba(180,130,10,0.12) 42%, transparent 64%)',
                    }} />

                    {/* Corner warmth accents */}
                    <div className="absolute inset-0" style={{
                        background:
                            'radial-gradient(ellipse 50% 38% at 100% 100%, rgba(160,115,8,0.16) 0%, transparent 58%),' +
                            'radial-gradient(ellipse 38% 28% at 0% 80%, rgba(140,100,5,0.10) 0%, transparent 55%)',
                    }} />

                    {/* Animated blobs */}
                    <div className="absolute inset-0" style={{ opacity: 0.20 }}>
                        <motion.div variants={blobA} animate={anim}
                            className="absolute top-[-12%] left-[3%] w-[55vw] h-[55vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.60) 0%, transparent 70%)', filter: 'blur(88px)' }}
                        />
                        <motion.div variants={blobB} animate={anim}
                            className="absolute bottom-[-16%] right-[1%] w-[45vw] h-[45vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(180,130,10,0.48) 0%, transparent 70%)', filter: 'blur(96px)' }}
                        />
                        <motion.div variants={blobC} animate={anim}
                            className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.30) 0%, transparent 70%)', filter: 'blur(72px)' }}
                        />
                    </div>

                    {/* Floating particles */}
                    <div className="absolute inset-0">
                        {PARTICLES.map(([l, t, s, dur, del, dx, dy], i) => (
                            <motion.div key={i}
                                className="absolute rounded-full"
                                style={{
                                    left: `${l}%`, top: `${t}%`,
                                    width: s, height: s,
                                    background: 'rgba(212,160,23,0.85)',
                                    boxShadow: '0 0 6px rgba(212,160,23,0.4)',
                                }}
                                animate={{ y: [0, dy, -dy * 0.5, dy * 0.3, 0], x: [0, dx, -dx * 0.4, dx * 0.2, 0], opacity: [0.28, 0.55, 0.20, 0.45, 0.28] }}
                                transition={{ duration: dur, delay: del, ease: 'easeInOut', repeat: Infinity }}
                            />
                        ))}
                    </div>

                    {/* Dot-grid overlay */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: DARK_DOTS,
                        backgroundSize: '32px 32px',
                        opacity: 0.35,
                    }} />

                    {/* Circuit pattern */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: DARK_CIRCUIT,
                        backgroundSize: '60px 60px',
                        opacity: 0.09,
                    }} />

                    {/* Concentric rings — right-side hero decoration */}
                    <div className="absolute" style={{ right: '12%', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        {[340, 520, 700].map((size, i) => (
                            <div key={i} className="absolute rounded-full border"
                                style={{
                                    width: size, height: size,
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderColor: `rgba(212,160,23,${0.07 - i * 0.018})`,
                                }} />
                        ))}
                    </div>

                </>
            )}

            {/* ══════════ LIGHT MODE ══════════ */}
            {!isDark && (
                <>
                    {/* Warm cream base */}
                    <div className="absolute inset-0" style={{ background: '#FDFAF3' }} />

                    {/* Gentle centered top warmth */}
                    <div className="absolute inset-0" style={{
                        background:
                            'radial-gradient(ellipse 95% 46% at 50% -8%, rgba(251,191,36,0.15) 0%, rgba(212,160,23,0.06) 46%, transparent 66%)',
                    }} />

                    {/* Top-right + bottom-left accents */}
                    <div className="absolute inset-0" style={{
                        background:
                            'radial-gradient(ellipse 44% 34% at 100% 0%, rgba(251,191,36,0.11) 0%, transparent 55%),' +
                            'radial-gradient(ellipse 46% 30% at 0% 100%, rgba(212,160,23,0.08) 0%, transparent 55%)',
                    }} />

                    {/* Animated ambient blobs */}
                    <div className="absolute inset-0" style={{ opacity: 0.16 }}>
                        <motion.div variants={blobA} animate={anim}
                            className="absolute top-[-18%] right-[-8%] w-[50vw] h-[50vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.46) 0%, transparent 70%)', filter: 'blur(92px)' }}
                        />
                        <motion.div variants={blobB} animate={anim}
                            className="absolute bottom-[-14%] left-[-6%] w-[40vw] h-[40vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.32) 0%, transparent 70%)', filter: 'blur(82px)' }}
                        />
                        <motion.div variants={blobC} animate={anim}
                            className="absolute top-[35%] right-[20%] w-[28vw] h-[28vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)', filter: 'blur(70px)' }}
                        />
                    </div>

                    {/* Floating particles — subtler in light mode */}
                    <div className="absolute inset-0">
                        {PARTICLES.map(([l, t, s, dur, del, dx, dy], i) => (
                            <motion.div key={i}
                                className="absolute rounded-full"
                                style={{ left: `${l}%`, top: `${t}%`, width: s - 0.5, height: s - 0.5, background: 'rgba(180,130,8,0.70)' }}
                                animate={{ y: [0, dy, -dy * 0.5, dy * 0.3, 0], x: [0, dx, -dx * 0.4, dx * 0.2, 0], opacity: [0.16, 0.32, 0.10, 0.24, 0.16] }}
                                transition={{ duration: dur, delay: del, ease: 'easeInOut', repeat: Infinity }}
                            />
                        ))}
                    </div>

                    {/* Dot-grid overlay */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: LIGHT_DOTS,
                        backgroundSize: '32px 32px',
                        opacity: 0.28,
                    }} />

                    {/* Circuit pattern */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: LIGHT_CIRCUIT,
                        backgroundSize: '60px 60px',
                        opacity: 0.06,
                    }} />

                    {/* Concentric rings — right-side hero decoration */}
                    <div className="absolute" style={{ right: '12%', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        {[340, 520, 700].map((size, i) => (
                            <div key={i} className="absolute rounded-full border"
                                style={{
                                    width: size, height: size,
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderColor: `rgba(212,160,23,${0.06 - i * 0.015})`,
                                }} />
                        ))}
                    </div>

                </>
            )}
        </div>
    );
});

export default BackgroundEffect;
