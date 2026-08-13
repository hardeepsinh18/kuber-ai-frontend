import { CheckCircle2, AlertCircle } from 'lucide-react'

// ── AI Commentary ─────────────────────────────────────────────────────────────

export function Commentary({ commentary }) {
  if (!commentary) {
    return (
      <div className="text-center py-16 text-zinc-400 dark:text-zinc-600 text-sm">
        AI commentary not available for this portfolio
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {commentary.strengths?.length > 0 && (
        <div className="rounded-2xl border border-green-200/60 dark:border-green-500/20
          bg-green-50/60 dark:bg-green-500/10 p-5"
          style={{ animation: 'fadeIn 0.35s ease forwards' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">Strengths</span>
          </div>
          <ul className="space-y-2">
            {commentary.strengths.map((s, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                <span className="text-green-500 flex-shrink-0 mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {commentary.areas_of_attention?.length > 0 && (
        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/20
          bg-amber-50/60 dark:bg-amber-500/10 p-5"
          style={{ animation: 'fadeIn 0.35s ease forwards', animationDelay: '80ms', opacity: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Areas of Attention</span>
          </div>
          <ul className="space-y-2">
            {commentary.areas_of_attention.map((s, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {commentary.overall_assessment && (
        <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
          bg-white/60 dark:bg-zinc-900/60 p-5"
          style={{ animation: 'fadeIn 0.35s ease forwards', animationDelay: '160ms', opacity: 0 }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Overall Assessment
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {commentary.overall_assessment}
          </p>
        </div>
      )}

      {commentary.detailed_analysis && (
        <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
          bg-white/60 dark:bg-zinc-900/60 p-5"
          style={{ animation: 'fadeIn 0.35s ease forwards', animationDelay: '240ms', opacity: 0 }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Detailed Analysis
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
            {commentary.detailed_analysis}
          </p>
        </div>
      )}
    </div>
  )
}
