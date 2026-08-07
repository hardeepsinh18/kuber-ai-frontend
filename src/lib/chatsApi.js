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

/**
 * Create a chat thread. Pass `id` to create it under an id the client already
 * holds — used to heal a chat that only ever existed locally (see
 * MissingChatError below). Idempotent server-side for an id you already own.
 */
export async function createChat(accessToken, title = 'New chat', id = undefined) {
  const res = await fetch(chatsUrl(), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(id ? { title, id } : { title }),
  });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
  const data = await safeJson(res);
  return data?.id ?? data?.chat_id ?? null;
}

/**
 * The server has no thread with this id — the chat exists only on this device.
 *
 * Distinct from "the endpoint isn't deployed" (501), which is the graceful-null
 * case this module was originally written around. Conflating the two is what
 * lost history: a 404 resolved as success, so the caller marked the messages
 * synced and never retried them, and the only surviving copy was localStorage.
 */
export class MissingChatError extends Error {
  constructor(id) {
    super(`Chat ${id} does not exist on the server`);
    this.name = 'MissingChatError';
    this.chatId = id;
  }
}

// Chrome/Firefox reject any keepalive request once the combined in-flight
// keepalive body size crosses ~64KB — there's no graceful degradation, the
// fetch just fails. A rich Analyst-mode answer (chart data + scorecards +
// filings + sentiment, all embedded in message metadata) routinely blows
// past that on its own. So keepalive is opt-in per call, only for payloads
// small enough that the browser won't reject them outright — otherwise a
// plain fetch (which at least works normally, just isn't unload-safe) is
// strictly better than one guaranteed to fail.
const KEEPALIVE_SAFE_BYTES = 60_000;

function keepaliveIfSmall(body) {
  return body.length < KEEPALIVE_SAFE_BYTES;
}

export async function updateChatTitle(id, title, accessToken) {
  const body = JSON.stringify({ title });
  const res = await fetch(chatUrl(id), {
    method: 'PATCH',
    headers: getHeaders(accessToken),
    body,
    keepalive: keepaliveIfSmall(body),
  });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => ` ${res.status}`));
  return true;
}

export async function appendMessages(id, messages, accessToken) {
  const body = JSON.stringify({ messages });
  const res = await fetch(messagesUrl(id), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body,
    keepalive: keepaliveIfSmall(body),
  });
  // 404 here means THIS CHAT is unknown to the server, which is recoverable and
  // must not read as success — returning null let the caller advance its synced
  // counter, permanently marking messages as stored that never were.
  if (res.status === 404) throw new MissingChatError(id);
  if (res.status === 501) return null;   // endpoint genuinely not deployed
  if (!res.ok) throw new Error(await res.text().catch(() => ` ${res.status}`));
  return true;
}

export async function deleteChat(id, accessToken) {
  const res = await fetch(chatUrl(id), { method: 'DELETE', headers: getHeaders(accessToken) });
  if (res.status === 404 || res.status === 501) return null;
  if (!res.ok) throw new Error(await res.text().catch(() => ` ${res.status}`));
  return true;
}
