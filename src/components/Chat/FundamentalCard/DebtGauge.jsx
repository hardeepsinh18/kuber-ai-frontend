/* ─── Debt/Equity semi-gauge ─────────────────────────────────────────────── */
export const DebtGauge = ({ value }) => {
    const maxVal = 2.5;
    const pct = Math.min((value || 0) / maxVal, 1);
    const r = 40, cx = 58, cy = 52, circ = Math.PI * r;
    const filled = pct * circ;
    const color = (value || 0) < 0.5 ? '#22c55e' : (value || 0) < 1.0 ? '#eab308' : '#ef4444';
    const angle = Math.PI * (1 - pct);
    const nx = cx + r * Math.cos(angle);
    const ny = cy - r * Math.sin(angle);
    return (
        <svg viewBox="0 0 116 72" style={{ width: '100%', maxWidth: 160, height: 72, display: 'block', margin: '0 auto' }}>
            <path d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
                fill="none" strokeWidth={7} strokeLinecap="round"
                className="stroke-zinc-200 dark:stroke-[#27282d]" />
            <path d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
                fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
                strokeDasharray={`${filled} ${circ}`} />
            <line x1={cx} y1={cy} x2={nx} y2={ny} strokeWidth={2} strokeLinecap="round"
                className="stroke-zinc-900 dark:stroke-white" />
            <circle cx={cx} cy={cy} r={3} className="fill-zinc-900 dark:fill-white" />
            <text x={cx - r - 2} y={cy + 13} textAnchor="end"   className="fill-zinc-500 dark:fill-[#52525b]" fontSize={8} fontFamily="Montserrat,sans-serif">0</text>
            <text x={cx}         y={cy - r - 4} textAnchor="middle" className="fill-zinc-500 dark:fill-[#52525b]" fontSize={8} fontFamily="Montserrat,sans-serif">1.0</text>
            <text x={cx + r + 2} y={cy + 13} textAnchor="start" className="fill-zinc-500 dark:fill-[#52525b]" fontSize={8} fontFamily="Montserrat,sans-serif">2.0+</text>
            <text x={cx - 14} y={cy - 14} textAnchor="middle" className="fill-emerald-600 dark:fill-[#22c55e]" fontSize={7} fontWeight="bold" fontFamily="Montserrat,sans-serif">SAFE</text>
            <text x={cx - 14} y={cy - 5}  textAnchor="middle" className="fill-emerald-600 dark:fill-[#22c55e]" fontSize={7} fontWeight="bold" fontFamily="Montserrat,sans-serif">ZONE</text>
        </svg>
    );
};
