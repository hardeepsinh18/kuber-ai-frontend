import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class RootErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Venty root error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 24, fontFamily: 'system-ui', background: '#121315', color: '#f1f5f9',
        }}>
          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
              Venty hit an unexpected error. Your chat history is safe in local storage.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#fdd405', color: '#121315', border: 'none', borderRadius: 8, fontWeight: 700,
                padding: '10px 24px', fontSize: 15, cursor: 'pointer', marginBottom: 16,
              }}
            >
              Reload App
            </button>
            <details style={{ textAlign: 'left', marginTop: 16 }}>
              <summary style={{ color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Error details</summary>
              <pre style={{ background: '#1e293b', padding: 12, borderRadius: 6, fontSize: 11, overflow: 'auto', marginTop: 8, color: '#fca5a5' }}>
                {this.state.error?.message || String(this.state.error)}
              </pre>
            </details>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
