import { useState, useEffect } from 'react'
import { Clock, ChevronRight } from 'lucide-react'
import { getAuthHeader, HISTORY_ENDPOINT, SNAPSHOT_ENDPOINT } from './api'

// ── History View ──────────────────────────────────────────────────────────────

export function HistoryView({ onLoad }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthHeader()
        if (!Object.keys(headers).length) {
          setError('Sign in to view your portfolio history.')
          setLoading(false)
          return
        }
        const res = await fetch(HISTORY_ENDPOINT, { headers })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const json = await res.json()
        if (!cancelled) setRecords(json.history || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const loadSnapshot = async (id) => {
    setLoadingId(id)
    try {
      const headers = await getAuthHeader()
      const res = await fetch(SNAPSHOT_ENDPOINT(id), { headers })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      onLoad(data, data._filename)
    } catch (e) {
      alert('Failed to load: ' + e.message)
    } finally {
      setLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#FDD405] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock size={36} className="text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    )
  }

  if (!records.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock size={36} className="text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">No history yet</p>
        <p className="text-xs text-zinc-500">Upload a portfolio to start building your analysis history.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3" style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {records.length} past {records.length === 1 ? 'analysis' : 'analyses'} — click to reload
      </p>
      {records.map((r, idx) => {
        const date = new Date(r.uploaded_at)
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        const health = Math.round(r.health_score ?? 0)
        return (
          <button
            key={r.id}
            onClick={() => loadSnapshot(r.id)}
            disabled={loadingId === r.id}
            style={{ animation: `slideInStock 0.3s ease forwards`, animationDelay: `${idx * 40}ms`, opacity: 0 }}
            className="w-full text-left rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
              bg-white/60 dark:bg-zinc-900/60 px-4 py-3.5
              hover:border-[#FDD405]/60 hover:bg-[#FDD405]/5
              transition-all duration-150 disabled:opacity-60"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{r.filename}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{dateStr} · {timeStr} · {r.holdings_count} stocks</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Health</p>
                  <p className="text-base font-black leading-tight"
                    style={{ color: health >= 80 ? '#22c55e' : health >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {health}
                  </p>
                </div>
                {loadingId === r.id
                  ? <div className="w-5 h-5 border-2 border-[#FDD405] border-t-transparent rounded-full animate-spin" />
                  : <ChevronRight size={16} className="text-zinc-400" />
                }
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
