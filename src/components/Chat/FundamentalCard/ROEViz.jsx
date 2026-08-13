import { fmtNum } from '../../../utils/metricFormat';

/* ─── ROE "Money engine" ─────────────────────────────────────────────────── */
// The ₹100 → ₹X illustration and the "+X% PER YEAR" caption both read the SAME
// formatted value as the card's footer (fmtPct), so the visual can never disagree
// with the headline number the way Math.round did (51.80% rendering as ₹52 / +52%).
export const ROEViz = ({ roe }) => {
    // A NEGATIVE ROE is a loss, and the card used to render it as a gain: the "+"
    // was a hardcoded literal (so -1.56 read "+-1.56%"), the arrow was always
    // green and pointing up, and the figure was always emerald and labelled
    // PROFIT. On a financial surface that inverts the meaning of the number.
    const n = Number(roe);
    const isLoss = Number.isFinite(n) && n < 0;
    // Magnitude for display — the sign is carried by the +/- prefix and the
    // LOSS/PROFIT label, so "₹-1.56" would double up on it.
    const magnitude = fmtNum(Math.abs(n));
    const sign = isLoss ? '−' : '+';
    const accent = isLoss ? '#ef4444' : '#22c55e';
    const valueClass = isLoss
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-emerald-600 dark:text-emerald-400';
    const labelClass = isLoss
        ? 'text-rose-600 dark:text-rose-500'
        : 'text-emerald-600 dark:text-emerald-500';

    return (
        <div className="w-full">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide text-center mb-2">
                Every ₹100 Invested {isLoss ? 'Loses' : 'Earns'}
            </p>
            {/* Three columns on one baseline: same number size, same caption size.
                min-w-0 + a shrinkable gap so the row fits a narrow tile instead of
                overflowing it — the captions are nowrap, so with a fixed gap-5 and
                flex-nowrap the "PROFIT" column was clipped by the card edge. */}
            <div className="flex items-start justify-center gap-2 sm:gap-5 flex-nowrap min-w-0">
                <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold text-zinc-900 dark:text-white leading-none h-6 flex items-center">₹100</span>
                    <span className="text-[9px] text-zinc-500 mt-1 whitespace-nowrap">YOU INVEST</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <span className="h-6 flex items-center">
                        {/* Arrow points DOWN and turns red on a loss, so the visual
                            agrees with the number instead of contradicting it. */}
                        <svg width="44" height="10" viewBox="0 0 44 10" aria-hidden="true">
                            <line x1={isLoss ? 8 : 0} y1="5" x2={isLoss ? 44 : 36} y2="5" stroke={accent} strokeWidth="2" />
                            <polygon points={isLoss ? '10,1 0,5 10,9' : '34,1 44,5 34,9'} fill={accent} />
                        </svg>
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-1 whitespace-nowrap">{sign}{magnitude}% PER YEAR</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <span className={`text-lg font-bold leading-none h-6 flex items-center ${valueClass}`}>
                        {isLoss ? '−' : ''}₹{magnitude}
                    </span>
                    <span className={`text-[9px] mt-1 whitespace-nowrap ${labelClass}`}>
                        {isLoss ? 'LOSS' : 'PROFIT'}
                    </span>
                </div>
            </div>
        </div>
    );
};
