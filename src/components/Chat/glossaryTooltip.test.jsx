import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within } from '@testing-library/react';
import { MetricCell } from './answerKit';
import { InfoTip } from './FundamentalCard/InfoTip';

/**
 * Guards the glossary layer's two safety properties:
 *   1. a covered label gains a tappable definition
 *   2. an uncovered label renders EXACTLY as before (no stray control)
 *
 * This project has no vitest setupFiles, so there is no automatic RTL cleanup —
 * we unmount explicitly and scope queries to each render's own container.
 * The tooltip body is portalled to document.body, so panel assertions query
 * document.body deliberately.
 */

afterEach(cleanup);

const panel = () => within(document.body);

describe('MetricCell glossary integration', () => {
    it('adds a tappable definition for an indicator the sheet covers', () => {
        const { getByRole } = render(<MetricCell label="RSI 14" value="24.60" note="Oversold" />);
        const btn = getByRole('button', { name: /what does rsi mean/i });
        expect(btn).toBeTruthy();

        // Panel is closed until asked for.
        expect(panel().queryByText(/crowded local train/i)).toBeNull();

        fireEvent.click(btn);
        // Plain-English definition + the real-life analogy, verbatim from the sheet.
        expect(panel().getByText(/A meter from 0 to 100/i)).toBeTruthy();
        expect(panel().getByText(/crowded local train/i)).toBeTruthy();
        expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('resolves period-suffixed labels to the concept', () => {
        const { getByRole } = render(<MetricCell label="EMA 200" value="₹1,772.19" />);
        expect(getByRole('button', { name: /what does ema mean/i })).toBeTruthy();
    });

    it('renders an unknown indicator exactly as before — no control added', () => {
        const { queryByRole, getByText } = render(<MetricCell label="Sharpe ratio" value="1.2" />);
        expect(queryByRole('button')).toBeNull();
        expect(getByText('Sharpe ratio')).toBeTruthy();
        expect(getByText('1.2')).toBeTruthy();
    });

    it('still renders the value and note it always did', () => {
        const { getByText } = render(<MetricCell label="RSI 14" value="24.60" note="Oversold" />);
        expect(getByText('24.60')).toBeTruthy();
        expect(getByText('Oversold')).toBeTruthy();
    });
});

describe('InfoTip', () => {
    it('keeps the legacy text-only contract intact', () => {
        const { getByRole } = render(<InfoTip text="Composite of the fundamental metrics below." />);
        fireEvent.click(getByRole('button', { name: /more information/i }));
        expect(panel().getByText(/Composite of the fundamental metrics/i)).toBeTruthy();
    });

    it('renders nothing at all when given neither text nor a known term', () => {
        const { container } = render(<InfoTip />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing for a term the sheet does not cover', () => {
        const { container } = render(<InfoTip term="Sharpe ratio" />);
        expect(container.firstChild).toBeNull();
    });

    it('shows the glossary body and the caller detail together', () => {
        const { getByRole } = render(<InfoTip term="RSI" text="Bearish: RSI 24.6 and falling." />);
        fireEvent.click(getByRole('button'));
        expect(panel().getByText(/A meter from 0 to 100/i)).toBeTruthy();   // glossary
        expect(panel().getByText(/RSI 24.6 and falling/i)).toBeTruthy();    // caller detail
    });

    it('closes on Escape and returns focus to the button without reopening', () => {
        const { getByRole } = render(<InfoTip term="ROCE" />);
        const btn = getByRole('button');
        fireEvent.click(btn);
        expect(panel().getByText(/tiffin services/i)).toBeTruthy();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(panel().queryByText(/tiffin services/i)).toBeNull();
        // Focus comes back to the trigger, and the refocus must NOT reopen it.
        expect(document.activeElement).toBe(btn);
        expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles shut on a second click', () => {
        const { getByRole } = render(<InfoTip term="ROE" />);
        const btn = getByRole('button');
        fireEvent.click(btn);
        expect(panel().getByText(/Two friends each open a shop/i)).toBeTruthy();
        fireEvent.click(btn);
        expect(panel().queryByText(/Two friends each open a shop/i)).toBeNull();
    });
});
