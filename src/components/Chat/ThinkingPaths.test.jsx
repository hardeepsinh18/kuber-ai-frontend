// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import ThinkingPaths, { PHASE_PHRASES, AMBIENT_PHRASES } from './ThinkingPaths';
import { ThemeProvider } from '../../context/ThemeContext';

afterEach(cleanup);

const renderPanel = (props) =>
    render(<ThemeProvider><ThinkingPaths {...props} /></ThemeProvider>);

// Steps arrive verbatim from the backend's `trace.steps` — recorded by the
// services that did the work. The component's job is to display them and to
// display NOTHING when there are none.
const realSteps = [
    'Read this as a stock screen',
    'Screened 47 stocks for PSU, dividend yield ≥ 3% — 10 matched',
    'Wrote the analysis from the verified data above',
];

describe('ThinkingPaths', () => {
    it('renders nothing when the backend reported no steps', () => {
        const { container } = renderPanel({ steps: [], isThinking: false, processingTime: 1.7 });
        expect(container.innerHTML).toBe('');
    });

    it('shows the backend steps once expanded', async () => {
        renderPanel({ steps: realSteps, isThinking: false, processingTime: 1.7 });

        await act(async () => { screen.getByRole('button').click(); });
        // Steps reveal on an 80ms-per-item stagger.
        await act(async () => { await new Promise(r => setTimeout(r, 400)); });

        for (const step of realSteps) {
            expect(screen.getByText(step)).toBeTruthy();
        }
    });

    it('reports the processing time it was given', () => {
        renderPanel({ steps: realSteps, isThinking: false, processingTime: 1.74 });
        expect(screen.getByText('1.7s')).toBeTruthy();
    });

    it('shows live steps while the request is in flight', () => {
        renderPanel({
            isThinking: true,
            liveSteps: [
                { id: 1, phase: 'done', text: 'Read this as an investment-decision question', ok: true },
                { id: 2, phase: 'start', text: 'Loading financials' },
            ],
        });

        expect(screen.getByText('Read this as an investment-decision question')).toBeTruthy();
        expect(screen.getByText('Loading financials')).toBeTruthy();
    });

    it('resolves a running step in place rather than duplicating it', () => {
        const { rerender } = renderPanel({
            isThinking: true,
            liveSteps: [{ id: 2, phase: 'start', text: 'Loading financials' }],
        });

        rerender(
            <ThemeProvider>
                <ThinkingPaths
                    isThinking
                    liveSteps={[{
                        id: 2, phase: 'done', ok: true,
                        text: 'Loaded 6 valuation metrics for RELIANCE',
                    }]}
                />
            </ThemeProvider>
        );

        expect(screen.queryByText('Loading financials')).toBeNull();
        expect(screen.getByText('Loaded 6 valuation metrics for RELIANCE')).toBeTruthy();
    });

    it('keeps only the newest few live steps on screen', () => {
        renderPanel({
            isThinking: true,
            liveSteps: [
                { id: 1, phase: 'done', text: 'oldest step', ok: true },
                { id: 2, phase: 'done', text: 'second step', ok: true },
                { id: 3, phase: 'done', text: 'third step', ok: true },
                { id: 4, phase: 'start', text: 'newest step' },
            ],
        });

        expect(screen.queryByText('oldest step')).toBeNull();
        expect(screen.getByText('newest step')).toBeTruthy();
    });

    it('names the phase that is actually running', () => {
        renderPanel({
            isThinking: true,
            liveSteps: [{ id: 1, phase: 'start', kind: 'documents', text: 'Searching company filings' }],
        });

        // Phrases naming a source may only show while that work is genuinely open.
        // Which of the phase's variants is picked rotates, so accept any of them.
        expect(PHASE_PHRASES.documents.some(p => screen.queryByText(p))).toBe(true);
    });

    it('falls back to a posture, never a source, before any step lands', () => {
        renderPanel({ isThinking: true });

        expect(AMBIENT_PHRASES.some(p => screen.queryByText(p))).toBe(true);
        const everySourceClaim = Object.values(PHASE_PHRASES).flat();
        for (const claim of everySourceClaim) {
            expect(screen.queryByText(claim)).toBeNull();
        }
    });

    it('keeps source claims out of the ambient set', () => {
        // The guard that matters as both lists grow: an ambient phrase can appear
        // at any moment, including before a single byte has been fetched, so none
        // of them may double as a claim about a source.
        const everySourceClaim = new Set(Object.values(PHASE_PHRASES).flat());
        for (const ambient of AMBIENT_PHRASES) {
            expect(everySourceClaim.has(ambient)).toBe(false);
        }
    });

    it('gives every phase more than one phrase so long steps keep moving', () => {
        for (const [kind, pool] of Object.entries(PHASE_PHRASES)) {
            expect(pool.length, `${kind} needs variants`).toBeGreaterThan(1);
            expect(new Set(pool).size, `${kind} has duplicates`).toBe(pool.length);
        }
    });

    it('invents no steps while the request is in flight', () => {
        // The old build cycled eight hardcoded lines here ("Retrieving analyst
        // views…"), then replaced them with a different invented list on arrival.
        renderPanel({ steps: [], isThinking: true });

        for (const invented of [
            /Extracting stock symbols/i,
            /Running technical analysis/i,
            /Retrieving analyst views/i,
            /Compiling insights/i,
            /Gathering expert market insights/i,
        ]) {
            expect(screen.queryByText(invented)).toBeNull();
        }
    });
});
