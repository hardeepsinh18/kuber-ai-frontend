/* OHLC tooltip for modal chart */
export const OHLCTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const bull = d.close >= d.open;
    return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-[11px] shadow-xl">
            <p className="text-zinc-400 mb-1">{d.date}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <span className="text-zinc-400">O</span><span className="text-white font-mono">₹{Number(d.open).toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                <span className="text-zinc-400">H</span><span className="text-emerald-400 font-mono">₹{Number(d.high).toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                <span className="text-zinc-400">L</span><span className="text-rose-400 font-mono">₹{Number(d.low).toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                <span className="text-zinc-400">C</span><span className={`font-mono font-semibold ${bull ? 'text-emerald-400' : 'text-rose-400'}`}>₹{Number(d.close).toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
            </div>
        </div>
    );
};
