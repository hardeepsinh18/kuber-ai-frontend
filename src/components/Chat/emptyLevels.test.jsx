/**
 * The model sometimes emits the entry/stop/target template with EMPTY slots —
 * "⚡ Entry ₹, | 🛑 Stop ₹, | 🎯 Target ₹," — and that rendered verbatim in the
 * answer as bare currency symbols and commas.
 *
 * On a financial surface that is worse than showing nothing: it reads as broken
 * data rather than absent data, and a user could reasonably think the numbers
 * failed to load rather than never existing.
 *
 * The risk in fixing it is over-matching, which would silently delete REAL entry
 * and target levels — far worse than the cosmetic bug. So the tests below spend
 * most of their weight on the negative cases: any line carrying digits must
 * survive untouched.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MessageBubble from './MessageBubble';

const renderBubble = (content) =>
    render(<MessageBubble role="ai" isStreaming={false} metadata={{}} content={content} />);

const body = () => document.body.textContent;

afterEach(cleanup);

describe('empty entry/stop/target lines are removed', () => {
    it('drops the exact line from the report', () => {
        renderBubble(
            'MACD at -13.77 signals bearish crossover, increasing risk.\n\n'
            + '⚡ Entry ₹, | 🛑 Stop ₹, | 🎯 Target ₹,'
        );
        expect(body()).toContain('MACD at -13.77');
        expect(body()).not.toContain('Entry ₹,');
        expect(body()).not.toContain('Target ₹,');
    });

    it('drops it without the emoji', () => {
        renderBubble('Analysis text.\n\nEntry ₹, | Stop ₹, | Target ₹,');
        expect(body()).toContain('Analysis text.');
        expect(body()).not.toMatch(/Entry\s*₹\s*,/);
    });

    it('drops a bolded empty line', () => {
        renderBubble('Analysis text.\n\n**Entry** ₹ | **Stop** ₹ | **Target** ₹');
        expect(body()).toContain('Analysis text.');
        expect(body()).not.toMatch(/Entry.*₹\s*\|/);
    });


    it('drops only the EMPTY slots when one carries a real value', () => {
        // The reported case: entry has a figure, stop and target do not. The
        // whole-line rule cannot catch this (the line has digits), so the blanks
        // rendered next to a genuine number — which is the most misleading form
        // of it.
        renderBubble(
            'Both banks have bearish MACD signals.\n\n'
            + '⚡ Entry ₹732.7 | 🛑 Stop ₹, | 🎯 Target ₹,'
        );
        expect(body()).toContain('732.7');          // the real value survives
        expect(body()).not.toMatch(/Stop\s*₹\s*,/);
        expect(body()).not.toMatch(/Target\s*₹\s*,/);
    });

    it('drops a trailing empty slot without eating the one before it', () => {
        renderBubble('Setup.\n\n⚡ Entry ₹818 | 🛑 Stop ₹802 | 🎯 Target ₹,');
        expect(body()).toContain('818');
        expect(body()).toContain('802');
        expect(body()).not.toMatch(/Target\s*₹\s*,/);
    });


    it('drops the colon-separated form', () => {
        // "Entry: RS, | Stop: RS," - the allowed-character class omitted the colon,
        // so this variant survived every other rule and rendered.
        renderBubble('Analysis text.\n\nEntry: ₹, | Stop: ₹, | Target: ₹,');
        expect(body()).toContain('Analysis text.');
        expect(body()).not.toMatch(/Entry:?\s*₹\s*,/);
        expect(body()).not.toMatch(/Target:?\s*₹\s*,/);
    });

    it('keeps a colon-separated line that HAS figures', () => {
        renderBubble('Setup.\n\nEntry: ₹1,450 | Target: ₹1,620');
        expect(body()).toContain('1,450');
        expect(body()).toContain('1,620');
    });

    it('keeps the surrounding analysis intact', () => {
        renderBubble(
            'ICICI Bank shows bearish momentum.\n\n'
            + '⚡ Entry ₹, | 🛑 Stop ₹, | 🎯 Target ₹,\n\n'
            + 'Price below EMA200 suggests a long-term downtrend.'
        );
        expect(body()).toContain('ICICI Bank shows bearish momentum');
        expect(body()).toContain('Price below EMA200');
    });
});

describe('real levels are never removed', () => {
    it('keeps a fully populated levels line', () => {
        renderBubble('Setup looks clean.\n\n⚡ Entry ₹818 | 🛑 Stop ₹802 | 🎯 Target ₹850');
        expect(body()).toContain('818');
        expect(body()).toContain('802');
        expect(body()).toContain('850');
    });

    it('keeps a levels line with thousands separators', () => {
        renderBubble('Setup.\n\n⚡ Entry ₹1,450 | 🛑 Stop ₹1,395 | 🎯 Target ₹1,620');
        expect(body()).toContain('1,450');
        expect(body()).toContain('1,620');
    });

    it('keeps a PARTIALLY populated line — real numbers must win', () => {
        // Deleting this would destroy genuine data, which is the failure mode
        // that actually matters here.
        renderBubble('Setup.\n\n⚡ Entry ₹818 | 🛑 Stop ₹, | 🎯 Target ₹850');
        expect(body()).toContain('818');
        expect(body()).toContain('850');
    });

    it('keeps prose that merely mentions entry or target', () => {
        renderBubble('Wait for a better entry before adding, and target the next resistance.');
        expect(body()).toContain('Wait for a better entry');
        expect(body()).toContain('target the next resistance');
    });

    it('keeps a markdown levels table', () => {
        renderBubble('| Level | Value |\n|---|---|\n| Entry | ₹8,650 |\n| Target | ₹9,100 |');
        expect(body()).toContain('8,650');
        expect(body()).toContain('9,100');
        // Asserting the VALUES survive is not enough — that passes even when the
        // table has collapsed into a paragraph of pipes. The label cells and the
        // table element itself are what actually prove the structure survived.
        expect(document.querySelector('table')).not.toBeNull();
        expect(body()).toContain('Entry');
        expect(body()).toContain('Target');
    });
});

/**
 * The levels cleanup above must never reach a markdown table. A GFM table is
 * held together by its delimiter row ("|---|---|"), which is pure punctuation
 * with no digits — exactly the shape the "empty levels line" rule was written to
 * delete. Deleting it silently downgrades every table in every answer into a
 * paragraph of pipe characters, which is how "Top PSU stocks by dividend yield"
 * rendered as one run-on line of text instead of a table.
 */
