"""FastAPI backend for the frontend, implementing the contract in frontend/API.md.

Run with: uv run uvicorn patentjev.api:app --reload --port 8000
"""

import threading
import uuid
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from patentjev.idea import Idea
from patentjev.idea_search import IdeaSearchResult, search_competing_patents
from patentjev.patent_comparison import PatentComparison, compare_patents
from patentjev.understand import FIELD_QUESTIONS, FIELDS, GATE, extract_idea_fields, score_idea_fields

FieldName = Literal["problem", "mechanism", "user"]
Tier = Literal["very_similar", "related", "closest"]

VERY_SIMILAR_THRESHOLD = 0.8
RELATED_THRESHOLD = 0.6
MAX_MATCHES = 10
FALLBACK_MATCHES = 3
SEARCH_PROGRESS_TOTAL = 100


class ClarifyAnswer(BaseModel):
    field: FieldName
    answer: str


class UnderstandRequest(BaseModel):
    idea: str
    answers: list[ClarifyAnswer] = []


class IdeaFieldsModel(BaseModel):
    problem: str
    mechanism: str
    user: str


class ClarifyQuestion(BaseModel):
    field: FieldName
    question: str


class UnderstandResponse(BaseModel):
    fields: IdeaFieldsModel
    scores: dict[FieldName, float]
    questions: list[ClarifyQuestion]


class SearchRequest(BaseModel):
    fields: IdeaFieldsModel


class SearchStartResponse(BaseModel):
    job_id: str


class Breakdown(BaseModel):
    same_problem: float
    same_mechanism: float
    same_user: float


class PatentMatch(BaseModel):
    publication_number: str
    title: str
    abstract: str
    url: str
    score: float
    tier: Tier
    breakdown: Breakdown | None


class SearchResult(BaseModel):
    domain: str
    scanned: int
    very_similar_count: int
    fallback: bool
    matches: list[PatentMatch]


class SearchStatus(BaseModel):
    status: Literal["running", "done", "error"]
    scanned: int
    total: int
    result: SearchResult | None
    error: str | None


app = FastAPI(title="patentjev backend")

# Dev convenience for running the frontend without the Vite proxy; tighten for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

_jobs: dict[str, dict[str, object]] = {}
_jobs_lock = threading.Lock()


def _set_job(job_id: str, **fields: object) -> None:
    with _jobs_lock:
        _jobs[job_id].update(fields)


def _get_job(job_id: str) -> dict[str, object] | None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job is not None else None


@app.post("/api/understand", response_model=UnderstandResponse)
def understand(req: UnderstandRequest) -> UnderstandResponse:
    answer_by_field = {a.field: a.answer for a in req.answers}
    extracted = extract_idea_fields(req.idea)
    fields = {name: answer_by_field.get(name, extracted[name]) for name in FIELDS}
    scores = score_idea_fields(fields)
    # An explicit clarify answer is always considered good enough, regardless of Jev's score.
    for name in answer_by_field:
        scores[name] = max(scores[name], GATE)
    questions = [
        ClarifyQuestion(field=name, question=FIELD_QUESTIONS[name])
        for name in FIELDS
        if scores[name] < GATE
    ]
    return UnderstandResponse(fields=IdeaFieldsModel(**fields), scores=scores, questions=questions)


def _score_match(comparison: PatentComparison) -> float:
    # Blend the ordinal relevancy score (0-2) with the three same-* Nouls (0-1 each).
    return (comparison.relevancy / 2 + comparison.same_mechanism + comparison.same_users + comparison.same_problem) / 4


def _build_search_result(search: IdeaSearchResult, comparisons: list[PatentComparison]) -> SearchResult:
    by_publication = {c.publication_number: c for c in comparisons}
    scored = [(_score_match(by_publication[p.publication_number]), p) for p in search.patents]
    scored.sort(key=lambda pair: pair[0], reverse=True)

    qualifying = [pair for pair in scored if pair[0] >= RELATED_THRESHOLD]
    fallback = not qualifying
    chosen = qualifying[:MAX_MATCHES] if qualifying else scored[:FALLBACK_MATCHES]

    matches = []
    for score, patent in chosen:
        comparison = by_publication[patent.publication_number]
        tier: Tier = "closest" if fallback else ("very_similar" if score >= VERY_SIMILAR_THRESHOLD else "related")
        matches.append(
            PatentMatch(
                publication_number=patent.publication_number,
                title=patent.title or "",
                abstract=patent.abstract or "",
                url=f"https://patents.google.com/patent/{patent.publication_number.replace('-', '')}",
                score=round(score, 3),
                tier=tier,
                breakdown=Breakdown(
                    same_problem=comparison.same_problem,
                    same_mechanism=comparison.same_mechanism,
                    same_user=comparison.same_users,
                ),
            )
        )

    return SearchResult(
        domain=f"{search.cpc_segment.description} ({search.cpc_segment.section})",
        scanned=search.iterations[-1].result_count if search.iterations else 0,
        very_similar_count=sum(1 for m in matches if m.tier == "very_similar"),
        fallback=fallback,
        matches=matches,
    )


def _run_search_job(job_id: str, fields: IdeaFieldsModel) -> None:
    try:
        idea = Idea(problem=fields.problem, mechanism=fields.mechanism, users=fields.user)

        def on_progress(done: int, total: int) -> None:
            _set_job(job_id, scanned=round(done / total * 90))

        search = search_competing_patents(idea.summary, on_progress=on_progress)
        _set_job(job_id, scanned=90)
        comparisons = compare_patents(idea, search.patents)
        _set_job(job_id, scanned=98)
        result = _build_search_result(search, comparisons)
        _set_job(job_id, status="done", result=result, scanned=SEARCH_PROGRESS_TOTAL)
    except Exception as exc:  # job runs off-thread; surface the error via the status endpoint
        _set_job(job_id, status="error", error=str(exc))


@app.post("/api/search", response_model=SearchStartResponse)
def start_search(req: SearchRequest) -> SearchStartResponse:
    job_id = uuid.uuid4().hex
    with _jobs_lock:
        _jobs[job_id] = {
            "status": "running",
            "scanned": 0,
            "total": SEARCH_PROGRESS_TOTAL,
            "result": None,
            "error": None,
        }
    threading.Thread(target=_run_search_job, args=(job_id, req.fields), daemon=True).start()
    return SearchStartResponse(job_id=job_id)


@app.get("/api/search/{job_id}", response_model=SearchStatus)
def get_search_status(job_id: str) -> SearchStatus:
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job")
    return SearchStatus(**job)
