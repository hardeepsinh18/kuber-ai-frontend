import { describe, it, expect } from 'vitest';
import { answerSections, firstParagraph, metricAnswer } from './answerSections';

describe('metricAnswer', () => {
    // fund.ratios entries are [value, threshold, label] (see getRatio in AnalystAnswer).
    const fund = {
        ratios: {
            pe_ratio: [23.2, 25, 'FAIR'],
            roe: [8.91, 15, 'Weak'],
            debt_equity: [0.34, 1, 'Strong'],
            net_margin: [8.9, null, 'Average'],
        },
    };

    it('answers a P/E question with the P/E, sector context and verdict', () => {
        expect(metricAnswer('pe ratio of reliance', fund, 'RELIANCE'))
            .toBe("RELIANCE's P/E is 23.2x versus the sector's 25.0x — fair.");
    });
    it('answers an ROE question with ROE (no sector context)', () => {
        expect(metricAnswer('reliance ROE', fund, 'RELIANCE')).toBe("RELIANCE's ROE is 8.9% — weak.");
    });
    it('answers a debt/equity question', () => {
        expect(metricAnswer('what is the d/e of reliance', fund, 'RELIANCE'))
            .toBe("RELIANCE's debt-to-equity is 0.34 — strong.");
    });
    it('accepts object-shaped ratio entries too', () => {
        const objFund = { ratios: { pe_ratio: { value: 23.2, threshold: 25, label: 'FAIR' } } };
        expect(metricAnswer('pe ratio', objFund, 'TCS')).toBe("TCS's P/E is 23.2x versus the sector's 25.0x — fair.");
    });
    it('returns null when the query names no known metric', () => {
        expect(metricAnswer('show me the chart', fund, 'RELIANCE')).toBeNull();
        expect(metricAnswer('fundamentals of reliance', fund, 'RELIANCE')).toBeNull();
    });
    it('returns null when the data is missing', () => {
        expect(metricAnswer('pe ratio', { ratios: {} }, 'X')).toBeNull();
        expect(metricAnswer('pe ratio', null, 'X')).toBeNull();
        expect(metricAnswer('', fund, 'X')).toBeNull();
    });
});

describe('firstParagraph', () => {
    it('returns the opening prose line — the direct answer for a metric query', () => {
        const md = 'The P/E of Reliance is **22.4**, above its 5-yr median.\n\n## Fundamentals\n\nmore text';
        expect(firstParagraph(md)).toBe('The P/E of Reliance is **22.4**, above its 5-yr median.');
    });
    it('skips leading headings, bullets, tables and quotes', () => {
        expect(firstParagraph('## Heading\n\n- bullet\n\nReal answer here')).toBe('Real answer here');
    });
    it('returns null for empty / heading-only input', () => {
        expect(firstParagraph('')).toBeNull();
        expect(firstParagraph(null)).toBeNull();
        expect(firstParagraph('# Only a heading')).toBeNull();
    });
});

describe('answerSections', () => {
    // Holistic intents keep the whole analyst wall — a buy decision or an
    // overview genuinely needs every card.
    describe('full / verdict → complete wall', () => {
        it.each(['full', 'verdict'])('%s shows every section', (intent) => {
            const s = answerSections(intent);
            expect(s.verdictBand).toBe(true);
            expect(s.chart).toBe(true);
            expect(s.scoreGrid).toBe(true);
            expect(s.technicalCard).toBe(true);
            expect(s.fundamentalCard).toBe(true);
            expect(s.sentiment).toBe(true);
            expect(s.news).toBe(true);
            expect(s.directAnswer).toBe(false);
        });
    });

    // The regression this fixes: "pe ratio of X" (→ 'fundamentals') must NOT
    // render the chart, technicals, sentiment wall or the BUY/SELL verdict band.
    describe('fundamentals → focused fundamentals view', () => {
        const s = answerSections('fundamentals');
        it('keeps the fundamental scorecard', () => expect(s.fundamentalCard).toBe(true));
        it('shows the direct answer instead of the hoisted verdict', () => {
            expect(s.directAnswer).toBe(true);
            expect(s.verdictBand).toBe(false);
        });
        it('hides the chart', () => expect(s.chart).toBe(false));
        it('hides technicals + patterns', () => {
            expect(s.technicalCard).toBe(false);
            expect(s.patterns).toBe(false);
        });
        it('hides the sentiment/filings wall', () => expect(s.sentiment).toBe(false));
        it('hides the overall multi-donut score grid', () => expect(s.scoreGrid).toBe(false));
        it('hides news', () => expect(s.news).toBe(false));
    });

    // The deployed classifier still labels single-metric queries 'pe_ratio'; it must
    // resolve to the exact same focused view as 'fundamentals'.
    describe("'pe_ratio' is an alias for the fundamentals view", () => {
        it('matches fundamentals section-for-section', () => {
            expect(answerSections('pe_ratio')).toEqual(answerSections('fundamentals'));
        });
        it('shows the fundamental card + direct answer, hides chart/verdict band', () => {
            const s = answerSections('pe_ratio');
            expect(s.fundamentalCard).toBe(true);
            expect(s.directAnswer).toBe(true);
            expect(s.chart).toBe(false);
            expect(s.verdictBand).toBe(false);
        });
    });

    describe('technicals → chart + technicals only', () => {
        const s = answerSections('technicals');
        it('shows chart + patterns + technical card', () => {
            expect(s.chart).toBe(true);
            expect(s.patterns).toBe(true);
            expect(s.technicalCard).toBe(true);
        });
        it('hides the fundamental card + sentiment + verdict band', () => {
            expect(s.fundamentalCard).toBe(false);
            expect(s.sentiment).toBe(false);
            expect(s.verdictBand).toBe(false);
        });
        it('shows the direct answer', () => expect(s.directAnswer).toBe(true));
    });

    describe('chart → chart only', () => {
        const s = answerSections('chart');
        it('shows the chart', () => expect(s.chart).toBe(true));
        it('hides technicals, fundamentals, sentiment', () => {
            expect(s.patterns).toBe(false);
            expect(s.technicalCard).toBe(false);
            expect(s.fundamentalCard).toBe(false);
            expect(s.sentiment).toBe(false);
        });
    });

    describe('news → news only', () => {
        const s = answerSections('news');
        it('shows news + direct answer', () => {
            expect(s.news).toBe(true);
            expect(s.directAnswer).toBe(true);
        });
        it('hides chart, cards, verdict band', () => {
            expect(s.chart).toBe(false);
            expect(s.fundamentalCard).toBe(false);
            expect(s.technicalCard).toBe(false);
            expect(s.verdictBand).toBe(false);
        });
    });

    // Robustness: unknown / missing intent must never blank the answer — fall
    // back to the full wall.
    describe('unknown / missing intent falls back to full', () => {
        it.each([undefined, null, '', 'garbage'])('%s → full wall', (intent) => {
            const s = answerSections(intent);
            expect(s.chart).toBe(true);
            expect(s.fundamentalCard).toBe(true);
            expect(s.directAnswer).toBe(false);
        });
    });
});
