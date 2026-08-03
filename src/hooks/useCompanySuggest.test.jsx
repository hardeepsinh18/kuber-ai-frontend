// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';

// Mock the network layer so the hook's debounce/keyboard/extraction logic is
// tested deterministically without a backend.
vi.mock('../lib/symbolSearch', () => ({
  MIN_CHARS: 2,
  searchSymbols: vi.fn(),
}));

import { searchSymbols } from '../lib/symbolSearch';
import { useCompanySuggest, extractCompanyQuery } from './useCompanySuggest';
import CompanySuggest from '../components/Chat/CompanySuggest';

const VEDL = { symbol: 'VEDL', name: 'Vedanta Limited', ticker: 'VEDL.NS' };
const MANY = { symbol: 'MANYAVAR', name: 'Vedant Fashions Limited', ticker: 'MANYAVAR.NS' };

// Mirrors exactly how InputBar / StartScreen wire the hook + dropdown.
function Harness({ onSelect }) {
  const [value, setValue] = useState('');
  const box = useRef(null);
  const sug = useCompanySuggest({ value, onSelect, anchorRef: box });
  return (
    <div ref={box}>
      <textarea
        aria-label="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (sug.onKeyDown(e)) return; }}
      />
      <CompanySuggest {...sug.dropdownProps} />
    </div>
  );
}

beforeEach(() => {
  searchSymbols.mockReset();
  searchSymbols.mockResolvedValue([VEDL, MANY]);
});
afterEach(cleanup);

const type = (v) => fireEvent.change(screen.getByLabelText('q'), { target: { value: v } });

describe('extractCompanyQuery', () => {
  const t = (v) => extractCompanyQuery(v)?.text ?? null;

  it('returns a bare company name unchanged', () => {
    expect(t('relia')).toBe('relia');
    expect(t('tata motors')).toBe('tata motors');
  });

  it('strips leading question scaffolding', () => {
    expect(t('should i buy reli')).toBe('reli');
    expect(t('what is the price of reliance')).toBe('reliance');
    expect(t('tell me about tata motors')).toBe('tata motors');
  });

  it('strips trailing scaffolding', () => {
    expect(t('reliance share price')).toBe('reliance');
    expect(t('is reliance a good buy')).toBe('reliance');
  });

  it('returns null for all-filler or empty input', () => {
    expect(extractCompanyQuery('should i buy')).toBeNull();
    expect(extractCompanyQuery('   ')).toBeNull();
  });

  it('returns null when the remaining span is longer than a company name', () => {
    // 5 non-filler words in the middle -> not a single company lookup
    expect(extractCompanyQuery('compare hdfc bank icici bank kotak bank axis bank')).toBeNull();
  });
});

describe('useCompanySuggest + CompanySuggest', () => {
  it('shows ranked results after a partial company name is typed', async () => {
    render(<Harness onSelect={() => {}} />);
    type('vedan');
    expect(await screen.findByText('Vedanta Limited')).toBeTruthy();
    expect(screen.getByText('Vedant Fashions Limited')).toBeTruthy();
    expect(searchSymbols).toHaveBeenCalledWith('vedan', expect.objectContaining({ limit: 8 }));
  });

  it('searches the company inside a natural-language query', async () => {
    render(<Harness onSelect={() => {}} />);
    type('should i buy reli');
    await screen.findByRole('listbox');
    expect(searchSymbols).toHaveBeenCalledWith('reli', expect.objectContaining({ limit: 8 }));
  });

  it('on select, replaces only the company span and keeps the rest of the query', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    type('should i buy reli');
    const row = await screen.findByText('Vedanta Limited');
    fireEvent.mouseDown(row);
    expect(onSelect).toHaveBeenCalledWith('should i buy Vedanta Limited', VEDL);
  });

  it('on select of a bare query, replaces the whole input', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    type('vedan');
    const row = await screen.findByText('Vedanta Limited');
    fireEvent.mouseDown(row);
    expect(onSelect).toHaveBeenCalledWith('Vedanta Limited', VEDL);
  });

  it('navigates with ArrowDown and selects with Enter', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    type('vedan');
    await screen.findByText('Vedanta Limited');
    const box = screen.getByLabelText('q');
    fireEvent.keyDown(box, { key: 'ArrowDown' }); // highlight first row
    fireEvent.keyDown(box, { key: 'Enter' });     // select it
    expect(onSelect).toHaveBeenCalledWith('Vedanta Limited', VEDL);
  });

  it('closes on Escape', async () => {
    render(<Harness onSelect={() => {}} />);
    type('vedan');
    await screen.findByRole('listbox');
    fireEvent.keyDown(screen.getByLabelText('q'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  it('does not search below the minimum character threshold', async () => {
    render(<Harness onSelect={() => {}} />);
    type('v');
    await new Promise((r) => setTimeout(r, 220));
    expect(searchSymbols).not.toHaveBeenCalled();
  });
});
