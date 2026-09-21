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
 * Exact match, because 'ROE' is a substring of 'ROCE' and a loose matcher picks
 * up both; the label lives in a `.truncate` span whose row is its grandparent.
 */
const rowFor = (label) =>
    screen.getByText((t, el) => el?.classList.contains('truncate') && t === label)
        .closest('div.flex.items-center.gap-2.px-2.py-2');

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

    it('counts unusable rows in the summary instead of hiding them', () => {
        renderCard();
        expect(screen.getByText(/not comparable/i)).toBeTruthy();
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

describe('summary line', () => {
    it('reports the peer count when comparing to a sector', () => {
        renderCard({ peerCount: 42, sectorName: 'Mining' });
        expect(screen.getByText(/42 stocks/)).toBeTruthy();
    });

    it('says so plainly when nothing is comparable', () => {
        render(<KeyRatiosCard symbol="X" ratios={{ pe_ratio: 19.43 }} sectorMedians={{ pe_ratio: -180.1 }} flat />);
        expect(screen.getByText(/No comparable benchmark/i)).toBeTruthy();
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
