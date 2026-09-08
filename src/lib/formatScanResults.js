import { getScannerSignal } from './scannerSignal';

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
