// Multi-scanner combos: pick up to 3 scanners, combine them ALL / ANY / EXCLUDE.
//
// The combine itself runs on the server (POST /api/v1/scanner/combo). It can't be
// done here: the single-scan endpoint returns only the top 10-15 hits, and
// intersecting two capped lists drops real overlaps and is almost always empty.
// This module holds the client-side pieces: labels, conflict hints, and the
// user's saved combinations.

export const MAX_SCANNERS = 3;
export const MIN_COMBO = 2;

export const MODES = [
    { key: 'all',     label: 'Match all',   short: 'ALL' },
    { key: 'any',     label: 'Match any',   short: 'ANY' },
    { key: 'exclude', label: 'Exclude one', short: 'NOT' },
];

// Hard contradictions: scanners that cannot fire on the same stock at once. In
// "Match all" mode such a pair can never produce a full match, so the run bar
// warns. In ANY / EXCLUDE mode the same pair is perfectly meaningful, which is
// why these are a hint and never a disabled button.
export const CONFLICTS = {
    'RSI Oversold':           ['RSI Overbought'],
    'RSI Overbought':         ['RSI Oversold'],
    'MACD Bullish Crossover': ['MACD Bearish Crossover'],
    'MACD Bearish Crossover': ['MACD Bullish Crossover'],
    'Supertrend Buy':         ['Supertrend Sell'],
    'Supertrend Sell':        ['Supertrend Buy'],
    'Golden Cross':           ['Death Cross'],
    'Death Cross':            ['Golden Cross'],
    'BB Breakout Bullish':    ['BB Squeeze'],
    'BB Squeeze':             ['BB Breakout Bullish', 'Short Term Breakouts', '52-Week High Breakout'],
    'Short Term Breakouts':   ['BB Squeeze'],
    '52-Week High Breakout':  ['BB Squeeze'],
    'Morning Star':           ['Evening Star', 'Bearish Engulfing', 'Hanging Man', 'Shooting Star'],
    'Evening Star':           ['Morning Star', 'Hammer'],
    'Bearish Engulfing':      ['Morning Star', 'Hammer'],
    'Hammer':                 ['Hanging Man', 'Shooting Star', 'Evening Star', 'Bearish Engulfing'],
    'Hanging Man':            ['Hammer', 'Morning Star'],
    'Shooting Star':          ['Hammer', 'Morning Star'],
};

/** Conflicting pairs inside a selection, each pair once: [["A","B"], ...]. */
export function conflictPairs(names) {
    const out = [];
    const list = [...(names || [])];
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            const a = list[i], b = list[j];
            if (CONFLICTS[a]?.includes(b) || CONFLICTS[b]?.includes(a)) out.push([a, b]);
        }
    }
    return out;
}

/** Same wording as the backend's combo_label, so panel, drawer and saved chip agree. */
export function comboLabel(names, mode, exclude) {
    const list = [...(names || [])];
    if (mode === 'any') return list.join(' or ');
    if (mode === 'exclude' && exclude) {
        return `${list.filter(n => n !== exclude).join(' + ')} · not ${exclude}`;
    }
    return list.join(' + ');
}

/** One-line plain-English description of what the combo will return. */
export function comboSummary(names, mode, exclude) {
    const list = [...(names || [])];
    if (mode === 'any') return `Stocks matching any of ${list.length}`;
    if (mode === 'exclude') {
        const keep = list.filter(n => n !== exclude);
        return keep.length > 1
            ? `Stocks matching ${keep.join(' and ')}, but not ${exclude}`
            : `Stocks matching ${keep[0]}, but not ${exclude}`;
    }
    return list.length === 3
        ? 'Stocks must match all 3 · falls back to 2 of 3'
        : `Stocks must match all ${list.length}`;
}

// ── Saved combinations ───────────────────────────────────────────────────────
// Per signed-in user (key suffixed with the user id, like the chat cache's
// SEC-C-002 namespacing). With no identity there is nothing to read or write,
// never a shared bucket. These are preferences, not financial data, so they are
// deliberately NOT part of the sign-out purge.

const STORE_BASE = 'venty_scanner_combos_v1';
export const MAX_SAVED = 8;

const storeKey = (userId) => (userId ? `${STORE_BASE}::${userId}` : null);

function isValidCombo(c) {
    return c && Array.isArray(c.scanners)
        && c.scanners.length >= MIN_COMBO && c.scanners.length <= MAX_SCANNERS
        && c.scanners.every(s => typeof s === 'string' && s)
        && MODES.some(m => m.key === c.mode)
        && (c.mode !== 'exclude' || c.scanners.includes(c.exclude));
}

/** Identity of a combo: same scanners (any order) + mode + exclude + universe. */
export function comboKey(c) {
    return [
        [...c.scanners].sort().join('|'),
        c.mode,
        c.mode === 'exclude' ? c.exclude : '',
        c.universe || 'nifty500',
    ].join('::');
}

export function loadSavedCombos(userId, storage = globalThis.localStorage) {
    const key = storeKey(userId);
    if (!key || !storage) return [];
    try {
        const parsed = JSON.parse(storage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed.filter(isValidCombo).slice(0, MAX_SAVED) : [];
    } catch {
        return [];
    }
}

function write(userId, list, storage) {
    const key = storeKey(userId);
    if (!key || !storage) return list;
    try { storage.setItem(key, JSON.stringify(list)); } catch { /* quota / private mode: keep in memory */ }
    return list;
}

/** Save (newest first). Re-saving an identical combo moves it to the front. */
export function saveCombo(userId, combo, storage = globalThis.localStorage) {
    const entry = {
        id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: combo.name || comboLabel(combo.scanners, combo.mode, combo.exclude),
        scanners: [...combo.scanners],
        mode: combo.mode,
        exclude: combo.mode === 'exclude' ? combo.exclude : null,
        universe: combo.universe || 'nifty500',
        savedAt: new Date().toISOString(),
    };
    if (!isValidCombo(entry)) return loadSavedCombos(userId, storage);
    const k = comboKey(entry);
    const rest = loadSavedCombos(userId, storage).filter(c => comboKey(c) !== k);
    return write(userId, [entry, ...rest].slice(0, MAX_SAVED), storage);
}

export function deleteCombo(userId, id, storage = globalThis.localStorage) {
    return write(userId, loadSavedCombos(userId, storage).filter(c => c.id !== id), storage);
}

export function isComboSaved(saved, combo) {
    if (!combo || !combo.scanners || combo.scanners.length < MIN_COMBO) return false;
    const k = comboKey(combo);
    return (saved || []).some(c => comboKey(c) === k);
}
