/**
 * The Overall Health card carried a weighting breakdown under its description —
 * "48% Technical · 48% Fundamental · 5% Sentiment".
 *
 * It was added to explain why the same stock scores differently on a short-term
 * vs long-term call, but in practice it is internal scoring detail: it crowds a
 * small card, and the three lens scores it refers to are already rendered as
 * their own sub-cards directly below. Removed at the user's request (2026-08-19).
 *
 * The DATA is untouched — answerKitCore still extracts `overallWeights` from the
 * scorecard, so this stays a display decision that a future surface can undo
 * without a backend change.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import { VentyScorePanel } from './answerKit';
import { getScores } from './answerKitCore';

const scoreCard = {
    overall: {
        score: 20,
        label: 'Poor',
        basis: 'blend',
        weights: '48% Technical · 48% Fundamental · 5% Sentiment',
    },
    technical: { score: 30, commentary: ['tech note'] },
    fundamental: { score: 40, commentary: ['fund note'] },
};

const renderPanel = (sc = scoreCard) =>
    render(<ThemeProvider><VentyScorePanel scoreCard={sc} /></ThemeProvider>);

afterEach(cleanup);

describe('Overall Health card hides the weighting breakdown', () => {
    it('does not render the weights string', () => {
        const { container } = renderPanel();
        expect(container.textContent).not.toContain('48% Technical');
        expect(container.textContent).not.toContain('5% Sentiment');
    });

    it('still shows the score, the label and the description', () => {
        const { container } = renderPanel();
        const text = container.textContent;
        expect(text).toContain('Overall Health');
        expect(text).toContain('20%');
        expect(text).toContain('Poor');
        expect(text).toContain("across all three lenses");
    });

    it('still shows each lens as its own sub-card', () => {
        // These are what the removed line referred to — if they ever stop
        // rendering, hiding the breakdown would leave the score unexplained.
        const { container } = renderPanel();
        expect(container.textContent).toContain('Technical');
        expect(container.textContent).toContain('Fundamental');
    });

    it('keeps the short/long basis wording, which is a different line', () => {
        const { container } = renderPanel({
            ...scoreCard,
            overall: { ...scoreCard.overall, basis: 'short' },
        });
        expect(container.textContent).toContain('weighted for a short-term call');
        expect(container.textContent).not.toContain('48% Technical');
    });

    it('the weights value is still extracted, so this is display-only', () => {
        // Guards against a future "cleanup" deleting the field from the core
        // extractor and turning a reversible UI choice into a data loss.
        expect(getScores(scoreCard, null).overallWeights)
            .toBe('48% Technical · 48% Fundamental · 5% Sentiment');
    });
});
