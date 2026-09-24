import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { KeyRatiosCard } from './KeyRatiosCard';

// jest-dom matchers are deliberately not set up in this project (see
// pages/AuthPage/passwordRules.test.jsx), so these assert on truthiness and
// textContent rather than toBeInTheDocument/toBeEmptyDOMElement.
//
// This suite renders repeatedly; without an explicit unmount each render stacks
// in the same document and every query reports "found multiple elements".
afterEach(cleanup);

/**
 * The reference screenshot's own payload, used as the fixture throughout:
 * LLOYDSME against a mining sector whose P/E median arrives negative and whose
 * quick ratio arrives as an unusable 904.15.
 */
const LLOYDSME = {
    pe_ratio: 19.43,
    pb_ratio: 5.16,
    roa: 10.24,
    roe: 37.66,
    roce: 26.65,
    quick_ratio: 0.59,
    ev_ebitda: 13.64,
};

const POISONED_SECTOR = {
    pe_ratio: -180.1,   // loss-makers dragged the mean negative
    pb_ratio: 1.9,
    roa: 4.81,
    roe: 5.42,
    roce: 10.6,
    quick_ratio: 904.15, // unit error
    ev_ebitda: 7.53,
};

const renderCard = (props = {}) => render(
    <KeyRatiosCard symbol="LLOYDSME" ratios={LLOYDSME} sectorMedians={POISONED_SECTOR} flat {...props} />
);

/**
 * The row container for a ratio.
 *
 * Queried by its row-header role, which is what a table gives us — and exact,
 * because 'ROE' is a substring of 'ROCE' and a loose matcher picks up both.
 */
const rowFor = (label) =>
    screen.getByRole('rowheader', { name: label }).closest('tr');

describe('rendering', () => {
    it('renders a row for every ratio present in the payload', () => {
        renderCard();
        for (const label of ['P/E', 'P/B', 'ROA', 'ROE', 'ROCE', 'Quick ratio', 'EV / EBITDA']) {
            expect(screen.getByText(label)).toBeTruthy();
        }
    });

    it('omits ratios the payload does not carry', () => {
        render(<KeyRatiosCard symbol="X" ratios={{ roe: 12 }} flat />);
        expect(screen.getByText('ROE')).toBeTruthy();
        expect(screen.queryByText('P/E')).toBeNull();
    });

    it('formats through the shared formatter (2dp, correct unit)', () => {
        renderCard();
        expect(screen.getByText('37.66%')).toBeTruthy();   // pct
        expect(screen.getByText('19.43x')).toBeTruthy();   // multiple
        expect(screen.getByText('0.59')).toBeTruthy();     // bare ratio
    });

    it('renders nothing at all when no ratio is usable', () => {
        const { container } = render(<KeyRatiosCard symbol="X" ratios={{}} flat />);
        expect(container.innerHTML).toBe('');
    });

    it('survives a completely absent payload without throwing', () => {
        expect(() => render(<KeyRatiosCard flat />)).not.toThrow();
    });
});

describe('the -180.1 sector P/E must not produce a verdict', () => {
    it('marks the P/E row not-comparable rather than red', () => {
        renderCard();
        const row = rowFor('P/E');
        expect(within(row).getByLabelText('Not comparable')).toBeTruthy();
        expect(within(row).queryByLabelText('Worse')).toBeNull();
    });

    it('never prints the poisoned benchmark as a comparison value', () => {
        renderCard();
        expect(screen.queryByText(/-180/)).toBeNull();
    });

    it('never prints the 904.15 quick-ratio artefact', () => {
        renderCard();
        expect(screen.queryByText(/904/)).toBeNull();
    });

    it('does not print a tally footer counting unusable rows', () => {
        // The summary footer was removed by product decision; the per-row
        // treatment already says which rows have no benchmark.
        renderCard();
        expect(screen.queryByText(/not comparable/i)).toBeNull();
    });
});

describe('polarity', () => {
    it('marks a high ROE better', () => {
        renderCard();
        expect(within(rowFor('ROE')).getByLabelText('Better')).toBeTruthy();
    });

    it('marks an expensive P/B worse, not better', () => {
        // 5.16 vs a 1.9 sector: higher P/B is more expensive.
        renderCard();
        expect(within(rowFor('P/B')).getByLabelText('Worse')).toBeTruthy();
    });

    it('does not apply ROE\'s direction to P/B', () => {
        renderCard();
        expect(within(rowFor('P/B')).queryByLabelText('Better')).toBeNull();
    });
});

