"""Keyword search over the Google Patents Public Data BigQuery dataset.

Authenticates with Application Default Credentials, so run
`gcloud auth application-default login` (with BigQuery access) before use.
"""

from dataclasses import dataclass

from google.cloud import bigquery

from patentjev.config import GCP_PROJECT_ID

PATENTS_TABLE = "patents-public-data.patents.publications"

# Full table scan by default; cap billed bytes so a bad query can't run up cost.
DEFAULT_MAX_BYTES_BILLED = 350 * 1024**3  # 350 GB

_DOC_CTE = f"""
WITH doc AS (
  SELECT
    publication_number,
    (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title,
    (SELECT text FROM UNNEST(abstract_localized) WHERE language = 'en' LIMIT 1) AS abstract,
    publication_date,
    filing_date,
    ARRAY(SELECT name FROM UNNEST(assignee_harmonized)) AS assignees,
    ARRAY(SELECT code FROM UNNEST(cpc)) AS cpc_codes
  FROM `{PATENTS_TABLE}`
)
"""


@dataclass
class PatentResult:
    publication_number: str
    title: str | None
    abstract: str | None
    publication_date: int | None
    filing_date: int | None
    assignees: list[str]
    cpc_codes: list[str]


def get_client(project_id: str | None = None) -> bigquery.Client:
    """Create a BigQuery client authenticated via Application Default Credentials."""
    project = project_id or GCP_PROJECT_ID
    if not project:
        raise ValueError(
            "No GCP project id set. Add GCP_PROJECT_ID to .env or pass project_id explicitly."
        )
    return bigquery.Client(project=project)


def _build_where(
    terms: list[str], cpc_prefix: str | None
) -> tuple[str, list[bigquery.ScalarQueryParameter]]:
    if not terms:
        raise ValueError("At least one search term is required.")
    params: list[bigquery.ScalarQueryParameter] = []
    clauses = []
    for i, term in enumerate(terms):
        name = f"term_{i}"
        params.append(bigquery.ScalarQueryParameter(name, "STRING", f"%{term.lower()}%"))
        clauses.append(f"(LOWER(title) LIKE @{name} OR LOWER(abstract) LIKE @{name})")
    where = " AND ".join(clauses)
    if cpc_prefix:
        params.append(bigquery.ScalarQueryParameter("cpc_prefix", "STRING", cpc_prefix))
        where += " AND EXISTS(SELECT 1 FROM UNNEST(cpc_codes) AS c WHERE STARTS_WITH(c, @cpc_prefix))"
    return where, params


def estimate_bytes_processed(
    terms: list[str], cpc_prefix: str | None = None, project_id: str | None = None
) -> int:
    """Dry-run a search to estimate bytes processed (proxy for cost) before running it."""
    where, params = _build_where(terms, cpc_prefix)
    query = f"{_DOC_CTE}SELECT * FROM doc WHERE {where} LIMIT 10"
    client = get_client(project_id)
    job_config = bigquery.QueryJobConfig(dry_run=True, query_parameters=params)
    job = client.query(query, job_config=job_config)
    return job.total_bytes_processed or 0


def count_patents(
    terms: list[str],
    cpc_prefix: str | None = None,
    project_id: str | None = None,
    max_bytes_billed: int | None = DEFAULT_MAX_BYTES_BILLED,
) -> int:
    """Count patents matching all `terms` (AND, substring on title/abstract), optionally scoped to a CPC prefix."""
    where, params = _build_where(terms, cpc_prefix)
    query = f"{_DOC_CTE}SELECT COUNT(*) AS n FROM doc WHERE {where}"
    client = get_client(project_id)
    job_config = bigquery.QueryJobConfig(query_parameters=params, maximum_bytes_billed=max_bytes_billed)
    rows = list(client.query(query, job_config=job_config).result())
    return rows[0].n if rows else 0


def search_patents(
    terms: list[str],
    limit: int = 10,
    cpc_prefix: str | None = None,
    project_id: str | None = None,
    max_bytes_billed: int | None = DEFAULT_MAX_BYTES_BILLED,
) -> list[PatentResult]:
    """Search patents matching all `terms` (AND, case-insensitive substring on title/abstract)."""
    where, params = _build_where(terms, cpc_prefix)
    params.append(bigquery.ScalarQueryParameter("limit", "INT64", limit))
    query = f"{_DOC_CTE}SELECT * FROM doc WHERE {where} LIMIT @limit"
    client = get_client(project_id)
    job_config = bigquery.QueryJobConfig(query_parameters=params, maximum_bytes_billed=max_bytes_billed)
    rows = client.query(query, job_config=job_config).result()
    return [
        PatentResult(
            publication_number=row.publication_number,
            title=row.title,
            abstract=row.abstract,
            publication_date=row.publication_date,
            filing_date=row.filing_date,
            assignees=list(row.assignees),
            cpc_codes=list(row.cpc_codes),
        )
        for row in rows
    ]
