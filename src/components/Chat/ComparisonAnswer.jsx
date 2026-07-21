import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trophy } from 'lucide-react';
import StockChart from './StockChart';
import { Card, MiniLabel } from './answerKit';
import { proseComponents } from './AnalystAnswer';

/**
 * ComparisonAnswer — head-to-head layout for "X vs Y" queries.
 * The single-stock Quick/Analyst screens are one-company deep-dives; rendering
 * them for a comparison buried the actual head-to-head behind "Read full
 * analysis" while TCS-only scorecards filled the screen. Here the comparison
 * IS the answer:
 *   1. VS band — the tickers being compared
 *   2. KUBER VERDICT band — parsed from the "> **Winner: X** — reason" line
 *   3. Full head-to-head markdown, expanded (scorecard tables, better/worse
 *      sections, final call — themed via AnalystAnswer's proseComponents)
 *   4. Charts per symbol when chart data is present
 */

const cleanSymbol = (s) =>
    String(s || '').replace(/\.(NS|BO)$/i, '').replace(/^NSE:/i, '').replace(/-EQ$/i, '').toUpperCase();

/* The H1 ("# ⚔️ TCS vs Infosys — Head to Head") is replaced by the VS band */
const stripLeadingH1 = (md) => String(md || '').replace(/^\s*#\s+[^\n]*\n+/, '');

/* "> **Winner: TCS** — one-sentence reason" → { name, reason } */
const parseWinner = (md) => {
    const m = String(md || '').match(/^>?\s*\*\*Winner:\s*([^*\n]+?)\*\*\s*[—–-]?\s*(.*)$/im);
    if (!m) return null;
    return { name: m[1].trim(), reason: (m[2] || '').replace(/\*+/g, '').trim() };
};

const ComparisonAnswer = ({ content, metadata = {}, chartData = null }) => {
    const symbols = (
        (metadata?.comparison_symbols?.length >= 2 ? metadata.comparison_symbols : metadata?.symbols) || []
    ).map(cleanSymbol).filter(Boolean).slice(0, 3);

    const winner = parseWinner(content);
    const body = stripLeadingH1(content);
    const charts = (Array.isArray(chartData) ? chartData : chartData ? [chartData] : [])
        .filter(cd => cd && !cd.error);

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

            {/* ── VS band ────────────────────────────────────────── */}
            {symbols.length >= 2 && (
                <div className="rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#FDD405]">
                    <span className="text-[15px] font-black tracking-wide text-black">{symbols[0]}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/60">vs</span>
                    <span className="text-[15px] font-black tracking-wide text-black">{symbols.slice(1).join(' · ')}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.15em] bg-black/10 text-black/70">
                        Head to head
                    </span>
                </div>
            )}

            {/* ── Winner verdict band ────────────────────────────── */}
            {winner && (
                <Card className="px-4 py-3.5 border-l-4 border-l-amber-500 dark:border-l-[#FDD405]">
                    <MiniLabel>Kuber verdict</MiniLabel>
                    <div className="mt-1.5 flex items-start gap-2">
                        <Trophy size={16} strokeWidth={2.5} className="mt-[2px] flex-shrink-0 text-amber-600 dark:text-[#FDD405]" />
                        <p className="text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                            <strong className="font-extrabold">Winner: {winner.name}</strong>
                            {winner.reason && <span className="text-zinc-600 dark:text-zinc-300"> — {winner.reason}</span>}
                        </p>
                    </div>
                </Card>
            )}

            {/* ── Full head-to-head, always expanded ─────────────── */}
            <Card className="px-4 py-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
                    {body}
                </ReactMarkdown>
            </Card>

            {/* ── Charts per symbol ──────────────────────────────── */}
            {charts.length > 0 && (
                <div className={charts.length > 1 ? 'grid gap-3 lg:grid-cols-2' : 'grid grid-cols-1'}>
                    {charts.map((cd, i) => (
                        <Card key={i} className="p-3 min-w-0">
                            <StockChart
                                chartData={cd}
                                symbol={cleanSymbol(cd?.chart_metadata?.symbol) || symbols[i] || ''}
                                variant="quick"
                                defaultType="candle"
                            />
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Footer strip ───────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    Say Kuber to the market
                </span>
                <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    Kuber AI
                </span>
            </div>
        </div>
    );
};

export default ComparisonAnswer;
