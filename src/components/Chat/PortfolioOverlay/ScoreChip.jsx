// ── Score Chip ────────────────────────────────────────────────────────────────

export function ScoreChip({ score }) {
  const s = Math.round(score)
  const cls = s >= 80
    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
    : s >= 60
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{s}</span>
  )
}
