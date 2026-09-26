# Patent Matcher — frontend

React + Vite + TypeScript. Lives entirely in `frontend/` so it never conflicts with backend work.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

By default it uses an in-browser mock backend (`VITE_USE_MOCK=true` in `.env.local`).
To hit the real backend on `localhost:8000`, set `VITE_USE_MOCK=false` and restart `npm run dev`.

API contract: [API.md](API.md). Flow: idea → clarify (max 2 rounds, skip) → review fields → scan progress → tiered results.

Layout:
- `src/api/types.ts` — request/response types (keep in sync with API.md)
- `src/api/client.ts` — real HTTP client + polling helper
- `src/api/mock.ts` — fake backend
- `src/components/` — one component per screen
