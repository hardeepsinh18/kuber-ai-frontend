// @vitest-environment jsdom
/**
 * Regression tests for the R:R mandate (2026-09-23): a VentyAI Verdict card —
 * and its Entry / Stop Loss / Target numbers — may render ONLY when it came
 * from the deterministic verdict engine (verdict_engine.py, compute_verdict),
 * because that is the only place the required risk:reward check runs
 * (ACTIONABLE_RR — a trade's levels never surface below a 1.5:1 ratio).
 *
 * This supersedes the AI-002/AI-011 behaviour (SnowDen audit, 2026-07-26),
 * which kept a fallback that derived a BUY/SELL/HOLD call from LLM prose and
 * filled Stop Loss / Target from scraped text or a single pattern-engine
 * support/resistance point, marked with a "*" footnote rather than hidden.
 * That fallback never computed or checked an R:R ratio, and a real case
 * reached production showing a ₹3 stop next to a ₹0.5 target with no ratio
 * checked at all — so the fallback was removed rather than patched.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { VerdictBand } from './answerKit';

afterEach(cleanup);

const PROSE_WITH_LEVELS =
    'TCS looks constructive. Entry around 3400, stop loss at 3200, target 3800 over the next quarter.';

describe('VerdictBand only renders the R:R-checked engine verdict', () => {
    it('renders nothing for prose-derived levels, even with a clear BUY/SELL/HOLD word', () => {
        const { container } = render(
            <VerdictBand content={PROSE_WITH_LEVELS} verdictText="BUY" price={3400} />
        );
        expect(container.textContent || '').toBe('');
    });

    it('renders nothing for a typed `signal` object — that path never ran the R:R check either', () => {
        const { container } = render(
            <VerdictBand signal={{ recommendation: 'BUY', ideal_entry: 3400, stop_loss: 3200, target: 3800 }}
                         content="TCS looks constructive." price={3400} />
        );
        expect(container.textContent || '').toBe('');
    });

    it('renders nothing with no verdict prop at all', () => {
        const { container } = render(<VerdictBand />);
        expect(container.textContent || '').toBe('');
    });

    it('renders the deterministic band when the engine actually computed a verdict', () => {
        const { container } = render(
            <VerdictBand verdict={{
                SHORT: {
                    verdict: 'BUY', confidence: 70, blend: 72,
                    levels: { actionable: true, entry: 3400, stop: 3200, target: 3800, rr: 2 },
                    reason_codes: [], data_sufficiency: 'full',
                },
            }} />
        );
        const text = container.textContent || '';
        expect(text).toContain('BUY');
        expect(text).toContain('1 : 2');
    });

    it('hides the level cells (but keeps the verdict word) when the engine marks the setup non-actionable', () => {
        const { container } = render(
            <VerdictBand verdict={{
                SHORT: {
                    verdict: 'BUY', confidence: 40, blend: 65,
                    levels: { actionable: false, stop: 100, target: 100.5, note: 'watchlist only: R:R 0.17 below the 1.5 floor' },
                    reason_codes: [], data_sufficiency: 'full',
                },
            }} />
        );
        const text = container.textContent || '';
        expect(text).toContain('BUY');
        expect(text).not.toMatch(/100\.5/);
        expect(text).toContain('watchlist only');
    });
});
