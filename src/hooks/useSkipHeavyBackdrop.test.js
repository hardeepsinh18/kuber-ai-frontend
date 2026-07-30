import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useSkipHeavyBackdrop from './useSkipHeavyBackdrop';

/**
 * QA-C-005 — the background video is 6.8 MB (dark) / 5.7 MB (light) of purely
 * decorative asset. These tests pin the two cases where it must not be downloaded at
 * all, and — just as importantly — the cases where it still must be, so a future
 * "optimisation" cannot quietly remove the backdrop for every desktop user.
 */

const origWidth = window.innerWidth;

function setWidth(px) {
    Object.defineProperty(window, 'innerWidth', {
        value: px, writable: true, configurable: true,
    });
}

function setConnection(value) {
    Object.defineProperty(navigator, 'connection', {
        value, writable: true, configurable: true,
    });
}

afterEach(() => {
    setWidth(origWidth);
    // remove the stub entirely so a test that expects "no connection API" is honest
    delete navigator.connection;
    vi.restoreAllMocks();
});

describe('useSkipHeavyBackdrop', () => {
    it('skips the download on a narrow (phone) viewport', () => {
        setWidth(375);
        const { result } = renderHook(() => useSkipHeavyBackdrop());
        expect(result.current).toBe(true);
    });

    it('keeps the backdrop on a desktop viewport', () => {
        setWidth(1440);
        const { result } = renderHook(() => useSkipHeavyBackdrop());
        expect(result.current).toBe(false);
    });

    it('skips when the user asked the browser to save data', () => {
        setWidth(1440);           // wide enough that only saveData can trigger it
        setConnection({ saveData: true });
        const { result } = renderHook(() => useSkipHeavyBackdrop());
        expect(result.current).toBe(true);
    });

    it('does not skip when saveData is explicitly false', () => {
        setWidth(1440);
        setConnection({ saveData: false });
        const { result } = renderHook(() => useSkipHeavyBackdrop());
        expect(result.current).toBe(false);
    });

    it('does not skip when the connection API is absent (Safari, Firefox)', () => {
        setWidth(1440);
        const { result } = renderHook(() => useSkipHeavyBackdrop());
        expect(result.current).toBe(false);
    });

    it('honours a custom breakpoint', () => {
        setWidth(800);
        const wide = renderHook(() => useSkipHeavyBackdrop(768));
        expect(wide.result.current).toBe(false);
        const narrow = renderHook(() => useSkipHeavyBackdrop(1024));
        expect(narrow.result.current).toBe(true);
    });

    it('treats the breakpoint as exclusive at the boundary', () => {
        setWidth(768);
        const { result } = renderHook(() => useSkipHeavyBackdrop(768));
        expect(result.current).toBe(false);
    });

    it('does not skip when the width cannot be measured', () => {
        // A 0 read is a measurement failure, not a narrow screen. Skipping there would
        // silently drop the backdrop for everyone if a browser quirk returned 0.
        setWidth(0);
        Object.defineProperty(document.documentElement, 'clientWidth', {
            value: 0, writable: true, configurable: true,
        });
        const { result } = renderHook(() => useSkipHeavyBackdrop());
        expect(result.current).toBe(false);
    });

    it('survives a throwing navigator without taking the app down', () => {
        setWidth(1440);
        Object.defineProperty(navigator, 'connection', {
            get() { throw new Error('boom'); }, configurable: true,
        });
        expect(() => renderHook(() => useSkipHeavyBackdrop())).not.toThrow();
    });
});
