import { clsx } from 'clsx';
import { useTheme } from '../../../context/ThemeContext';

/* ─── OVERALL HEALTH SCORE banner ───────────────────────────────── */
// Not currently wired into the composed FundamentalScoreCard output (removed
// 2026-07-10 per product request) — kept here for potential reuse.
const COMPONENT_LABELS = { technical: 'TECH', financial: 'FIN', management: 'MGMT' };

export const OverallHealthScore = ({ score, label, summary, ratingsSum, components }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const s = Math.min(100, Math.max(0, score || 0));
    const r = 32, cx = 42, cy = 42, circ = 2 * Math.PI * r;
    const filled = (s / 100) * circ;
    const { strong = 0, watch = 0, risk = 0 } = ratingsSum || {};
    const ringColor = s >= 70 ? '#10b981' : s >= 40 ? '#FDD405' : '#ef4444';
    const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
    const numColor   = isDark ? '#fff' : '#111';
    const subColor   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    return (
        <div className="mb-4 rounded-xl p-4 flex items-center gap-4 border
                        bg-zinc-100 border-zinc-200
                        dark:bg-zinc-900 dark:border-zinc-800/80">
            <div className="flex-shrink-0">
                <svg viewBox="0 0 84 84" width={80} height={80}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={8} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={8}
                        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`} />
                    <text x={cx} y={cy - 4} textAnchor="middle" fill={numColor}
                        fontSize={21} fontWeight="800" fontFamily="Montserrat,sans-serif">{s}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fill={subColor}
                        fontSize={9} fontFamily="Montserrat,sans-serif">/100</text>
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-1',
                    isDark ? 'text-white/50' : 'text-zinc-500')}>
                    Overall Health Score
                </p>
                <p className={clsx('text-[15px] font-bold leading-snug mb-2 line-clamp-2',
                    isDark ? 'text-white' : 'text-zinc-900')}>
                    {summary || label || 'Healthy company.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {components && Object.entries(components).map(([k, v]) => (
                        <span key={k} className={clsx(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                            isDark ? 'bg-white/5 text-white/80 border-white/15' : 'bg-white text-zinc-700 border-zinc-300'
                        )}>
                            <span className="opacity-60">{COMPONENT_LABELS[k] || k.toUpperCase()}</span>
                            {v}
                        </span>
                    ))}
                    {[
                        { dot: 'bg-emerald-500', text: `${strong} STRONG` },
                        { dot: 'bg-amber-400',   text: `${watch} WATCH` },
                        { dot: 'bg-rose-500',    text: `${risk} RISK` },
                    ].map(({ dot, text }) => (
                        <span key={text} className={clsx(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            isDark ? 'bg-white/10 text-white/80' : 'bg-zinc-200/80 text-zinc-700'
                        )}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
                            {text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
