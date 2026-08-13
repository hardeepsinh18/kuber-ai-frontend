import { clsx } from 'clsx';

/* ─── Peer rank horizontal bars ─────────────────────────────────────────── */
export const PeerRankCard = ({ peers, group, rank }) => {
    const sorted = [...peers].sort((a, b) => (b.score || 0) - (a.score || 0));
    const maxScore = sorted[0]?.score || 100;
    const foundIdx = sorted.findIndex(p => p.is_self);
    const myRank = rank ?? (foundIdx >= 0 ? foundIdx + 1 : 1);

    return (
        <div className="bg-[#FDD405] rounded-xl border border-[#FDD405]/40 p-3 flex flex-col">
            <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-black leading-none">Peer rank</p>
                    <p className="text-[10px] text-black/60 uppercase tracking-wide mt-0.5">VS {group || 'SECTOR'}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap flex-shrink-0 bg-black/15 border-black/20 text-black">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-700" />
                    #{myRank}
                </span>
            </div>
            <div className="flex-1 w-full space-y-2 pt-1 min-h-[60px]">
                {sorted.map((p) => (
                    <div key={p.name || p.symbol} className="flex items-center gap-2">
                        <span className={clsx(
                            'text-[10px] w-24 flex-shrink-0 truncate',
                            p.is_self ? 'font-bold text-black' : 'text-black/60'
                        )}>
                            {p.name || p.symbol}
                        </span>
                        <div className="flex-1 h-1.5 bg-black/15 rounded-full overflow-hidden">
                            <div
                                className={clsx('h-full rounded-full', p.is_self ? 'bg-black' : 'bg-black/30')}
                                style={{ width: `${((p.score || 0) / maxScore) * 100}%` }}
                            />
                        </div>
                        <span className={clsx(
                            'text-[10px] w-5 text-right flex-shrink-0',
                            p.is_self ? 'font-bold text-black' : 'text-black/60'
                        )}>
                            {p.score}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-end pt-2 border-t border-black/20 mt-2">
                <span className="text-[10px] text-black/60 leading-tight">Best in peer set: {sorted[0]?.score}</span>
            </div>
        </div>
    );
};
