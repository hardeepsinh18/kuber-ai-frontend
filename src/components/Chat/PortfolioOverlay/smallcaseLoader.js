// Loads the Smallcase Gateway JS SDK once, idempotently. Confirmed script
// origin (from Smallcase's own integration docs): https://gateway.smallcase.com
// — must match src/security/csp.js's script-src entry if this ever changes.
const SDK_URL = 'https://gateway.smallcase.com/scdk/2.0.0/scdk.js'

let loadPromise = null

export function loadSmallcaseSdk() {
  if (typeof window !== 'undefined' && window.scDK) {
    return Promise.resolve(window.scDK)
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.type = 'text/javascript'
    script.async = true
    script.onload = () => {
      if (window.scDK) resolve(window.scDK)
      else reject(new Error('Smallcase SDK script loaded but window.scDK is missing.'))
    }
    script.onerror = () => {
      loadPromise = null // allow a retry on next call
      reject(new Error('Could not load the Smallcase Gateway SDK.'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
