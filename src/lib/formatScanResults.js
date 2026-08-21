import { getScannerSignal } from './scannerSignal';

// Formats a scanner's results into the markdown message shown in chat.
// ratiosBasis (VENTY-6): a fundamental scanner's provenance note, when the
// backend supplies one — see app/api/scanner.py.
export function formatResults(name, scannerNames, results, universe, seconds, ratiosBasis = null) {
    if (results.length === 0) {
        return `**${name}** found no matching stocks in ${universe} today (scanned in ${seconds}s).`;
    }
    const rows = results.map((r, i) => {
        const sig = getScannerSignal(scannerNames, r);
        return `${i + 1}. **${r.Symbol}**${sig ? ` ${sig.label}` : ''}`;
    }).join('\n');
    const lines = [`## ${name} — ${results.length} stocks found`, `_${universe} · scanned in ${seconds}s_`, '', rows];
    if (ratiosBasis) lines.push('', `_${ratiosBasis}_`);
    return lines.join('\n');
}
