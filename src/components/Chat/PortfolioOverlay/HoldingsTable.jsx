import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { fmtINR } from '../answerKit'
import { CLASS_BADGE, RATING_DOT } from './constants'
import { ScoreChip } from './ScoreChip'

// ── Holdings Table ────────────────────────────────────────────────────────────

export function HoldingsTable({ holdings }) {
  const [expanded, setExpanded] = useState(new Set())
  const sorted = [...holdings].sort((a, b) => b.weight - a.weight)

  const toggle = (sym) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(sym) ? next.delete(sym) : next.add(sym)
    return next
  })

  return (
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
      bg-white/60 dark:bg-zinc-900/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/40
              bg-zinc-50/80 dark:bg-zinc-900/80">
              <th className="w-5 py-3 px-3" />
              <th className="text-left py-3 px-3">Symbol</th>
              <th className="text-right py-3 px-3">Qty</th>
              <th className="text-right py-3 px-3">CMP</th>
              <th className="text-right py-3 px-3">Value</th>
              <th className="text-right py-3 px-3">Wt%</th>
              <th className="text-right py-3 px-3">P&amp;L</th>
              <th className="text-center py-3 px-3">Score</th>
              <th className="text-left py-3 px-4">Classification</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h, idx) => {
              const isOpen = expanded.has(h.symbol)
              const hasBreakdown = h.fundamental_breakdown && Object.keys(h.fundamental_breakdown).length > 0
              return (
                <React.Fragment key={h.symbol}>
                  <tr
                    className="border-b border-zinc-100 dark:border-zinc-800/40
                      hover:bg-zinc-50/80 dark:hover:bg-white/[0.03]
                      transition-colors cursor-pointer"
                    style={{ animation: `slideInStock 0.35s ease forwards`, animationDelay: `${idx * 30}ms`, opacity: 0 }}
                    onClick={() => hasBreakdown && toggle(h.symbol)}
                  >
                    <td className="py-2.5 px-3 text-zinc-400 dark:text-zinc-600">
                      {hasBreakdown && (
                        isOpen
                          ? <ChevronDown size={12} />
                          : <ChevronRight size={12} />
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[12px] text-street-yellow-ink dark:text-[#fdd405]">
                        {h.symbol}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-600">{h.sector}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-zinc-700 dark:text-zinc-300">
                      {h.quantity?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-zinc-700 dark:text-zinc-300">
                      ₹{h.cmp?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-zinc-700 dark:text-zinc-300">
                      {fmtINR(h.position_value)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-zinc-500 dark:text-zinc-400">
                      {((h.weight ?? 0) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs">
                      {h.unrealized_pnl != null ? (
                        <span className={h.unrealized_pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {h.unrealized_pnl >= 0 ? '+' : ''}{fmtINR(Math.abs(h.unrealized_pnl))}
                          {h.unrealized_pnl_pct != null && (
                            <span className="opacity-60 ml-1">
                              ({h.unrealized_pnl_pct >= 0 ? '+' : ''}{h.unrealized_pnl_pct?.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <ScoreChip score={h.fundamental_score} />
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap
                        ${CLASS_BADGE[h.fundamental_classification] ?? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}>
                        {h.fundamental_classification || '—'}
                      </span>
                    </td>
                  </tr>

                  {isOpen && hasBreakdown && (
                    <tr style={{ animation: 'fadeIn 0.2s ease forwards' }}>
                      <td colSpan={9} className="pb-3 pt-1 px-4">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3
                          flex flex-wrap gap-x-5 gap-y-2">
                          {Object.entries(h.fundamental_breakdown).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: RATING_DOT[v] ?? '#71717a' }} />
                              <span className="text-zinc-400 dark:text-zinc-500">{k}:</span>
                              <span className="text-zinc-700 dark:text-zinc-300 font-medium">{v}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-600 px-4 py-3">
        ↓ Click any row to expand ratio breakdown
      </p>
    </div>
  )
}
