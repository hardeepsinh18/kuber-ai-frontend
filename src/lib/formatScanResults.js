import { getScannerSignal, getComboMetric } from './scannerSignal';

// Formats a scanner's results into the markdown message shown in chat.
// This used to append a data-provenance note ("Cached broker snapshot — may lag
// the live figure shown elsewhere"). Removed by product decision: it named
// internal sources that mean nothing to a reader and undermined the numbers it
// sat beneath. Do not reinstate it as UI copy — if two snapshots disagree, fix
// the snapshots. The backend still sends `ratios_basis`; it is simply not shown.
export function formatResults(name, scannerNames, results, universe, seconds) {
    if (results.length === 0) {
        return `**${name}** found no matching stocks in ${universe} today (scanned in ${seconds}s).`;
    }
    const rows = results.map((r, i) => {
        const sig = getScannerSignal(scannerNames, r);
        return `${i + 1}. **${r.Symbol}**${sig ? ` ${sig.label}` : ''}`;
    }).join('\n');
    const lines = [`## ${name} — ${results.length} stocks found`, `_${universe} · scanned in ${seconds}s_`, '', rows];
    return lines.join('\n');
}

// Combo (2-3 scanner) results. Each row lists every scanner it matched with that
// scanner's own value, e.g. "1. **TCS** — RSI Oversold: ₹3,500 · High ROE: ROE 45.2%".
export function formatComboResults(job) {
    const name = job?.scanner || 'Combined scan';
    const results = job?.results || [];
    const universe = job?.universe || '';
    const seconds = job?.duration_seconds ?? 0;
    if (results.length === 0) {
        return `**${name}** found no matching stocks in ${universe} today (scanned in ${seconds}s).`;
    }
    const rows = results.map((r, i) => {
        const parts = (r.matched || []).map(n => {
            const sig = getComboMetric(n, r.signals?.[n]);
            return sig ? `${n}: ${sig.label}` : n;
        });
        const partial = r.of && r.match_count < r.of ? ` _(${r.match_count}/${r.of})_` : '';
        return `${i + 1}. **${r.Symbol}**${partial}${parts.length ? ` — ${parts.join(' · ')}` : ''}`;
    }).join('\n');
    const head = job?.fallback
        ? `## ${name} — no stock matched all ${job?.scanners?.length || 3}; ${results.length} matched ${job.required} of ${job?.scanners?.length || 3}`
        : `## ${name} — ${results.length} stocks found`;
    return [head, `_${universe} · scanned in ${seconds}s_`, '', rows].join('\n');
}
