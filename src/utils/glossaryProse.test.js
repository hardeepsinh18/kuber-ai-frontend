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

    // Rule 5 — ambiguous everyday words stay out
    it('does not fire on ambiguous everyday words', () => {
        expect(marked(annotateProse('There is strong support from the board.'))).toEqual([]);
        expect(marked(annotateProse('A correction to the report was issued.'))).toEqual([]);
        expect(marked(annotateProse('Trading volume of conversation was high.'))).toEqual([]);
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
