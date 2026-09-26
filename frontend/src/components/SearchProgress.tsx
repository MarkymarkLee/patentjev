// Screen 4: progress bar driven by the scanned/total counts from polling
// GET /api/search/{job_id}. total is 0 until the first poll returns.
export function SearchProgress({ scanned, total }: { scanned: number; total: number }) {
  const pct = total ? Math.round((scanned / total) * 100) : 0
  return (
    <div className="card">
      <h2>Scanning patents…</h2>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">
        {scanned.toLocaleString()} / {total ? total.toLocaleString() : '…'} abstracts
      </p>
    </div>
  )
}
