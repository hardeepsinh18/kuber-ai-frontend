/**
 * Backend chats API client for sync when user is logged in.
 * Expects: GET/POST /api/v1/chats, GET/PATCH/DELETE /api/v1/chats/:id, POST /api/v1/chats/:id/messages.
 * Falls back gracefully when backend does not yet expose these (e.g. 404).
 */

import { getApiBase } from './apiBase';

const API_BASE = getApiBase();   // '' = same-origin relative /api/*

function getHeaders(accessToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function chatsUrl() {
  return `${API_BASE}/api/v1/chats`;
}

function chatUrl(id) {
  return `${API_BASE}/api/v1/chats/${id}`;
}

function messagesUrl(id) {
  return `${API_BASE}/api/v1/chats/${id}/messages`;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

export async function getChats(accessToken) {
  const res = await fetch(chatsUrl(), { method: 'GET', headers: getHeaders(accessToken) });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
  const data = await safeJson(res);
  if (!data) return [];
  return Array.isArray(data) ? data : data?.chats ?? data?.items ?? [];
}

export async function getChat(id, accessToken) {
  const res = await fetch(chatUrl(id), { method: 'GET', headers: getHeaders(accessToken) });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
  const data = await safeJson(res);
  if (!data) return null;
  const messages = data.messages ?? data.items ?? [];
  return { id: data.id ?? id, title: data.title ?? 'Chat', updatedAt: data.updated_at ?? data.updatedAt ?? Date.now(), messages };
}

export async function createChat(accessToken, title = 'New chat') {
  const res = await fetch(chatsUrl(), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({ title }),
  });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
  const data = await safeJson(res);
  return data?.id ?? data?.chat_id ?? null;
}

export async function updateChatTitle(id, title, accessToken) {
  const res = await fetch(chatUrl(id), {
    method: 'PATCH',
    headers: getHeaders(accessToken),
    body: JSON.stringify({ title }),
  });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => ` ${res.status}`));
  return true;
}

export async function appendMessages(id, messages, accessToken) {
  const res = await fetch(messagesUrl(id), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({ messages }),
  });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => ` ${res.status}`));
  return true;
}

export async function deleteChat(id, accessToken) {
  const res = await fetch(chatUrl(id), { method: 'DELETE', headers: getHeaders(accessToken) });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => ` ${res.status}`));
  return true;
}
