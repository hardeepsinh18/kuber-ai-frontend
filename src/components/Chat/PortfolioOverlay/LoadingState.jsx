import { useState, useEffect } from 'react'

// ── Loading State ─────────────────────────────────────────────────────────────

export function LoadingState({ fileName }) {
  const steps = [
    'Parsing holdings from Excel...',
    'Resolving NSE symbols...',
    'Enriching from VentyAI database...',
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
