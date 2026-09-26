"""Compare found patents against the idea using Jev (relevancy, mechanism, users, problem)."""

from dataclasses import dataclass

from typesafe_sdk import Noul, Score, TypeSafeClient

from patentjev.bigquery_search import PatentResult
from patentjev.config import TYPESAFE_API_KEY
from patentjev.idea import Idea

_RELEVANCY_CRITERIA = ["Not relevant", "Somewhat relevant", "Highly relevant"]


@dataclass
class PatentComparison:
    publication_number: str
    title: str | None
    relevancy: float
    relevancy_confidence: float
    same_mechanism: float
    same_users: float
    same_problem: float


def compare_patent(idea: Idea, patent: PatentResult) -> PatentComparison:
    """Ask Jev how one patent relates to the idea across relevancy, mechanism, users, and problem."""
    state = {
        "idea": {"problem": idea.problem, "mechanism": idea.mechanism, "users": idea.users},
        "patent": {"title": patent.title, "abstract": patent.abstract},
    }
    with TypeSafeClient(api_key=TYPESAFE_API_KEY) as client:
        response = client.system_one(
            state,
            {
                "relevancy": Score(
                    instructions="How relevant is the patent as prior art or competition for the idea overall?",
                    criteria=_RELEVANCY_CRITERIA,
                ),
                "mechanism": Noul(
                    instructions="The patent uses substantially the same underlying mechanism or "
                    "technical approach as the idea's mechanism.",
                ),
                "users": Noul(
                    instructions="The patent targets substantially the same users or customers as "
                    "the idea's users.",
                ),
                "problem": Noul(
                    instructions="The patent addresses substantially the same problem as the idea's "
                    "problem.",
                ),
            },
        )
    return PatentComparison(
        publication_number=patent.publication_number,
        title=patent.title,
        relevancy=response.scores["relevancy"].score,
        relevancy_confidence=response.scores["relevancy"].confidence,
        same_mechanism=response.nouls["mechanism"].noul,
        same_users=response.nouls["users"].noul,
        same_problem=response.nouls["problem"].noul,
    )


def compare_patents(idea: Idea, patents: list[PatentResult]) -> list[PatentComparison]:
    return [compare_patent(idea, patent) for patent in patents]
