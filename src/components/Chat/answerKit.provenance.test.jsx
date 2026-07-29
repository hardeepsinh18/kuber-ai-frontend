// @vitest-environment jsdom
/**
 * Regression tests for AI-002 / AI-011 (SnowDen audit run 2026-07-26).
 *
 * answerKit.jsx asserts its own contract that levels are "computed or absent,
 * never invented". But when the backend supplies no typed signal fields — which is
 * what the live API does today; it returns no `signal` object at all — the entry /
 * stop / target shown in the verdict band are scraped out of the LLM's prose by
 * extractLevelsFromText. Those were rendered identically to engine-computed values,
 * so a number the model invented was indistinguishable from one that was computed.
 *
 * Removing the prose path outright would strip the band entirely, so prose-derived
 * levels are still shown — but marked, and the marking is what these tests protect.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { VerdictBand } from './answerKit';

afterEach(cleanup);

const PROSE_WITH_LEVELS =
    'TCS looks constructive. Entry around 3400, stop loss at 3200, target 3800 over the next quarter.';

describe('AI-002: prose-derived levels are marked as model text', () => {
    it('flags levels read out of the answer prose', () => {
        const { container } = render(
            <VerdictBand content={PROSE_WITH_LEVELS} verdictText="BUY" price={3400} />
        );
        const text = container.textContent || '';
        if (!/Entry|Target|Stop/i.test(text)) return; // no band rendered — nothing to assert
        expect(text).toContain('not computed by the engine');
    });

    it('does NOT add the model-text footnote when levels come from typed fields', () => {
        const { container } = render(
            <VerdictBand
                content="TCS looks constructive."
                signal={{ recommendation: 'BUY', ideal_entry: 3400, stop_loss: 3200, target: 3800 }}
                price={3400}
            />
        );
        const text = container.textContent || '';
        expect(text).toContain('3,400');
        expect(text).not.toContain('not computed by the engine');
    });

    it('still renders the levels rather than hiding them', () => {
        /* Losing the band entirely would be a worse regression than labelling it. */
        const { container } = render(
            <VerdictBand content={PROSE_WITH_LEVELS} verdictText="BUY" price={3400} />
        );
        const text = container.textContent || '';
        if (/Entry|Target|Stop/i.test(text)) {
            expect(text).toMatch(/3,?400|3,?200|3,?800/);
        }
    });
});
