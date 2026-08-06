/**
 * A clarifying question is not analysis, so it must not carry an investment
 * disclaimer.
 *
 * "Are you looking at TATAELXSI for short term or long term?" and the "which
 * company did you mean" picker both ASK the user something and state no view on
 * any stock. A SEBI-advice notice under a one-line question is noise, and
 * showing it everywhere dilutes it where it genuinely matters — under a real
 * buy/sell verdict.
 *
 * The inverse matters just as much: suppressing the disclaimer on a genuine
 * answer would be a compliance problem, not a cosmetic one, so both directions
 * are pinned here.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MessageBubble from './MessageBubble';

vi.mock('./StockChart', () => ({ default: () => null }));

const DISCLAIMER = /not investment advice/i;

const renderBubble = (props) =>
    render(<MessageBubble role="ai" isStreaming={false} metadata={{}} {...props} />);

afterEach(cleanup);

describe('disclaimer is hidden on clarifying questions', () => {
    it('is absent on a short-term/long-term horizon question', () => {
        renderBubble({
            content: 'Are you looking at **TATAELXSI** for **short term** or **long term**?',
        });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });

    it('is absent regardless of the order the horizon is phrased', () => {
        renderBubble({ content: 'Do you mean long term or short term for TCS?' });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });

    it('is absent on a "which company did you mean" disambiguation', () => {
        renderBubble({
            content: 'Which ICICI company did you mean?\n\n1. ICICI Bank\n2. ICICI Lombard',
            metadata: {
                disambiguation: {
                    ambiguous: true,
                    auto_resolved: false,
                    suggestions: [{ symbol: 'ICICIBANK' }, { symbol: 'ICICIGI' }],
                },
            },
        });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });

    it('is absent when the model writes the hyphenated form', () => {
        // "short-term or long-term" is the same question; only the spelling
        // differs, and the original detector only allowed whitespace.
        renderBubble({ content: 'Do you want a short-term or long-term view on TATAELXSI?' });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });

    it('is absent when the model uses an en-dash', () => {
        renderBubble({ content: 'Short–term or long–term for TATAELXSI?' });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });

    it('is absent for a single-aspect intent, where the rendered text is filtered', () => {
        // The rendered body is textToDisplay (post strip + intent filter), not the
        // raw content. The gate checks both, so a question surviving only in the
        // filtered text is still caught.
        renderBubble({
            content: 'Are you looking at TATAELXSI for short term or long term?',
            queryIntent: 'technical',
        });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });
});

describe('disclaimer still shows where it matters', () => {
    it('is present on an ordinary answer', () => {
        renderBubble({
            content: 'TCS looks fundamentally strong with an ROE of 51.8% and steady margins.',
        });
        expect(screen.queryByText(DISCLAIMER)).not.toBeNull();
    });

    it('is present on a verdict answer that merely MENTIONS both horizons', () => {
        // The guard keys on a question, not on the words appearing anywhere — an
        // answer discussing both horizons is still analysis and needs the notice.
        renderBubble({
            content: 'For the short term the setup is weak, but over the long term the '
                + 'fundamentals support accumulation on dips.',
        });
        expect(screen.queryByText(DISCLAIMER)).not.toBeNull();
    });

    it('is present on an auto-resolved disambiguation (a real answer)', () => {
        // A medium-confidence auto-resolve attaches a disambiguation payload for the
        // "switch company" chips, but its content IS a stock answer.
        renderBubble({
            content: 'HDFC Bank is trading near its 52-week high with an ROE of 17%.',
            metadata: {
                disambiguation: {
                    ambiguous: true,
                    auto_resolved: true,
                    suggestions: [{ symbol: 'HDFCBANK' }],
                },
            },
        });
        expect(screen.queryByText(DISCLAIMER)).not.toBeNull();
    });

    it('is absent on an error bubble', () => {
        renderBubble({ content: 'Something went wrong. Please try again.', isError: true });
        expect(screen.queryByText(DISCLAIMER)).toBeNull();
    });
});
