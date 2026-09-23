import { describe, it, expect } from 'vitest';
import {
    RATIO_META, RATIO_ORDER, sane, verdict, percentile, median,
    LOWER_BETTER, HIGHER_BETTER, BAND_BETTER,
} from './ratioPolarity';

/**
 * These tests encode the three defects visible in the reference screenshot that
 * this module exists to prevent. Each block names the artefact it guards.
 */

describe('polarity — the direction of "better" differs per ratio', () => {
    it('treats a LOWER P/E as better', () => {
        expect(verdict('pe_ratio', 19.43, 30)).toBe('better');
        expect(verdict('pe_ratio', 40, 30)).toBe('worse');
    });

    it('treats a HIGHER ROE as better', () => {
        // The screenshot's own numbers: 37.66% against a 5.42% sector.
        expect(verdict('roe', 37.66, 5.42)).toBe('better');
        expect(verdict('roe', 2, 5.42)).toBe('worse');
    });

    it('does not apply one direction to every ratio', () => {
        // Same comparison shape, opposite verdicts — the bug in a naive `a > b`.
        expect(verdict('pe_ratio', 50, 25)).toBe('worse');
        expect(verdict('roce', 50, 25)).toBe('better');
    });

    it('reads near-identical values as similar, not a flipped verdict', () => {
        expect(verdict('roe', 10.1, 10)).toBe('similar');
        expect(verdict('pe_ratio', 20.2, 20)).toBe('similar');
    });
});

describe('poisoned benchmarks — the -180.1 sector P/E artefact', () => {
    it('refuses to judge against a negative sector P/E', () => {
        // The screenshot marks 19.43 RED against -180.1. There is no honest
        // verdict here; null forces the caller to say "not comparable".
        expect(verdict('pe_ratio', 19.43, -180.1)).toBeNull();
    });

    it('refuses to judge against the 904.15 quick-ratio artefact', () => {
        expect(sane('quick_ratio', 904.15)).toBe(false);
    });

    it('rejects a negative P/E as the subject too, not just the benchmark', () => {
        expect(sane('pe_ratio', -12)).toBe(false);
        expect(verdict('pe_ratio', -12, 25)).toBeNull();
    });

    it('returns null rather than a verdict when the benchmark is missing', () => {
        expect(verdict('roe', 15, null)).toBeNull();
        expect(verdict('roe', 15, undefined)).toBeNull();
        expect(verdict('roe', 15, 0)).toBeNull();
    });

    it('excludes insane peers from the median instead of averaging them in', () => {
        // One loss-maker at -180 is exactly what drags a sector MEAN negative.
        const m = median('pe_ratio', [18, 22, 26, -180.1]);
        expect(m).toBe(22);
        expect(m).toBeGreaterThan(0);
    });
});

describe('banded ratios — liquidity is not monotonic', () => {
    it('calls 0.59 a risk (the screenshot value)', () => {
        expect(verdict('quick_ratio', 0.59, null)).toBe('worse');
    });

    it('calls a healthy 1.5 good', () => {
        expect(verdict('quick_ratio', 1.5, null)).toBe('better');
    });

    it('does not reward hoarded cash as excellence', () => {
        // 12x current assets is idle capital, not strength — 'similar', not 'better'.
        expect(verdict('quick_ratio', 12, null)).toBe('similar');
    });

    it('ignores the peer value entirely for banded ratios', () => {
        // Being near a sick sector's median is not health.
        expect(verdict('quick_ratio', 0.59, 0.6)).toBe('worse');
    });

    it('mirrors the backend current-ratio band', () => {
        expect(verdict('current_ratio', 2, null)).toBe('better');
        expect(verdict('current_ratio', 0.9, null)).toBe('worse');
    });
});

describe('percentile — polarity-aware ranking', () => {
    it('gives a cheap P/E a high percentile', () => {
        expect(percentile('pe_ratio', 10, [10, 20, 30, 40])).toBe(75);
    });

    it('gives a high ROE a high percentile', () => {
        expect(percentile('roe', 40, [10, 20, 30, 40])).toBe(75);
    });

    it('needs at least two usable peers', () => {
        expect(percentile('roe', 10, [20])).toBeNull();
        expect(percentile('roe', 10, [])).toBeNull();
        expect(percentile('roe', 10, null)).toBeNull();
    });
});

describe('median — honest sample sizes', () => {
    it('returns null below the minimum peer count', () => {
        // A "median" of two stocks is a coincidence, not a benchmark.
        expect(median('roe', [10, 20])).toBeNull();
    });

    it('averages the middle pair on an even-sized pool', () => {
        expect(median('roe', [10, 20, 30, 40])).toBe(25);
    });

    it('takes the middle value on an odd-sized pool', () => {
        expect(median('roe', [10, 20, 30])).toBe(20);
    });
});

describe('input hygiene', () => {
    it('rejects non-numeric and non-finite input', () => {
        for (const bad of [null, undefined, '', 'abc', NaN, Infinity, -Infinity]) {
            expect(sane('roe', bad)).toBe(false);
            expect(verdict('roe', bad, 10)).toBeNull();
        }
    });

    it('accepts numeric strings, as JSON payloads often carry them', () => {
        expect(sane('roe', '15.5')).toBe(true);
        expect(verdict('roe', '37.66', '5.42')).toBe('better');
    });

    it('passes an unknown ratio through without judging it', () => {
        expect(sane('not_a_ratio', 123)).toBe(true);
    });
});

describe('metadata integrity', () => {
    it('declares a direction for every ratio', () => {
        for (const [key, meta] of Object.entries(RATIO_META)) {
            expect([LOWER_BETTER, HIGHER_BETTER, BAND_BETTER], key).toContain(meta.dir);
        }
    });

    it('gives every banded ratio a band', () => {
        for (const [key, meta] of Object.entries(RATIO_META)) {
            if (meta.dir === BAND_BETTER) {
                expect(Array.isArray(meta.band), key).toBe(true);
                expect(meta.band[0], key).toBeLessThan(meta.band[1]);
            }
        }
    });

    it('orders only ratios that exist', () => {
        for (const key of RATIO_ORDER) expect(RATIO_META[key], key).toBeTruthy();
    });

    it('gives every ratio a sane range with min below max', () => {
        for (const [key, meta] of Object.entries(RATIO_META)) {
            expect(meta.sane[0], key).toBeLessThan(meta.sane[1]);
        }
    });
});