describe('banded liquidity ratios', () => {
    it('flags a 0.59 quick ratio as a risk', () => {
        renderCard();
        expect(within(rowFor('Quick ratio')).getByLabelText('Worse')).toBeTruthy();
    });

    it('shows the healthy range rather than a peer comparison', () => {
        renderCard();
        expect(within(rowFor('Quick ratio')).getByText(/1–2 ideal/)).toBeTruthy();
    });

    it('still judges a banded ratio when no sector data exists at all', () => {
        render(<KeyRatiosCard symbol="X" ratios={{ quick_ratio: 0.59 }} flat />);
        expect(within(rowFor('Quick ratio')).getByLabelText('Worse')).toBeTruthy();
    });
});

describe('peer tabs', () => {
    const peers = {
        COALINDIA: { pe_ratio: 7.2, roe: 38.1, pb_ratio: 2.4 },
        NMDC:      { pe_ratio: 9.8, roe: 22.5, pb_ratio: 2.1 },
        KIOCL:     { pe_ratio: 55.0, roe: 3.2, pb_ratio: 6.8 },
        GMDCLTD:   { pe_ratio: 14.2, roe: 11.4, pb_ratio: 1.7 },
    };

    it('renders a tab per peer plus the sector', () => {
        renderCard({ peerRatios: peers, sectorName: 'Mining' });
        expect(screen.getByRole('button', { name: 'Mining' })).toBeTruthy();
        for (const p of Object.keys(peers)) {
            expect(screen.getByRole('button', { name: p })).toBeTruthy();
        }
    });

    it('switches the benchmark when a peer tab is chosen', () => {
        renderCard({ peerRatios: peers });
        fireEvent.click(screen.getByRole('button', { name: 'COALINDIA' }));
        // Against COALINDIA's 7.2x, LLOYDSME's 19.43x is expensive.
        expect(within(rowFor('P/E')).getByLabelText('Worse')).toBeTruthy();
    });

    it('computes an honest sector median when none is supplied', () => {
        // No sectorMedians: the median comes from the peer pool (7.2/9.8/14.2/55
        // → 12.0), so a 19.43 P/E reads as worse — and no -180.1 anywhere.
        renderCard({ peerRatios: peers, sectorMedians: null });
        expect(within(rowFor('P/E')).getByLabelText('Worse')).toBeTruthy();
    });

    it('renders no tabs when there are no peers', () => {
        renderCard();
        expect(screen.queryByRole('button', { name: 'COALINDIA' })).toBeNull();
    });

    it('does not offer the stock itself as its own comparator', () => {
        renderCard({ peerRatios: { ...peers, LLOYDSME } });
        const tabs = screen.getAllByRole('button').map(b => b.textContent);
        expect(tabs.filter(t => t === 'LLOYDSME')).toHaveLength(0);
    });
});

describe('benchmark column', () => {
    const peers = {
        A: { pe_ratio: 10 }, B: { pe_ratio: 20 },
        C: { pe_ratio: 30 }, D: { pe_ratio: 40 },
    };

    it('shows n/a when the peer set is too thin for a median', () => {
        // One peer is not a sector median; the column must say so.
        render(<KeyRatiosCard symbol="X" ratios={{ pe_ratio: 12 }} peerRatios={{ A: { pe_ratio: 10 } }} flat />);
        expect(within(rowFor('P/E')).getByText('n/a')).toBeTruthy();
    });

    it('prints the benchmark in the comparison column', () => {
        render(<KeyRatiosCard symbol="X" ratios={{ pe_ratio: 12 }} peerRatios={peers} flat />);
        expect(within(rowFor('P/E')).getByText('25.00x')).toBeTruthy();
    });
});

/* The legend and tally footer were removed by product decision — the green/red
   values and the trend arrow already carry that meaning row by row. These guard
   against either being reintroduced. */
