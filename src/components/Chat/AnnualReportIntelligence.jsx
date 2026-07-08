import React, { useState } from 'react';
import {
    BookOpenText, TrendingUp, ShieldAlert, Leaf, Target,
    Compass, Lightbulb, ChevronUp, ChevronDown, ExternalLink,
} from 'lucide-react';

/**
 * Annual Report Intelligence card — an analyst-style read of the company's own annual
 * report (annual_report_insights + management_guidance + risk_factors, LLM-extracted).
 * Thematic sections, a severity-tagged Risk Radar, and an extraction-confidence meter —
 * the qualitative sibling of the Management Sentiment card. Deliberately carries NO
 * financial figures (those come from the authoritative fundamentals cards).
 *
 * Props: data = {
 *   fiscal_year, report_title, pdf_url, confidence, evidence_count,
 *   company_story, growth_drivers: [str], management_priorities, capital_allocation,
 *   competitive_position, future_outlook, esg_snapshot,
 *   segments: [str], guidance: [str],
 *   risk_radar: [{ title, category, severity }], key_takeaways: [str]
 * }
 */

const GOLD = '#FDD405';
const GOLD_TEXT = '#a16207';

const SEV = {
    high:   '#ef4444',
    medium: '#fb923c',
    low:    '#22c55e',
};

const Section = ({ icon: Icon, title, children }) => (
    <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-1">
            <Icon size={12} strokeWidth={2.2} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-400 dark:text-zinc-500">{title}</span>
        </div>
        <div className="text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">{children}</div>
    </div>
);

const Bullets = ({ items }) => (
    <ul className="space-y-1">
        {items.map((t, i) => (
            <li key={i} className="flex gap-1.5">
                <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                <span>{t}</span>
            </li>
        ))}
    </ul>
);

const AnnualReportIntelligence = ({ data }) => {
    const [open, setOpen] = useState(true);
    const [showAll, setShowAll] = useState(false);
    if (!data || !data.company_story) return null;

    const conf = Math.round((data.confidence || 0) * 100);
    const confColor = conf >= 85 ? '#22c55e' : conf >= 70 ? GOLD_TEXT : '#fb923c';
    const drivers = Array.isArray(data.growth_drivers) ? data.growth_drivers : [];
    const risks = Array.isArray(data.risk_radar) ? data.risk_radar.filter(r => r && r.title) : [];
    const segments = Array.isArray(data.segments) ? data.segments : [];
    const guidance = Array.isArray(data.guidance) ? data.guidance : [];
    const takeaways = Array.isArray(data.key_takeaways) ? data.key_takeaways : [];
    const hasFull = data.management_priorities || data.capital_allocation ||
        data.competitive_position || data.future_outlook || data.esg_snapshot || guidance.length > 0;

    return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD}40)` }} />
            <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-900/60">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                        Annual Report Intelligence
                    </span>
                    {data.fiscal_year && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1"
                              style={{ background: `${GOLD}22`, color: GOLD_TEXT }}>
                            <BookOpenText size={10} strokeWidth={2.4} /> FY{data.fiscal_year}
                        </span>
                    )}
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${confColor}18`, color: confColor }}>
                        {conf}% confidence
                    </span>
                    <button onClick={() => setOpen(o => !o)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label="Toggle details">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                </div>

                {/* Company story — always visible */}
                <div className="text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-200">{data.company_story}</div>

                {/* Segment chips */}
                {segments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {segments.map((s, i) => (
                            <span key={i}
                                  className="text-[10.5px] px-2 py-0.5 rounded-md font-medium border text-zinc-600 dark:text-zinc-300"
                                  style={{ borderColor: `${GOLD}40`, background: `${GOLD}10` }}>{s}</span>
                        ))}
                    </div>
                )}

                {open && (
                    <>
                        {/* Risk Radar */}
                        {risks.length > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <ShieldAlert size={12} strokeWidth={2.2} className="text-zinc-400 dark:text-zinc-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-400 dark:text-zinc-500">Risk Radar</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {risks.map((r, i) => {
                                        const c = SEV[(r.severity || '').toLowerCase()] || '#a1a1aa';
                                        return (
                                            <span key={i}
                                                  className="text-[11px] px-2 py-1 rounded-lg font-medium inline-flex items-center gap-1.5 border"
                                                  style={{ background: `${c}12`, borderColor: `${c}30` }}>
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                                                <span className="text-zinc-600 dark:text-zinc-300">{r.title}</span>
                                                {r.category && <span className="text-[9.5px]" style={{ color: c }}>{r.category}</span>}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Growth Drivers */}
                        {drivers.length > 0 && (
                            <Section icon={TrendingUp} title="Growth Drivers"><Bullets items={drivers} /></Section>
                        )}

                        {/* Full analysis (collapsible) */}
                        {hasFull && (
                            <div className="mt-3">
                                <button onClick={() => setShowAll(s => !s)}
                                    className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1">
                                    {showAll ? '▾' : '▸'} Full analysis
                                </button>
                                {showAll && (
                                    <div>
                                        {data.future_outlook && <Section icon={Compass} title="Future Outlook">{data.future_outlook}</Section>}
                                        {(data.capital_allocation || guidance.length > 0) && (
                                            <Section icon={Target} title="Capital Allocation & Guidance">
                                                {data.capital_allocation}
                                                {guidance.length > 0 && (
                                                    <ul className="mt-1 space-y-1">
                                                        {guidance.map((g, i) => (
                                                            <li key={i} className="flex gap-1.5">
                                                                <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                                                                <span>{g}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </Section>
                                        )}
                                        {data.competitive_position && <Section icon={ShieldAlert} title="Competitive Position">{data.competitive_position}</Section>}
                                        {data.management_priorities && <Section icon={Target} title="Management Priorities">{data.management_priorities}</Section>}
                                        {data.esg_snapshot && <Section icon={Leaf} title="ESG Snapshot">{data.esg_snapshot}</Section>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Key Takeaways */}
                        {takeaways.length > 0 && (
                            <Section icon={Lightbulb} title="Key Takeaways"><Bullets items={takeaways} /></Section>
                        )}

                        {/* Confidence meter */}
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${conf}%`, background: confColor }} />
                            </div>
                            <span className="text-[9.5px] font-semibold whitespace-nowrap" style={{ color: confColor }}>{conf}% extraction confidence</span>
                        </div>

                        {/* Footer: evidence + source */}
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[9.5px] text-zinc-400 dark:text-zinc-600">
                                {data.evidence_count ? `${data.evidence_count} passages from the annual report` : 'From the company annual report'} · Not investment advice.
                            </span>
                            {data.pdf_url && (
                                <a href={data.pdf_url} target="_blank" rel="noopener noreferrer"
                                   className="text-[10px] font-semibold inline-flex items-center gap-0.5 whitespace-nowrap"
                                   style={{ color: GOLD_TEXT }}>
                                    <ExternalLink size={10} /> Annual report
                                </a>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AnnualReportIntelligence;
