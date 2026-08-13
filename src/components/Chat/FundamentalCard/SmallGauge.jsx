import { fmtNum } from '../../../utils/metricFormat';

/* ─── Small circular gauge (ROCE) ───────────────────────────────────────── */
export const SmallGauge = ({ value, sublabel, size = 88 }) => {
    const pct = Math.min(100, Math.max(0, value || 0));   // arc fill (clamped)
    const r = 32, cx = 40, cy = 42, circ = 2 * Math.PI * r;
    const filled = (pct / 100) * circ;
    const color = '#FDD405';
    // Centre reads the shared formatter so it matches the bottom value exactly.
    const shown = fmtNum(value) ?? '—';
    return (
        <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 80 88" width={size} height={size}>
                <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={8}
                    className="stroke-zinc-200 dark:stroke-[#27282d]" />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
                    strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`} />
                <text x={cx} y={cy - 2} textAnchor="middle"
                    className="fill-zinc-900 dark:fill-white"
                    fontSize={13} fontWeight="700" fontFamily="Montserrat,sans-serif">{shown}%</text>
                {sublabel && (
                    <text x={cx} y={cy + 13} textAnchor="middle"
                        className="fill-zinc-500 dark:fill-[#9ca3af]"
                        fontSize={7} fontFamily="Montserrat,sans-serif" letterSpacing="0.5">{sublabel.toUpperCase()}</text>
                )}
            </svg>
        </div>
    );
};
