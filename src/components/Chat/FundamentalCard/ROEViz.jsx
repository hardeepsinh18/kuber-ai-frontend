import { fmtNum } from '../../../utils/metricFormat';

/* ─── ROE "Money engine" ─────────────────────────────────────────────────── */
// The ₹100 → ₹X illustration and the "+X% PER YEAR" caption both read the SAME
// formatted value as the card's footer (fmtPct), so the visual can never disagree
// with the headline number the way Math.round did (51.80% rendering as ₹52 / +52%).
export const ROEViz = ({ roe }) => {
    const profit = fmtNum(roe);
    return (
        <div className="w-full">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide text-center mb-2">
                Every ₹100 Invested Earns
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
                        <svg width="44" height="10" viewBox="0 0 44 10">
                            <line x1="0" y1="5" x2="36" y2="5" stroke="#22c55e" strokeWidth="2" />
                            <polygon points="34,1 44,5 34,9" fill="#22c55e" />
                        </svg>
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-1 whitespace-nowrap">+{profit}% PER YEAR</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none h-6 flex items-center">₹{profit}</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-1 whitespace-nowrap">PROFIT</span>
                </div>
            </div>
        </div>
    );
};
