import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// ─── Layer 2: Financial terminal grid ───────────────────────
// Thin golden hairlines on 80×60 cells — Bloomberg terminal feel
const DARK_GRID = `url("data:image/svg+xml,%3Csvg width='80' height='60' viewBox='0 0 80 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 80 0 L 0 0 0 60' fill='none' stroke='%23D4A017' stroke-width='0.3' opacity='0.12'/%3E%3C/svg%3E")`;
const LIGHT_GRID = `url("data:image/svg+xml,%3Csvg width='80' height='60' viewBox='0 0 80 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 80 0 L 0 0 0 60' fill='none' stroke='%23B8860B' stroke-width='0.3' opacity='0.09'/%3E%3C/svg%3E")`;

// ─── Layer 5: Floating data-point particles ──────────────────
// [left%, top%, sizePx, durationS, delayS, driftX, driftY]
const PARTICLES = [
    [  8, 18, 2,   24,  0,   8, -12 ],
    [ 20, 70, 1.5, 30, -7,  -7,  11 ],
    [ 37, 42, 2.5, 26, -13, 11,  -8 ],
    [ 52, 85, 1.5, 32, -4,  -6,  10 ],
    [ 66, 20, 1.5, 21, -17,  8, -12 ],
    [ 80, 57, 2.5, 25, -3,  -9,   8 ],
    [ 90, 10, 1.5, 31, -20,  6, -10 ],
    [ 14, 90, 1.5, 27, -9,  -8,   7 ],
    [ 45, 12, 2.5, 20, -15, 12,  -7 ],
    [ 72, 76, 1.5, 25, -10, -6,  12 ],
    [ 30, 55, 1.5, 28, -6,   8,  -8 ],
    [ 60, 38, 2.5, 22, -13, -9,   7 ],
    [ 25, 30, 1.5, 33, -5,   7, -10 ],
    [ 82, 35, 2,   24, -11, 10,  -7 ],
];

// ─── Blob animations — longer, calmer durations ──────────────
const blobA = {
    idle:    { scale: 1, x: 0, y: 0 },
    animate: {
        scale: [1, 1.10, 1],
        x:     [0, 28, -18, 0],
        y:     [0, -18, 24, 0],
        transition: { duration: 30, ease: 'linear', repeat: Infinity },
    },
};
const blobB = {
    idle:    { scale: 1.05, x: 0, y: 0 },
    animate: {
        scale: [1.05, 1, 1.08],
        x:     [0, -25, 16, 0],
        y:     [0, 22, -18, 0],
        transition: { duration: 38, ease: 'linear', repeat: Infinity },
    },
};
const blobC = {
    idle:    { scale: 1, x: 0, y: 0 },
    animate: {
        scale: [1, 1.07, 0.97, 1],
        x:     [0, 18, -10, 0],
        y:     [0, -12, 20, 0],
        transition: { duration: 46, ease: 'linear', repeat: Infinity },
    },
};

