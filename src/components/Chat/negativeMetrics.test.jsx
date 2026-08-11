/**
 * A negative ROE is a LOSS, and the card rendered it as a gain.
 *
 * The reported stock has an ROE of -1.56%. The Money-engine tile showed
 * "+1.56% PER YEAR", a green up-arrow, and the figure in emerald labelled
 * PROFIT — every visual cue said the opposite of what the number means. The "+"
 * was a hardcoded literal, so the raw value would have read "+-1.56%".
 *
 * On a financial surface this is the worst class of display bug: not missing
 * data, but data whose meaning is inverted. These pin the sign end to end.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FinancialScoreCard, FiveYearScoreCard } from './FundamentalCard';

vi.mock('./StockChart', () => ({ default: () => null }));

// The 5-year cards render sparklines that observe their container. jsdom has no
// ResizeObserver, so stub it — this is a harness gap, not behaviour under test.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const fundWith = (ratios, historical) => ({ ratios, historical });

const text = () => document.body.textContent;

afterEach(cleanup);

describe('negative ROE renders as a loss, not a gain', () => {
    const negative = () =>
        render(<FinancialScoreCard fund={fundWith({ roe: [-1.56, 15, 'POOR'] })} symbol="TEST" flat />);

    it('never prints a "+" in front of the negative figure', () => {
        negative();
        // Not a bare "+-" check: the footer legend ends "Elite 30%+" and is
        // immediately followed by the value, so "+-" appears for innocent reasons.
        // What matters is that the FIGURE is not presented as a gain.
        expect(text()).not.toMatch(/\+\s*1\.56/);
    });

    it('shows the value as negative', () => {
        negative();
        // U+2212 minus, or a plain hyphen — either is acceptable, absent is not.
        expect(text()).toMatch(/[−-]\s*1\.56/);
    });

    it('labels it LOSS rather than PROFIT', () => {
        negative();
        expect(text()).toContain('LOSS');
        expect(text()).not.toContain('PROFIT');
    });

    it('says the money is LOST, not EARNED', () => {
        negative();
        expect(text()).toMatch(/Loses/i);
        expect(text()).not.toMatch(/Invested Earns/i);
    });
});

describe('positive ROE is unchanged', () => {
    const positive = () =>
        render(<FinancialScoreCard fund={fundWith({ roe: [15.9, 15, 'STRONG'] })} symbol="TEST" flat />);

    it('still prints a "+" and reads PROFIT', () => {
        positive();
        expect(text()).toContain('+15.90');
        expect(text()).toContain('PROFIT');
        expect(text()).not.toContain('LOSS');
    });

    it('still says the money is EARNED', () => {
        positive();
        expect(text()).toMatch(/Earns/i);
    });

    it('does not print a minus sign', () => {
        positive();
        expect(text()).not.toMatch(/[−]\s*15\.90/);
    });
});

describe('growth badges carry their own sign', () => {
    // The CAGR badges live in FiveYearScoreCard, which renders collapsed, so the
    // header has to be opened before its cards are in the DOM.
    const withCagr = (revenue_cagr) => {
        const r = render(
            <FiveYearScoreCard
                fund={fundWith({}, {
                    years: ['FY24', 'FY25', 'FY26'],
                    revenue_cr: [1000, 900, 800],
                    revenue_cagr,
                })}
            />
        );
        fireEvent.click(screen.getByText(/Financial Score Card|5 Year|Year/i));
        return r;
    };

    it('shows a shrinking business as negative, not "+-"', () => {
        withCagr(-8.3);
        expect(text()).not.toContain('+-');
        expect(text()).toMatch(/[−-]\s*8\.30% CAGR/);
    });

    it('still shows growth as positive', () => {
        withCagr(12.4);
        expect(text()).toMatch(/\+12\.40% CAGR/);
    });

    it('renders a zero CAGR rather than dropping the badge', () => {
        // `hist.revenue_cagr ? …` treated 0 as absent; the != null check keeps it.
        withCagr(0);
        expect(text()).toMatch(/\+0\.00% CAGR/);
    });
});
