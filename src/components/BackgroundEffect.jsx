import { memo, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const CELL = 48;

function buildPCB(W, H) {
    const cols = Math.floor(W / CELL) + 2;
    const rows = Math.floor(H / CELL) + 2;
    const segments = [];
    const padMap = new Map();

    const addPad = (cx, cy) => padMap.set(`${cx},${cy}`, { x: cx * CELL, y: cy * CELL });
    const count = Math.min(Math.floor((W * H) / (CELL * CELL) * 0.55), 160);

    for (let i = 0; i < count; i++) {
        let cx = Math.floor(Math.random() * cols);
        let cy = Math.floor(Math.random() * rows);
        const len = 3 + Math.floor(Math.random() * 9);
        let prev = -1;

        for (let j = 0; j < len; j++) {
            addPad(cx, cy);
            const dirs = [0, 1, 2, 3].filter(d => prev < 0 || Math.abs(d - prev) !== 2);
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            let nx = cx, ny = cy;
            if (d === 0) nx++; else if (d === 1) ny++;
            else if (d === 2) nx--; else ny--;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                segments.push({ x1: cx * CELL, y1: cy * CELL, x2: nx * CELL, y2: ny * CELL });
                cx = nx; cy = ny; prev = d;
            }
        }
    }
    return { segments, pads: [...padMap.values()] };
}

const BackgroundEffect = memo(() => {
    const { theme } = useTheme();
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = window.innerWidth;
        const H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const dark = theme === 'dark';
        const { segments, pads } = buildPCB(W, H);

        // ── Pre-render static layer (bg + traces + pads) ──
        const off = document.createElement('canvas');
        off.width = W * dpr;
        off.height = H * dpr;
        const ox = off.getContext('2d');
        ox.scale(dpr, dpr);

        ox.fillStyle = dark ? '#0A0A0A' : '#F5F2E8';
        ox.fillRect(0, 0, W, H);

        // Ambient glow (dark only)
        if (dark) {
            const grd = ox.createRadialGradient(W * 0.55, H * 0.45, 0, W * 0.55, H * 0.45, W * 0.6);
            grd.addColorStop(0, 'rgba(212,160,23,0.07)');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ox.fillStyle = grd;
            ox.fillRect(0, 0, W, H);
        }

        // Traces
        ox.lineWidth = 1;
        ox.lineCap = 'square';
        ox.strokeStyle = dark ? 'rgba(212,160,23,0.22)' : 'rgba(185,158,35,0.16)';
        segments.forEach(({ x1, y1, x2, y2 }) => {
            ox.beginPath(); ox.moveTo(x1, y1); ox.lineTo(x2, y2); ox.stroke();
        });

        // Pads (small squares at junctions)
        pads.forEach(({ x, y }) => {
            ox.fillStyle = dark ? 'rgba(212,160,23,0.45)' : 'rgba(185,158,35,0.30)';
            ox.fillRect(x - 2.5, y - 2.5, 5, 5);
        });

        // ── Particles ──
        const particles = [];
        const spawn = () => {
            if (!segments.length) return;
            const s = segments[Math.floor(Math.random() * segments.length)];
            particles.push({
                s,
                t: Math.random(),
                speed: 0.00055 + Math.random() * 0.0009,
            });
        };
        for (let i = 0; i < 30; i++) spawn();

        let prev = 0;
        const frame = (ts) => {
            const dt = prev ? Math.min(ts - prev, 40) : 16;
            prev = ts;

            // Blit static layer
            ctx.drawImage(off, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

            // Particles
            particles.forEach(p => {
                p.t += p.speed * dt;
                if (p.t > 1) {
                    p.t = 0;
                    p.s = segments[Math.floor(Math.random() * segments.length)];
                }
                const x = p.s.x1 + (p.s.x2 - p.s.x1) * p.t;
                const y = p.s.y1 + (p.s.y2 - p.s.y1) * p.t;

                // Outer glow
                const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
                g.addColorStop(0, dark ? 'rgba(255,210,60,0.75)' : 'rgba(200,165,20,0.60)');
                g.addColorStop(0.4, dark ? 'rgba(212,160,23,0.30)' : 'rgba(185,145,15,0.20)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();

                // Core dot
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = dark ? '#FFD95A' : '#C8A025';
                ctx.fill();
            });

            rafRef.current = requestAnimationFrame(frame);
        };

        rafRef.current = requestAnimationFrame(frame);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [theme]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
        />
    );
});

BackgroundEffect.displayName = 'BackgroundEffect';
export default BackgroundEffect;
