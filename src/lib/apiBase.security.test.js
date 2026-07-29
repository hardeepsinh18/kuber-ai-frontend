/**
 * Regression test for QA-C-001 (audit run 2026-07-26).
 *
 * VITE_API_BASE is UNSET in the UAT deploy workflow, so getApiBase() returns ''.
 * The admin data layer builds `new URL(`${base}/api/v1/...`)`, and `new URL()` with
 * no origin throws TypeError — which took the entire admin dashboard down.
 *
 * These tests deliberately run with the variable unset, because a test with it set
 * would pass and miss the defect completely.
 */
import { describe, it, expect } from 'vitest';
import { getApiBase, getApiOrigin } from './apiBase';

describe('QA-C-001 admin URL construction with VITE_API_BASE unset', () => {
    it('getApiBase() stays "" so ordinary relative fetches remain same-origin', () => {
        expect(getApiBase()).toBe('');
    });

    it('demonstrates the defect: new URL() over the bare base throws', () => {
        expect(() => new URL(`${getApiBase()}/api/v1/admin/stats`)).toThrow(TypeError);
    });

    it('getApiOrigin() yields an absolute origin that new URL() accepts', () => {
        expect(getApiOrigin()).toBe(window.location.origin);
        expect(() => new URL(`${getApiOrigin()}/api/v1/admin/stats`)).not.toThrow();
    });

    it('the constructed admin URL keeps the same path and accepts query params', () => {
        const url = new URL(`${getApiOrigin()}/api/v1/admin/stats`);
        url.searchParams.set('page', '2');
        expect(url.pathname).toBe('/api/v1/admin/stats');
        expect(url.searchParams.get('page')).toBe('2');
    });
});
