import React, { useState, useMemo, useContext } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
    BarChart, Bar, LineChart, Line, Cell,
    XAxis, YAxis, CartesianGrid, ReferenceLine,
    ComposedChart, Customized, ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

/* ─── label classifiers ──────────────────────────────────────────────────── */
// Backend RATING_LABEL: {5:"Exceptional", 4:"Strong", 3:"Average", 2:"Weak", 1:"Poor"}
// "Exceptional" was missing → was falling through to RISK (causing 93/100 + 4 RISK bug)
const isGoodLabel = (l) =>
    /EXCEPTIONAL|STRONG|CHEAP|ELITE|ZERO.?DEBT|ATTRACTIVE|ABOVE.?AVG|RISING|#\d|STABLE.?HIGH|NEW/i.test(l || '');
const isNeutralLabel = (l) =>
    /AVERAGE|MODERATE|WATCH|STABILIZ|FAIR/i.test(l || '');

/* ─── Rating badge ───────────────────────────────────────────────────────── */
const RatingBadge = ({ label, className }) => {
    if (!label) return null;
    const good = isGoodLabel(label);
    const neutral = !good && isNeutralLabel(label);
    return (
        <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap flex-shrink-0',
            good    ? 'bg-emerald-50 dark:bg-zinc-900 border-emerald-500/50 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-300' :
            neutral ? 'bg-amber-50 dark:bg-zinc-900 border-amber-500/50 dark:border-amber-700/40 text-amber-700 dark:text-amber-300' :
                      'bg-rose-50 dark:bg-zinc-900 border-rose-500/50 dark:border-rose-700/40 text-rose-700 dark:text-rose-300',
            className
        )}>
            <span className={clsx(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                good ? 'bg-emerald-500' : neutral ? 'bg-amber-500' : 'bg-rose-500'
            )} />
            {label}
        </span>
    );
};

