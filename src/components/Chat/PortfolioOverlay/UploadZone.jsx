import { useState, useRef } from 'react'
import { FileSpreadsheet } from 'lucide-react'

// ── Upload Zone ───────────────────────────────────────────────────────────────

export function UploadZone({ onFile }) {
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
