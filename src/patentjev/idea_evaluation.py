"""Full idea-to-verdict pipeline: patent search (Jev + GMI + BigQuery) plus Jev-based comparison."""

from dataclasses import dataclass

from patentjev.idea import Idea, load_idea
from patentjev.idea_search import (
    DEFAULT_MAX_ITERATIONS,
    DEFAULT_RESULT_THRESHOLD,
    IdeaSearchResult,
    search_competing_patents,
)
from patentjev.patent_comparison import PatentComparison, compare_patents


@dataclass
class IdeaEvaluation:
    idea: Idea
    search: IdeaSearchResult
    comparisons: list[PatentComparison]


def evaluate_idea(
    idea_path: str = "main_idea",
    result_threshold: int = DEFAULT_RESULT_THRESHOLD,
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
    final_limit: int = 20,
) -> IdeaEvaluation:
    """Load the idea, search for competing patents, then have Jev compare each one to the idea."""
    idea = load_idea(idea_path)
    search = search_competing_patents(
        idea.summary,
        result_threshold=result_threshold,
        max_iterations=max_iterations,
        final_limit=final_limit,
    )
    comparisons = compare_patents(idea, search.patents)
    return IdeaEvaluation(idea=idea, search=search, comparisons=comparisons)
