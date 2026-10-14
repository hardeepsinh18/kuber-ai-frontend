import { useEffect, useRef, useState } from 'react'
import { Link2, AlertCircle, Loader2 } from 'lucide-react'
import {
  getAuthHeader,
  SMALLCASE_CREATE_TXN_ENDPOINT,
  SMALLCASE_TXN_STATUS_ENDPOINT,
  SMALLCASE_FETCH_ENDPOINT,
} from './api'
import { loadSmallcaseSdk } from './smallcaseLoader'

// ── Broker connect via Smallcase Gateway ────────────────────────────────────
//
// The SDK's own triggerTransaction callback is treated as a UI signal only —
// "the widget finished, go check our backend" — never as a source of truth.
// Our backend learns smallcaseAuthId exclusively from the HMAC-verified
// webhook, so /transaction-status is only ever a progress indicator, not the
// actual confirmation. Polling tolerates repeated failures from that endpoint
// (it never throws mid-loop) and, short of an explicit ERRORED, always falls
// through to fetch-holdings — the one call whose success or failure actually
// reflects whether the webhook recorded a connection.
const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 120_000

const STAGE_LABEL = {
  creating: 'Starting broker connection...',
  widget: 'Waiting for broker login...',
  polling: 'Confirming your connection...',
  fetching: 'Fetching your holdings...',
}

export function SmallcaseConnect({ onComplete, onError }) {
  const [stage, setStage] = useState('creating')
  const [message, setMessage] = useState('')
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return // StrictMode double-invoke guard
    startedRef.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    try {
      setStage('creating')
      const authHeaders = await getAuthHeader()

      const createRes = await fetch(SMALLCASE_CREATE_TXN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({}),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.detail || `Could not start broker connection (${createRes.status})`)
      }
      const { transaction_id, gateway, smallcase_auth_token } = await createRes.json()

      setStage('widget')
      const scDK = await loadSmallcaseSdk()
      const gatewayInstance = new scDK({
        gateway,
        smallcaseAuthToken: smallcase_auth_token,
      })

      // The widget's own resolution/rejection only tells us the UI flow ended —
      // it is never trusted as data. Either way, poll our backend next; a
      // genuine failure surfaces there too (status stays INITIALIZED/ERRORED).
      try {
        await gatewayInstance.triggerTransaction({ transactionId: transaction_id })
      } catch {
        // fall through to polling regardless
      }

      setStage('polling')
      const finalStatus = await pollTransactionStatus(transaction_id, authHeaders)
      // ERRORED is an explicit, confirmed negative signal from Smallcase — stop.
      // Anything else (COMPLETED, or a timeout caused by the status endpoint
      // itself being unavailable) falls through to fetch-holdings below: the
      // webhook is the real source of truth and writes the connection
      // independently of whether polling could ever confirm it, so a broken
      // status endpoint must not block a connection that actually succeeded.
      if (finalStatus === 'ERRORED') {
        throw new Error('The broker connection could not be completed. Please try again.')
      }

      setStage('fetching')
      const holdingsRes = await fetch(SMALLCASE_FETCH_ENDPOINT, {
        method: 'POST',
        headers: authHeaders,
      })
      if (!holdingsRes.ok) {
        if (holdingsRes.status === 404) {
          throw new Error('Broker connection did not complete in time. Please try again.')
        }
        const err = await holdingsRes.json().catch(() => ({}))
        throw new Error(err.detail || `Could not fetch holdings (${holdingsRes.status})`)
      }
      const data = await holdingsRes.json()
      onComplete(data)
    } catch (e) {
      setMessage(e.message || 'Broker connection failed.')
      onError(e.message || 'Broker connection failed. Please try again.')
    }
  }

  async function pollTransactionStatus(transactionId, authHeaders) {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
      const res = await fetch(SMALLCASE_TXN_STATUS_ENDPOINT(transactionId), { headers: authHeaders })
      if (res.ok) {
        const { status } = await res.json()
        if (status === 'COMPLETED' || status === 'ERRORED') return status
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }
    return 'TIMEOUT'
  }

  return (
    <div className="flex flex-col items-center justify-center py-20"
      style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      <div className="w-16 h-16 mb-6 rounded-2xl flex items-center justify-center bg-[#FDD405]/15">
        {message ? (
          <AlertCircle size={28} className="text-red-500 dark:text-red-400" />
        ) : (
          <Loader2 size={28} className="text-[#FDD405] animate-spin" />
        )}
      </div>
      <p className="text-base font-bold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
        <Link2 size={14} className="text-[#FDD405]" />
        Connecting via Smallcase
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        {message || STAGE_LABEL[stage]}
      </p>
    </div>
  )
}
