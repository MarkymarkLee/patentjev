"""Classify a patent idea into a top-level CPC section (segment) using Jev (TypeSafe)."""

from dataclasses import dataclass

from typesafe_sdk import Choice, TypeSafeClient

from patentjev.config import TYPESAFE_API_KEY

# The 9 CPC sections: https://www.cooperativepatentclassification.org/cpcSchemeAndDefinitions
CPC_SECTIONS = {
    "A": "Human necessities: agriculture, foodstuffs, personal or domestic articles, health, life-saving, amusement",
    "B": "Performing operations, transporting: separating/mixing, shaping, printing, vehicles, packing, transport",
    "C": "Chemistry and metallurgy",
    "D": "Textiles and paper",
    "E": "Fixed constructions: building, civil engineering, mining, water/sewage, roads and bridges",
    "F": "Mechanical engineering, lighting, heating, weapons, blasting, engines, pumps",
    "G": "Physics: instruments, computing, optics, measuring, control, nucleonics",
    "H": "Electricity: electric elements, power generation/distribution, communication, electronics, semiconductors",
    "Y": "Emerging cross-sectional technologies (climate change mitigation, e-commerce, nanotechnology)",
}


@dataclass
class CpcSegment:
    section: str
    description: str
    confidence: float
    probabilities: dict[str, float]


def classify_cpc_section(idea_summary: str) -> CpcSegment:
    """Pick the CPC section that best fits a patent idea, to scope a BigQuery search."""
    with TypeSafeClient(api_key=TYPESAFE_API_KEY) as client:
        response = client.system_one(
            idea_summary,
            {
                "cpc_section": Choice(
                    instructions="Which CPC (Cooperative Patent Classification) section best covers this invention idea?",
                    criteria=CPC_SECTIONS,
                ),
            },
        )
    answer = response.choices["cpc_section"]
    return CpcSegment(
        section=answer.choice,
        description=CPC_SECTIONS[answer.choice],
        confidence=answer.confidence,
        probabilities=answer.probabilities,
    )
