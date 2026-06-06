# KuberAI — AI Stock Market Assistant

An AI-powered financial assistant for Indian equity markets. Ask about stocks, get technical analysis, strategy recommendations, and market overviews.

**Frontend:** React + Vite → deployed on Vercel  
**Backend:** FastAPI (Python) → deployed on AWS EC2

---

## Quick links

| Document | Purpose |
|---|---|
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Set up and run the project locally |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, module map |
| [docs/DEVELOPMENT_STANDARDS.md](docs/DEVELOPMENT_STANDARDS.md) | Code style, PR process, testing rules |

---

## Repository structure

```
/                          ← Frontend (React + Vite) — deploy root to Vercel
├── src/                   ← React source code
├── public/                ← Static assets
├── vercel.json            ← Vercel routing (proxies /api/* to backend)
├── KuberAI-backend/       ← FastAPI backend — deploy to AWS EC2
│   ├── app/               ← Application package (main entry point)
│   │   ├── api/           ← Route handlers
│   │   ├── core/          ← Response pipeline, intent classifier, LLM formatter
│   │   └── services/      ← Market data, fundamentals, RAG, historical data
│   ├── Dockerfile         ← Docker image (also used for HF Spaces)
│   ├── requirements.txt   ← Python dependencies
│   └── .env.example       ← All env vars with documentation
├── docs/                  ← Architecture, onboarding, deployment guides
├── scripts/               ← Deployment and ops scripts (run from repo root)
└── logs-viewer/           ← Optional admin log viewer (separate Vercel app)
```

---

## Production deployment

| Layer | Platform | Config |
|---|---|---|
| Frontend | Vercel | Root directory = `.` (repo root) |
| Backend | AWS EC2 (t3.medium) | systemd service `stockbot`, port 8000 |
| Database | Supabase (PostgreSQL) | `DATABASE_URL` env var |
| Cache | Upstash Redis | `UPSTASH_REDIS_REST_URL` env var |
| Market data | FYERS API | `FYERS_CLIENT_ID` / `FYERS_SECRET_KEY` env vars |

> **Backend URL in vercel.json:** The backend EC2 IP is hardcoded in [vercel.json](vercel.json).  
> When the EC2 instance changes, update all destinations in that file.  
> Long-term: point a subdomain (e.g. `api.kuberai.in`) to the EC2 and use that hostname instead of the raw IP.

---

## Local development

See [docs/ONBOARDING.md](docs/ONBOARDING.md) for the full setup guide.

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd KuberAI-backend
cp .env.example .env  # fill in your API keys
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
