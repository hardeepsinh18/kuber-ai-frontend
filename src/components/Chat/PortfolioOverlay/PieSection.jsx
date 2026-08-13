import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PIE_COLORS } from './constants'

// ── Pie Chart Section ─────────────────────────────────────────────────────────

export function PieSection({ title, data }) {
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
