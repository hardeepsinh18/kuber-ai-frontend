/**
 * Single source of truth for rendering fundamental metric values.
 *
 * Every surface that prints a ratio — the FundamentalCard metric tiles and their
 * inner visuals, the Analyst scorecard grid, and the single-metric prose in
 * answerSections — must format from here. Before this module each surface rounded
 * on its own, so one ROE of 51.7981 rendered three different ways in the same
 * answer: "₹52" and "+52% PER YEAR" inside the Money-engine visual (Math.round),
 * "51.80%" in the tile footer (toFixed(2)), and "51.8%" in the Analyst grid
 * (toFixed(1)). Formatting in one place keeps them identical.
 *
 * Convention: percentages and multiples carry 2 decimals, matching the precision
 * the backend reports. Ratios that are not percentages (debt/equity) also use 2.
 */

/** Decimal places every metric renders at. Change here, changes everywhere. */
export const METRIC_DECIMALS = 2;

/**
 * Format a metric's bare number — no unit suffix.
 * Returns null for null/undefined/non-numeric so callers can skip the row.
 */
export const fmtNum = (v, decimals = METRIC_DECIMALS) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n.toFixed(decimals);
};

/** Format as a percentage: 51.7981 → "51.80%" */
export const fmtPct = (v, decimals = METRIC_DECIMALS) => {
    const n = fmtNum(v, decimals);
    return n == null ? null : `${n}%`;
};

/** Format as a multiple: 28.4 → "28.40x" */
export const fmtMultiple = (v, decimals = METRIC_DECIMALS) => {
    const n = fmtNum(v, decimals);
    return n == null ? null : `${n}x`;
};

/** Format a plain ratio with no unit (debt/equity): 0.7 → "0.70" */
export const fmtRatio = (v, decimals = METRIC_DECIMALS) => fmtNum(v, decimals);