/* ─── Metric card shell ──────────────────────────────────────────────────── */
const MetricCard = ({ title, subtitle, badge, children, bottomLabel, bottomValue, className }) => (
    <div className={clsx(
        'bg-white dark:bg-zinc-900 rounded-xl border border-[#FDD405] p-3 flex flex-col',
        className
    )}>
        <div className="flex items-start justify-between mb-2 gap-2">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-none">{title}</p>
                {subtitle && <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">{subtitle}</p>}
            </div>
            {badge && <RatingBadge label={badge} />}
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[60px]">
            {children}
        </div>
        {(bottomLabel || bottomValue) && (
            <div className="flex items-end justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700/50 mt-2 gap-2">
                {bottomLabel && <span className="text-[10px] text-zinc-500 leading-tight">{bottomLabel}</span>}
                {bottomValue && <span className="text-sm font-bold text-zinc-900 dark:text-white flex-shrink-0">{bottomValue}</span>}
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

/* ─── OVERALL HEALTH SCORE banner ───────────────────────────────── */
const OverallHealthScore = ({ score, label, summary, ratingsSum }) => {
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
                        bg-zinc-900 border-zinc-700/50
                        dark:bg-zinc-900 dark:border-zinc-700/50
                        light:bg-zinc-100 light:border-zinc-200"
             style={!isDark ? { background: '#f4f4f5', borderColor: '#e4e4e7' } : {}}>
            <div className="flex-shrink-0">
                <svg viewBox="0 0 84 84" width={80} height={80}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={8} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={8}
                        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`} />
                    <text x={cx} y={cy - 4} textAnchor="middle" fill={numColor}
                        fontSize={21} fontWeight="800" fontFamily="Inter,sans-serif">{s}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fill={subColor}
                        fontSize={9} fontFamily="Inter,sans-serif">/100</text>
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

/* ─── FINANCIAL SCORE CARD (collapsible 2-col grid) ─────────────────────── */
const FinancialScoreCard = ({ fund, symbol }) => {
    const [open, setOpen] = React.useState(false);
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
        <div className="mt-4 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden bg-white dark:bg-[#1C1B15]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Financial Score Card</span>
                {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
            </button>
            {open && (
                <div className="p-3 grid grid-cols-1 xs:grid-cols-2 gap-3 bg-zinc-50 dark:bg-[#1C1B15]">
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
        <div className="mt-4 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden bg-white dark:bg-[#1C1B15]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">5 Year Financial Score Card</span>
                {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
            </button>
            {open && (
                <div className="p-3 grid grid-cols-1 xs:grid-cols-2 gap-3 bg-zinc-50 dark:bg-[#1C1B15]">
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

/* ─── Real mini candlestick layer for pattern cards ─────────────────────── */
const MiniCandleLayer = ({ xAxisMap, yAxisMap, data }) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;
    const bandwidth = typeof xAxis.bandwidth === 'function' ? xAxis.bandwidth() : 8;
    const halfW = Math.max(bandwidth * 0.42, 2);
    return (
        <g>
            {data.map((pt, i) => {
                if (pt.open == null || pt.close == null || pt.high == null || pt.low == null) return null;
                const isBull = pt.close >= pt.open;
                const color = isBull ? '#26a69a' : '#ef5350';
                const xPos = xAxis.scale(pt.date);
                if (xPos == null || isNaN(xPos)) return null;
                const cx = xPos + bandwidth / 2;
                const yH = yAxis.scale(pt.high);
                const yL = yAxis.scale(pt.low);
                const bodyTop = yAxis.scale(Math.max(pt.open, pt.close));
                const bodyBot = yAxis.scale(Math.min(pt.open, pt.close));
                if ([yH, yL, bodyTop, bodyBot].some(v => v == null || isNaN(v))) return null;
                const bodyH = Math.max(Math.abs(bodyBot - bodyTop), 1.5);
                return (
                    <g key={i}>
                        <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth={1.2} opacity={0.9} />
                        <rect x={cx - halfW} y={bodyTop} width={halfW * 2} height={bodyH}
                              fill={color} stroke={color} strokeWidth={0.5} rx={0.5} />
                    </g>
                );
            })}
        </g>
    );
};

/* ─── Mini chart for a single pattern card ───────────────────────────────── */
const PatternMiniChart = ({ chartData, barsAgo = 0, support, resistance }) => {
    const rawChart = useMemo(() => {
        if (!chartData) return null;
        if (Array.isArray(chartData)) return chartData.find(cd => cd && !cd.error) ?? null;
        return chartData.error ? null : chartData;
    }, [chartData]);

    const slicedData = useMemo(() => {
        if (!rawChart) return null;
        const { dates = [], open = [], high = [], low = [], close = [] } = rawChart;
        const allData = dates.map((date, i) => ({
            date,
            open: open[i], high: high[i], low: low[i], close: close[i],
        })).filter(d => d.close != null);
        if (allData.length < 5) return null;

        const n = allData.length;
        const patternIdx = Math.max(0, n - 1 - barsAgo);
        const start = Math.max(0, patternIdx - 12);
        const end   = Math.min(n, patternIdx + 4);
        const slice = allData.slice(start, end);
        return slice.length >= 3 ? { slice, patternIdx: patternIdx - start } : null;
    }, [rawChart, barsAgo]);

    if (!slicedData) {
        return <CandleChart patternName="__unknown__" />;
    }

    const { slice, patternIdx } = slicedData;

    const allHL = slice.flatMap(d => [d.high, d.low, support, resistance].filter(v => v != null));
    const yMin  = Math.min(...allHL);
    const yMax  = Math.max(...allHL);
    const pad   = (yMax - yMin) * 0.1 || 1;
    const domain = [yMin - pad, yMax + pad];

    // Highlight the pattern formation bar
    const highlightDate  = slice[patternIdx]?.date;
    const highlightBefore = slice[Math.max(0, patternIdx - 1)]?.date;

    return (
        <div style={{ width: '100%', height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={slice} margin={{ top: 6, right: 4, left: 0, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.25} vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={domain} hide />
                    {/* Pattern zone highlight */}
                    {highlightDate && highlightBefore && (
                        <ReferenceLine x={highlightDate} stroke="#FDD405" strokeWidth={14} strokeOpacity={0.18} />
                    )}
                    {/* Support line */}
                    {support != null && (
                        <ReferenceLine y={support} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.2}
                            label={{ value: `S`, position: 'insideTopRight', fill: '#10b981', fontSize: 8 }} />
                    )}
                    {/* Resistance line */}
                    {resistance != null && (
                        <ReferenceLine y={resistance} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.2}
                            label={{ value: `R`, position: 'insideTopRight', fill: '#ef4444', fontSize: 8 }} />
                    )}
                    {/* Invisible line so recharts initialises the axis scale */}
                    <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                    <Customized component={(props) => <MiniCandleLayer {...props} data={slice} />} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

/* ─── PATTERN DETECTION & RESISTANCE ALERT ───────────────────────────────── */
export const PatternDetectionSection = ({ patternSummary, chartData = null }) => {
    const [open, setOpen] = React.useState(false);
    if (!patternSummary) return null;

    const candlesticks = Array.isArray(patternSummary.candlestick) ? patternSummary.candlestick : [];
    const summary      = patternSummary.summary;
    const resistance   = patternSummary.resistance;
    const support      = patternSummary.support;

    // Build a name→detail map so each card knows bars_ago
    const detailMap = useMemo(() => {
        const map = {};
        [...(patternSummary.bullish_details || []), ...(patternSummary.bearish_details || [])]
            .forEach(d => { map[d.name] = d; });
        return map;
    }, [patternSummary]);

    const hasContent = candlesticks.length > 0 || summary;
    if (!hasContent) return null;

    return (
        <div className="mt-4 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden bg-white dark:bg-[#1C1B15]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Pattern Detection & Resistance Alert</span>
                {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
            </button>
            {open && (
                <div className="p-4 bg-zinc-50 dark:bg-[#1C1B15]">
                    {summary && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">{summary}</p>
                    )}
                    {candlesticks.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {candlesticks.slice(0, 4).map((name, i) => {
                                const detail   = detailMap[name] || {};
                                const barsAgo  = detail.bars_ago ?? 0;
                                const strength = detail.strength;
                                return (
                                    <div key={i} className="bg-white dark:bg-zinc-900 border border-[#FDD405] rounded-xl p-3">
                                        {/* Header: Resistance badge + bars-ago label */}
                                        <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
                                            {resistance != null && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/40 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 flex-shrink-0" />
                                                    R ₹{Number(resistance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-auto">
                                                {barsAgo === 0 ? 'Today' : `${barsAgo}d ago`}
                                                {strength ? ` · ${strength}` : ''}
                                            </span>
                                        </div>

                                        {/* Real candle chart or schematic fallback */}
                                        <PatternMiniChart
                                            chartData={chartData}
                                            barsAgo={barsAgo}
                                            support={support}
                                            resistance={resistance}
                                        />

                                        <div className="border-t border-zinc-200 dark:border-zinc-700/40 pt-2 mt-2">
                                            <p className="text-xs font-semibold text-zinc-900 dark:text-white text-center">{name}</p>
                                        </div>
                                    </div>
                                );
                            })}
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

/* ─── Kuber AI Score Banner ──────────────────────────────────────────────── */
const KuberScoreBanner = ({ horizon, tech, fund, ratingsSum, symbol }) => {
    const [showBreakdown, setShowBreakdown] = useState(false);
    if (!horizon) return null;

    const { label, blended_score, weights, note } = horizon;
    const score = blended_score ?? 0;

    const scoreColor =
        score >= 70 ? '#22c55e' :
        score >= 50 ? '#FDD405' :
        score >= 35 ? '#fb923c' : '#ef4444';

    const verdict =
        score >= 70 ? 'Strong Pick' :
        score >= 55 ? 'Watchlist' :
        score >= 40 ? 'Caution' : 'Avoid';

    const isShort = label === 'Short Term';
    const icon = isShort ? '⚡' : '📅';

    // SVG circular gauge
    const r = 34, cx = 44, cy = 44, circ = 2 * Math.PI * r;
    const filled = (score / 100) * circ;

    return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {/* Top accent bar */}
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}40)` }} />

            {/* Banner body */}
            <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-900/60">
                {/* Label row */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                        Kuber AI Score
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${scoreColor}18`, color: scoreColor }}>
                        {icon} {label}
                    </span>
                </div>

                {/* Score row */}
                <div className="flex items-center gap-4">
                    {/* Circular gauge */}
                    <div className="flex-shrink-0">
                        <svg viewBox="0 0 88 88" width={80} height={80}>
                            <circle cx={cx} cy={cy} r={r} fill="none"
                                stroke="rgba(128,128,128,0.15)" strokeWidth={7} />
                            <circle cx={cx} cy={cy} r={r} fill="none"
                                stroke={scoreColor} strokeWidth={7}
                                strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`} />
                            <text x={cx} y={cy - 3} textAnchor="middle"
                                fill={scoreColor} fontSize={20} fontWeight="800"
                                fontFamily="Inter,sans-serif">{score}</text>
                            <text x={cx} y={cy + 11} textAnchor="middle"
                                fill="rgba(128,128,128,0.7)" fontSize={9}
                                fontFamily="Inter,sans-serif">/100</text>
                        </svg>
                    </div>

                    {/* Text side */}
                    <div className="flex-1 min-w-0">
                        <div className="text-[18px] font-extrabold leading-tight mb-1"
                             style={{ color: scoreColor }}>{verdict}</div>
                        <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                            {label} Verdict
                            <span className="text-zinc-400 dark:text-zinc-600 font-normal"> · {weights}</span>
                        </div>
                        {note && (
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed">
                                {note}
                            </div>
                        )}
                    </div>
                </div>

                {/* Component scores row */}
                {(tech || fund) && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                        {tech && (
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                                 style={{ background: 'rgba(128,128,128,0.06)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tech</span>
                                <span className="text-[13px] font-bold ml-auto"
                                      style={{ color: tech.score >= 70 ? '#22c55e' : tech.score >= 50 ? '#FDD405' : '#ef4444' }}>
                                    {tech.score}/100
                                </span>
                            </div>
                        )}
                        {fund && fund.score != null && (
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                                 style={{ background: 'rgba(128,128,128,0.06)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fund</span>
                                <span className="text-[13px] font-bold ml-auto"
                                      style={{ color: fund.score >= 70 ? '#22c55e' : fund.score >= 50 ? '#FDD405' : '#ef4444' }}>
                                    {Math.round(fund.score)}/100
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Toggle */}
                <button
                    onClick={() => setShowBreakdown(o => !o)}
                    className="mt-3 text-[11px] font-medium text-zinc-400 dark:text-zinc-500
                               hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                    {showBreakdown ? 'Hide' : 'Show'} detailed breakdown ↕
                </button>
            </div>

            {/* Breakdown — Technical Engine + Fundamental Engine */}
            {showBreakdown && (
                <div className="px-4 pb-4 bg-white dark:bg-[#111]">
                    {/* ── Technical Engine ── */}
                    {tech && <TechnicalScoreCard tech={tech} />}

                    {/* ── Fundamental Engine ── */}
                    {fund ? (
                        <>
                            {fund.score != null && (
                                <div className="mt-4">
                                    <OverallHealthScore
                                        score={fund.score}
                                        label={fund.label}
                                        summary={fund.summary}
                                        ratingsSum={ratingsSum}
                                    />
                                </div>
                            )}
                            <FinancialScoreCard fund={fund} symbol={symbol} />
                            {fund.historical && <FiveYearScoreCard fund={fund} />}
                        </>
                    ) : (
                        <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-5 flex items-start gap-3">
                            <span className="text-lg flex-shrink-0">📊</span>
                            <div>
                                <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">
                                    Fundamental data unavailable
                                </p>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                                    No financial data could be fetched for this stock. The blended score above uses technical signals only.
                                    Try asking about a Nifty 500 stock for full analysis.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── Technical Score Card ───────────────────────────────────────────────── */
const SIGNAL_NAMES = {
    price_structure: 'Price Structure',
    ema_stack:       'EMA Stack',
    breakout:        'Breakout',
    volume_context:  'Volume',
    rsi:             'RSI',
    macd:            'MACD',
    volatility:      'Volatility',
    weekly_trend:    'Weekly Trend',
    sentiment:       'Sentiment',
    risk_flags:      'Risk Flags',
    sma_regime:      'SMA Regime',
};

const SIG_PALETTE = {
    Exceptional: { bg: 'rgba(34,197,94,0.10)',  color: '#22c55e' },
    Strong:      { bg: 'rgba(74,222,128,0.08)',  color: '#4ade80' },
    Average:     { bg: 'rgba(253,212,5,0.09)',   color: '#FDD405' },
    Weak:        { bg: 'rgba(251,146,60,0.10)',  color: '#fb923c' },
    Poor:        { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444' },
};

const TechnicalScoreCard = ({ tech }) => {
    const [open, setOpen] = useState(false);
    if (!tech) return null;

    const { score, label, weekly_bias, modules, risk_flags } = tech;
    const signals = modules?.v22_signals || {};

    const scoreColor =
        score >= 70 ? '#22c55e' :
        score >= 50 ? '#FDD405' :
        score >= 35 ? '#fb923c' : '#ef4444';

    const biasMap = {
        WEEKLY_BULLISH: { text: '↑ Weekly Bullish', color: '#22c55e' },
        WEEKLY_NEUTRAL: { text: '→ Weekly Neutral', color: '#FDD405' },
        WEEKLY_BEARISH: { text: '↓ Weekly Bearish', color: '#ef4444' },
    };
    const bias = biasMap[weekly_bias] || { text: weekly_bias || '—', color: '#FDD405' };

    return (
        <div className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3
                           bg-zinc-100 dark:bg-zinc-800
                           hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Technical Score Card</span>
                <span className="text-zinc-400 text-xs">{open ? '∧' : '∨'}</span>
            </button>

            {open && (
                <div className="p-4 bg-white dark:bg-[#141414] space-y-3">

                    {/* Score banner */}
                    <div className="flex items-center justify-between p-3 rounded-xl"
                         style={{ background: `${scoreColor}12`, border: `1.5px solid ${scoreColor}30` }}>
                        <div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Technical Quality Score</div>
                            <div className="text-3xl font-extrabold leading-none" style={{ color: scoreColor }}>{score}<span className="text-base font-semibold opacity-60">/100</span></div>
                            <div className="text-xs font-bold mt-1" style={{ color: scoreColor }}>{label}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                  style={{ background: `${bias.color}15`, color: bias.color }}>
                                {bias.text}
                            </span>
                            {risk_flags?.length > 0 && (
                                <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                      style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                                    ⚠ {risk_flags.length} risk flag{risk_flags.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Signal tiles */}
                    {Object.keys(signals).length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(signals).map(([key, sig]) => {
                                const p = SIG_PALETTE[sig.label] || SIG_PALETTE.Average;
                                return (
                                    <div key={key}
                                         className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50"
                                         style={{ background: p.bg }}>
                                        <div>
                                            <div className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-0.5">
                                                {SIGNAL_NAMES[key] || key}
                                            </div>
                                            <div className="text-[11px] font-bold" style={{ color: p.color }}>{sig.label}</div>
                                        </div>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                                             style={{ backgroundColor: p.color }}>
                                            {sig.score}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Risk flag list */}
                    {risk_flags?.length > 0 && (
                        <div className="space-y-1 pt-1">
                            {risk_flags.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-[11px] text-rose-500 dark:text-rose-400">
                                    <span className="mt-0.5 flex-shrink-0">⚠</span>
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── DEFAULT EXPORT: composed full fundamental block ───────────────────── */
export default function FundamentalScoreCard({ scoreCard, symbol }) {
    const fund    = scoreCard?.fundamental;
    const tech    = scoreCard?.technical;
    const horizon = scoreCard?.horizon;
    if (!fund && !tech) return null;

    const ratingsSum = fund?.ratings_summary
        ?? (fund?.ratios ? computeRatings(fund.ratios) : null);

    return (
        <>
            {horizon ? (
                /* Horizon query — all detail lives inside the collapsible banner */
                <KuberScoreBanner
                    horizon={horizon}
                    tech={tech}
                    fund={fund}
                    ratingsSum={ratingsSum}
                    symbol={symbol}
                />
            ) : (
                /* No horizon — show individual cards directly */
                <>
                    {tech && <TechnicalScoreCard tech={tech} />}

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

                    {fund && <FinancialScoreCard fund={fund} symbol={symbol} />}
                    {fund?.historical && <FiveYearScoreCard fund={fund} />}
                </>
            )}
        </>
    );
}