describe('markdown tables survive the levels cleanup', () => {
    const table = [
        '## Top Dividend-Yield Stocks (NSE)',
        '',
        '| # | Company | Div Yield | P/E | Mkt Cap |',
        '|---|---------|-----------|-----|---------|',
        '| 1 | **VEDL** | 12.20% | 9.9x | Rs 109,041 Cr |',
        '| 2 | **ONGC** | 5.11% | 6.9x | Rs 301,172 Cr |',
    ].join('\n');

    it('renders a screening answer as a real table, not a paragraph of pipes', () => {
        renderBubble(table);
        const el = document.querySelector('table');
        expect(el).not.toBeNull();
        // Header cells come through as <th>, so the column names are structure,
        // not prose.
        const headers = [...document.querySelectorAll('th')].map(th => th.textContent.trim());
        expect(headers).toEqual(['#', 'Company', 'Div Yield', 'P/E', 'Mkt Cap']);
        expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('leaves no raw pipe characters in the rendered text', () => {
        renderBubble(table);
        expect(body()).not.toContain('|');
    });

    it('keeps a label cell that happens to be a level word', () => {
        // "Entry"/"Target" as a table LABEL is a cell, not an inline levels slot.
        renderBubble('| Level | Value |\n|---|---|\n| Entry | ₹8,650 |');
        const cells = [...document.querySelectorAll('td')].map(td => td.textContent.trim());
        expect(cells).toEqual(['Entry', '₹8,650']);
    });

    it('keeps a horizontal rule', () => {
        // "---" is also pure punctuation with no digits.
        renderBubble('First section.\n\n---\n\nSecond section.');
        expect(document.querySelector('hr')).not.toBeNull();
    });

    it('keeps the intro prose above a table as prose', () => {
        // The second reported answer ("Which mid-cap stocks have best ROE") leads
        // with a paragraph and then tabulates — both halves have to survive.
        renderBubble(
            '## Mid-cap Stocks on NSE with Highest ROE\n\n'
            + 'VEDL leads the pack with an ROE of 38.2 percent.\n\n'
            + '| Stock | Price | ROE |\n'
            + '|-------|-------|-----|\n'
            + '| VEDL | Rs 277.80 | 38.2% |\n'
            + '| HDFCAMC | Rs 2,549.90 | 32.9% |'
        );
        expect(body()).toContain('VEDL leads the pack');
        expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(body()).not.toContain('|');
    });
});