describe('no legend or tally footer', () => {
    it('does not show the peer count', () => {
        renderCard({ peerCount: 42, sectorName: 'Sector' });
        expect(screen.queryByText(/42 stocks/)).toBeNull();
    });

    it('does not show the colour legend', () => {
        renderCard();
        expect(screen.queryByText(/Better in comparison/i)).toBeNull();
        expect(screen.queryByText(/Worse in comparison/i)).toBeNull();
    });

    it('does not show an "Ahead on N of N" tally', () => {
        renderCard();
        expect(screen.queryByText(/Ahead on/i)).toBeNull();
    });

    it('still marks an unusable benchmark on the row itself', () => {
        // Removing the footer must not cost the per-row signal: a nonsense
        // sector median (-180.1 P/E) still has to read as "no verdict" rather
        // than being scored. The row shows a dash labelled for screen readers.
        render(<KeyRatiosCard symbol="X" ratios={{ pe_ratio: 19.43 }} sectorMedians={{ pe_ratio: -180.1 }} flat />);
        expect(screen.getAllByLabelText(/not comparable/i).length).toBeGreaterThan(0);
    });
});

describe('collapsible shell', () => {
    it('collapses and expands when not flat', () => {
        render(<KeyRatiosCard symbol="LLOYDSME" ratios={LLOYDSME} defaultOpen />);
        const toggle = screen.getByRole('button', { name: /Key Ratios/ });
        expect(screen.getByText('ROE')).toBeTruthy();
        fireEvent.click(toggle);
        expect(screen.queryByText('ROE')).toBeNull();
        fireEvent.click(toggle);
        expect(screen.getByText('ROE')).toBeTruthy();
    });
});

describe('accuracy — what is shown must be what the data says', () => {
    it('never invents a benchmark the payload did not supply', () => {
        // No sector medians, no peers: the comparison column must be n/a on
        // every row rather than falling back to a default "typical" figure.
        render(<KeyRatiosCard symbol="X" ratios={{ pe_ratio: 19.43, roe: 37.66 }} flat />);
        expect(within(rowFor('P/E')).getByText('n/a')).toBeTruthy();
        expect(within(rowFor('ROE')).getByText('n/a')).toBeTruthy();
    });

    it('prefers a backend-supplied median over one computed from visible peers', () => {
        // The backend medians the WHOLE sector; the peer tabs carry only a few
        // names. Recomputing from those few would silently narrow the sample.
        render(
            <KeyRatiosCard
                symbol="X"
                ratios={{ pe_ratio: 19.43 }}
                sectorMedians={{ pe_ratio: 22.4 }}
                peerRatios={{ A: { pe_ratio: 8 }, B: { pe_ratio: 9 }, C: { pe_ratio: 10 } }}
                flat
            />
        );
        expect(within(rowFor('P/E')).getByText('22.40x')).toBeTruthy();
        expect(within(rowFor('P/E')).queryByText('9.00x')).toBeNull();
    });

    it('falls back to a peer-computed median only when the backend sent none', () => {
        render(
            <KeyRatiosCard
                symbol="X"
                ratios={{ pe_ratio: 19.43 }}
                peerRatios={{ A: { pe_ratio: 8 }, B: { pe_ratio: 9 }, C: { pe_ratio: 10 } }}
                flat
            />
        );
        expect(within(rowFor('P/E')).getByText('9.00x')).toBeTruthy();
    });

    it('ignores a backend median that is itself out of range', () => {
        // Defence in depth: the backend filters before taking a median, but the
        // card must not trust a poisoned one if it ever arrives.
        render(
            <KeyRatiosCard
                symbol="X"
                ratios={{ pe_ratio: 19.43 }}
                sectorMedians={{ pe_ratio: -180.1 }}
                peerRatios={{ A: { pe_ratio: 18 }, B: { pe_ratio: 20 }, C: { pe_ratio: 22 } }}
                flat
            />
        );
        // Falls through to the honest peer median rather than showing -180.1.
        expect(within(rowFor('P/E')).getByText('20.00x')).toBeTruthy();
        expect(screen.queryByText(/-180/)).toBeNull();
    });

    it('renders every value at the shared 2dp precision', () => {
        // Guards the ROE 16-vs-15.90 class of regression: one number, one
        // rounding, sourced from metricFormat.
        render(<KeyRatiosCard symbol="X" ratios={{ roe: 15.8951, pe_ratio: 19.4 }} flat />);
        expect(screen.getByText('15.90%')).toBeTruthy();
        expect(screen.getByText('19.40x')).toBeTruthy();
    });

    it('does not round a value into or out of a verdict', () => {
        // 19.999 vs 20 is 'similar' (inside the 2% dead-band), not 'better',
        // even though it prints as 20.00x.
        render(<KeyRatiosCard symbol="X" ratios={{ pe_ratio: 19.999 }} sectorMedians={{ pe_ratio: 20 }} flat />);
        expect(within(rowFor('P/E')).getByLabelText('In line')).toBeTruthy();
    });
});

