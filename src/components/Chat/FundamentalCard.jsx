import React from 'react';
import {
    BarChart, Bar, LineChart, Line, Cell,
    XAxis, ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

/* ─── label classifiers ──────────────────────────────────────────────────── */
const isGoodLabel = (l) =>
    /CHEAP|ELITE|ZERO.?DEBT|ATTRACTIVE|ABOVE.?AVG|RISING|STRONG|#\d|STABLE.?HIGH|NEW/i.test(l || '');
const isNeutralLabel = (l) =>
    /MODERATE|WATCH|STABILIZ|FAIR|AVERAGE/i.test(l || '');

/* ─── Rating badge ───────────────────────────────────────────────────────── */
const RatingBadge = ({ label, className }) => {
    if (!label) return null;
    const good = isGoodLabel(label);
    const neutral = !good && isNeutralLabel(label);
    return (
        <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap flex-shrink-0',
            good    ? 'bg-zinc-900 border-emerald-700/40 text-emerald-300' :
            neutral ? 'bg-zinc-900 border-amber-700/40  text-amber-300'   :
                      'bg-zinc-900 border-rose-700/40   text-rose-300',
            className
        )}>
            <span className={clsx(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                good ? 'bg-emerald-400' : neutral ? 'bg-amber-400' : 'bg-rose-400'
            )} />
            {label}
        </span>
    );
};

