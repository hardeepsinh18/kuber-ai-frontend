import { useState } from 'react';
import { TechnicalScoreCard } from './TechnicalScoreCard';
import { FinancialScoreCard } from './FinancialScoreCard';
import { FiveYearScoreCard } from './FiveYearScoreCard';

/* ─── Venty Score Banner ──────────────────────────────────────────────── */
export const KuberScoreBanner = ({ horizon, tech, fund, ratingsSum, symbol }) => {
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
                        Venty Score
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
                                fontFamily="Montserrat,sans-serif">{score}</text>
                            <text x={cx} y={cy + 11} textAnchor="middle"
                                fill="rgba(128,128,128,0.7)" fontSize={9}
                                fontFamily="Montserrat,sans-serif">/100</text>
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

            {/* Breakdown, Technical Engine + Fundamental Engine */}
            {showBreakdown && (
                <div className="px-4 pb-4 bg-white dark:bg-[#111]">
                    {/* ── Fundamental Engine ── */}
                    {fund ? (
                        <>
                            {/* Overall Health banner removed here too (2026-07-10) */}

                            {/* ── Technical Engine ── */}
                            {tech && <TechnicalScoreCard tech={tech} />}

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
