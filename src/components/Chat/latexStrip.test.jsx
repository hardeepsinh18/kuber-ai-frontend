/**
 * VNTY-006: a concept answer occasionally comes back as raw LaTeX
 * ("[ \text{P/E Ratio} = \frac{\text{Share Price}}{\text{EPS}} ]") instead of
 * prose. There is no LaTeX renderer in this app (ReactMarkdown + remark-gfm
 * only), so it rendered as literal backslash-and-brace markup on screen.
 * stripResponseChrome's stripLatex step converts it to plain text.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MessageBubble from './MessageBubble';

const renderBubble = (content) =>
    render(<MessageBubble role="ai" isStreaming={false} metadata={{}} content={content} />);

const body = () => document.body.textContent;

afterEach(cleanup);

describe('LaTeX is converted to plain text in answer prose', () => {
    it('converts the exact reported case (bare brackets, no backslash)', () => {
        renderBubble('[ \\text{P/E Ratio} = \\frac{\\text{Share Price}}{\\text{EPS}} ]');
        expect(body()).toContain('P/E Ratio = (Share Price / EPS)');
        expect(body()).not.toContain('\\text');
        expect(body()).not.toContain('\\frac');
    });

    it('converts proper \\[ \\] display-math delimiters', () => {
        renderBubble('\\[ \\text{P/E Ratio} = \\frac{\\text{Share Price}}{\\text{EPS}} \\]');
        expect(body()).toContain('P/E Ratio = (Share Price / EPS)');
        expect(body()).not.toContain('\\[');
        expect(body()).not.toContain('\\]');
    });

    it('converts $...$ inline math', () => {
        renderBubble('The formula is $\\frac{Price}{EPS}$ for P/E.');
        expect(body()).toContain('The formula is (Price / EPS) for P/E.');
    });

    it('converts \\times to the multiplication sign', () => {
        renderBubble('ROE = \\frac{Net Income}{Shareholder Equity} \\times 100');
        expect(body()).toContain('ROE = (Net Income / Shareholder Equity) × 100');
    });

    it('never touches ordinary bracketed prose with no LaTeX anywhere in the answer', () => {
        renderBubble('Normal prose with [a bracket] and a citation [source: NSE].');
        expect(body()).toContain('Normal prose with [a bracket] and a citation [source: NSE].');
    });

    it('leaves plain parenthetical math untouched even if LaTeX appears elsewhere in the same answer', () => {
        renderBubble('P/E = (1500 / 50) = 30x. Also, \\text{ROE} is a separate ratio.');
        expect(body()).toContain('P/E = (1500 / 50) = 30x.');
        expect(body()).toContain('ROE is a separate ratio.');
    });
});