/* ─── Metric card shell ──────────────────────────────────────────────────── */
const MetricCard = ({ title, subtitle, badge, children, bottomLabel, bottomValue, className }) => (
    <div className={clsx(
        'bg-zinc-900 rounded-xl border border-zinc-700/50 p-3 flex flex-col',
        className
    )}>
        <div className="flex items-start justify-between mb-2 gap-2">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-none">{title}</p>
                {subtitle && <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">{subtitle}</p>}
            </div>
            {badge && <RatingBadge label={badge} />}
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[60px]">
            {children}
        </div>
        {(bottomLabel || bottomValue) && (
            <div className="flex items-end justify-between pt-2 border-t border-zinc-700/50 mt-2 gap-2">
                {bottomLabel && <span className="text-[10px] text-zinc-500 leading-tight">{bottomLabel}</span>}
                {bottomValue && <span className="text-sm font-bold text-white flex-shrink-0">{bottomValue}</span>}
            </div>
        )}
    </div>
);

/* ─── Mini bar chart (Recharts) ─────────────────────────────────────────── */
const MiniBar = ({ data, color = '#FDD405', years }) => {
    if (!data?.length) return null;
    const items = data.map((v, i) => ({ v: Number(v) || 0, y: years?.[i] ?? `Y${i + 1}` }));
    return (
        <ResponsiveContainer width="100%" height={72}>
            <BarChart data={items} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
                <XAxis dataKey="y" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                    {items.map((_, i) => (
                        <Cell key={i} fill={i === items.length - 1 ? color : `${color}99`} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/* ─── Mini line chart (Recharts) ────────────────────────────────────────── */
const MiniLine = ({ data, color = '#22c55e', years }) => {
    if (!data?.length) return null;
    const items = data.map((v, i) => ({ v: Number(v) || 0, y: years?.[i] ?? `Y${i + 1}` }));
    return (
        <ResponsiveContainer width="100%" height={72}>
            <LineChart data={items} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="y" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2}
                    dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};

/* ─── P/E Gradient Bar ───────────────────────────────────────────────────── */
const PEGradientBar = ({ pe, sectorPe, symbol }) => {
    const max = Math.max((sectorPe || 30) * 1.9, (pe || 20) * 1.8, 55);
    const pePos     = Math.min(Math.max(((pe || 0) / max) * 100, 4), 94);
    const sectorPos = Math.min(Math.max(((sectorPe || 28) / max) * 100, 4), 94);
    const sym = (symbol || 'STK').toUpperCase().replace(/\.NS|\.BO|-EQ|NSE:|BSE:/gi, '').slice(0, 4);

    return (
        <div className="w-full px-1">
            {/* reserve vertical space: label 14px + circle 28px + tick 4px = ~46px above bar */}
            <div className="relative" style={{ paddingTop: 46 }}>
                {/* Sector avg label */}
                <div className="absolute text-[9px] text-zinc-400 whitespace-nowrap"
                     style={{ left: `${sectorPos}%`, top: 0, transform: 'translateX(-50%)' }}>
                    Sector {sectorPe || 28}x
                </div>
                {/* Symbol yellow circle */}
                <div className="absolute z-10 flex flex-col items-center"
                     style={{ left: `${pePos}%`, top: 14, transform: 'translateX(-50%)' }}>
                    <div className="w-7 h-7 rounded-full bg-[#FDD405] border-2 border-zinc-900 flex items-center justify-center text-[7px] font-black text-black shadow">
                        {sym}
                    </div>
                    <div className="w-px h-1 bg-[#FDD405]" />
                </div>
                {/* Gradient bar */}
                <div className="relative h-3 rounded-full"
                     style={{ background: 'linear-gradient(to right,#22c55e 0%,#84cc16 25%,#eab308 50%,#f97316 75%,#ef4444 100%)' }}>
                    <div className="absolute top-0 bottom-0 w-px bg-white/50"
                         style={{ left: `${sectorPos}%` }} />
                </div>
            </div>
            <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                <span>CHEAP</span><span>EXPENSIVE</span>
            </div>
        </div>
    );
};

/* ─── ROE "Money engine" ─────────────────────────────────────────────────── */
const ROEViz = ({ roe }) => {
    const profit = Math.round(roe || 0);
    return (
        <div className="w-full">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide text-center mb-2">
                Every ₹100 Invested Earns
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="text-center">
                    <p className="text-xl font-bold text-white leading-none">₹100</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">YOU INVEST</p>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-bold text-emerald-400">+{profit}%</span>
                    <svg width="36" height="10" viewBox="0 0 36 10">
                        <line x1="0" y1="5" x2="28" y2="5" stroke="#22c55e" strokeWidth="2" />
                        <polygon points="26,1 36,5 26,9" fill="#22c55e" />
                    </svg>
                    <span className="text-[9px] text-zinc-500">PER YEAR</span>
                </div>
                <div className="w-14 h-14 rounded-full bg-emerald-950/50 border-2 border-emerald-500 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-emerald-400 leading-none">₹{profit}</span>
                    <span className="text-[7px] text-emerald-500 text-center leading-tight mt-0.5">PROFIT{'\n'}BACK</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Small circular gauge (ROCE) ───────────────────────────────────────── */
const SmallGauge = ({ value, sublabel, size = 88 }) => {
    const pct = Math.min(100, Math.max(0, value || 0));
    const r = 32, cx = 40, cy = 42, circ = 2 * Math.PI * r;
    const filled = (pct / 100) * circ;
    const color = '#FDD405';
    return (
        <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 80 88" width={size} height={size}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27282d" strokeWidth={8} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
                    strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`} />
                <text x={cx} y={cy - 2} textAnchor="middle" fill="#fff"
                    fontSize={17} fontWeight="700" fontFamily="Inter,sans-serif">{Math.round(pct)}%</text>
                {sublabel && (
                    <text x={cx} y={cy + 13} textAnchor="middle" fill="#9ca3af"
                        fontSize={7} fontFamily="Inter,sans-serif" letterSpacing="0.5">{sublabel.toUpperCase()}</text>
                )}
            </svg>
        </div>
    );
};

/* ─── Debt/Equity semi-gauge ─────────────────────────────────────────────── */
const DebtGauge = ({ value }) => {
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
                fill="none" stroke="#27282d" strokeWidth={7} strokeLinecap="round" />
            <path d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
                fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
                strokeDasharray={`${filled} ${circ}`} />
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={3} fill="#fff" />
            <text x={cx - r - 2} y={cy + 13} textAnchor="end"   fill="#52525b" fontSize={8} fontFamily="Inter,sans-serif">0</text>
            <text x={cx}         y={cy - r - 4} textAnchor="middle" fill="#52525b" fontSize={8} fontFamily="Inter,sans-serif">1.0</text>
            <text x={cx + r + 2} y={cy + 13} textAnchor="start" fill="#52525b" fontSize={8} fontFamily="Inter,sans-serif">2.0+</text>
            <text x={cx - 14} y={cy - 14} textAnchor="middle" fill="#22c55e" fontSize={7} fontWeight="bold" fontFamily="Inter,sans-serif">SAFE</text>
            <text x={cx - 14} y={cy - 5}  textAnchor="middle" fill="#22c55e" fontSize={7} fontWeight="bold" fontFamily="Inter,sans-serif">ZONE</text>
        </svg>
    );
};

/* ─── Net Margin split bar ───────────────────────────────────────────────── */
const ProfitSliceBar = ({ netMargin }) => {
    const profit = Math.round(Math.min(100, Math.max(0, netMargin || 0)));
    const cost = 100 - profit;
    return (
        <div className="w-full">
            <p className="text-[9px] text-zinc-500 text-center uppercase tracking-wide mb-2">
                From Every ₹100 of Sales
            </p>
            <div className="flex rounded-lg overflow-hidden h-8 w-full">
                {profit > 0 && (
                    <div className="flex items-center justify-center text-[11px] font-bold text-white bg-emerald-600"
                         style={{ width: `${profit}%` }}>
                        ₹{profit}
                    </div>
                )}
                {cost > 0 && (
                    <div className="flex items-center justify-center text-[11px] font-semibold text-zinc-400 bg-zinc-800"
                         style={{ width: `${cost}%` }}>
                        ₹{cost}
                    </div>
                )}
            </div>
            <div className="flex justify-between text-[9px] mt-1">
                <span className="text-emerald-400 font-semibold">PROFIT</span>
                <span className="text-zinc-500">COSTS & TAX</span>
            </div>
        </div>
    );
};

/* ─── Peer rank horizontal bars ─────────────────────────────────────────── */
const PeerRankCard = ({ peers, group, rank }) => {
    const sorted = [...peers].sort((a, b) => (b.score || 0) - (a.score || 0));
    const maxScore = sorted[0]?.score || 100;
    const foundIdx = sorted.findIndex(p => p.is_self);
    const myRank = rank ?? (foundIdx >= 0 ? foundIdx + 1 : 1);

    return (
        <div className="bg-[#FDD405] rounded-xl border border-[#FDD405]/40 p-3 flex flex-col">
            <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-black leading-none">Peer rank</p>
                    <p className="text-[10px] text-black/60 uppercase tracking-wide mt-0.5">VS {group || 'SECTOR'}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap flex-shrink-0 bg-black/15 border-black/20 text-black">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-700" />
                    #{myRank}
                </span>
            </div>
            <div className="flex-1 w-full space-y-2 pt-1 min-h-[60px]">
                {sorted.map((p) => (
                    <div key={p.name || p.symbol} className="flex items-center gap-2">
                        <span className={clsx(
                            'text-[10px] w-24 flex-shrink-0 truncate',
                            p.is_self ? 'font-bold text-black' : 'text-black/60'
                        )}>
                            {p.name || p.symbol}
                        </span>
                        <div className="flex-1 h-1.5 bg-black/15 rounded-full overflow-hidden">
                            <div
                                className={clsx('h-full rounded-full', p.is_self ? 'bg-black' : 'bg-black/30')}
                                style={{ width: `${((p.score || 0) / maxScore) * 100}%` }}
                            />
                        </div>
                        <span className={clsx(
                            'text-[10px] w-5 text-right flex-shrink-0',
                            p.is_self ? 'font-bold text-black' : 'text-black/60'
                        )}>
                            {p.score}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-end pt-2 border-t border-black/20 mt-2">
                <span className="text-[10px] text-black/60 leading-tight">Best in peer set: {sorted[0]?.score}</span>
            </div>
        </div>
    );
};

/* ─── OVERALL HEALTH SCORE (yellow banner) ───────────────────────────────── */
const OverallHealthScore = ({ score, label, summary, ratingsSum }) => {
    const s = Math.min(100, Math.max(0, score || 0));
    const r = 32, cx = 42, cy = 42, circ = 2 * Math.PI * r;
    const filled = (s / 100) * circ;
    const { strong = 0, watch = 0, risk = 0 } = ratingsSum || {};
    return (
        <div className="mb-4 rounded-xl bg-[#FDD405] p-4 flex items-center gap-4">
            <div className="flex-shrink-0">
                <svg viewBox="0 0 84 84" width={80} height={80}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={8} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000" strokeWidth={8}
                        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`} />
                    <text x={cx} y={cy - 4} textAnchor="middle" fill="#000"
                        fontSize={21} fontWeight="800" fontFamily="Inter,sans-serif">{s}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(0,0,0,0.55)"
                        fontSize={9} fontFamily="Inter,sans-serif">/100</text>
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mb-1">
                    Overall Health Score
                </p>
                <p className="text-[15px] font-bold text-black leading-snug mb-2 line-clamp-2">
                    {summary || label || 'Healthy company.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { dot: 'bg-emerald-700', text: `${strong} STRONG` },
                        { dot: 'bg-amber-700',   text: `${watch} WATCH` },
                        { dot: 'bg-rose-700',    text: `${risk} RISK` },
                    ].map(({ dot, text }) => (
                        <span key={text} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/15 text-[10px] font-semibold text-black">
                            <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
                            {text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ─── FINANCIAL SCORE CARD (collapsible 2-col grid) ─────────────────────── */
const FinancialScoreCard = ({ fund, symbol }) => {
    const [open, setOpen] = React.useState(true);
    const ratios = fund?.ratios ?? {};
    const hist   = fund?.historical ?? null;
    const years  = hist?.years ?? ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'];

    const getR = (key) => {
        const v = ratios[key];
        if (v == null) return [null, null, null];
        if (Array.isArray(v)) return [v[0] ?? null, v[1] ?? null, v[2] ?? null];
        if (typeof v === 'object') return [v.value ?? null, v.threshold ?? null, v.label ?? null];
        return [v, null, null];
    };

    const [pe, sectorPe, peLabel]  = getR('pe_ratio');
    const [roe, ,  roeLabel]       = getR('roe');
    const [roce, , roceLabel]      = getR('roce');
    const [margin, , marginLabel]  = getR('net_margin');
    const [debt, ,  debtLabel]     = getR('debt_equity');
    const [revGr, , revGrLabel]    = getR('revenue_growth');
    const [profGr, , profGrLabel]  = getR('profit_growth');

    const peers    = fund?.peers ?? null;
    const peerGroup = fund?.peer_group ?? 'SECTOR';
    const peerRank = fund?.peer_rank ?? null;

    const hasCards = [pe, roe, roce, margin, debt, revGr, profGr].some(v => v != null) || peers?.length > 0;
    if (!hasCards) return null;

    return (
        <div className="mt-4 border border-zinc-700/50 rounded-xl overflow-hidden bg-zinc-950">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FDD405] hover:bg-[#FDD405]/90 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-black">Financial Score Card</span>
                {open ? <ChevronUp size={15} className="text-black/70 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-black/70 flex-shrink-0" />}
            </button>
            {open && (
                <div className="p-3 grid grid-cols-1 xs:grid-cols-2 gap-3 bg-zinc-950">
                    {pe != null && (
                        <MetricCard title="Price tag" subtitle="P/E RATIO" badge={peLabel}
                            bottomLabel={`You pay ~${Math.round(pe)} yrs of profit`}
                            bottomValue={`${pe}x`}>
                            <PEGradientBar pe={pe} sectorPe={sectorPe || 28} symbol={symbol} />
                        </MetricCard>
                    )}
                    {roe != null && (
                        <MetricCard title="Money engine" subtitle="RETURN ON EQUITY" badge={roeLabel}
                            bottomLabel="Benchmark 15% · Elite 30%+"
                            bottomValue={`${roe}%`}>
                            <ROEViz roe={roe} />
                        </MetricCard>
                    )}
                    {roce != null && (
                        <MetricCard title="Capital muscle" subtitle="RETURN ON CAPITAL" badge={roceLabel}
                            bottomLabel="Benchmark 20%"
                            bottomValue={`${roce}%`}>
                            <SmallGauge value={roce} size={88} sublabel="ROCE" />
                        </MetricCard>
                    )}
                    {margin != null && (
                        <MetricCard title="Profit slice" subtitle="NET MARGIN" badge={marginLabel}
                            bottomValue={`${margin}%`}>
                            <ProfitSliceBar netMargin={margin} />
                        </MetricCard>
                    )}
                    {debt != null && (
                        <MetricCard title="Debt stress" subtitle="DEBT / EQUITY" badge={debtLabel}
                            bottomLabel="Safe < 1.0 · Risky > 2.0"
                            bottomValue={Number(debt).toFixed(2)}>
                            <DebtGauge value={debt} />
                        </MetricCard>
                    )}
                    {revGr != null && (
                        <MetricCard title="Sales growth" subtitle="REVENUE · 5 YR CAGR" badge={revGrLabel}
                            bottomLabel="Goal > 10% per year"
                            bottomValue={`${revGr}%`}>
                            {hist?.revenue_cr?.length
                                ? <MiniBar data={hist.revenue_cr} color="#FDD405" years={years} />
                                : <p className="text-3xl font-black text-[#FDD405]">{revGr}%</p>
                            }
                        </MetricCard>
                    )}
                    {profGr != null && (
                        <MetricCard title="Profit pace" subtitle="NET PROFIT · 5 YR CAGR" badge={profGrLabel}
                            bottomLabel="Goal > 10% per year"
                            bottomValue={`${profGr}%`}>
                            {hist?.net_profit_cr?.length
                                ? <MiniLine data={hist.net_profit_cr} color="#FDD405" years={years} />
                                : <p className="text-3xl font-black text-[#FDD405]">{profGr}%</p>
                            }
                        </MetricCard>
                    )}
                    {peers?.length > 0 && (
                        <PeerRankCard peers={peers} group={peerGroup} rank={peerRank} />
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── 5 YEAR FINANCIAL SCORE CARD ───────────────────────────────────────── */
const FiveYearScoreCard = ({ fund }) => {
    const [open, setOpen] = React.useState(false);
    const hist = fund?.historical;
    if (!hist) return null;

    const years   = hist.years ?? ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'];
    const lastYear = years[years.length - 1] ?? 'Latest';

    const fmtCr = (v) => {
        if (v == null) return '—';
        const n = Number(v);
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L Cr`;
        if (n >= 1000)   return `₹${Math.round(n).toLocaleString('en-IN')} Cr`;
        return `₹${n}`;
    };
    const first = (arr) => arr?.[0] ?? null;
    const last  = (arr) => arr?.[arr.length - 1] ?? null;

    const hasAny = [
        hist.revenue_cr, hist.net_profit_cr, hist.eps,
        hist.roce_pct, hist.roe_pct, hist.net_margin_pct, hist.dividend_yield_pct,
    ].some(a => a?.length > 0) || hist.fcf_crore != null;

    if (!hasAny) return null;

    return (
        <div className="mt-4 border border-zinc-700/50 rounded-xl overflow-hidden bg-zinc-950">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FDD405] hover:bg-[#FDD405]/90 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-black">5 Year Financial Score Card</span>
                {open ? <ChevronUp size={15} className="text-black/70 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-black/70 flex-shrink-0" />}
            </button>
            {open && (
                <div className="p-3 grid grid-cols-1 xs:grid-cols-2 gap-3 bg-zinc-950">
                    {hist.revenue_cr?.length > 0 && (
                        <MetricCard title="Revenue" subtitle="TOP LINE · ₹ CR"
                            badge={hist.revenue_cagr ? `+${hist.revenue_cagr}% CAGR` : null}
                            bottomLabel={first(hist.revenue_cr) ? `From ${fmtCr(first(hist.revenue_cr))} (${years[0]})` : null}
                            bottomValue={fmtCr(last(hist.revenue_cr))}>
                            <MiniBar data={hist.revenue_cr} color="#FDD405" years={years} />
                        </MetricCard>
                    )}
                    {hist.net_profit_cr?.length > 0 && (
                        <MetricCard title="Net Profit" subtitle="BOTTOM LINE · ₹ CR"
                            badge={hist.profit_cagr ? `+${hist.profit_cagr}% CAGR` : null}
                            bottomLabel={first(hist.net_profit_cr) ? `From ${fmtCr(first(hist.net_profit_cr))} (${years[0]})` : null}
                            bottomValue={fmtCr(last(hist.net_profit_cr))}>
                            <MiniBar data={hist.net_profit_cr} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.eps?.length > 0 && (
                        <MetricCard title="EPS" subtitle="EARNINGS PER SHARE · ₹"
                            badge={hist.eps_cagr ? `+${hist.eps_cagr}% CAGR` : null}
                            bottomLabel={first(hist.eps) != null ? `From ₹${first(hist.eps)} (${years[0]})` : null}
                            bottomValue={last(hist.eps) != null ? `₹${last(hist.eps)}` : null}>
                            <MiniLine data={hist.eps} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.roce_pct?.length > 0 && (
                        <MetricCard title="ROCE" subtitle="CAPITAL EFFICIENCY · %"
                            badge={hist.roce_label ?? null}
                            bottomLabel={first(hist.roce_pct) != null ? `${first(hist.roce_pct)}% → ${last(hist.roce_pct)}%` : null}
                            bottomValue={first(hist.roce_pct) != null && last(hist.roce_pct) != null
                                ? `+${Math.round(last(hist.roce_pct) - first(hist.roce_pct))} pts` : null}>
                            <MiniLine data={hist.roce_pct} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.roe_pct?.length > 0 && (
                        <MetricCard title="ROE" subtitle="RETURN ON EQUITY · %"
                            badge={hist.roe_label ?? null}
                            bottomLabel={first(hist.roe_pct) != null ? `${first(hist.roe_pct)}% → ${last(hist.roe_pct)}%` : null}
                            bottomValue={null}>
                            <MiniLine data={hist.roe_pct} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.net_margin_pct?.length > 0 && (
                        <MetricCard title="Net Margin" subtitle="PROFITABILITY · %"
                            badge={hist.margin_label ?? null}
                            bottomValue={last(hist.net_margin_pct) != null ? `${last(hist.net_margin_pct)}%` : null}>
                            <MiniLine data={hist.net_margin_pct} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.dividend_yield_pct?.length > 0 && hist.dividend_yield_pct.some(v => v > 0) && (
                        <MetricCard title="Dividend Yield" subtitle="INCOME TO INVESTOR · %"
                            badge={hist.divyld_label ?? null}
                            bottomValue={last(hist.dividend_yield_pct) != null ? `${last(hist.dividend_yield_pct)}%` : null}>
                            <MiniBar data={hist.dividend_yield_pct.map(v => v || 0)} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.fcf_crore != null && (
                        <div className="bg-[#FDD405] rounded-xl p-4 flex flex-col">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-black leading-none">Free Cash Flow</p>
                                    <p className="text-[10px] text-black/60 uppercase tracking-wide mt-0.5">HIGH EARNINGS QUALITY</p>
                                </div>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/15 text-[10px] font-semibold text-black">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 inline-block flex-shrink-0" />
                                    NEW
                                </span>
                            </div>
                            <p className="text-[10px] text-black/60 uppercase tracking-wide mb-1">{lastYear} FCF</p>
                            <p className="text-2xl font-black text-black leading-none">
                                ₹{Number(hist.fcf_crore).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs font-bold text-black/70 mt-0.5">CRORE</p>
                            <div className="mt-3 pt-2 border-t border-black/20">
                                <p className="text-[10px] text-black/60 leading-snug">Cash left after running & growing the business</p>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-black/60">Profits convert to real cash</p>
                                    <p className="text-[11px] font-bold text-black">₹{Number(hist.fcf_crore).toLocaleString('en-IN')} Cr</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── Mini SVG candlestick chart ─────────────────────────────────────────── */
const CANDLE_PRESETS = {
    'Hammer':           [{ o:78,h:82,l:35,c:76 },{ o:76,h:79,l:60,c:72 },{ o:72,h:74,l:25,c:71 }],
    'Inverted Hammer':  [{ o:60,h:64,l:55,c:58 },{ o:58,h:62,l:52,c:56 },{ o:56,h:90,l:54,c:58 }],
    'Doji':             [{ o:65,h:74,l:57,c:68 },{ o:68,h:76,l:62,c:65 },{ o:65,h:80,l:50,c:65 }],
    'Engulfing':        [{ o:72,h:75,l:66,c:68 },{ o:65,h:76,l:62,c:74 }],
    'Morning Star':     [{ o:78,h:80,l:70,c:72 },{ o:70,h:72,l:62,c:64 },{ o:66,h:78,l:64,c:76 }],
    'Dark Cloud Cover': [{ o:62,h:74,l:60,c:72 },{ o:78,h:80,l:62,c:63 }],
    'Shooting Star':    [{ o:60,h:64,l:55,c:62 },{ o:62,h:66,l:58,c:64 },{ o:64,h:92,l:62,c:63 }],
    'Inside Bar':       [{ o:56,h:80,l:50,c:72 },{ o:68,h:76,l:60,c:63 }],
    '_default':         [{ o:62,h:74,l:58,c:70 },{ o:70,h:78,l:65,c:74 },{ o:74,h:80,l:68,c:72 }],
};

const CandleChart = ({ patternName }) => {
    const candles = CANDLE_PRESETS[patternName] ?? CANDLE_PRESETS['_default'];
    const W = 100, H = 62, padX = 8, padY = 6;
    const n = candles.length;
    const slotW = (W - padX * 2) / n;
    const bodyW = slotW * 0.55;
    const mapY  = (v) => padY + ((100 - v) / 100) * (H - padY * 2);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 54, display: 'block' }}>
            {candles.map((c, i) => {
                const cx = padX + i * slotW + slotW / 2;
                const isBull = c.c >= c.o;
                const clr = isBull ? '#22c55e' : '#ef4444';
                const top = mapY(Math.max(c.o, c.c));
                const bot = mapY(Math.min(c.o, c.c));
                const bh  = Math.max(bot - top, 2);
                return (
                    <g key={i}>
                        <line x1={cx} y1={mapY(c.h)} x2={cx} y2={mapY(c.l)} stroke={clr} strokeWidth={1.5} />
                        <rect x={cx - bodyW / 2} y={top} width={bodyW} height={bh} fill={clr} rx={1} />
                    </g>
                );
            })}
        </svg>
    );
};

/* ─── PATTERN DETECTION & RESISTANCE ALERT ───────────────────────────────── */
export const PatternDetectionSection = ({ patternSummary }) => {
    const [open, setOpen] = React.useState(true);
    if (!patternSummary) return null;

    const candlesticks = Array.isArray(patternSummary.candlestick) ? patternSummary.candlestick : [];
    const summary      = patternSummary.summary;
    const resistance   = patternSummary.resistance;

    const hasContent = candlesticks.length > 0 || summary;
    if (!hasContent) return null;

    return (
        <div className="mt-4 border border-zinc-700/50 rounded-xl overflow-hidden bg-zinc-950">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FDD405] hover:bg-[#FDD405]/90 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-black">Pattern Detection & Resistance Alert</span>
                {open ? <ChevronUp size={15} className="text-black/70 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-black/70 flex-shrink-0" />}
            </button>
            {open && (
                <div className="p-4 bg-zinc-950">
                    {summary && (
                        <p className="text-sm text-zinc-300 leading-relaxed mb-4">{summary}</p>
                    )}
                    {candlesticks.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {candlesticks.slice(0, 4).map((name, i) => (
                                <div key={i} className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-3">
                                    {resistance != null && (
                                        <div className="flex justify-end mb-1">
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/50 border border-rose-700/40 text-[10px] font-semibold text-rose-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                                                Resist ₹{Number(resistance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    )}
                                    <CandleChart patternName={name} />
                                    <div className="border-t border-zinc-700/40 pt-2 mt-1">
                                        <p className="text-xs font-semibold text-white text-center">{name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── helper: compute badge counts from ratios ──────────────────────────── */
const computeRatings = (ratios) => {
    let strong = 0, watch = 0, risk = 0;
    Object.values(ratios || {}).forEach(r => {
        const lbl = Array.isArray(r) ? r[2] : null;
        if (!lbl) return;
        if (isGoodLabel(lbl)) strong++;
        else if (isNeutralLabel(lbl)) watch++;
        else risk++;
    });
    return { strong, watch, risk };
};

/* ─── DEFAULT EXPORT: composed full fundamental block ───────────────────── */
export default function FundamentalScoreCard({ scoreCard, symbol }) {
    const fund = scoreCard?.fundamental;
    const tech = scoreCard?.technical;
    if (!fund && !tech) return null;

    const ratingsSum = fund?.ratings_summary
        ?? (fund?.ratios ? computeRatings(fund.ratios) : null);

    return (
        <>
            {/* Technical commentary bullets */}
            {Array.isArray(tech?.commentary) && tech.commentary.length > 0 && (
                <div className="mt-4 space-y-1.5">
                    {tech.commentary.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-zinc-500 flex-shrink-0" />
                            {c}
                        </div>
                    ))}
                </div>
            )}

            {/* Overall Health Score (yellow banner) */}
            {fund?.score != null && (
                <div className="mt-4">
                    <OverallHealthScore
                        score={fund.score}
                        label={fund.label}
                        summary={fund.summary}
                        ratingsSum={ratingsSum}
                    />
                </div>
            )}

            {/* Financial Score Card */}
            {fund && <FinancialScoreCard fund={fund} symbol={symbol} />}

            {/* 5 Year Financial Score Card */}
            {fund?.historical && <FiveYearScoreCard fund={fund} />}
        </>
    );
}
