import { useState } from 'react'
import type { ClarifyAnswer, ClarifyQuestion } from '../api/types'

interface Props {
  questions: ClarifyQuestion[]
  round: number
  maxRounds: number
  busy: boolean
  onAnswer: (answers: ClarifyAnswer[]) => void
  onSkip: () => void
}

export function ClarifyPanel({ questions, round, maxRounds, busy, onAnswer, onSkip }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const filled = questions.filter((q) => draft[q.field]?.trim())
  return (
    <div className="card">
      <h2>
        A bit more detail <span className="muted">(round {round} of {maxRounds})</span>
      </h2>
      {questions.map((q) => (
        <div key={q.field} className="field">
          <label htmlFor={`q-${q.field}`}>{q.question}</label>
          <input
            id={`q-${q.field}`}
            value={draft[q.field] ?? ''}
            onChange={(e) => setDraft({ ...draft, [q.field]: e.target.value })}
          />
        </div>
      ))}
      <div className="row">
        <button
          disabled={busy || filled.length === 0}
          onClick={() => onAnswer(filled.map((q) => ({ field: q.field, answer: draft[q.field].trim() })))}
        >
          {busy ? 'Checking…' : 'Continue'}
        </button>
        <button className="secondary" disabled={busy} onClick={onSkip}>
          Search anyway
        </button>
      </div>
    </div>
  )
}
