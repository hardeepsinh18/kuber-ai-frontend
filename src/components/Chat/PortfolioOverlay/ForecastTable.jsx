import { fmtINR } from '../answerKit'

// ── Forecast Table ────────────────────────────────────────────────────────────

export function ForecastTable({ forecast }) {
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