/* ─── Absolute rating column ──────────────────────────────────────────────────
 *
 * The bug this column exists to fix: the table answered "better or worse than
 * the sector?" while looking like it answered "is this good?". ATALREAL showed
 * ROE 7.96% in GREEN with an up-arrow purely because its sector median was
 * 6.37% — but a 7.96% ROE is a poor absolute return. Beating a weak sector is
 * not the same as being good, and the card must now say both things separately.
 */
describe('KeyRatiosCard — absolute rating', () => {
    // The exact payload from the reported screenshot.
    const ATALREAL = { pe_ratio: 26.50, roe: 7.96, roce: 10.70 };
    const ATALREAL_SECTOR = { pe_ratio: 25.55, roe: 6.37, roce: 15.81 };

    const renderAtalreal = (props = {}) => render(
        <KeyRatiosCard symbol="ATALREAL" ratios={ATALREAL} sectorMedians={ATALREAL_SECTOR} flat {...props} />
    );

    const rowFor = (label) => screen.getByRole('rowheader', { name: label }).closest('tr');

    it('rates an ROE that beats a weak sector as Poor, not good', () => {
        renderAtalreal();
        // Green/up-arrow against the sector...
        expect(within(rowFor('ROE')).getByLabelText('Better')).toBeTruthy();
        // ...but the absolute rating tells the truth.
        expect(rowFor('ROE').textContent).toContain('Poor');
    });

    it('rates ROCE 10.70% as Weak', () => {
        renderAtalreal();
        expect(rowFor('ROCE').textContent).toContain('Weak');
    });

    it('renders the Rating column header', () => {
        renderAtalreal();
        expect(screen.getByRole('columnheader', { name: 'Rating' })).toBeTruthy();
    });

    it('explains that colour compares while rating judges', () => {
        renderAtalreal();
        expect(document.body.textContent).toContain('beat a weak');
    });

    it('uses the full five-tier scale at the backend cutoffs', () => {
        // Mirrors _rate_roce_roe in app/services/fundamental_engine.py.
        for (const [roe, label] of [[30, 'Excellent'], [20, 'Good'], [14, 'Average'], [9, 'Weak'], [3, 'Poor']]) {
            cleanup();
            render(<KeyRatiosCard symbol="X" ratios={{ roe }} flat />);
            expect(rowFor('ROE').textContent, `roe ${roe}`).toContain(label);
        }
    });

    it('grades debt/equity on its lower-is-better scale', () => {
        render(<KeyRatiosCard symbol="X" ratios={{ debt_equity: 0.2 }} flat />);
        expect(rowFor('Debt / Equity').textContent).toContain('Excellent');
    });

    it('shows no rating for a ratio with no defensible absolute scale', () => {
        // P/B has no backend rating function — it must stay ungraded rather than
        // invent a threshold, so the row carries the not-comparable dash.
        render(<KeyRatiosCard symbol="X" ratios={{ pb_ratio: 5.16 }} flat />);
        const cells = rowFor('P/B').querySelectorAll('td');
        expect(cells[cells.length - 1].textContent.trim()).toBe('—');
    });

    it('keeps the rating fixed when the comparator tab changes', () => {
        // The rating is absolute: switching Sector → peer may flip the arrow, but
        // must never change the verdict on the number itself.
        render(
            <KeyRatiosCard
                symbol="ATALREAL"
                ratios={ATALREAL}
                sectorMedians={ATALREAL_SECTOR}
                peerRatios={{ PEER1: { roe: 40, roce: 30, pe_ratio: 12 } }}
                flat
            />
        );
        expect(rowFor('ROE').textContent).toContain('Poor');
        fireEvent.click(screen.getByRole('button', { name: 'PEER1' }));
        expect(rowFor('ROE').textContent).toContain('Poor');
    });

    it('omits the legend when nothing on the card is graded', () => {
        render(<KeyRatiosCard symbol="X" ratios={{ pb_ratio: 5.16 }} flat />);
        expect(document.body.textContent).not.toContain('beat a weak');
    });
});
