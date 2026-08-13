import { computeRatings } from './labelClassifiers';
import { KuberScoreBanner } from './KuberScoreBanner';
import { TechnicalScoreCard } from './TechnicalScoreCard';
import { FinancialScoreCard } from './FinancialScoreCard';
import { FiveYearScoreCard } from './FiveYearScoreCard';

/* ─── DEFAULT EXPORT: composed full fundamental block ───────────────────── */
export default function FundamentalScoreCard({ scoreCard, symbol }) {
    const fund    = scoreCard?.fundamental;
    const tech    = scoreCard?.technical;
    const horizon = scoreCard?.horizon;
    const overall = scoreCard?.overall;   // blended: avg of tech/fin/mgmt pillars
    if (!fund && !tech) return null;

    const ratingsSum = fund?.ratings_summary
        ?? (fund?.ratios ? computeRatings(fund.ratios) : null);

    return (
        <>
            {horizon ? (
                /* Horizon query — all detail lives inside the collapsible banner */
                <KuberScoreBanner
                    horizon={horizon}
                    tech={tech}
                    fund={fund}
                    ratingsSum={ratingsSum}
                    symbol={symbol}
                />
            ) : (
                /* No horizon — show individual cards directly */
                <>
                    {/* Overall Health Score banner removed (2026-07-10, user request) —
                        the Technical/Financial score cards below carry the detail;
                        OverallHealthScore component kept above for potential reuse. */}

                    {tech && <TechnicalScoreCard tech={tech} />}

                    {fund && <FinancialScoreCard fund={fund} symbol={symbol} />}
                    {fund?.historical && <FiveYearScoreCard fund={fund} />}
                </>
            )}
        </>
    );
}

// Individual detail cards — embedded by AnalystAnswer inside its scorecard sections
export { TechnicalScoreCard, FinancialScoreCard, FiveYearScoreCard };

// Re-exported so external consumers importing from './FundamentalCard' (the
// folder) keep resolving exactly the same named exports the old flat file had.
// cagrSpan is a plain function, not a component — same reasoning as the
// disable comment that guarded its original declaration in the flat file.
// eslint-disable-next-line react-refresh/only-export-components
export { cagrSpan } from './FinancialScoreCard';
export { PatternDetectionSection } from './PatternDetectionSection';
