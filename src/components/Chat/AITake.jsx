import React from 'react';
import { Sparkles, Gauge, Scale, Newspaper } from 'lucide-react';

/**
 * AI Take — a compact synthesized verdict line shown above the structured cards.
 * Built from structured signals (management tone + valuation + latest event) on the
 * backend — no per-query LLM. Props: data = { symbol, bullets: [{ kind, text }] }
 */

const KIND_ICON = { sentiment: Gauge, valuation: Scale, event: Newspaper };

const AITake = ({ data }) => {
    if (!data || !Array.isArray(data.bullets) || data.bullets.length === 0) return null;
    return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-amber-300/40 dark:border-amber-500/20">
            <div className="px-4 py-3 bg-gradient-to-br from-amber-50 to-zinc-50 dark:from-amber-500/5 dark:to-zinc-900/40">
                <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={13} className="text-amber-500" strokeWidth={2.4} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600/90 dark:text-amber-400/90">
                        AI Take
                    </span>
                </div>
                <div className="space-y-1.5">
                    {data.bullets.map((b, i) => {
                        const Icon = KIND_ICON[b.kind] || Sparkles;
                        return (
                            <div key={i} className="flex items-start gap-2">
                                <Icon size={13} strokeWidth={2}
                                    className="text-amber-500/80 mt-[1px] flex-shrink-0" />
                                <span className="text-[12px] text-zinc-700 dark:text-zinc-200 leading-snug">{b.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AITake;
