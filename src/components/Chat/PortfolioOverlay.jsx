import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, FileSpreadsheet, BarChart2, AlertCircle,
  CheckCircle2, RefreshCw, ChevronDown, ChevronRight, Clock,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'

// In production Vercel proxies /portfolio-api/* → EC2:8001/api/*
// Set VITE_PORTFOLIO_API_BASE=http://localhost:8001 for local dev
const _raw = import.meta.env.VITE_PORTFOLIO_API_BASE
const PORTFOLIO_BASE = (_raw && _raw.startsWith('http')) ? _raw.replace(/\/$/, '') : ''
const UPLOAD_ENDPOINT = PORTFOLIO_BASE
  ? `${PORTFOLIO_BASE}/api/v1/portfolio/upload-and-analyze`
  : '/portfolio-api/v1/portfolio/upload-and-analyze'

// History endpoints live on the main backend — Vercel proxies /api/* there
const HISTORY_ENDPOINT  = '/api/v1/portfolio/history'
const SNAPSHOT_ENDPOINT = (id) => `/api/v1/portfolio/history/${id}`

async function getAuthHeader() {
  try {
    if (!supabase) return {}
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { 'X-Supabase-Auth': `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#f59e0b'
  return '#ef4444'
}

const CLASS_BADGE = {
  'Elite Compounder':  'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'Institutional Buy': 'bg-green-500/20  text-green-600  dark:text-green-400  border-green-500/30',
  'Buy':               'bg-blue-500/20   text-blue-600   dark:text-blue-400   border-blue-500/30',
  'Hold':              'bg-amber-500/20  text-amber-600  dark:text-amber-400  border-amber-500/30',
  'Weak':              'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  'Avoid':             'bg-red-500/20    text-red-600    dark:text-red-400    border-red-500/30',
}

const RATING_DOT = {
  Exceptional: '#10b981', Strong: '#22c55e',
  Average: '#f59e0b', Weak: '#f97316', Poor: '#ef4444',
}

const PIE_COLORS = ['#FDD405','#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316']

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 130, strokeWidth = 10 }) {
  const [animScore, setAnimScore] = useState(0)
  useEffect(() => {
    // Double RAF: first ensures 0 is painted, second triggers the CSS transition
    let raf1, raf2
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimScore(score))
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [score])

  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (animScore / 100) * circ
  const color = scoreColor(score)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="currentColor" strokeWidth={strokeWidth}
        className="text-zinc-200 dark:text-white/8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </svg>
  )
}

// ── Score Chip ────────────────────────────────────────────────────────────────

function ScoreChip({ score }) {
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

// ── History View ──────────────────────────────────────────────────────────────

function HistoryView({ onLoad }) {
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

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }) {
  const fileRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.(xlsx|xls|json)$/i)) {
      alert('Only .xlsx, .xls, or .json files are accepted.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum allowed size is 10MB.')
      return
    }
    onFile(f)
  }

  return (
    <div className="flex flex-col items-center justify-center py-10"
      style={{ animation: 'fadeIn 0.4s ease forwards' }}>

      {/* Drag zone */}
      <div
        className={`w-full max-w-md cursor-pointer rounded-2xl border-2 border-dashed
          p-10 text-center transition-all duration-200 select-none
          ${dragging
            ? 'border-[#FDD405] bg-[#FDD405]/5 scale-[1.02]'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]'
          }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.json" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />

        <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center
          transition-colors duration-200
          ${dragging ? 'bg-[#FDD405]/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          <FileSpreadsheet size={30} className={dragging ? 'text-[#FDD405]' : 'text-zinc-500 dark:text-zinc-400'} />
        </div>

        <p className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
          {dragging ? 'Drop to analyse' : 'Upload your portfolio'}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6">
          Drag & drop an Excel or JSON file, or click to browse
        </p>

        <div className="inline-flex flex-col gap-1.5 text-xs text-left mb-7">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FDD405]" />
            <span className="text-zinc-500">Required: <span className="text-zinc-700 dark:text-zinc-300 font-medium">Symbol, Quantity</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="text-zinc-500">Optional: <span className="text-zinc-600 dark:text-zinc-400">Avg Price, CMP</span></span>
          </div>
        </div>

        <button className="px-7 py-2.5 bg-[#FDD405] text-zinc-900 font-bold rounded-xl text-sm
          hover:bg-[#e8c304] active:scale-95 transition-all shadow-sm shadow-[#FDD405]/20">
          Choose File
        </button>
      </div>

      <p className="mt-5 text-xs text-zinc-400 dark:text-zinc-600">
        Supports Zerodha, Groww, Angel One, Smallcase exports
      </p>
    </div>
  )
}

// ── Loading State ─────────────────────────────────────────────────────────────

function LoadingState({ fileName }) {
  const steps = [
    'Parsing holdings from Excel...',
    'Resolving NSE symbols...',
    'Enriching from KuberAI database...',
    'Computing fundamental scores...',
    'Generating AI commentary...',
  ]
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20"
      style={{ animation: 'fadeIn 0.3s ease forwards' }}>

      {/* Spinning ring */}
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-4
          border-zinc-200 dark:border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent
          border-t-[#FDD405] animate-spin" />
        <div className="absolute inset-[10px] rounded-full border-2 border-transparent
          border-t-[#FDD405]/40 animate-spin"
          style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      </div>

      <p className="text-base font-bold text-zinc-900 dark:text-white mb-1">
        Analysing your portfolio
      </p>
      {fileName && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">{fileName}</p>
      )}
      <p className="text-sm text-zinc-500 dark:text-zinc-500 transition-all duration-500 mb-8">
        {steps[step]}
      </p>

      {/* Progress bar */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div key={i}
            className={`h-1 rounded-full transition-all duration-500
              ${i <= step ? 'bg-[#FDD405]' : 'bg-zinc-200 dark:bg-zinc-700'}`}
            style={{ width: i <= step ? 28 : 8 }} />
        ))}
      </div>
    </div>
  )
}

