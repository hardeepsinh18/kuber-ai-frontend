import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchSymbols } from './symbolSearch';

const ok = (results) => ({
  ok: true,
  json: async () => ({ results }),
});

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchSymbols', () => {
  it('appends a rolling cache-bust token to the request URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([{ symbol: 'TCS', name: 'Tata Consultancy Services Limited', ticker: 'TCS.NS', query: 'Tata Consultancy Services Limited' }]));
    vi.stubGlobal('fetch', fetchMock);

    await searchSymbols('tcsx1', { limit: 8 }); // unique key to avoid module cache from other tests
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/api/v1/symbols/search?q=tcsx1');
    expect(url).toMatch(/[?&]cb=\d+/); // cache-bust bucket present
  });

  it('dedupes repeat queries within the session (one fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([{ symbol: 'INFY', name: 'Infosys Limited', ticker: 'INFY.NS', query: 'Infosys Limited' }]));
    vi.stubGlobal('fetch', fetchMock);

    const a = await searchSymbols('infyq2', { limit: 8 });
    const b = await searchSymbols('infyq2', { limit: 8 });
    expect(fetchMock).toHaveBeenCalledTimes(1); // second served from module cache
    expect(b).toEqual(a);
  });

  it('does not fetch below the minimum character threshold', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchSymbols('a', { limit: 8 });
    expect(r).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
