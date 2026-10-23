import { describe, it, expect } from 'vitest';
import { newsSentiment, timeAgo, newsMetaParts, newsSourceList } from './newsMeta';

const NOW = Date.parse('2026-10-23T12:30:00+05:30');

describe('newsSentiment', () => {
    it('prefers the stored five-way label', () => {
        expect(newsSentiment({ sentiment_label: 'mixed', sentiment: 'neutral' })).toMatchObject({ key: 'mixed', label: 'Mixed', dot: 'bg-amber-400' });
        expect(newsSentiment({ sentiment_label: 'uncertain' }).label).toBe('Uncertain');
    });

    it("maps Venty's bullish/bearish vocabulary for live-feed items", () => {
        expect(newsSentiment({ sentiment: 'Bullish' }).key).toBe('positive');
        expect(newsSentiment({ sentiment: 'bearish' }).key).toBe('negative');
        expect(newsSentiment({}).key).toBe('neutral');
        expect(newsSentiment({ sentiment_label: 'nonsense', sentiment: 'bearish' }).key).toBe('negative');
    });
});

describe('timeAgo', () => {
    it('rounds to minutes, hours, then days', () => {
        expect(timeAgo('2026-10-23T12:29:50+05:30', NOW)).toBe('1m ago');
        expect(timeAgo('2026-10-23T12:05:00+05:30', NOW)).toBe('25m ago');
        expect(timeAgo('2026-10-23T09:35:00+05:30', NOW)).toBe('3h ago');
        expect(timeAgo('2026-10-21T10:00:00+05:30', NOW)).toBe('2d ago');
    });

    it('returns null for missing or unparseable times', () => {
        expect(timeAgo(null, NOW)).toBeNull();
        expect(timeAgo('yesterday', NOW)).toBeNull();
    });
});

describe('newsMetaParts', () => {
    it('builds label · category · age · source count for stored news', () => {
        const h = { sentiment_label: 'mixed', category: 'results', published: '2026-10-23T09:35:00+05:30', sources_count: 4 };
        expect(newsMetaParts(h, NOW)).toEqual(['Mixed', 'Results', '3h ago', '4 sources']);
    });

    it('drops parts that would say nothing', () => {
        const h = { sentiment_label: 'negative', category: 'other', published: null, sources_count: 1 };
        expect(newsMetaParts(h, NOW)).toEqual(['Negative']);
    });

    it('is empty for live-feed items, which keep their old look', () => {
        expect(newsMetaParts({ title: 'x', sentiment: 'bullish' }, NOW)).toEqual([]);
    });
});

describe('newsSourceList', () => {
    it('lists every publisher that ran the story', () => {
        expect(newsSourceList({ sources: [{ source: 'Mint' }, { source: 'Economic Times' }] })).toBe('Mint, Economic Times');
        expect(newsSourceList({})).toBe('');
    });
});
