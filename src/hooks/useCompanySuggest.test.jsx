// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';

// Mock the network layer so the hook's debounce/keyboard/eligibility logic is
// tested deterministically without a backend.
vi.mock('../lib/symbolSearch', () => ({
  MIN_CHARS: 2,
  searchSymbols: vi.fn(),
}));

import { searchSymbols } from '../lib/symbolSearch';
import { useCompanySuggest } from './useCompanySuggest';
import CompanySuggest from '../components/Chat/CompanySuggest';

const VEDL = { symbol: 'VEDL', name: 'Vedanta Limited', ticker: 'VEDL.NS' };
const MANY = { symbol: 'MANYAVAR', name: 'Vedant Fashions Limited', ticker: 'MANYAVAR.NS' };

// Mirrors exactly how InputBar / StartScreen wire the hook + dropdown.
function Harness({ onPick }) {
  const [value, setValue] = useState('');
  const box = useRef(null);
  const sug = useCompanySuggest({ value, onPick, anchorRef: box });
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

describe('useCompanySuggest + CompanySuggest', () => {
  it('shows ranked results after a partial company name is typed', async () => {
    render(<Harness onPick={() => {}} />);
    type('vedan');
    expect(await screen.findByText('Vedanta Limited')).toBeTruthy();
    expect(screen.getByText('Vedant Fashions Limited')).toBeTruthy();
    expect(searchSymbols).toHaveBeenCalledWith('vedan', expect.objectContaining({ limit: 8 }));
  });

  it('picks a company on click (mousedown) and fills via onPick', async () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    type('vedan');
    const row = await screen.findByText('Vedanta Limited');
    fireEvent.mouseDown(row);
    expect(onPick).toHaveBeenCalledWith(VEDL);
  });

  it('navigates with ArrowDown and selects with Enter', async () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    type('vedan');
    await screen.findByText('Vedanta Limited');
    const box = screen.getByLabelText('q');
    fireEvent.keyDown(box, { key: 'ArrowDown' }); // highlight first row
    fireEvent.keyDown(box, { key: 'Enter' });     // select it
    expect(onPick).toHaveBeenCalledWith(VEDL);
  });

  it('closes on Escape', async () => {
    render(<Harness onPick={() => {}} />);
    type('vedan');
    await screen.findByRole('listbox');
    fireEvent.keyDown(screen.getByLabelText('q'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  it('does not search for question-length input (too many words)', async () => {
    render(<Harness onPick={() => {}} />);
    type('is reliance a good buy right now');
    await new Promise((r) => setTimeout(r, 220)); // past the debounce
    expect(searchSymbols).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not search below the minimum character threshold', async () => {
    render(<Harness onPick={() => {}} />);
    type('v');
    await new Promise((r) => setTimeout(r, 220));
    expect(searchSymbols).not.toHaveBeenCalled();
  });
});
