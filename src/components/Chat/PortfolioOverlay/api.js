import { getIdToken } from '../../../lib/auth'
import { getApiBase } from '../../../lib/apiBase'

// Same-origin relative /api/* (behind CloudFront/ALB). The portfolio engine is mounted on
// the main backend, so every portfolio call goes through /api/v1/portfolio/*.
export const API_BASE = getApiBase()
export const UPLOAD_ENDPOINT   = `${API_BASE}/api/v1/portfolio/upload-and-analyze`
export const HISTORY_ENDPOINT  = `${API_BASE}/api/v1/portfolio/history`
export const SNAPSHOT_ENDPOINT = (id) => `${API_BASE}/api/v1/portfolio/history/${id}`
export const DETAIL_URL = (sym) => `${API_BASE}/api/v1/portfolio/stock-detail/${sym}`

export async function getAuthHeader() {
  try {
    const token = await getIdToken()
    if (!token) return {}
    // Cognito ID token. Authorization is primary; X-Supabase-Auth kept as an alias
    // so backend routes that read either header keep working through the cutover.
    return { Authorization: `Bearer ${token}`, 'X-Supabase-Auth': `Bearer ${token}` }
  } catch {
    return {}
  }
}
