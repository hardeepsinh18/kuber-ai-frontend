/**
 * CONF-D-003 / ISS-12 — DPDP data-subject rights client.
 *
 * The backend has shipped GET /privacy/export and POST /privacy/delete since
 * before this audit, but nothing in the product called them: LegalPage described
 * the rights in prose only, so a data principal had no way to actually exercise
 * access or erasure. Under the DPDP Act a right you cannot exercise is not a
 * right, and enforcement lands 2027-05-13.
 *
 * Both endpoints require a verified bearer token — these act on the caller's own
 * records, and the backend derives the user from the token, never from the body.
 */

import { getApiBase } from './apiBase';

const API_BASE = getApiBase();   // '' = same-origin relative /api/*

function privacyUrl(path) {
  return `${API_BASE}/api/v1/privacy/${path}`;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

/**
 * Fetch everything we hold about the signed-in user.
 * Returns the parsed JSON export; throws with a readable message otherwise.
 */
export async function exportMyData(accessToken) {
  if (!accessToken) throw new Error('Please sign in to export your data.');

  const res = await fetch(privacyUrl('export'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await safeJson(res);
    if (res.status === 503) throw new Error('Data export is temporarily unavailable. Please try again later.');
    throw new Error(body?.detail || `Export failed (${res.status}).`);
  }
  return res.json();
}

/**
 * Permanently erase the signed-in user's data. Irreversible — callers MUST
 * confirm before invoking this.
 */
export async function deleteMyData(accessToken) {
  if (!accessToken) throw new Error('Please sign in to delete your data.');

  const res = await fetch(privacyUrl('delete'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await safeJson(res);
    if (res.status === 503) throw new Error('Account deletion is temporarily unavailable. Please try again later.');
    throw new Error(body?.detail || `Deletion failed (${res.status}).`);
  }
  return res.json();
}

/**
 * Trigger a browser download of the export as a JSON file.
 *
 * Kept separate from exportMyData so the network call stays testable without
 * touching the DOM, and so a caller can render the data instead of downloading.
 */
export function downloadExport(data, filename) {
  const name = filename || `venty-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Always release the object URL, even if the click path threw.
    URL.revokeObjectURL(url);
  }
  return name;
}
