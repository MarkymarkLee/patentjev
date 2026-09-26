"""End-to-end pipeline: CPC segment via Jev, iterative query generation via GMI, search via BigQuery."""

from collections.abc import Callable
from dataclasses import dataclass

from patentjev.bigquery_search import PatentResult, count_patents, search_patents
from patentjev.cpc_classifier import CpcSegment, classify_cpc_section
from patentjev.gmi_query import generate_search_terms

DEFAULT_RESULT_THRESHOLD = 50
DEFAULT_MAX_ITERATIONS = 5


@dataclass
class SearchIteration:
    terms: list[str]
    result_count: int


@dataclass
class IdeaSearchResult:
    cpc_segment: CpcSegment
    iterations: list[SearchIteration]
    patents: list[PatentResult]


def search_competing_patents(
    idea_summary: str,
    result_threshold: int = DEFAULT_RESULT_THRESHOLD,
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
    final_limit: int = 20,
    on_progress: Callable[[int, int], None] | None = None,
    use_cache: bool = False,
) -> IdeaSearchResult:
    """Classify the idea's CPC segment, then iterate patent search terms from broad to narrow.

    Stops once the result count drops to or below `result_threshold`, or after `max_iterations`.
    `on_progress(done, total)` is called after each stage, for callers that want to report progress.
    """
    total_steps = max_iterations + 2  # classify + up to max_iterations searches + final fetch
    step = 0

    def report() -> None:
        if on_progress:
            on_progress(step, total_steps)

    cpc_segment = classify_cpc_section(idea_summary)
    step += 1
    report()

    terms = generate_search_terms(idea_summary)
    count = count_patents(terms, cpc_prefix=cpc_segment.section, use_cache=use_cache)
    iterations = [SearchIteration(terms=terms, result_count=count)]
    step += 1
    report()

    while count > result_threshold and len(iterations) < max_iterations:
        terms = generate_search_terms(idea_summary, previous_terms=terms, previous_count=count)
        count = count_patents(terms, cpc_prefix=cpc_segment.section, use_cache=use_cache)
        iterations.append(SearchIteration(terms=terms, result_count=count))
        step += 1
        report()

    patents = search_patents(terms, limit=final_limit, cpc_prefix=cpc_segment.section, use_cache=use_cache)
    step = total_steps
    report()
    return IdeaSearchResult(cpc_segment=cpc_segment, iterations=iterations, patents=patents)
