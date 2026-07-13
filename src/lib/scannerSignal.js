// Scanner-aware Signal column logic, shared by ScannerDrawer (chips) and
// ScannerPanel (chat markdown).
//
// Each fundamental scanner declares its own primary metric — the thing the
// user actually screened for (High ROE shows ROE, not P/E). Technical /
// momentum / pattern scanners show the stock price. Previously a blind
// column-priority cascade checked PE before ROE_%, so every fundamental
// scanner displayed "P/E ..." because PE ships as a context column.

const fmtNum = (v, dp = 2) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return String(parseFloat(n.toFixed(dp)));
};

// scanner name → { col: primary result column, label, type }
const FUNDAMENTAL_SIGNALS = {
    'Low P/E':        { col: 'PE',           make: v => `P/E ${v}`,    type: 'bull'    },
    'High ROE':       { col: 'ROE_%',        make: v => `ROE ${v}%`,   type: 'bull'    },
    'Low Debt':       { col: 'DE_Ratio',     make: v => `D/E ${v}`,    type: 'bull'    },
    'Revenue Growth': { col: 'Rev_Growth_%', make: v => `Rev +${v}%`,  type: 'bull'    },
    'EPS Growth':     { col: 'EPS_Growth_%', make: v => `EPS +${v}%`,  type: 'bull'    },
    'High Dividend':  { col: 'Div_Yield_%',  make: v => `Yield ${v}%`, type: 'bull'    },
    'Value Pick':     { col: 'PE',           make: v => `P/E ${v}`,    type: 'bull'    },
    'Growth Pick':    { col: 'EPS_Growth_%', make: v => `EPS +${v}%`,  type: 'bull'    },
    'Quality Pick':   { col: 'ROE_%',        make: v => `ROE ${v}%`,   type: 'bull'    },
};

// Safety net when the expected column is missing: most specific first,
// generic P/E LAST so it can never shadow the scanner's real metric.
const FALLBACKS = [
    ['Breakout_%',   v => `+${v}%`,      'bull'],
    ['Gap_Up_%',     v => `↑ ${v}%`,     'bull'],
    ['Gap_Down_%',   v => `↓ ${v}%`,     'bear'],
    ['ROE_%',        v => `ROE ${v}%`,   'bull'],
    ['Rev_Growth_%', v => `Rev +${v}%`,  'bull'],
    ['EPS_Growth_%', v => `EPS +${v}%`,  'bull'],
    ['Div_Yield_%',  v => `Yield ${v}%`, 'bull'],
    ['DE_Ratio',     v => `D/E ${v}`,    'bull'],
    ['RSI',          v => `RSI ${v}`,    'neutral'],
    ['Vol_Ratio',    v => `vol ×${v}`,   'neutral'],
    ['PE',           v => `P/E ${v}`,    'neutral'],
];

/**
 * @param {string|string[]} scannerNames  scanner name, "A + B" label, or array
 * @param {object} row                    one result row from the scanner API
 * @returns {{label: string, type: 'bull'|'bear'|'neutral'|'price'}|null}
 */
export function getScannerSignal(scannerNames, row) {
    if (!row) return null;
    const names = Array.isArray(scannerNames)
        ? scannerNames
        : String(scannerNames || '').split(' + ');

    // 0. Chart Patterns scanner shows the pattern name + direction (its whole point).
    //    e.g. "Double Top · bearish → ₹305 (Triggered)"
    if (names.some(n => (n?.trim?.() ?? n) === 'Chart Patterns') && row.Pattern) {
        const dir  = String(row.Direction || '').toLowerCase();
        const type = dir === 'bullish' ? 'bull' : dir === 'bearish' ? 'bear' : 'neutral';
        const tgt  = fmtNum(row.Target);
        const tier = row.Tier ? ` (${row.Tier})` : '';
        const arrow = tgt != null ? ` → ₹${tgt}` : '';
        return { label: `${row.Pattern}${dir ? ` · ${dir}` : ''}${arrow}${tier}`, type };
    }

    // 1. A selected fundamental scanner shows ITS metric
    for (const name of names) {
        const spec = FUNDAMENTAL_SIGNALS[name?.trim?.() ?? name];
        if (spec) {
            const v = fmtNum(row[spec.col]);
            if (v != null) return { label: spec.make(v), type: spec.type };
        }
    }

    // 2. Non-fundamental scanners show the price
    if (row['Chg_%'] != null) {
        const v = Number(row['Chg_%']);
        const close = fmtNum(row.Close);
        if (close != null) {
            return { label: `₹${close} (${v >= 0 ? '+' : ''}${v}%)`, type: v >= 0 ? 'bull' : 'bear' };
        }
    }
    const close = fmtNum(row.Close);
    if (close != null) return { label: `₹${close}`, type: 'price' };

    // 3. Safety net — any recognizable metric
    for (const [col, make, type] of FALLBACKS) {
        const v = fmtNum(row[col]);
        if (v != null) return { label: make(v), type };
    }
    return null;
}
