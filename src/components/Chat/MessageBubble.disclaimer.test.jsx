// @vitest-environment jsdom
/**
 * Regression tests for CONF-COPY-001 (Critical) and QA-C-003 (High),
 * SnowDen audit run 2026-07-26.
 *
 * The education-only disclaimer is a regulatory control. It previously rendered
 * only when the MODEL's prose happened to match a disclaimer regex, so any answer
 * where the LLM omitted or reworded the line shipped with no disclaimer — including
 * BUY/SELL verdicts carrying entry, stop and target levels.
 *
 * Every case below feeds model text deliberately STRIPPED of all disclaimer wording.
 * That is the condition the old gate failed on, and it is what stops this regressing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MessageBubble from './MessageBubble';
import { ThemeProvider } from '../../context/ThemeContext';

afterEach(cleanup);

const renderBubble = (props) =>
    render(<ThemeProvider><MessageBubble {...props} /></ThemeProvider>);

// Sentinel from the DISCLAIMER_TEXT constant in MessageBubble.jsx.
const DISCLAIMER_SENTINEL = 'consult a SEBI-registered advisor';

// Model text with every disclaimer word removed — no "disclaimer", no
// "education only", no "consult a SEBI".
const NO_DISCLAIMER_TEXT =
    'RELIANCE looks constructive here. Momentum is improving and the trend is intact.';

const baseMeta = {
    at_a_glance: { price: 1280.5, symbol: 'RELIANCE', company_name: 'Reliance' },
};

describe('CONF-COPY-001: disclaimer does not depend on model output', () => {
    it('renders on a plain answer whose text contains no disclaimer wording', () => {
        const { container } = renderBubble({
            role: 'assistant',
            content: NO_DISCLAIMER_TEXT,
            isStreaming: false,
        });
        expect(container.textContent).toContain(DISCLAIMER_SENTINEL);
    });

    it('renders on a BUY verdict carrying entry, stop and target levels', () => {
        const { container } = renderBubble({
            role: 'assistant',
            content:
                'Verdict: BUY RELIANCE. Entry 1280, stop-loss 1180, target 1450. '
                + 'The setup is clean and risk-reward is favourable.',
            metadata: baseMeta,
            signal: { recommendation: 'BUY', why: ['momentum'] },
            queryIntent: 'verdict',
            isStreaming: false,
        });
        // The precise failure the finding describes: advice + price levels, no disclaimer.
        expect(container.textContent).toContain(DISCLAIMER_SENTINEL);
    });

    it('renders on the structured Quick/Analyst layout', () => {
        const { container } = renderBubble({
            role: 'assistant',
            content: NO_DISCLAIMER_TEXT,
            metadata: baseMeta,
            scoreCard: {
                verdict: 'HOLD',
                overall: { score: 62, components: { technical: 55, financial: 60, management: 58 } },
                technical: { score: 55 },
                fundamental: { score: 60 },
            },
            signal: { recommendation: 'HOLD', why: ['strong moat'] },
            queryIntent: 'full',
            isStreaming: false,
        });
        expect(container.textContent).toContain(DISCLAIMER_SENTINEL);
    });

    it('still renders when the model DID emit its own disclaimer, without duplicating it', () => {
        const { container } = renderBubble({
            role: 'assistant',
            content:
                NO_DISCLAIMER_TEXT
                + '\n\nDisclaimer: This is for education only, not investment advice.',
            isStreaming: false,
        });
        const text = container.textContent;
        expect(text).toContain(DISCLAIMER_SENTINEL);
        // stripResponseChrome removes the model's line, so the box appears exactly once.
        expect(text.split(DISCLAIMER_SENTINEL).length - 1).toBe(1);
    });

    it('never renders a disclaimer on the user\'s own message', () => {
        const { container } = renderBubble({
            role: 'user',
            content: 'is reliance a buy?',
            isStreaming: false,
        });
        expect(container.textContent).not.toContain(DISCLAIMER_SENTINEL);
    });

    it('never renders a disclaimer on a client-authored error bubble', () => {
        const { container } = renderBubble({
            role: 'ai',
            content: '⚠️ Something went wrong. Please try again.',
            isError: true,
            isStreaming: false,
        });
        expect(container.textContent).not.toContain(DISCLAIMER_SENTINEL);
    });
});
