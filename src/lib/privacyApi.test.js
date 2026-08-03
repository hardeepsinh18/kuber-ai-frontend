/**
 * CONF-D-003 / ISS-12 — DPDP export + erasure must actually be reachable.
 *
 * The backend shipped /privacy/export and /privacy/delete long before this audit,
 * but nothing in the product called them. LegalPage described the rights in prose,
 * so a data principal could read that they had a right of access and erasure and
 * still have no way to exercise either. These tests pin the client that closes
 * that gap: correct method, correct auth header, and errors that a user can act on.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportMyData, deleteMyData, downloadExport } from './privacyApi';

const TOKEN = 'test-id-token';

describe('exportMyData', () => {
    beforeEach(() => { global.fetch = vi.fn(); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('GETs the export endpoint with a bearer token', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({ chats: [] }) });
        await exportMyData(TOKEN);

        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toContain('/api/v1/privacy/export');
        expect(opts.method).toBe('GET');
        expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    });

    it('returns the parsed payload', async () => {
        const payload = { chats: [{ id: 1 }], messages: [] };
        global.fetch.mockResolvedValue({ ok: true, json: async () => payload });
        await expect(exportMyData(TOKEN)).resolves.toEqual(payload);
    });

    it('refuses without a token rather than calling the API', async () => {
        await expect(exportMyData(null)).rejects.toThrow(/sign in/i);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('explains a 503 in words a user can act on', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
        await expect(exportMyData(TOKEN)).rejects.toThrow(/temporarily unavailable/i);
    });

    it('surfaces the server detail when there is one', async () => {
        global.fetch.mockResolvedValue({
            ok: false, status: 400, json: async () => ({ detail: 'Bad request' }),
        });
        await expect(exportMyData(TOKEN)).rejects.toThrow('Bad request');
    });

    it('does not throw a parse error when the body is not JSON', async () => {
        global.fetch.mockResolvedValue({
            ok: false, status: 500, json: async () => { throw new Error('not json'); },
        });
        await expect(exportMyData(TOKEN)).rejects.toThrow(/500/);
    });
});

describe('deleteMyData', () => {
    beforeEach(() => { global.fetch = vi.fn(); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('POSTs the delete endpoint with a bearer token', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'erased' }) });
        await deleteMyData(TOKEN);

        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toContain('/api/v1/privacy/delete');
        expect(opts.method).toBe('POST');
        expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    });

    it('refuses without a token — erasure must never be anonymous', async () => {
        await expect(deleteMyData(null)).rejects.toThrow(/sign in/i);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('reports the erased counts back to the caller', async () => {
        global.fetch.mockResolvedValue({
            ok: true, json: async () => ({ status: 'erased', deleted: { chats: 3 } }),
        });
        await expect(deleteMyData(TOKEN)).resolves.toEqual({
            status: 'erased', deleted: { chats: 3 },
        });
    });
});

describe('downloadExport', () => {
    it('names the file with the export date by default', () => {
        const clicked = [];
        const origCreate = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = origCreate(tag);
            if (tag === 'a') el.click = () => clicked.push(el.download);
            return el;
        });
        global.URL.createObjectURL = vi.fn(() => 'blob:x');
        global.URL.revokeObjectURL = vi.fn();

        const name = downloadExport({ a: 1 });
        expect(name).toMatch(/^venty-my-data-\d{4}-\d{2}-\d{2}\.json$/);
        expect(clicked[0]).toBe(name);
        vi.restoreAllMocks();
    });

    it('always releases the object URL', () => {
        global.URL.createObjectURL = vi.fn(() => 'blob:y');
        global.URL.revokeObjectURL = vi.fn();
        downloadExport({ a: 1 }, 'custom.json');
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:y');
    });
});
