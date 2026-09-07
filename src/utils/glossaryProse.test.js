import { describe, it, expect } from 'vitest';
import { annotateProse } from './glossaryProse';

const marked = (segs) => segs.filter(s => s.term).map(s => s.term);
const rebuilt = (segs) => segs.map(s => s.text).join('');

describe('annotateProse', () => {
    it('never alters the text, only splits it', () => {
        const t = 'MACD -37.09 below zero, momentum has rolled over, exit signal.';
        expect(rebuilt(annotateProse(t))).toBe(t);
    });

    it('finds jargon in a real technical bullet', () => {
        const t = 'Bullish signals (2): MACD, Candlesticks.';
        expect(marked(annotateProse(t))).toEqual(['Bullish', 'MACD', 'Candlestick']);
    });

    it('finds jargon in a real fundamental bullet', () => {
        const t = 'P/E 13.9x · cheap · ROE 15% · average';
        expect(marked(annotateProse(t))).toEqual(['P/E ratio', 'ROE']);
    });

    // Rule 1
    it('marks only the FIRST mention of a term', () => {
        const t = 'RSI is low. RSI stays low. RSI again.';
        expect(marked(annotateProse(t))).toEqual(['RSI']);
    });

    it('shares the seen-set across sibling bullets', () => {
        const seen = new Set();
        const a = annotateProse('MACD has rolled over.', seen);
        const b = annotateProse('MACD still negative.', seen);
        expect(marked(a)).toEqual(['MACD']);
        expect(marked(b)).toEqual([]);   // already marked in the sibling above
    });

    // Rule 2
    it('prefers the longest term', () => {
        expect(marked(annotateProse('The moving average is flat.'))).toEqual(['Moving average']);
        expect(marked(annotateProse('Dividend yield of 2%.'))).toEqual(['Dividend yield']);
    });

    // Rule 3
    it('matches whole words only', () => {
        expect(marked(annotateProse('Shortly afterwards it recovered.'))).toEqual([]);
        expect(marked(annotateProse('EMAs everywhere'))).toEqual([]);
    });

    it('still matches terms containing a slash', () => {
        expect(marked(annotateProse('P/E of 31x'))).toEqual(['P/E ratio']);
        expect(marked(annotateProse('D/E is 0.4'))).toEqual(['D/E ratio']);
    });

    // Rule 4 — the one that protects quoted management commentary
    it('never annotates inside straight quotes', () => {
        const t = 'He said "our momentum is bullish" in the call.';
        expect(marked(annotateProse(t))).toEqual([]);
    });

    it('never annotates inside smart quotes', () => {
        const t = '“Retail demand stayed bullish” per management.';
        expect(marked(annotateProse(t))).toEqual([]);
    });

    it('annotates outside a quote but not within it', () => {
        const t = 'RSI is low, though he said "momentum is fine".';
        expect(marked(annotateProse(t))).toEqual(['RSI']);
    });

    // Rule 5 — the whole sheet is eligible, everyday-English terms included.
    // They are marked wherever they appear outside a quote; the reader takes
    // the sense from the surrounding stock answer.
    it('marks the everyday-English terms too', () => {
        // 'holding' is itself a sheet term, so both are legitimately marked.
        expect(marked(annotateProse('Price is holding above support.'))).toEqual(['Holding', 'Support']);
        expect(marked(annotateProse('Volume was heavy today.'))).toEqual(['Volume']);
        expect(marked(annotateProse('A correction after the rally.'))).toEqual(['Correction', 'Rally']);
    });

    it('is case-insensitive but reports the sheet term', () => {
        expect(marked(annotateProse('rsi and macd both fell'))).toEqual(['RSI', 'MACD']);
    });

    it('handles empty and non-string input safely', () => {
        expect(annotateProse('')).toEqual([{ text: '', term: null }]);
        expect(annotateProse(null)).toEqual([{ text: '', term: null }]);
        expect(annotateProse(undefined)).toEqual([{ text: '', term: null }]);
    });

    it('returns a single unmarked segment when nothing matches', () => {
        const t = 'The company filed its report on Tuesday.';
        expect(annotateProse(t)).toEqual([{ text: t, term: null }]);
    });
});

describe('full-sheet coverage', () => {
    it('every PROSE_TERMS entry resolves to a real sheet row', async () => {
        const { PROSE_TERMS } = await import('./glossaryProse');
        const { lookupTerm } = await import('./glossaryLookup');
        const unresolvable = PROSE_TERMS.filter(t => !lookupTerm(t));
        expect(unresolvable).toEqual([]);
    });

    it('covers every sheet term except VWAP, which has no row', async () => {
        const { PROSE_TERMS } = await import('./glossaryProse');
        const { lookupTerm, GLOSSARY } = await import('./glossaryLookup');
        const covered = new Set(PROSE_TERMS.map(t => lookupTerm(t)?.term).filter(Boolean));
        expect(GLOSSARY.length).toBe(156);
        const uncovered = GLOSSARY.filter(e => !covered.has(e.term)).map(e => e.term);
        expect(uncovered).toEqual([]);
    });

    it('marks the newly added categories', () => {
        expect(marked(annotateProse('The IPO opens next week.'))).toEqual(['IPO']);
        expect(marked(annotateProse('Start an SIP in an index fund.'))).toEqual(['SIP', 'Index fund']);
        expect(marked(annotateProse('SEBI requires a demat account and KYC.'))).toEqual(['SEBI', 'Demat account', 'KYC']);
        expect(marked(annotateProse('STT and brokerage apply on every trade.'))).toEqual(['STT', 'Brokerage']);
        expect(marked(annotateProse('Nifty and Sensex both fell.'))).toEqual(['Nifty', 'Sensex']);
        expect(marked(annotateProse('A buyback was announced after the stock split.'))).toEqual(['Buyback', 'Stock split']);
        expect(marked(annotateProse('Check the bid price against the ask price.'))).toEqual(['Bid price', 'Ask price']);
    });

    // With every term eligible, the quote rule is what keeps the everyday sense
    // safe: management commentary is never annotated.
    it('never marks everyday-English terms inside quoted commentary', () => {
        expect(marked(annotateProse('He said "we have strong support from the board".'))).toEqual([]);
        expect(marked(annotateProse('"Delivery of the goods was delayed," he said.'))).toEqual([]);
        expect(marked(annotateProse('“We cover that later”, per management.'))).toEqual([]);
    });

    it('whole-word matching still stops near-miss words', () => {
        expect(marked(annotateProse('Shortly afterwards it recovered.'))).toEqual([]);
        expect(marked(annotateProse('A longer horizon suits them.'))).toEqual([]);
        expect(marked(annotateProse('Positions were covered quickly.'))).toEqual([]);
    });

    it('still matches the unambiguous compounds of held-back words', () => {
        expect(marked(annotateProse('Buy a call option before expiry.'))).toEqual(['Call option', 'Expiry']);
        expect(marked(annotateProse('The listing gain was 20%.'))).toEqual(['Listing gain']);
    });
});
