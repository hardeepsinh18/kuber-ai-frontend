// ── Helpers ───────────────────────────────────────────────────────────────────
// fmtINR and scoreColor now live in answerKit.jsx (shared, single implementation —
// see the imports in the files that use them). Note: scoreColor's green/amber/red
// thresholds are 70/50 there (previously 80/60 here), so some scores that used to
// render amber will now render green.

export const CLASS_BADGE = {
  'Elite Compounder':  'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'Institutional Buy': 'bg-green-500/20  text-green-600  dark:text-green-400  border-green-500/30',
  'Buy':               'bg-blue-500/20   text-blue-600   dark:text-blue-400   border-blue-500/30',
  'Hold':              'bg-amber-500/20  text-amber-600  dark:text-amber-400  border-amber-500/30',
  'Weak':              'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  'Avoid':             'bg-red-500/20    text-red-600    dark:text-red-400    border-red-500/30',
}

export const RATING_DOT = {
  Exceptional: '#10b981', Strong: '#22c55e',
  Average: '#f59e0b', Weak: '#f97316', Poor: '#ef4444',
}

export const PIE_COLORS = ['#FDD405','#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316']
