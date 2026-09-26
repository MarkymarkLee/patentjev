# patentjev

## Patent idea search pipeline

Given a free-text idea summary:

1. **Jev (TypeSafe)** picks the best-fit top-level CPC section (segment) for the idea.
2. **GMI Cloud** (OpenAI-compatible LLM inference) generates patent search terms, broad on the
   first pass and progressively narrower each iteration.
3. Each iteration's terms are run against **Google BigQuery**'s public patents dataset, scoped to
   the chosen CPC section, until the result count drops to/below a threshold (or iterations run out).

Setup:

1. Enable the BigQuery API on your GCP project and grant your account the `roles/bigquery.jobUser` role (or higher).
2. Authenticate locally: `gcloud auth application-default login`.
3. Set `GCP_PROJECT_ID`, `JEVAPIKEY` (TypeSafe API key), and `GMI_API_KEY` (GMI Cloud API key) in `.env`.
4. For a forwarded frontend, set `CORS_ORIGINS` to a comma-separated list of exact origins, or set
    `CORS_ORIGIN_REGEX` for a forwarded HTTPS domain pattern.

Usage:

```python
from patentjev.idea_search import search_competing_patents

result = search_competing_patents("A shoe insole with embedded pressure sensors for gait analysis")

print(result.cpc_segment.section, result.cpc_segment.description)
for iteration in result.iterations:
    print(iteration.terms, iteration.result_count)
for patent in result.patents:
    print(patent.publication_number, patent.title)
```

Each BigQuery search scans a multi-terabyte public table; `search_patents`/`count_patents` cap
billed bytes at 200 GB by default (`max_bytes_billed`). Use
`bigquery_search.estimate_bytes_processed(terms)` to check cost before running ad hoc queries.

## Backend API (for frontend/)

`src/patentjev/api.py` implements the contract in [frontend/API.md](frontend/API.md)
(`/api/understand`, `/api/search`, `/api/search/{job_id}`) on top of the pipeline above, plus a
Jev-based comparison of each match against the idea.

Run it:

```bash
uv run uvicorn patentjev.api:app --reload --port 8000
```

Then run the frontend (`cd frontend && npm run dev`) with `VITE_USE_MOCK=false` in
`frontend/.env.local` to point it at this backend instead of the in-browser mock.