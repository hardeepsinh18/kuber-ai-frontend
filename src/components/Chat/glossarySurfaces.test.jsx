import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within } from '@testing-library/react';
import { IndicatorsTable } from './answerKit';
import ScreenerAnswer from './ScreenerAnswer';

afterEach(cleanup);
const body = () => within(document.body);

/* Coverage guard: the glossary must reach EVERY surface that prints a metric
   name, not just the fundamental cards. One test per surface. */

describe('IndicatorsTable (MessageBubble / general answers)', () => {
    it('attaches the glossary to indicator names, and only known ones', () => {
        const { getByRole, container } = render(
            <IndicatorsTable rows={[
                { indicator: 'RSI 14',  value: '24.60', signal: 'Oversold' },
                { indicator: 'VWAP 20', value: '1,597', signal: 'Bearish'  },
            ]} />
        );
        // table is collapsed by default
        fireEvent.click(getByRole('button', { name: /technical indicators/i }));

        const scope = within(container);
        expect(scope.getByRole('button', { name: /what does rsi mean/i })).toBeTruthy();
        // VWAP is not in the 156-row sheet -> no control, label still printed
        expect(scope.queryByRole('button', { name: /what does vwap/i })).toBeNull();
        expect(scope.getByText('VWAP 20')).toBeTruthy();
        expect(scope.getByText('24.60')).toBeTruthy();
    });
});

describe('ScreenerAnswer metric chips', () => {
    it('attaches the glossary to screener metric labels', () => {
        const { container } = render(
            <ScreenerAnswer rows={[{ symbol: 'ICICIGI', metrics: [
                { label: 'ROE', value: '16.6%' },
                { label: 'Sharpe', value: '1.2' },
            ] }]} />
        );
        const scope = within(container);
        expect(scope.getByRole('button', { name: /what does roe mean/i })).toBeTruthy();
        expect(scope.queryByRole('button', { name: /what does sharpe/i })).toBeNull();
    });
});

describe('markdown tables (comparison + analyst prose)', () => {
    it('attaches the glossary to table headers via proseComponents', async () => {
        const { proseComponents } = await import('./AnalystAnswer');
        const Th = proseComponents.th;
        const { container } = render(<table><thead><tr><Th>ROCE</Th></tr></thead></table>);
        expect(within(container).getByRole('button', { name: /what does roce mean/i })).toBeTruthy();
    });

    it('leaves a non-metric header alone', async () => {
        const { proseComponents } = await import('./AnalystAnswer');
        const Th = proseComponents.th;
        const { container } = render(<table><thead><tr><Th>Company</Th></tr></thead></table>);
        expect(within(container).queryByRole('button')).toBeNull();
        expect(within(container).getByText('Company')).toBeTruthy();
    });
});

describe('in-prose glossary (the surface a new user actually reads)', () => {
    it('underlines jargon inside VentyScorePanel commentary bullets', async () => {
        const { VentyScorePanel } = await import('./answerKit');
        const { container } = render(
            <VentyScorePanel scoreCard={{
                technical: { score: 23, commentary: [
                    'Bearish signals (2): MACD, Candlesticks.',
                    'Price closed below the 20 EMA, exit short-term longs.',
                ] },
            }} />
        );
        const scope = within(container);
        expect(scope.getByRole('button', { name: /what does macd mean/i })).toBeTruthy();
        expect(scope.getByRole('button', { name: /what does candlestick mean/i })).toBeTruthy();
        expect(scope.getByRole('button', { name: /what does ema mean/i })).toBeTruthy();
    });

    it('marks a repeated term only once across sibling bullets', async () => {
        const { VentyScorePanel } = await import('./answerKit');
        const { container } = render(
            <VentyScorePanel scoreCard={{
                technical: { score: 23, commentary: [
                    'MACD below zero.', 'MACD still negative.', 'MACD weak.',
                ] },
            }} />
        );
        expect(within(container).getAllByRole('button', { name: /what does macd mean/i })).toHaveLength(1);
    });

    it('opens the definition when an inline term is clicked', async () => {
        const { GlossaryText } = await import('./GlossaryText');
        const { getByRole } = render(
            <GlossaryText seen={new Set()}>{'RSI 24.6 and falling.'}</GlossaryText>
        );
        fireEvent.click(getByRole('button', { name: /what does rsi mean/i }));
        expect(body().getByText(/crowded local train/i)).toBeTruthy();
    });

    it('renders the sentence unchanged when it holds no jargon', async () => {
        const { GlossaryText } = await import('./GlossaryText');
        const { container, queryByRole } = render(
            <GlossaryText seen={new Set()}>{'The company filed its report on Tuesday.'}</GlossaryText>
        );
        expect(queryByRole('button')).toBeNull();
        expect(container.textContent).toBe('The company filed its report on Tuesday.');
    });
});