// ─── Layer 7: Market Intelligence Network ────────────────────
// Abstract sector relationship topology — subconscious financial signal
// viewBox 1440×900 maps to full screen proportionally
const IntelligenceMap = ({ stroke, opacity }) => (
    <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={{ opacity }}
    >
        {/* ── Hub → sector connections (solid) ── */}
        <line x1="720" y1="338" x2="360" y2="222" stroke={stroke} strokeWidth="0.55" />
        <line x1="720" y1="338" x2="1010" y2="178" stroke={stroke} strokeWidth="0.55" />
        <line x1="720" y1="338" x2="1124" y2="494" stroke={stroke} strokeWidth="0.55" />
        <line x1="720" y1="338" x2="866" y2="632" stroke={stroke} strokeWidth="0.55" />
        <line x1="720" y1="338" x2="430" y2="614" stroke={stroke} strokeWidth="0.55" />
        <line x1="720" y1="338" x2="258" y2="466" stroke={stroke} strokeWidth="0.55" />

        {/* ── Cross-sector relationships (dashed — secondary flows) ── */}
        <line x1="360" y1="222" x2="1010" y2="178" stroke={stroke} strokeWidth="0.32" strokeDasharray="3,11" />
        <line x1="1010" y1="178" x2="1124" y2="494" stroke={stroke} strokeWidth="0.32" strokeDasharray="3,11" />
        <line x1="430" y1="614" x2="1124" y2="494" stroke={stroke} strokeWidth="0.32" strokeDasharray="3,11" />
        <line x1="866" y1="632" x2="258" y2="466" stroke={stroke} strokeWidth="0.32" strokeDasharray="3,11" />
        <line x1="430" y1="614" x2="866" y2="632" stroke={stroke} strokeWidth="0.32" strokeDasharray="3,11" />
        <line x1="360" y1="222" x2="258" y2="466" stroke={stroke} strokeWidth="0.32" strokeDasharray="3,11" />

        {/* ── Central hub — market intelligence core ── */}
        <circle cx="720" cy="338" r="13"  stroke={stroke} strokeWidth="0.75" />
        <circle cx="720" cy="338" r="23"  stroke={stroke} strokeWidth="0.32" strokeDasharray="2,7" />
        <circle cx="720" cy="338" r="38"  stroke={stroke} strokeWidth="0.18" strokeDasharray="1,9" />

        {/* ── Sector nodes ── */}
        <circle cx="360"  cy="222" r="9"  stroke={stroke} strokeWidth="0.6" />
        <circle cx="1010" cy="178" r="11" stroke={stroke} strokeWidth="0.6" />
        <circle cx="1124" cy="494" r="8"  stroke={stroke} strokeWidth="0.6" />
        <circle cx="866"  cy="632" r="8"  stroke={stroke} strokeWidth="0.6" />
        <circle cx="430"  cy="614" r="9"  stroke={stroke} strokeWidth="0.6" />
        <circle cx="258"  cy="466" r="7"  stroke={stroke} strokeWidth="0.6" />

        {/* ── Outer orbital ellipse — portfolio boundary ── */}
        <ellipse cx="720" cy="338" rx="445" ry="292"
            stroke={stroke} strokeWidth="0.25" strokeDasharray="4,20" />

        {/* ── Abstract market trajectory lines (candlestick abstraction) ── */}
        {/* Upper trend channel */}
        <path d="M -60,148 C 140,165 320,132 540,150 S 820,168 1020,145 S 1240,128 1460,143"
            stroke={stroke} strokeWidth="0.42" />
        {/* Lower trend channel */}
        <path d="M -60,730 C 160,710 350,748 580,722 S 860,696 1060,714 S 1280,700 1500,690"
            stroke={stroke} strokeWidth="0.42" />

        {/* ── Support / resistance zones (horizontal dashes) ── */}
        <line x1="60"  y1="430" x2="500" y2="430"
            stroke={stroke} strokeWidth="0.36" strokeDasharray="8,24" />
        <line x1="900" y1="260" x2="1380" y2="260"
            stroke={stroke} strokeWidth="0.36" strokeDasharray="8,24" />

        {/* ── Trend channel lines ── */}
        <line x1="50"  y1="540" x2="710" y2="370"
            stroke={stroke} strokeWidth="0.28" strokeDasharray="5,19" />
        <line x1="50"  y1="660" x2="710" y2="490"
            stroke={stroke} strokeWidth="0.28" strokeDasharray="5,19" />

        {/* ── Candlestick geometry abstraction ── */}
        {/* Very subtle vertical structure hints — not literal candles */}
        <line x1="200" y1="300" x2="200" y2="560" stroke={stroke} strokeWidth="0.22" strokeDasharray="2,14" />
        <line x1="1240" y1="180" x2="1240" y2="480" stroke={stroke} strokeWidth="0.22" strokeDasharray="2,14" />
        <line x1="640" y1="480" x2="640" y2="700" stroke={stroke} strokeWidth="0.22" strokeDasharray="2,14" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════
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

            {/* ══════════════ DARK MODE ══════════════════════════════════ */}
            {isDark && (
                <>
                    {/* Layer 1a — Deep base */}
                    <div className="absolute inset-0" style={{ background: '#09090A' }} />

                    {/* Layer 1b — Crown radial: warm gold intelligence spill from top */}
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 130% 52% at 50% -10%, rgba(212,160,23,0.26) 0%, rgba(180,130,10,0.10) 42%, transparent 62%)',
                    }} />

                    {/* Layer 4 — Intelligence glow: radiates from hero/search area */}
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 80% 60% at 50% 36%, rgba(212,160,23,0.075) 0%, rgba(160,110,8,0.04) 42%, transparent 68%)',
                    }} />

                    {/* Corner depth accents */}
                    <div className="absolute inset-0" style={{
                        background:
                            'radial-gradient(ellipse 48% 36% at 100% 100%, rgba(160,115,8,0.14) 0%, transparent 56%),' +
                            'radial-gradient(ellipse 36% 26% at 0% 82%, rgba(140,100,5,0.09) 0%, transparent 52%)',
                    }} />

                    {/* Layer 3 — Animated ambient blobs (market heat) */}
                    <div className="absolute inset-0" style={{ opacity: 0.17 }}>
                        <motion.div variants={blobA} animate={anim}
                            className="absolute top-[-14%] left-[2%] w-[54vw] h-[54vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.58) 0%, transparent 70%)', filter: 'blur(90px)' }}
                        />
                        <motion.div variants={blobB} animate={anim}
                            className="absolute bottom-[-18%] right-[0%] w-[44vw] h-[44vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(180,130,10,0.46) 0%, transparent 70%)', filter: 'blur(98px)' }}
                        />
                        <motion.div variants={blobC} animate={anim}
                            className="absolute top-[38%] left-[56%] w-[30vw] h-[30vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.28) 0%, transparent 70%)', filter: 'blur(76px)' }}
                        />
                    </div>

                    {/* Layer 2 — Financial terminal grid */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: DARK_GRID,
                        backgroundSize: '80px 60px',
                    }} />

                    {/* Layer 7 — Market Intelligence Network */}
                    <IntelligenceMap stroke="#D4A017" opacity={0.13} />

                    {/* Layer 6 — Concentric intelligence rings (centered on search area) */}
                    <div className="absolute pointer-events-none"
                        style={{ left: '50%', top: '36%', transform: 'translate(-50%, -50%)' }}>
                        {[160, 300, 460, 650, 880].map((size, i) => (
                            <div key={i} className="absolute rounded-full border"
                                style={{
                                    width: size, height: size,
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderColor: `rgba(212,160,23,${0.13 - i * 0.022})`,
                                }} />
                        ))}
                    </div>

                    {/* Layer 5 — Floating data-point particles */}
                    <div className="absolute inset-0">
                        {PARTICLES.map(([l, t, s, dur, del, dx, dy], i) => (
                            <motion.div key={i}
                                className="absolute rounded-full"
                                style={{
                                    left: `${l}%`, top: `${t}%`,
                                    width: s, height: s,
                                    background: 'rgba(212,160,23,0.9)',
                                    boxShadow: '0 0 4px rgba(212,160,23,0.3)',
                                }}
                                animate={{
                                    y: [0, dy, -dy * 0.5, dy * 0.3, 0],
                                    x: [0, dx, -dx * 0.4, dx * 0.2, 0],
                                    opacity: [0.20, 0.46, 0.14, 0.36, 0.20],
                                }}
                                transition={{ duration: dur, delay: del, ease: 'easeInOut', repeat: Infinity }}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* ══════════════ LIGHT MODE ═════════════════════════════════ */}
            {!isDark && (
                <>
                    {/* Layer 1a — Warm ivory base (Goldman Sachs annual report feel) */}
                    <div className="absolute inset-0" style={{ background: '#FAF8F2' }} />

                    {/* Layer 1b — Champagne top warmth */}
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 92% 44% at 50% -8%, rgba(251,191,36,0.14) 0%, rgba(212,160,23,0.055) 44%, transparent 64%)',
                    }} />

                    {/* Layer 4 — Intelligence glow (warm ambient behind search) */}
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 72% 52% at 50% 36%, rgba(212,160,23,0.065) 0%, rgba(180,130,10,0.03) 44%, transparent 68%)',
                    }} />

                    {/* Corner paper accents */}
                    <div className="absolute inset-0" style={{
                        background:
                            'radial-gradient(ellipse 42% 32% at 100% 0%, rgba(251,191,36,0.10) 0%, transparent 52%),' +
                            'radial-gradient(ellipse 44% 28% at 0% 100%, rgba(212,160,23,0.07) 0%, transparent 52%)',
                    }} />

                    {/* Layer 3 — Ambient warmth blobs */}
                    <div className="absolute inset-0" style={{ opacity: 0.13 }}>
                        <motion.div variants={blobA} animate={anim}
                            className="absolute top-[-20%] right-[-10%] w-[48vw] h-[48vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.44) 0%, transparent 70%)', filter: 'blur(95px)' }}
                        />
                        <motion.div variants={blobB} animate={anim}
                            className="absolute bottom-[-16%] left-[-8%] w-[38vw] h-[38vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.30) 0%, transparent 70%)', filter: 'blur(86px)' }}
                        />
                        <motion.div variants={blobC} animate={anim}
                            className="absolute top-[32%] right-[18%] w-[26vw] h-[26vw] rounded-full will-change-transform"
                            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.20) 0%, transparent 70%)', filter: 'blur(72px)' }}
                        />
                    </div>

                    {/* Layer 2 — Financial terminal grid */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: LIGHT_GRID,
                        backgroundSize: '80px 60px',
                    }} />

                    {/* Layer 7 — Market Intelligence Network */}
                    <IntelligenceMap stroke="#B8860B" opacity={0.10} />

                    {/* Layer 6 — Concentric intelligence rings */}
                    <div className="absolute pointer-events-none"
                        style={{ left: '50%', top: '36%', transform: 'translate(-50%, -50%)' }}>
                        {[160, 300, 460, 650, 880].map((size, i) => (
                            <div key={i} className="absolute rounded-full border"
                                style={{
                                    width: size, height: size,
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderColor: `rgba(180,130,8,${0.10 - i * 0.016})`,
                                }} />
                        ))}
                    </div>

                    {/* Layer 5 — Floating data-point particles */}
                    <div className="absolute inset-0">
                        {PARTICLES.map(([l, t, s, dur, del, dx, dy], i) => (
                            <motion.div key={i}
                                className="absolute rounded-full"
                                style={{
                                    left: `${l}%`, top: `${t}%`,
                                    width: s - 0.5, height: s - 0.5,
                                    background: 'rgba(180,130,8,0.65)',
                                }}
                                animate={{
                                    y: [0, dy, -dy * 0.5, dy * 0.3, 0],
                                    x: [0, dx, -dx * 0.4, dx * 0.2, 0],
                                    opacity: [0.12, 0.26, 0.08, 0.20, 0.12],
                                }}
                                transition={{ duration: dur, delay: del, ease: 'easeInOut', repeat: Infinity }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});

BackgroundEffect.displayName = 'BackgroundEffect';
export default BackgroundEffect;
