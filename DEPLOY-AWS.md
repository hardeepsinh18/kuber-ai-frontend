# Deploy — AWS S3 + CloudFront (`aws-prod`)

This branch builds a fully **same-origin** SPA: every backend call is a relative
`/api/*` path (via `getApiBase()`, default `""`). Served on `aws.72street.ai`,
CloudFront routes `/api/*` to the ALB and everything else to S3 — **no CORS**.

## 1. Build

Set **only** these two env vars (do NOT set `VITE_API_URL`, `VITE_API_BASE`, or
`VITE_PORTFOLIO_API_BASE` — an API base would break same-origin):

```bash
VITE_SUPABASE_URL=https://xqutgxdwmsvabwaioszq.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>

npm ci
npm run build        # → dist/
```

The Supabase URL + anon key are baked into the bundle (the anon key is public by
design). No backend URL is baked in.

## 2. Upload

Sync `dist/` to the S3 bucket, then invalidate CloudFront:

```bash
aws s3 sync dist/ s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths '/*'
```

## 3. CloudFront behaviors

| Path pattern | Origin | Cache | Notes |
|---|---|---|---|
| `/api/*` | **ALB** | **Disabled** (`CachingDisabled`) | Allow all methods (GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE). Forward headers **`Authorization`, `X-Admin-Key`, `X-Supabase-Auth`, `Content-Type`** (+ query strings). Use origin request policy `AllViewer` or a custom policy with those headers. |
| `Default (*)` | **S3** | Enabled | Static SPA assets. |

Optional (only if you want Swagger/health via CloudFront): also route `/health`,
`/docs`, `/docs/*`, `/openapi.json` → ALB.

> The portfolio engine is mounted on the main backend, so **all** portfolio calls
> use `/api/v1/portfolio/*` — a single `/api/*` behavior covers everything. No
> `/portfolio-api` rule needed.

## 4. SPA fallback (React Router / BrowserRouter)

Add **Custom Error Responses** so deep links (`/admin`, `/chat/...`, `/login`)
serve the app shell:

| HTTP error code | Response page path | Response code |
|---|---|---|
| 403 | `/index.html` | 200 |
| 404 | `/index.html` | 200 |

## 5. Backend (ALB origin)

Point the `/api/*` behavior's origin at the ALB fronting the FastAPI backend
(gunicorn, port 8000). Because the browser hits the same host for the app and the
API, requests are **same-origin — CORS is not involved**.

---

_`vercel.json` in this repo is Vercel-only (hardcoded EC2 rewrites) and is inert
on CloudFront; ignore it for AWS._
