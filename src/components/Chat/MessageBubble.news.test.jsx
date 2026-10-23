// @vitest-environment jsdom
/**
 * Recent News rendering for stored news (backend news worker): Positive/Negative/
 * Mixed/Uncertain dots, a "label · category · age · sources" line, stock matching
 * by symbol_tag — while live-feed items keep their old look.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';
import { ThemeProvider } from '../../context/ThemeContext';

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T12:35:00+05:30'));
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const renderBubble = (props) =>
    render(<ThemeProvider><MessageBubble {...props} /></ThemeProvider>);

// Shapes the backend now sends (app/services/sentiment_service.headlines_for_response).
const STORED_Q2 = {
    title: 'Swiggy Q2 Results: Loss narrows YoY to Rs 922 crore; revenue jumps 36%',
    url: 'https://economictimes.indiatimes.com/swiggy-q2',
    source: 'Economic Times',
    sentiment: 'neutral',
    sentiment_label: 'mixed',
    category: 'results',
    published: '2026-10-22T15:57:00+05:30',
    sources_count: 4,
    sources: [{ source: 'Economic Times' }, { source: 'NDTV Profit' }, { source: 'Business Standard' }, { source: 'Mint' }],
    symbol_tag: 'SWIGGY',
};
const STORED_TANKS = {
    title: 'Share Price Tanks Over 9% After Q2 Results. Should You Buy, Sell Or Hold?', // no company name in title
    url: 'https://www.livemint.com/swiggy-tanks',
    source: 'Mint',
    sentiment: 'bearish',
    sentiment_label: 'negative',
    category: 'results',
    published: '2026-10-23T09:35:00+05:30',
    sources_count: 1,
    symbol_tag: 'SWIGGY',
};
const LIVE_FEED = { title: 'Swiggy shares slide ahead of Q2 results', url: 'https://x/1', source: 'Mint', sentiment: 'bullish' };

const classicProps = (newsHeadlines) => ({
    role: 'assistant',
    content: 'Here is the latest on Swiggy.',
    metadata: { symbols: ['SWIGGY.NS'], at_a_glance: { company_name: 'Swiggy Limited' } },
    newsHeadlines,
    queryIntent: 'news',
    isStreaming: false,
});

describe('Recent News — stored news', () => {
    it('shows the five-way label, category, age and source count', () => {
        renderBubble(classicProps([STORED_TANKS, STORED_Q2]));

        expect(screen.getByText('Negative · Results · 3h ago')).toBeTruthy();
        const q2Meta = screen.getByText('Mixed · Results · 21h ago · 4 sources');
        expect(q2Meta.getAttribute('title')).toBe('Economic Times, NDTV Profit, Business Standard, Mint');
        expect(screen.getByLabelText('Mixed news').className).toContain('bg-amber-400');
        expect(screen.getByLabelText('Negative news').className).toContain('bg-rose-400');
    });

    it('keeps a story the backend mapped to the stock even when the title never names it', () => {
        renderBubble(classicProps([STORED_TANKS]));
        expect(screen.getByText(/Share Price Tanks Over 9%/)).toBeTruthy();
    });

    it('renders live-feed items exactly as before: no meta line', () => {
        const { container } = renderBubble(classicProps([LIVE_FEED]));
        expect(screen.getByText('Swiggy shares slide ahead of Q2 results')).toBeTruthy();
        expect(screen.getByLabelText('Positive news')).toBeTruthy();
        expect(container.textContent).not.toMatch(/ago|sources/);
    });
});

describe('Recent News — Quick mode', () => {
    it('shows "3h ago · 4 sources" instead of the raw published timestamp', () => {
        const { container } = renderBubble({
            ...classicProps([{ ...STORED_Q2, published: '2026-10-23T09:35:00+05:30' }]),
            metadata: { symbols: ['SWIGGY.NS'], at_a_glance: { company_name: 'Swiggy Limited', price: 412.5, symbol: 'SWIGGY' } },
            responseMode: 'snap',
        });
        // "3h ago" always; " · 4 sources" in a span hidden below the sm breakpoint.
        const sourcesNote = screen.getByText('· 4 sources'); // matcher trims the leading space
        expect(sourcesNote.className).toContain('hidden sm:inline');
        expect(sourcesNote.parentElement.textContent).toBe('3h ago · 4 sources');
        expect(container.textContent).not.toContain('2026-10-23T09:35');
        expect(screen.getByLabelText('Mixed news')).toBeTruthy();
    });
});
