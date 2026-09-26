import { useState } from 'react'
import type { FieldName, IdeaFields } from '../api/types'

const LABELS: Record<FieldName, string> = {
  problem: 'Problem',
  mechanism: 'How it works',
  user: 'For whom',
}

export function FieldsReview({
  fields,
  onConfirm,
  onBack,
}: {
  fields: IdeaFields
  onConfirm: (fields: IdeaFields) => void
  onBack: () => void
}) {
  const [edited, setEdited] = useState(fields)
  return (
    <div className="card">
      <h2>Here's what we'll search for</h2>
      {(Object.keys(LABELS) as FieldName[]).map((f) => (
        <div key={f} className="field">
          <label htmlFor={`f-${f}`}>{LABELS[f]}</label>
          <textarea
            id={`f-${f}`}
            rows={2}
            value={edited[f]}
            onChange={(e) => setEdited({ ...edited, [f]: e.target.value })}
          />
        </div>
      ))}
      <div className="row">
        <button onClick={() => onConfirm(edited)}>Search patents</button>
        <button className="secondary" onClick={onBack}>
          Start over
        </button>
      </div>
    </div>
  )
}
