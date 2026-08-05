/**
 * Screener / list answers — "highest P/E in IT", "top PSU stocks by ROE".
 *
 * These use the SAME answer box as the Analyst layout: the padded main card
 * holding distinct inner sub-cards, opened by a labelled prose block, with the
 * result set as another inner card below it. The goal is that every query type
 * lands in one recognisable container, whatever the payload.
 *
 * What it does not do is fake single-stock chrome. A list has no company
 * header, no price, no verdict and no score, so those sub-cards are simply
 * absent rather than filled with invented values — on a financial surface a
 * plausible-but-wrong number is worse than a missing one. The container, the
 * spacing, the labels and the reveal animation are shared; only the sections
 * that genuinely have data are rendered.
 *
 * The caller only mounts this when parseScreenerRows() found >= 2 rows, so a
 * misparse degrades to the original markdown rather than to a wrong card.
 */
import { MiniLabel, INNER_CARD, InlineMd, LogoTile } from './answerKit';

/* One result row — logo, rank, symbol, metric chips. Mirrors the metric-cell
 * treatment used across the Analyst cards (uppercase micro-label above a bold
 * tabular value) so the numbers read the same wherever they appear. */
const ResultRow = ({ row, rank }) => (
    <li className={`${INNER_CARD} p-3`}>
        <div className="flex items-center gap-3">
            <span className="text-[11px] font-black tabular-nums w-5 flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                {rank}
            </span>
            <LogoTile symbol={row.symbol} text={row.symbol} />
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold truncate text-zinc-900 dark:text-white">{row.symbol}</p>
                {/* Wraps rather than overflowing on a narrow card. */}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
                    {row.metrics.map((m) => (
                        <span key={m.label} className="flex items-baseline gap-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                {m.label}
                            </span>
                            <span className="text-[13px] font-bold tabular-nums text-zinc-900 dark:text-white">
                                {m.value}
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    </li>
);

const ScreenerAnswer = ({ rows = [], intro = '', outro = '', title = 'Results' }) => {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            {/* Same main answer card as AnalystAnswer's summary hero. */}
            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181613] p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">

                {/* Title row stands in for CompanyCard: a list has no single company,
                    so it names the screen and its size instead. */}
                <div className={`${INNER_CARD} px-4 py-3 flex items-baseline justify-between gap-3`}>
                    <h4 className="text-[14px] font-bold text-zinc-900 dark:text-white min-w-0 truncate">{title}</h4>
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 flex-shrink-0 tabular-nums">
                        {rows.length} {rows.length === 1 ? 'match' : 'matches'}
                    </span>
                </div>

                {/* Same slot, same label treatment as "Why this verdict". */}
                {intro && (
                    <div className={`${INNER_CARD} px-4 py-3.5`}>
                        <MiniLabel>Answer</MiniLabel>
                        <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                            <InlineMd>{intro}</InlineMd>
                        </div>
                    </div>
                )}

                <div className={`${INNER_CARD} px-3 py-3 space-y-2`}>
                    <MiniLabel className="px-1">Results</MiniLabel>
                    <ol className="space-y-2 list-none p-0 m-0">
                        {rows.map((row, i) => (
                            <ResultRow key={row.symbol} row={row} rank={i + 1} />
                        ))}
                    </ol>
                </div>

                {outro && (
                    <div className={`${INNER_CARD} px-4 py-3.5`}>
                        <MiniLabel>What this means</MiniLabel>
                        <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                            <InlineMd>{outro}</InlineMd>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScreenerAnswer;
