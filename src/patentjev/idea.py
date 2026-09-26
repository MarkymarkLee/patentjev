"""Load a structured idea summary from a plain-text file (see main_idea for the expected format)."""

from dataclasses import dataclass
from pathlib import Path

_FIELD_PREFIXES = {
    "problem": "problem:",
    "mechanism": "how it works:",
    "users": "for whom:",
}


@dataclass
class Idea:
    problem: str
    mechanism: str
    users: str

    @property
    def summary(self) -> str:
        return f"Problem: {self.problem}\nHow it works: {self.mechanism}\nFor whom: {self.users}"


def load_idea(path: str | Path = "main_idea") -> Idea:
    """Parse an idea file with `Problem:`, `How it works:`, and `For whom:` lines."""
    fields = {"problem": "", "mechanism": "", "users": ""}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        for field, prefix in _FIELD_PREFIXES.items():
            if line.lower().startswith(prefix):
                fields[field] = line[len(prefix) :].strip()
    missing = [field for field, value in fields.items() if not value]
    if missing:
        raise ValueError(f"{path}: missing fields {missing} (expected 'Problem:', 'How it works:', 'For whom:')")
    return Idea(**fields)
