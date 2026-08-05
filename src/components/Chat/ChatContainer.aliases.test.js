/**
 * The alias table turns a typed company name into a "confident" ticker hint that
 * the backend then trusts over its own resolution. So a wrong entry here is not
 * a cosmetic bug: the answer card renders the WRONG COMPANY's price, chart and
 * verdict under the user's question.
 *
 * Reported case: "icici lombard" returned ICICIBANK. Bare 'icici' is an alias
 * for ICICIBANK, and the single-word pass matched it regardless of the word that
 * followed — so the whole ICICI group collapsed onto the bank.
 *
 * Every ticker asserted below was verified against the live symbol-search master
 * list before being written, not inferred from the company name.
 */
import { describe, it, expect } from 'vitest';
import { extractStockSymbols } from './ChatContainer';

const symbolsFor = (q) => {
    const out = extractStockSymbols(q);
    // The helper returns { confident, rewrittenQuery, ... } — only the confident
    // hints reach the backend as `symbols`.
    return (out?.confident ?? out?.symbols ?? []).map(String);
};

describe('group companies are not swallowed by the house name', () => {
    it('resolves ICICI Lombard to ICICIGI, not ICICIBANK', () => {
        expect(symbolsFor('icici lombard')).toContain('ICICIGI');
        expect(symbolsFor('icici lombard')).not.toContain('ICICIBANK');
    });

    it('resolves the full legal name the sidebar sends', () => {
        // This exact string is what the follow-up chip / title uses.
        const s = symbolsFor('ICICI Lombard General Insurance Company Limited');
        expect(s).toContain('ICICIGI');
        expect(s).not.toContain('ICICIBANK');
    });

    it('resolves ICICI Prudential to ICICIPRULI', () => {
        expect(symbolsFor('icici prudential')).toContain('ICICIPRULI');
        expect(symbolsFor('icici prudential')).not.toContain('ICICIBANK');
    });

    it('resolves Godrej group companies to their own tickers', () => {
        expect(symbolsFor('godrej industries')).toContain('GODREJIND');
        expect(symbolsFor('godrej agrovet')).toContain('GODREJAGRO');
        expect(symbolsFor('godrej consumer')).toContain('GODREJCP');
    });

    it('resolves Bajaj Holdings to BAJAJHLDNG, not Bajaj Finance', () => {
        expect(symbolsFor('bajaj holdings')).toContain('BAJAJHLDNG');
        expect(symbolsFor('bajaj holdings')).not.toContain('BAJFINANCE');
    });

    it('sends NO hint for an unmapped group company rather than a wrong one', () => {
        // We have no alias for these. Sending nothing lets the backend resolve
        // against the full NSE list; sending ICICIBANK would be confidently wrong.
        expect(symbolsFor('icici venture')).not.toContain('ICICIBANK');
        expect(symbolsFor('godrej enterprises')).not.toContain('GODREJCP');
    });
});

describe('the flagship still resolves normally', () => {
    it('keeps bare house names on the flagship', () => {
        expect(symbolsFor('icici')).toContain('ICICIBANK');
        expect(symbolsFor('godrej')).toContain('GODREJCP');
        expect(symbolsFor('bajaj')).toContain('BAJFINANCE');
    });

    it('keeps the explicit bank names', () => {
        expect(symbolsFor('icici bank')).toContain('ICICIBANK');
        expect(symbolsFor('kotak bank')).toContain('KOTAKBANK');
    });

    it('does not break a head followed by ordinary query words', () => {
        // "icici share price" must still mean the bank — the guard only fires on
        // a following word that looks like another company.
        expect(symbolsFor('icici share price')).toContain('ICICIBANK');
        expect(symbolsFor('icici today')).toContain('ICICIBANK');
        expect(symbolsFor('icici chart')).toContain('ICICIBANK');
        expect(symbolsFor('icici bank vs hdfc bank')).toContain('ICICIBANK');
    });

    it('leaves unrelated single-name stocks untouched', () => {
        expect(symbolsFor('titan')).toContain('TITAN');
        expect(symbolsFor('maruti')).toContain('MARUTI');
        expect(symbolsFor('sail')).toContain('SAIL');
    });

    it('never throws on empty or odd input', () => {
        for (const q of ['', '   ', '???', 'a'.repeat(400)]) {
            expect(() => extractStockSymbols(q)).not.toThrow();
        }
    });
});
