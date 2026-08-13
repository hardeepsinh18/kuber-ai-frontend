import { clsx } from 'clsx';
import { isGoodLabel, isNeutralLabel } from './labelClassifiers';

/* ─── Rating badge ───────────────────────────────────────────────────────── */
export const RatingBadge = ({ label, className }) => {
    if (!label) return null;
    const good = isGoodLabel(label);
    const neutral = !good && isNeutralLabel(label);
    return (
        <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap flex-shrink-0',
            good    ? 'bg-emerald-50 dark:bg-zinc-900 border-emerald-500/50 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-300' :
            neutral ? 'bg-amber-50 dark:bg-zinc-900 border-amber-500/50 dark:border-amber-700/40 text-amber-700 dark:text-amber-300' :
                      'bg-rose-50 dark:bg-zinc-900 border-rose-500/50 dark:border-rose-700/40 text-rose-700 dark:text-rose-300',
            className
        )}>
            <span className={clsx(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                good ? 'bg-emerald-500' : neutral ? 'bg-amber-500' : 'bg-rose-500'
            )} />
            {label}
        </span>
    );
};
