# Frontend ↔ Backend API contract

The frontend calls these endpoints under `/api`. In dev, Vite proxies `/api` to
`http://localhost:8000`, so the backend should serve them at `http://localhost:8000/api/...`.
TypeScript source of truth: `src/api/types.ts`.

## POST /api/understand
Extract idea fields (LLM) and gate each with a Jev Noul ("specific enough to search?").

Request:
```json
{ "idea": "free text", "answers": [{ "field": "mechanism", "answer": "optical PPG sensor" }] }
```
`answers` accumulates across clarify rounds (max 2); `field` is `problem | mechanism | user`.

Response:
```json
{
  "fields": { "problem": "...", "mechanism": "...", "user": "..." },
  "scores": { "problem": 0.82, "mechanism": 0.41, "user": 0.7 },
  "questions": [{ "field": "mechanism", "question": "How does it measure glucose?" }]
}
```
`questions` = one per field scoring < 0.6. Empty list means ready to search.

## POST /api/search
Start a scan. Returns immediately.
```json
// request
{ "fields": { "problem": "...", "mechanism": "...", "user": "..." } }
// response
{ "job_id": "abc123" }
```

## GET /api/search/{job_id}
Polled every ~400 ms to drive the progress bar.
```json
{
  "status": "running | done | error",
  "scanned": 1200,
  "total": 3000,
  "error": null,
  "result": null
}
```
When `status` is `done`, `result` is:
```json
{
  "domain": "Wearable health sensors (A61B5)",
  "scanned": 3000,
  "very_similar_count": 2,
  "fallback": false,
  "matches": [
    {
      "publication_number": "US-2021123456-A1",
      "title": "...",
      "abstract": "...",
      "url": "https://patents.google.com/patent/US2021123456A1",
      "score": 0.91,
      "tier": "very_similar | related | closest",
      "breakdown": { "same_problem": 0.94, "same_mechanism": 0.82, "same_user": 0.9 }
    }
  ]
}
```
- Tiers: ≥ 0.8 `very_similar`, 0.6–0.8 `related`, cap 10. If none qualify, return the top 3 as `closest` with `fallback: true`.
- `breakdown` (stage 2) may be `null` — the UI hides it.
