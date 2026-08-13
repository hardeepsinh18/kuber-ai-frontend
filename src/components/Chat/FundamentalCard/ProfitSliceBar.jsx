import { fmtPct } from '../../../utils/metricFormat';

/* ─── Net Margin split bar ───────────────────────────────────────────────── */
export const ProfitSliceBar = ({ netMargin }) => {
    // Show the exact margin so the bar matches the headline value (8.90%, not a
    // rounded 9). Widths use the same number; the profit slice gets a floor so a
    // small margin still has room for its label.
    const exact      = Math.min(100, Math.max(0, Number(netMargin) || 0));
    const profitPct  = fmtPct(exact);
    const costPct    = fmtPct(100 - exact);
    const profitW    = Math.max(exact, 22);
    const costW      = 100 - profitW;
    return (
        <div className="w-full">
            <p className="text-[9px] text-zinc-500 text-center uppercase tracking-wide mb-2">
                Of Every 100% of Sales
            </p>
            <div className="flex rounded-lg overflow-hidden h-8 w-full">
                {exact > 0 && (
                    <div className="flex items-center justify-center text-[11px] font-bold text-white bg-emerald-600 whitespace-nowrap px-1"
                         style={{ width: `${profitW}%` }}>
                        {profitPct}
                    </div>
                )}
                {costW > 0 && (
                    <div className="flex items-center justify-center text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 whitespace-nowrap px-1"
                         style={{ width: `${costW}%` }}>
                        {costPct}
                    </div>
                )}
            </div>
            <div className="flex justify-between text-[9px] mt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PROFIT</span>
                <span className="text-zinc-500">COSTS & TAX</span>
            </div>
        </div>
    );
};
