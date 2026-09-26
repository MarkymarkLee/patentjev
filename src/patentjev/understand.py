"""Extract idea fields with GMI and gate each with a Jev Noul ("specific enough to search?")."""

import json

from openai import OpenAI
from typesafe_sdk import Noul, TypeSafeClient

from patentjev.config import GMI_API_KEY, TYPESAFE_API_KEY
from patentjev.gmi_query import GMI_BASE_URL, GMI_MODEL

FIELDS = ("problem", "mechanism", "user")
GATE = 0.6

FIELD_QUESTIONS = {
    "problem": "What specific problem does this solve, and for what situation?",
    "mechanism": "How does it work — what sensor, method, or technique does it use?",
    "user": "Who exactly uses it — consumers, clinicians, farmers, manufacturers?",
}

_EXTRACT_SYSTEM_PROMPT = """Extract three short fields from an invention idea description:
"problem" (what problem it solves), "mechanism" (how it works - sensor/method/technique), and
"user" (who uses it). Respond with ONLY a JSON object with keys "problem", "mechanism", "user",
each a short phrase. If the idea text doesn't say enough for a field, make your best short guess."""


def _gmi_client() -> OpenAI:
    return OpenAI(base_url=GMI_BASE_URL, api_key=GMI_API_KEY)


def extract_idea_fields(idea: str) -> dict[str, str]:
    """Best-guess problem/mechanism/user fields from free-text idea, via GMI."""
    response = _gmi_client().chat.completions.create(
        model=GMI_MODEL,
        messages=[
            {"role": "system", "content": _EXTRACT_SYSTEM_PROMPT},
            {"role": "user", "content": idea},
        ],
        temperature=0.2,
    )
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("GMI returned an empty response.")
    text = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    fields = json.loads(text)
    return {name: str(fields.get(name, "")) for name in FIELDS}


def score_idea_fields(fields: dict[str, str]) -> dict[str, float]:
    """Score each field 0-1 with Jev: is it specific enough to search patents on?"""
    with TypeSafeClient(api_key=TYPESAFE_API_KEY) as client:
        response = client.system_one(
            {name: fields[name] for name in FIELDS},
            {
                name: Noul(
                    instructions=f"The '{name}' field is specific enough (not vague or generic) "
                    "to use as a patent search term."
                )
                for name in FIELDS
            },
        )
    return {name: response.nouls[name].noul for name in FIELDS}
