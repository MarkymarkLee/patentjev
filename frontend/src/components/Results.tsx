import type { PatentMatch, SearchResult, Tier } from '../api/types'

const TIER_LABEL: Record<Tier, string> = {
  very_similar: 'Very similar',
  related: 'Related',
  closest: 'Closest found',
}

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

function ResultCard({ m }: { m: PatentMatch }) {
  return (
    <article className={`result-row tier-${m.tier}`}>
      <div className="result-main">
        <div className="result-kicker"><span className="badge">{TIER_LABEL[m.tier]}</span><span className="result-dot" /> <a href={m.url} target="_blank" rel="noreferrer">{m.publication_number}</a></div>
        <h3>{m.title}</h3>
        <p>{m.abstract}</p>
      </div>
      <div className="result-score"><strong>{m.score.toFixed(2)}</strong><span>match score</span></div>
      <div className="result-detail">
      {m.breakdown && (
        <div className="breakdown">
          <Bar label="Same problem" value={m.breakdown.same_problem} />
          <Bar label="Same mechanism" value={m.breakdown.same_mechanism} />
          <Bar label="Same user" value={m.breakdown.same_user} />
        </div>
      )}
      </div>
    </article>
  )
}

export function Results({ result, onReset }: { result: SearchResult; onReset: () => void }) {
  const verySimilar = result.matches.filter((match) => match.tier === 'very_similar').length
  const related = result.matches.filter((match) => match.tier === 'related').length
  const closest = result.matches.filter((match) => match.tier === 'closest').length
  const topScore = result.matches.length ? Math.max(...result.matches.map((match) => match.score)) : 0

  return (
    <section className="results-shell">
      <div className="results-nav"><div className="brand-mark"><span>✦</span> Patentjev</div><span className="nav-context">Prior art workspace</span><button className="secondary nav-button" onClick={onReset}>New search <span>⌘ K</span></button></div>
      <div className="results-header">
        <div><p className="eyebrow">Search overview</p><h1>Patent landscape</h1><p className="results-subtitle">A focused view of the closest prior art for <strong>{result.domain}</strong>.</p></div>
        <div className="scan-pill"><span className="pulse" /> Scan complete <span>{result.scanned.toLocaleString()} patents</span></div>
      </div>
      {result.fallback && <p className="notice">No close matches — showing the closest patents found.</p>}
      <div className="metric-grid">
        <div className="metric-card metric-featured"><span>Highest match</span><strong>{topScore.toFixed(2)}</strong><small>similarity score</small></div>
        <div className="metric-card"><span>Very similar</span><strong>{result.very_similar_count || verySimilar}</strong><small>strong overlap</small></div>
        <div className="metric-card"><span>Results surfaced</span><strong>{result.matches.length}</strong><small>from this scan</small></div>
      </div>
      <div className="results-content">
        <div className="result-list"><div className="list-heading"><h2>Closest matches</h2><span>{result.matches.length} documents</span></div>{result.matches.map((m) => <ResultCard key={m.publication_number} m={m} />)}</div>
        <aside className="insight-panel"><div className="panel-heading"><span className="panel-icon">◎</span><div><h2>Match distribution</h2><p>How results compare</p></div></div><div className="distribution"><div className="distribution-bar"><i style={{ width: `${result.matches.length ? (verySimilar / result.matches.length) * 100 : 0}%` }} /><i style={{ width: `${result.matches.length ? (related / result.matches.length) * 100 : 0}%` }} /><i style={{ width: `${result.matches.length ? (closest / result.matches.length) * 100 : 0}%` }} /></div><div className="legend"><span><i className="legend-dot very-dot" /> Very similar <b>{verySimilar}</b></span><span><i className="legend-dot related-dot" /> Related <b>{related}</b></span><span><i className="legend-dot closest-dot" /> Closest <b>{closest}</b></span></div></div><div className="tip"><strong>Research tip</strong><p>Start with the highest scoring result, then review the breakdown to understand where the overlap comes from.</p></div></aside>
      </div>
      <p className="disclaimer">
        These are similar patents in this dataset only. This is a triage tool, not a legal or novelty opinion.
      </p>
    </section>
  )
}
