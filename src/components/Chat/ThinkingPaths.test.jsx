// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import ThinkingPaths from './ThinkingPaths';
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

    it('invents no steps while the request is in flight', () => {
        // The old build cycled eight hardcoded lines here ("Retrieving analyst
        // views…"), then replaced them with a different invented list on arrival.
        renderPanel({ steps: [], isThinking: true });

        expect(screen.getByText('Analyzing')).toBeTruthy();
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
