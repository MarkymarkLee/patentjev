// Screen 5: header, tiered result cards, and the not-legal-advice disclaimer.
// Tiering and the top-3 fallback are decided by the backend; we only display.
import type { PatentMatch, SearchResult, Tier } from '../api/types'

const TIER_LABEL: Record<Tier, string> = {
  very_similar: 'Very similar',
  related: 'Related',
  closest: 'Closest found',
}

// One row of the stage 2 breakdown: label, 0–1 bar, numeric value.
function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bar">
      <span>{label}</span>
      <div className="progress small">
        <div className="progress-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="muted">{value.toFixed(2)}</span>
    </div>
  )
}

// A single patent. The tier-* class sets the colored left border and badge color.
function ResultCard({ m }: { m: PatentMatch }) {
  return (
    <article className={`card result tier-${m.tier}`}>
      <header>
        <span className="badge">{TIER_LABEL[m.tier]}</span>
        <span className="score">{m.score.toFixed(2)}</span>
      </header>
      <h3>{m.title}</h3>
      <a href={m.url} target="_blank" rel="noreferrer">
        {m.publication_number}
      </a>
      <p>{m.abstract}</p>
      {/* Stage 2 breakdown is optional — backend sends null if it didn't compute it */}
      {m.breakdown && (
        <div className="breakdown">
          <Bar label="Same problem" value={m.breakdown.same_problem} />
          <Bar label="Same mechanism" value={m.breakdown.same_mechanism} />
          <Bar label="Same user" value={m.breakdown.same_user} />
        </div>
      )}
    </article>
  )
}

export function Results({ result, onReset }: { result: SearchResult; onReset: () => void }) {
  return (
    <section>
      <div className="results-header">
        <h2>
          Scanned {result.scanned.toLocaleString()} patents in {result.domain}, {result.very_similar_count} very
          similar
        </h2>
        <button className="secondary" onClick={onReset}>
          New search
        </button>
      </div>
      {result.fallback && <p className="notice">No close matches — showing the closest patents found.</p>}
      {result.matches.map((m) => (
        <ResultCard key={m.publication_number} m={m} />
      ))}
      <p className="disclaimer">
        These are similar patents in this dataset only. This is a triage tool, not a legal or novelty opinion.
      </p>
    </section>
  )
}
