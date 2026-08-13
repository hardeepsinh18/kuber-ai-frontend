import { useState, useRef, useEffect, useCallback } from 'react'
import { X, BarChart2, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { getAuthHeader, UPLOAD_ENDPOINT } from './api'
import { UploadZone } from './UploadZone'
import { LoadingState } from './LoadingState'
import { Results } from './Results'
import { HistoryView } from './HistoryView'

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
