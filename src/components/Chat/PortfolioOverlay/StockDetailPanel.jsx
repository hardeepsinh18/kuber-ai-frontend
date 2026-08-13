// ── Stock Detail Panel ────────────────────────────────────────────────────────

export function StockDetailPanel({ detail }) {
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
    ['Debt-to-Equity', null,        fmt(debt_to_equity),  debt_to_equity == null ? '' : debt_to_equity < 0.5 ? 'text-green-500' : debt_to_equity < 1.5 ? 'text-amber-500' : 'text-red-500'],
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
