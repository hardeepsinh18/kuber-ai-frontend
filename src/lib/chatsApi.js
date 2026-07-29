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
  // Backend caps a single page at 100 (FastAPI Query le=100) and defaults to
  // 20 if omitted — pull every page so users with >20 threads (or with
  // threads created on another device) see their full history, not just the
  // most-recently-touched 20.
  const PAGE_SIZE = 100;
  let offset = 0;
  const all = [];
  for (;;) {
    const res = await fetch(`${chatsUrl()}?limit=${PAGE_SIZE}&offset=${offset}`, {
      method: 'GET',
      headers: getHeaders(accessToken),
    });
    if (res.status === 404 || res.status === 501) return offset === 0 ? null : all;
    if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
    const data = await safeJson(res);
    const page = data ? (Array.isArray(data) ? data : data?.chats ?? data?.items ?? []) : [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
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
  // keepalive: lets this survive a page unload/refresh that happens right
  // after a response finishes (the exact window the debounced persist used
  // to lose) — a plain in-flight fetch can otherwise be cancelled when the
  // page tears down.
  const res = await fetch(chatUrl(id), {
    method: 'PATCH',
    headers: getHeaders(accessToken),
    body: JSON.stringify({ title }),
    keepalive: true,
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
    keepalive: true,
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
