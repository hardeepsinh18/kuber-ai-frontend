// Headless typeahead controller for the chat input's company autocomplete.
//
// Owns debounce, request cancellation, keyboard nav, and outside-click. Pairs
// with the CompanySuggest dropdown component:
//
//   const box = useRef(null);
//   const sug = useCompanySuggest({ value: input, onPick: (c) => setInput(c.name), anchorRef: box });
//   <div ref={box} className="relative">
//     <textarea onKeyDown={(e) => { if (sug.onKeyDown(e)) return; ...sendLogic }} ... />
//     <CompanySuggest {...sug.dropdownProps} direction="up" />
//   </div>
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchSymbols, MIN_CHARS } from '../lib/symbolSearch';

const DEBOUNCE_MS = 150;
const MAX_WORDS = 5; // "state bank of india" = 4; questions run longer -> no dropdown
const MAX_CHARS = 40;

export function useCompanySuggest({ value, onPick, anchorRef }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const suppressRef = useRef(false); // skip one search right after a pick

  useEffect(() => {
    if (suppressRef.current) { suppressRef.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // All state changes happen inside the debounced callback (async), never
    // synchronously in the effect body — avoids cascading renders on every
    // keystroke and keeps the fetch/close paths in one place.
    debounceRef.current = setTimeout(async () => {
      const q = (value || '').trim();
      const words = q.split(/\s+/).filter(Boolean);
      const eligible = q.length >= MIN_CHARS && q.length <= MAX_CHARS && words.length <= MAX_WORDS;

      if (abortRef.current) abortRef.current.abort();
      if (!eligible) { setResults([]); setOpen(false); setActive(-1); return; }

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await searchSymbols(q, { limit: 8, signal: ctrl.signal });
        setResults(r);
        setOpen(r.length > 0);
        setActive(-1);
      } catch (e) {
        if (e.name !== 'AbortError') { setResults([]); setOpen(false); }
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);

  const pick = useCallback((item) => {
    if (!item) return;
    suppressRef.current = true;
    setOpen(false); setResults([]); setActive(-1);
    onPick?.(item);
  }, [onPick]);

  // Return true if the key was handled here (parent should stop its own handling).
  const onKeyDown = useCallback((e) => {
    if (!open || results.length === 0) return false;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); setActive((i) => (i + 1) % results.length); return true;
      case 'ArrowUp':
        e.preventDefault(); setActive((i) => (i <= 0 ? results.length - 1 : i - 1)); return true;
      case 'Enter':
        if (active >= 0) { e.preventDefault(); pick(results[active]); return true; }
        return false; // nothing highlighted -> let parent send the typed query
      case 'Tab':
        if (active >= 0) { e.preventDefault(); pick(results[active]); return true; }
        return false;
      case 'Escape':
        e.preventDefault(); close(); return true;
      default:
        return false;
    }
  }, [open, results, active, pick, close]);

  // Close on click/tap outside the anchored input area.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (anchorRef?.current && !anchorRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
    };
  }, [open, anchorRef, close]);

  return {
    onKeyDown,
    close,
    dropdownProps: { results, open, active, onHover: setActive, onPick: pick },
  };
}
