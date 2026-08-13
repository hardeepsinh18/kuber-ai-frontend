import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { fmtINR, scoreColor, ScoreRing } from '../answerKit'
import { HoldingsTable } from './HoldingsTable'
import { PieSection } from './PieSection'
import { ForecastTable } from './ForecastTable'
import { Commentary } from './Commentary'
import { DeepDiveTab } from './DeepDiveTab'

// ── Score Ring ────────────────────────────────────────────────────────────────
// ScoreRing now lives in answerKit.jsx (shared, single implementation — see the
// import above). This call site passes size/stroke to match its old 130/10
// footprint, `animate` for the old fill-from-0 behaviour, and `showLabel={false}`
// since this overlay draws its own number/label on top of the ring.

// ── Results View ──────────────────────────────────────────────────────────────

export function Results({ data }) {
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
          <ScoreRing score={Math.round(health_score)} size={130} stroke={10} animate showLabel={false} />
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