// ── Pie Chart Section ─────────────────────────────────────────────────────────

function PieSection({ title, data }) {
  const chartData = Object.entries(data || {})
    .map(([name, value]) => ({ name, value: Math.round(value * 100) }))
    .filter(d => d.value > 0)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
        rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-zinc-900 dark:text-white">{payload[0].name}</p>
        <p className="text-zinc-500">{payload[0].value}%</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
      bg-white/60 dark:bg-zinc-900/60 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider
        text-zinc-500 dark:text-zinc-400 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name"
            cx="50%" cy="50%" outerRadius={70} paddingAngle={2} strokeWidth={0}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {d.name} <span className="text-zinc-400 dark:text-zinc-500">{d.value}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Holdings Table ────────────────────────────────────────────────────────────

function HoldingsTable({ holdings }) {
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
                      <div className="font-semibold text-[12px] text-indigo-600 dark:text-indigo-300">
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

// ── Forecast Table ────────────────────────────────────────────────────────────

function ForecastTable({ forecast }) {
  if (!forecast?.length) return null
  return (
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
      bg-white/60 dark:bg-zinc-900/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/40
              bg-zinc-50/80 dark:bg-zinc-900/80">
              <th className="text-left py-3 px-4 font-semibold">Scenario</th>
              {forecast[0]?.points?.map(p => (
                <th key={p.years} className="text-right py-3 px-3 font-semibold">{p.years}Y</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecast.map((f, i) => (
              <tr key={f.rate_pct}
                className="border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors"
                style={{ animation: `fadeIn 0.3s ease forwards`, animationDelay: `${i * 60}ms`, opacity: 0 }}>
                <td className="py-3 px-4">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{f.rate_pct}%</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-2">{f.label}</span>
                </td>
                {f.points?.map(p => (
                  <td key={p.years} className="py-3 px-3 text-right">
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {fmtINR(p.projected_value)}
                    </div>
                    <div className="text-[10px] text-green-600 dark:text-green-500">
                      +{p.gain_pct}%
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-600 px-4 py-3">
        Projections assume constant CAGR reinvestment. Not financial advice.
      </p>
    </div>
  )
}

// ── AI Commentary ─────────────────────────────────────────────────────────────

function Commentary({ commentary }) {
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

// ── Stock Detail Panel ────────────────────────────────────────────────────────

function StockDetailPanel({ detail }) {
  const {
    symbol, company_name, sector, industry, current_price,
    rsi, macd_histogram, ma_20, ma_50, ma_200, high_52w, low_52w, trend,
    pe_ratio, pb_ratio, roe, net_margin, debt_to_equity,
    revenue_cr, net_profit_cr, ebitda_cr, eps, market_cap_cr,
    peg_ratio, beta, dividend_yield,
  } = detail

  const range     = (high_52w - low_52w) || 1
  const pos52w    = Math.min(100, Math.max(0, ((current_price - low_52w) / range) * 100))
  const rsiColor  = rsi == null ? '#71717a' : rsi < 30 ? '#22c55e' : rsi > 70 ? '#ef4444' : rsi >= 50 ? '#f59e0b' : '#3b82f6'
  const rsiLabel  = rsi == null ? '—' : rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : rsi >= 55 ? 'Bullish' : rsi >= 45 ? 'Neutral' : 'Weak'
  const trendClr  = trend === 'Bullish' ? '#22c55e' : trend === 'Bearish' ? '#ef4444' : '#f59e0b'

  const q = (v, good, ok) => v == null ? '' : v >= good ? 'text-green-500' : v >= ok ? 'text-amber-500' : 'text-red-500'
  const fmt  = (v, d=2) => v != null ? v.toFixed(d) : '—'
  const fmtP = v => v != null ? `${v.toFixed(1)}%` : '—'
  const fmtC = v => v != null ? `₹${v.toLocaleString('en-IN')}Cr` : '—'
  const fmtI = v => v != null ? `₹${v.toLocaleString('en-IN')}` : '—'

  const fundRows = [
    ['P/E Ratio',      pe_ratio,    fmt(pe_ratio),        ''],
    ['P/B Ratio',      pb_ratio,    fmt(pb_ratio),        ''],
    ['ROE',            roe,         fmtP(roe),            q(roe, 18, 10)],
    ['Net Margin',     net_margin,  fmtP(net_margin),     q(net_margin, 15, 5)],
    ['Debt / Equity',  null,        fmt(debt_to_equity),  debt_to_equity == null ? '' : debt_to_equity < 0.5 ? 'text-green-500' : debt_to_equity < 1.5 ? 'text-amber-500' : 'text-red-500'],
    ['Revenue',        null,        fmtC(revenue_cr),     ''],
    ['Net Profit',     null,        fmtC(net_profit_cr),  ''],
    ['EBITDA',         null,        fmtC(ebitda_cr),      ''],
    ['EPS',            null,        eps != null ? fmtI(eps) : '—', ''],
    ['Market Cap',     null,        fmtC(market_cap_cr),  ''],
    ['PEG Ratio',      null,        fmt(peg_ratio),       ''],
    ['Beta',           null,        fmt(beta),            ''],
    ['Dividend Yield', null,        fmtP(dividend_yield), ''],
  ]

  return (
    <div className="space-y-4" style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
        bg-white/60 dark:bg-zinc-900/60 px-5 py-4 flex justify-between items-start">
        <div>
          <p className="text-base font-bold text-zinc-900 dark:text-white">{symbol}</p>
          <p className="text-xs text-zinc-400">{company_name}</p>
          {(sector || industry) && (
            <p className="text-[11px] text-zinc-500 mt-0.5">{[sector, industry].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="text-right">
          {current_price != null && (
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              ₹{current_price.toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-xs font-semibold mt-0.5" style={{ color: trendClr }}>{trend}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Technicals */}
        <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
          bg-white/60 dark:bg-zinc-900/60 p-4 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Technicals</p>

          {/* RSI */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-zinc-500">RSI (14)</span>
              <span className="font-semibold" style={{ color: rsiColor }}>
                {rsi != null ? rsi.toFixed(1) : '—'} · {rsiLabel}
              </span>
            </div>
            <div className="relative h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-[30%] bg-green-400/25 rounded-l-full" />
              <div className="absolute inset-y-0 right-0 w-[30%] bg-red-400/25 rounded-r-full" />
              {rsi != null && (
                <div className="absolute top-0 bottom-0 w-1 rounded-full"
                  style={{ left: `${Math.min(98, rsi)}%`, background: rsiColor, transform: 'translateX(-50%)' }} />
              )}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5">
              <span>0</span><span>Oversold 30</span><span>70 Overbought</span><span>100</span>
            </div>
          </div>

          {/* MACD */}
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">MACD Signal</span>
            {macd_histogram != null ? (
              <span className={`font-semibold ${macd_histogram > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {macd_histogram > 0 ? '▲ Bullish' : '▼ Bearish'}
                <span className="text-zinc-400 font-normal ml-1.5">{macd_histogram.toFixed(3)}</span>
              </span>
            ) : <span className="text-zinc-400">—</span>}
          </div>

          {/* 52W Range */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-zinc-500">52W Range</span>
              <span className="text-zinc-400 text-[10px]">{pos52w.toFixed(0)}% of range</span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-green-400 transition-all duration-700"
                style={{ width: `${pos52w}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5">
              <span>{low_52w != null ? `₹${low_52w.toLocaleString('en-IN')}` : '—'}</span>
              <span>{high_52w != null ? `₹${high_52w.toLocaleString('en-IN')}` : '—'}</span>
            </div>
          </div>

          {/* Moving Averages */}
          <div>
            <p className="text-[11px] text-zinc-500 mb-2">Moving Averages vs CMP</p>
            <div className="space-y-1.5">
              {[['MA 20', ma_20], ['MA 50', ma_50], ['MA 200', ma_200]].map(([lbl, val]) => (
                <div key={lbl} className="flex justify-between text-xs">
                  <span className="text-zinc-500">{lbl}</span>
                  {val != null && current_price != null ? (
                    <span className={`font-medium ${current_price >= val ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{val.toLocaleString('en-IN')}
                      <span className="ml-1.5 text-[10px]">{current_price >= val ? '▲ Above' : '▼ Below'}</span>
                    </span>
                  ) : <span className="text-zinc-400">—</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fundamentals */}
        <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
          bg-white/60 dark:bg-zinc-900/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-4">Fundamentals</p>
          <div className="space-y-2.5">
            {fundRows.map(([label, , val, cls]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-zinc-500">{label}</span>
                <span className={`font-medium ${cls || 'text-zinc-700 dark:text-zinc-300'}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Deep Dive Tab ─────────────────────────────────────────────────────────────

const DETAIL_URL = (sym) => PORTFOLIO_BASE
  ? `${PORTFOLIO_BASE}/api/v1/portfolio/stock-detail/${sym}`
  : `/portfolio-api/v1/portfolio/stock-detail/${sym}`

function DeepDiveTab({ holdings }) {
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
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 truncate">{h.symbol}</p>
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

// ── Results View ──────────────────────────────────────────────────────────────

function Results({ data }) {
  const [activeTab, setActiveTab] = useState('holdings')

  const {
    portfolio_value, holdings_count,
    health_score, technical_score, fundamental_score, diversification_score,
    holdings = [], sector_exposure = {}, market_cap_exposure = {},
    forecast = [], commentary, enrichment_warnings = [],
  } = data

  const tabs = [
    { key: 'holdings',  label: 'Holdings'   },
    { key: 'exposure',  label: 'Exposure'   },
    { key: 'forecast',  label: 'Forecast'   },
    { key: 'ai',        label: 'AI Report'  },
    { key: 'deepdive',  label: 'Deep Dive'  },
  ]

  const scores = [
    { label: 'Technical',      val: technical_score },
    { label: 'Fundamental',    val: fundamental_score },
    { label: 'Diversification', val: diversification_score },
  ]

  return (
    <div className="space-y-5" style={{ animation: 'fadeIn 0.4s ease forwards' }}>

      {/* ── Health Banner ── */}
      <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/40
        bg-white/70 dark:bg-zinc-900/70 p-5 flex flex-col sm:flex-row gap-5 items-center">

        {/* Ring */}
        <div className="relative flex-shrink-0">
          <ScoreRing score={Math.round(health_score)} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-zinc-900 dark:text-white leading-none">
              {Math.round(health_score)}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest
              text-zinc-400 dark:text-zinc-500 mt-0.5">
              Health
            </span>
          </div>
        </div>

        {/* Metric grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-zinc-200/70 dark:border-zinc-800/40
            bg-zinc-50/80 dark:bg-zinc-800/40 p-3 text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
              {fmtINR(portfolio_value)}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Portfolio Value</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{holdings_count} stocks</p>
          </div>

          {scores.map(s => (
            <div key={s.label}
              className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/40
                bg-zinc-50/80 dark:bg-zinc-800/40 p-3 text-center">
              <p className="text-lg font-bold leading-tight" style={{ color: scoreColor(s.val) }}>
                {Math.round(s.val)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Warnings ── */}
      {enrichment_warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-500/20
          bg-amber-50/60 dark:bg-amber-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
            <AlertCircle size={11} />
            {enrichment_warnings.length} enrichment notice{enrichment_warnings.length > 1 ? 's' : ''}
          </p>
          <ul className="space-y-0.5">
            {enrichment_warnings.map((w, i) => (
              <li key={i} className="text-[11px] text-amber-700/80 dark:text-amber-500/70">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-xl
        bg-zinc-100/80 dark:bg-zinc-800/50
        border border-zinc-200/70 dark:border-zinc-800/40">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200
              ${activeTab === t.key
                ? 'bg-[#FDD405] text-zinc-900 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div key={activeTab} style={{ animation: 'fadeIn 0.25s ease forwards' }}>
        {activeTab === 'holdings' && <HoldingsTable holdings={holdings} />}

        {activeTab === 'exposure' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PieSection title="Sector Exposure" data={sector_exposure} />
            <PieSection title="Market Cap Exposure" data={market_cap_exposure} />
          </div>
        )}

        {activeTab === 'forecast' && (
          <ForecastTable forecast={forecast} />
        )}

        {activeTab === 'ai'       && <Commentary commentary={commentary} />}
        {activeTab === 'deepdive' && <DeepDiveTab holdings={holdings} />}
      </div>
    </div>
  )
}

// ── Main Overlay ──────────────────────────────────────────────────────────────

export default function PortfolioOverlay({ onClose }) {
  const [phase, setPhase] = useState('upload')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')

  // Store onClose in a ref so the ESC listener never needs to re-register
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const h = e => e.key === 'Escape' && onCloseRef.current?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])  // runs once

  const handleFile = async (file) => {
    setFileName(file.name)
    setPhase('loading')
    setErrorMsg('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const authHeaders = await getAuthHeader()
      const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd, headers: authHeaders })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server returned ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
      setPhase('results')
    } catch (e) {
      setErrorMsg(e.message || 'Upload failed. Check your connection and try again.')
      setPhase('error')
    }
  }

  const reset = () => {
    setPhase('upload')
    setResult(null)
    setErrorMsg('')
    setFileName('')
  }

  const loadFromHistory = useCallback((data, name) => {
    setResult(data)
    setFileName(name || 'Saved analysis')
    setPhase('results')
  }, [])

  const showHistory = phase !== 'loading'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center
        bg-black/70 dark:bg-black/80 backdrop-blur-sm overflow-y-auto p-4 md:p-6"
      style={{ animation: 'fadeIn 0.2s ease forwards' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-5xl my-4
          bg-[#F5F2E8] dark:bg-[#111111]
          rounded-3xl shadow-2xl
          border border-zinc-200/80 dark:border-zinc-800/60"
        style={{ animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards', minHeight: 320 }}
      >

        {/* ── Sticky header ── */}
        <div className="flex items-center justify-between px-5 py-4
          border-b border-zinc-200/70 dark:border-zinc-800/40
          sticky top-0 z-10 rounded-t-3xl
          bg-[#EDEAE0]/95 dark:bg-[#111111]/95 backdrop-blur-md">

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
              bg-[#FDD405]/15 dark:bg-[#FDD405]/10">
              <BarChart2 size={17} className="text-[#FDD405]" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-zinc-900 dark:text-white leading-tight">
                Portfolio Analysis
              </h2>
              {fileName && phase === 'results' && (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">
                  {fileName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showHistory && (
              <button
                onClick={() => phase === 'history' ? reset() : setPhase('history')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                  transition-all duration-150
                  ${phase === 'history'
                    ? 'bg-[#FDD405]/15 text-[#FDD405]'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/5'
                  }`}>
                <Clock size={11} />
                History
              </button>
            )}
            {phase === 'results' && (
              <button onClick={reset}
                className="flex items-center gap-1.5 text-xs font-medium
                  text-zinc-500 dark:text-zinc-400
                  hover:text-zinc-800 dark:hover:text-zinc-200
                  px-3 py-1.5 rounded-lg
                  hover:bg-zinc-200/60 dark:hover:bg-white/5
                  transition-all duration-150">
                <RefreshCw size={11} /> Re-upload
              </button>
            )}
            <button onClick={onClose}
              className="p-2 rounded-xl transition-all duration-150
                text-zinc-400 dark:text-zinc-500
                hover:text-zinc-800 dark:hover:text-white
                hover:bg-zinc-200/70 dark:hover:bg-white/10">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 md:p-6">
          {phase === 'upload'   && <UploadZone onFile={handleFile} />}
          {phase === 'loading'  && <LoadingState fileName={fileName} />}
          {phase === 'results'  && result && <Results data={result} />}
          {phase === 'history'  && <HistoryView onLoad={loadFromHistory} />}

          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-24 text-center"
              style={{ animation: 'fadeIn 0.3s ease forwards' }}>
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10
                flex items-center justify-center mb-5">
                <AlertCircle size={32} className="text-red-500 dark:text-red-400" />
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                Analysis failed
              </p>
              <p className="text-sm text-zinc-500 mb-8 max-w-md">{errorMsg}</p>
              <button onClick={reset}
                className="px-7 py-2.5 bg-[#FDD405] text-zinc-900 font-bold rounded-xl
                  text-sm hover:bg-[#e8c304] active:scale-95 transition-all shadow-sm">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
