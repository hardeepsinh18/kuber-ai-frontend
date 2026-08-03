// Headless typeahead controller for the chat input's company autocomplete.
//
// Owns debounce, request cancellation, keyboard nav, and outside-click. Unlike a
// plain search box, it works inside natural-language queries: from
// "should i buy reli" it extracts "reli", suggests Reliance, and on select
// replaces only that portion -> "should i buy Reliance Industries Limited".
//
//   const box = useRef(null);
//   const sug = useCompanySuggest({ value: input, onSelect: setInput, anchorRef: box });
//   <div ref={box} className="relative">
//     <textarea onKeyDown={(e) => { if (sug.onKeyDown(e)) return; ...sendLogic }} ... />
//     <CompanySuggest {...sug.dropdownProps} direction="up" />
//   </div>
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchSymbols, MIN_CHARS } from '../lib/symbolSearch';

const DEBOUNCE_MS = 150;
const MAX_QUERY_WORDS = 4; // company names top out ~4 words ("state bank of india")
const MAX_CHARS = 40;

// Scaffolding words that wrap a company name in a question but are never part of
// it. Trimmed from BOTH ends of the input so the middle (the company) is what we
// search: "should i buy X share price" -> "X", "what is the price of X" -> "X".
const FILLER = new Set([
  'should', 'shall', 'could', 'would', 'can', 'will', 'do', 'does', 'did',
  'is', 'are', 'am', 'was', 'were', 'be', 'been',
  'i', 'we', 'you', 'u', 'me', 'us', 'my', 'our',
  'buy', 'buying', 'bought', 'sell', 'selling', 'sold', 'hold', 'holding',
  'invest', 'investing', 'purchase',
  'a', 'an', 'the', 'this', 'that',
  'good', 'bad', 'best', 'better', 'worth', 'safe', 'right', 'now', 'today', 'currently',
  'to', 'of', 'about', 'on', 'in', 'for', 'at', 'with', 'from',
  'tell', 'show', 'give', 'find', 'get', 'know', 'think', 'suggest', 'recommend',
  'check', 'explain', 'analyse', 'analyze',
  'what', 'whats', "what's", 'how', 'hows', 'why', 'which', 'when',
  'price', 'target', 'view', 'opinion', 'outlook', 'thoughts',
  'or', 'not', 'and', 'vs', 'versus', 'than',
  'share', 'shares', 'stock', 'stocks',
]);

const isFiller = (tok) => FILLER.has(tok.toLowerCase().replace(/[^\w']/g, ''));

// Returns { text, start, end } for the company-name span within `value`, or null
// if nothing searchable remains after trimming filler from both ends.
export function extractCompanyQuery(value) {
  const raw = value ?? '';
  const tokens = [...raw.matchAll(/\S+/g)];
  if (tokens.length === 0) return null;

  let i = 0;
  let j = tokens.length;
  while (i < j && isFiller(tokens[i][0])) i++;
  while (j > i && isFiller(tokens[j - 1][0])) j--;
  if (j - i <= 0 || j - i > MAX_QUERY_WORDS) return null;

  const start = tokens[i].index;
  const end = tokens[j - 1].index + tokens[j - 1][0].length;
  return { text: raw.slice(start, end), start, end };
}

export function useCompanySuggest({ value, onSelect, anchorRef }) {
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
      const info = extractCompanyQuery(value);
      const q = info ? info.text.trim() : '';
      const eligible = q.length >= MIN_CHARS && q.length <= MAX_CHARS;

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
    // Replace only the matched company span, preserving the rest of the query.
    const raw = value ?? '';
    const info = extractCompanyQuery(raw);
    const newValue = info
      ? raw.slice(0, info.start) + item.name + raw.slice(info.end)
      : item.name;
    suppressRef.current = true;
    setOpen(false); setResults([]); setActive(-1);
    onSelect?.(newValue, item);
  }, [onSelect, value]);

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
