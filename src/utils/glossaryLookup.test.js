import { describe, it, expect } from 'vitest';
import { lookupTerm, hasTerm, GLOSSARY } from './glossaryLookup';

describe('glossary data', () => {
    it('carries all 156 sheet rows', () => {
        expect(GLOSSARY).toHaveLength(156);
    });

    it('every entry has a definition and a real-life example', () => {
        const thin = GLOSSARY.filter(e => !e.term || !e.definition || !e.example);
        expect(thin).toEqual([]);
    });

    it('has no duplicate terms', () => {
        const seen = GLOSSARY.map(e => e.term.toLowerCase());
        expect(new Set(seen).size).toBe(seen.length);
    });

    it('keeps the sheet copy verbatim (spot-check the analogies)', () => {
        expect(lookupTerm('RSI').example).toContain('crowded local train');
        expect(lookupTerm('ROCE').example).toContain('tiffin services');
        expect(lookupTerm('Oversold').definition).toContain('does not mean the share is cheap');
    });
});

describe('lookupTerm', () => {
    it('matches an exact term regardless of case or padding', () => {
        expect(lookupTerm('ROE').term).toBe('ROE');
        expect(lookupTerm('roe').term).toBe('ROE');
        expect(lookupTerm('  RoCe  ').term).toBe('ROCE');
    });

    it('resolves period-suffixed indicator labels to the concept', () => {
        expect(lookupTerm('RSI 14').term).toBe('RSI');
        expect(lookupTerm('EMA 20').term).toBe('EMA');
        expect(lookupTerm('EMA 200').term).toBe('EMA');
        expect(lookupTerm('ADX 14').term).toBe('ADX');
    });

    it('resolves the ratio labels the cards actually print', () => {
        expect(lookupTerm('P/E').term).toBe('P/E ratio');
        expect(lookupTerm('D/E').term).toBe('D/E ratio');
        expect(lookupTerm('Revenue growth').term).toBe('Revenue');
        expect(lookupTerm('52W High').term).toBe('52 week high and low');
    });

    it('tolerates a trailing colon on a label', () => {
        expect(lookupTerm('ROE:').term).toBe('ROE');
    });

    // The safety property: an unknown label must return null so the caller
    // renders exactly what it renders today. A fuzzy match here would put a
    // wrong definition under a real number.
    it('returns null for anything it does not explicitly know', () => {
        expect(lookupTerm('Sharpe ratio')).toBeNull();
        expect(lookupTerm('Gibberish')).toBeNull();
        expect(lookupTerm('')).toBeNull();
        expect(lookupTerm(null)).toBeNull();
        expect(lookupTerm(undefined)).toBeNull();
        expect(lookupTerm(42)).toBeNull();
    });

    it('does not substring-match a longer label onto a short term', () => {
        // "Beta" is a term; "Beta version" must not resolve to it.
        expect(lookupTerm('Beta version')).toBeNull();
        // "Volume" is a term; an unrelated compound must not borrow it.
        expect(lookupTerm('Volume weighted nonsense')).toBeNull();
    });

    it('every alias points at a term that exists', () => {
        // Guards against a typo in ALIASES silently yielding null forever.
        const aliasProbes = [
            'rsi 14', 'ema stack', 'atr 14', 'sma regime', 'p/e', 'd/e',
            'operating margin', 'net margin', 'return on equity', 'free cash flow',
            'earnings per share', 'revenue growth', 'promoter holdings',
            '52 week high', 'market cap', 'last traded price', 'vol',
            'candlesticks', 'price structure', 'weekly trend', 'bollinger band',
            'dividend yld', 'debt to equity', 'profit after tax',
        ];
        const broken = aliasProbes.filter(a => lookupTerm(a) === null);
        expect(broken).toEqual([]);
    });
});

describe('hasTerm', () => {
    it('mirrors lookupTerm', () => {
        expect(hasTerm('ROE')).toBe(true);
        expect(hasTerm('Sharpe ratio')).toBe(false);
    });
});
