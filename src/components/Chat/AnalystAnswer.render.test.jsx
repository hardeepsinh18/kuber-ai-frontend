// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import AnalystAnswer from './AnalystAnswer';
import { ThemeProvider } from '../../context/ThemeContext';

afterEach(cleanup);

// StockChart (rendered by the full/technicals/chart paths) reads ThemeContext.
const renderAnswer = (props) =>
    render(<ThemeProvider><AnalystAnswer {...props} /></ThemeProvider>);

// Minimal but realistic props for a "pe ratio of reliance" style answer. content
// leads with the metric — exactly what the backend returns (its opening line is
// the direct answer).
const baseProps = {
    content: 'The P/E of Reliance is **22.4**, above its 5-year median of ~19.\n\n## Fundamentals\n\nROE sits at 8.9%.',
    verdictText: 'Reliance is a safe, cash-generating giant. Hold for stability.',
    metadata: { at_a_glance: { price: 1280.5, symbol: 'RELIANCE', company_name: 'Reliance', pe_ratio: 22.4 } },
    signal: { recommendation: 'HOLD', why: ['strong moat'] },
    scoreCard: {
        verdict: 'HOLD',
        overall: { score: 62, components: { technical: 55, financial: 60, management: 58 } },
        technical: { score: 55 },
        fundamental: { score: 60 },
    },
    chartData: [{ symbol: 'RELIANCE', candles: [{ time: 1, open: 1, high: 2, low: 1, close: 1 }] }],
    symbolLabel: 'RELIANCE',
    streaming: false, // no animation/timers — every eligible section renders immediately
};

describe('AnalystAnswer intent narrowing', () => {
    it("pe_ratio (deployed single-metric intent): direct answer, no chart/verdict band", () => {
        const { container } = renderAnswer({ ...baseProps, queryIntent: 'pe_ratio' });
        const text = container.textContent;
        // Direct answer card (label "Answer") replaces "Why this verdict"
        expect(text).toContain('Answer');
        expect(text).not.toContain('Why this verdict');
        // With no query/ratios, falls back to the reply's opening paragraph
        expect(text).toContain('The P/E of Reliance is');
        // The full-wall sections are gone
        expect(container.querySelector('canvas')).toBeNull();      // no StockChart
        expect(text).not.toContain('VentyAI Score');              // no overall score grid
        expect(text).not.toContain('VentyAI Verdict');               // no BUY/SELL verdict band
    });

    it("pe_ratio: answers the asked metric from scorecard data, not the opening line", () => {
        const { container } = renderAnswer({
            ...baseProps,
            queryIntent: 'pe_ratio',
            query: 'pe ratio of reliance',
            scoreCard: { ...baseProps.scoreCard, fundamental: { score: 60, ratios: { pe_ratio: [23.2, 25, 'FAIR'] } } },
        });
        const text = container.textContent;
        // The metric answer (built from data) leads — even though content opens on P/E 22.4
        // 2 decimals: utils/metricFormat is the shared precision for every surface.
        // Comma, not an em dash: stripAiDashes rewrites the verdict separator.
        expect(text).toContain("RELIANCE's P/E is 23.20x versus the sector's 25.00x, fair.");
        expect(text).not.toContain('The P/E of Reliance is'); // the opening paragraph is NOT used
    });

    it("full: keeps the verdict summary and the score wall", () => {
        // chartData omitted: the live-chart canvas can't be measured in jsdom, and
        // the wide-path sections under test (verdict summary + score grid) don't
        // need it. The fundamentals test above already proves the chart is gated.
        const { container } = renderAnswer({ ...baseProps, chartData: undefined, queryIntent: 'full' });
        const text = container.textContent;
        expect(text).toContain('Why this verdict');
        expect(text).toContain('VentyAI Score');
    });
});
