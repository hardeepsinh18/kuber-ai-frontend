/* ─── P/E Gradient Bar ───────────────────────────────────────────────────── */
export const PEGradientBar = ({ pe, sectorPe, symbol }) => {
    const max = Math.max((sectorPe || 30) * 1.9, (pe || 20) * 1.8, 55);
    const pePos = Math.min(Math.max(((pe || 0) / max) * 100, 4), 94);
    const sym = (symbol || 'STK').toUpperCase().replace(/\.NS|\.BO|-EQ|NSE:|BSE:/gi, '').slice(0, 4);

    return (
        <div className="w-full px-1">
            {/* reserve vertical space: circle 28px + tick 4px = ~32px above bar */}
            <div className="relative" style={{ paddingTop: 32 }}>
                {/* Symbol yellow circle */}
                <div className="absolute z-10 flex flex-col items-center"
                     style={{ left: `${pePos}%`, top: 0, transform: 'translateX(-50%)' }}>
                    <div className="w-7 h-7 rounded-full bg-[#FDD405] border-2 border-zinc-400 dark:border-zinc-900 flex items-center justify-center text-[7px] font-black text-black shadow">
                        {sym}
                    </div>
                    <div className="w-px h-1 bg-[#FDD405]" />
                </div>
                {/* Gradient bar */}
                <div className="relative h-3 rounded-full"
                     style={{ background: 'linear-gradient(to right,#22c55e 0%,#84cc16 25%,#eab308 50%,#f97316 75%,#ef4444 100%)' }} />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                <span>CHEAP</span><span>EXPENSIVE</span>
            </div>
        </div>
    );
};
