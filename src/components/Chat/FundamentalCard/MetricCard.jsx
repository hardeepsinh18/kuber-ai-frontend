import { clsx } from 'clsx';
import { INNER_CARD_DARK } from '../answerKit';
import { RatingBadge } from './RatingBadge';

/* ─── Metric card shell ──────────────────────────────────────────────────── */
export const MetricCard = ({ title, subtitle, badge, children, bottomLabel, bottomValue, className }) => (
    <div className={clsx(
        `bg-zinc-50 dark:bg-[${INNER_CARD_DARK}] rounded-xl border border-zinc-200 dark:border-zinc-800/80 p-3 flex flex-col`,
        className
    )}>
        {/* flex-wrap so a long uppercase subtitle drops the badge to its own line
            instead of colliding with it in a narrow column; leading-tight because
            leading-none clipped the descenders once the subtitle wrapped. */}
        <div className="flex flex-wrap items-start justify-between mb-2 gap-x-2 gap-y-1">
            <div className="min-w-0 flex-1">
                {subtitle && <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wide leading-tight">{subtitle}</p>}
                <p className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{title}</p>
            </div>
            {badge && <RatingBadge label={badge} />}
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[60px]">
            {children}
        </div>
        {(bottomLabel || bottomValue) && (
            <div className="flex items-end justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800/80 mt-2 gap-2">
                {bottomLabel && <span className="text-[10px] text-zinc-500 leading-tight">{bottomLabel}</span>}
                {bottomValue && <span className="text-sm font-bold text-zinc-900 dark:text-white flex-shrink-0">{bottomValue}</span>}
            </div>
        )}
    </div>
);
