/**
 * Screener / list answers — "highest P/E in IT", "top PSU stocks by ROE".
 *
 * These describe a LIST of companies, so they carry none of the single-stock
 * payload (price, chart, signal, scoreCard) the Quick/Analyst layouts are built
 * around, and they used to fall through to bare markdown. That made the same
 * product answer two visibly different ways depending on the question asked.
 *
 * This renders them in the SAME card system as every other answer — same Card
 * shell, MiniLabel, INNER_CARD rows, logo tiles — as a ranked list, which is
 * what the data actually is. It deliberately does not invent a verdict, price
 * or score for a list; consistency here means shared visual language, not
 * fabricated single-stock fields.
 *
 * The caller only mounts this when parseScreenerRows() found >= 2 rows, so a
 * misparse degrades to the original prose rather than to a wrong card.
 */
import { Card, CardHeader, MiniLabel, INNER_CARD, InlineMd, LogoTile } from './answerKit';

const ScreenerAnswer = ({ rows = [], intro = '', outro = '', title = 'Results' }) => {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    return (
        <Card className="p-4 sm:p-5 space-y-4">
            <div className="flex items-baseline justify-between gap-3">
                <CardHeader>{title}</CardHeader>
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                    {rows.length} {rows.length === 1 ? 'match' : 'matches'}
                </span>
            </div>

            {intro && (
                <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                    <InlineMd>{intro}</InlineMd>
                </p>
            )}

            <ol className="space-y-2 list-none p-0 m-0">
                {rows.map((row, i) => (
                    <li key={row.symbol} className={`${INNER_CARD} p-3`}>
                        <div className="flex items-center gap-3">
                            {/* Rank: the whole point of a screener is the ordering. */}
                            <span className="text-[11px] font-black tabular-nums w-5 flex-shrink-0
                                             text-zinc-400 dark:text-zinc-500">
                                {i + 1}
                            </span>
                            <LogoTile symbol={row.symbol} text={row.symbol} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold truncate text-zinc-900 dark:text-white">
                                    {row.symbol}
                                </p>
                                {/* Metrics wrap instead of overflowing on a narrow card. */}
                                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
                                    {row.metrics.map((m) => (
                                        <span key={m.label} className="flex items-baseline gap-1.5">
                                            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em]
                                                             text-zinc-500 dark:text-zinc-400">
                                                {m.label}
                                            </span>
                                            <span className="text-[13px] font-bold tabular-nums
                                                             text-zinc-900 dark:text-white">
                                                {m.value}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ol>

            {outro && (
                <div className="space-y-1.5">
                    <MiniLabel>What this means</MiniLabel>
                    <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                        <InlineMd>{outro}</InlineMd>
                    </p>
                </div>
            )}
        </Card>
    );
};

export default ScreenerAnswer;
