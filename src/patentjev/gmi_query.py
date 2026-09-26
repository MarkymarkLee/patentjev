"""Generate/iterate patent-search keyword terms with GMI Cloud's OpenAI-compatible inference API."""

import json

from openai import OpenAI

from patentjev.config import GMI_API_KEY

GMI_BASE_URL = "https://api.gmi-serving.com/v1"
GMI_MODEL = "openai/gpt-5.4-mini"

_SYSTEM_PROMPT = """You generate keyword search phrases for a prior-art patent search tool.
The tool requires ALL returned phrases to appear (as literal substrings, case-insensitive) \
somewhere in a patent's title or abstract, so each phrase must be a short, plain technical term or \
noun phrase (1-3 words) likely to appear verbatim in patent text - not a full sentence or an \
invented combination. Respond with ONLY a JSON array of strings, no other text or markdown."""


def _client() -> OpenAI:
    return OpenAI(base_url=GMI_BASE_URL, api_key=GMI_API_KEY)


def _parse_terms(content: str) -> list[str]:
    text = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    terms = json.loads(text)
    if not isinstance(terms, list) or not all(isinstance(t, str) for t in terms):
        raise ValueError(f"Expected a JSON array of strings, got: {content!r}")
    return terms


def generate_search_terms(
    idea_summary: str,
    previous_terms: list[str] | None = None,
    previous_count: int | None = None,
) -> list[str]:
    """Ask GMI for search terms: one broad phrase on the first call, then append one narrowing
    phrase to the previous list each subsequent call (so match count shrinks monotonically)."""
    if previous_terms is None:
        user_prompt = (
            f"Invention idea:\n{idea_summary}\n\n"
            "Return a JSON array with exactly ONE short, generic phrase (1-3 words) naming the "
            "core concept, broad enough to match many related and competing patents."
        )
    else:
        user_prompt = (
            f"Invention idea:\n{idea_summary}\n\n"
            f"Current search phrases {previous_terms!r} (all required) returned {previous_count} "
            "results, which is too many.\n"
            "Return a JSON array containing all of the current phrases PLUS exactly one new, more "
            "specific phrase that narrows toward this idea, to reduce the result count."
        )
    response = _client().chat.completions.create(
        model=GMI_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("GMI returned an empty response.")
    return _parse_terms(content)
