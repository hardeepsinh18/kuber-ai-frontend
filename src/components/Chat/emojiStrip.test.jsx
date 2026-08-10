/**
 * The model decorates its own prose with emoji — "💰 Top Dividend-Yield Stocks
 * (NSE)", "🔍 Analysis", "📊 Fundamentals". The answer surfaces already carry a
 * deliberate visual language (brand yellow, MiniLabels, icon components), so a
 * stray emoji reads as decoration the product did not choose, and it renders at
 * a different size and baseline to the heading it sits in.
 *
 * The risk is stripping too much: arrows and the rupee sign carry MEANING in a
 * financial answer ("₹1,450 → ₹1,620", "↑ 12%"). Removing those would damage
 * the content rather than tidy it, so most of the weight below is on what must
 * SURVIVE.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MessageBubble from './MessageBubble';

const renderBubble = (content) =>
    render(<MessageBubble role="ai" isStreaming={false} metadata={{}} content={content} />);

const body = () => document.body.textContent;

afterEach(cleanup);

describe('emoji are stripped from answer prose', () => {
    it('removes the emoji from a heading (the reported case)', () => {
        renderBubble('## 💰 Top Dividend-Yield Stocks (NSE)\n\nSome analysis follows.');
        expect(body()).toContain('Top Dividend-Yield Stocks (NSE)');
        expect(body()).not.toContain('💰');
    });

    it('removes emoji from inline prose', () => {
        renderBubble('🔍 Looking at the numbers, TCS shows 📊 strong margins.');
        expect(body()).toContain('Looking at the numbers');
        expect(body()).toContain('strong margins');
        expect(body()).not.toContain('🔍');
        expect(body()).not.toContain('📊');
    });

    it('removes the traffic-light and signal emoji the model favours', () => {
        renderBubble('Status: 🟢 healthy, 🔴 risk, 🟡 watch, ⚡ fast, 🛑 stop, 🎯 target.');
        for (const e of ['🟢', '🔴', '🟡', '⚡', '🛑', '🎯']) {
            expect(body(), e).not.toContain(e);
        }
        expect(body()).toContain('healthy');
        expect(body()).toContain('watch');
    });

    it('leaves no double space where an emoji was removed mid-heading', () => {
        renderBubble('## 📈 Momentum');
        expect(body()).toContain('Momentum');
        expect(body()).not.toMatch(/#\s{2,}Momentum/);
    });
});

describe('meaningful symbols are NOT stripped', () => {
    it('keeps the rupee sign', () => {
        renderBubble('Entry at ₹1,450 with a target of ₹1,620.');
        expect(body()).toContain('₹1,450');
        expect(body()).toContain('₹1,620');
    });

    it('keeps directional arrows, which carry meaning in a financial answer', () => {
        renderBubble('Revenue moved ₹1,450 → ₹1,620 and margin ↑ 2.4% while debt ↓ 8%.');
        expect(body()).toContain('→');
        expect(body()).toContain('↑');
        expect(body()).toContain('↓');
    });

    it('keeps ordinary punctuation, maths and percent signs', () => {
        renderBubble('ROE ≈ 15.9%, P/E 24.2x, debt/equity ±0.3 — all within range.');
        expect(body()).toContain('15.9%');
        expect(body()).toContain('24.2x');
        expect(body()).toContain('≈');
        expect(body()).toContain('±');
    });

    it('keeps the analysis text itself untouched', () => {
        const text = 'ICICI Bank has a P/E of 14.2 and a ROE of 13.6%, but is in a strong downtrend.';
        renderBubble(`📉 ${text}`);
        expect(body()).toContain(text);
    });

    it('keeps bullet characters used as list markers', () => {
        // markdown renders "- " as its own bullet, but a literal "·" separator in
        // prose is content and must survive.
        renderBubble('TCS · IT Services · Large cap');
        expect(body()).toContain('·');
    });
});
