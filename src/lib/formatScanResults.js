import { getScannerSignal } from './scannerSignal';

// Formats a scanner's results into the markdown message shown in chat.
export function formatResults(name, scannerNames, results, universe, seconds) {
    if (results.length === 0) {
        return `**${name}** found no matching stocks in ${universe} today (scanned in ${seconds}s).`;
    }
    const rows = results.map((r, i) => {
        const sig = getScannerSignal(scannerNames, r);
        return `${i + 1}. **${r.Symbol}**${sig ? ` ${sig.label}` : ''}`;
    }).join('\n');
    return [`## ${name} — ${results.length} stocks found`, `_${universe} · scanned in ${seconds}s_`, '', rows].join('\n');
}
