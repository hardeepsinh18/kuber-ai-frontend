import { useState } from 'react'
import { DETAIL_URL } from './api'
import { ScoreChip } from './ScoreChip'
import { StockDetailPanel } from './StockDetailPanel'

// ── Deep Dive Tab ─────────────────────────────────────────────────────────────

export function DeepDiveTab({ holdings }) {
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const sorted = [...holdings].sort((a, b) => b.weight - a.weight)

  const pick = async (sym) => {
    if (sym === selected) return
    setSelected(sym)
    setDetail(null)
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(DETAIL_URL(sym))
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setDetail(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stock grid selector */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {sorted.map(h => (
          <button key={h.symbol} onClick={() => pick(h.symbol)}
            className={`rounded-xl p-2.5 text-left border transition-all duration-150
              ${selected === h.symbol
                ? 'border-[#FDD405] bg-[#FDD405]/10 shadow-sm'
                : 'border-zinc-200/70 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}>
            <p className="text-[11px] font-bold text-street-yellow-ink dark:text-[#fdd405] truncate">{h.symbol}</p>
            <p className="text-[9px] text-zinc-400 truncate mt-0.5">{h.sector}</p>
            <ScoreChip score={h.fundamental_score} />
          </button>
        ))}
      </div>

      {/* Detail area */}
      {!selected && (
        <div className="text-center py-14 text-zinc-400 dark:text-zinc-600 text-sm">
          Select a stock above to view live technical &amp; fundamental analysis
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-14 gap-3">
          <div className="w-8 h-8 border-2 border-[#FDD405] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Fetching live data for {selected}…</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      )}

      {detail && !loading && <StockDetailPanel detail={detail} />}
    </div>
  )
}
