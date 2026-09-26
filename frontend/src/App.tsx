import { useState } from 'react'
import { api, runSearch } from './api/client'
import type { ClarifyAnswer, ClarifyQuestion, IdeaFields, SearchResult } from './api/types'
import { ClarifyPanel } from './components/ClarifyPanel'
import { FieldsReview } from './components/FieldsReview'
import { IdeaInput } from './components/IdeaInput'
import { Results } from './components/Results'
import { SearchProgress } from './components/SearchProgress'

// Top-level screen controller. The app is a linear wizard:
//   input → clarify (0–2 rounds) → review → searching → results
// Exactly one screen renders at a time, chosen by `step.kind`.

// After this many clarify rounds we stop asking and go to review regardless.
const MAX_CLARIFY_ROUNDS = 2

// Each variant carries only the data its screen needs, so TypeScript
// guarantees e.g. `step.result` exists whenever we render the results screen.
type Step =
  | { kind: 'input' }
  | { kind: 'clarify'; questions: ClarifyQuestion[]; fields: IdeaFields }
  | { kind: 'review'; fields: IdeaFields }
  | { kind: 'searching'; scanned: number; total: number }
  | { kind: 'results'; result: SearchResult }

export default function App() {
  const [step, setStep] = useState<Step>({ kind: 'input' })
  // The original free-text idea; re-sent on every clarify round.
  const [idea, setIdea] = useState('')
  // Every clarify answer so far, across rounds. The backend re-extracts
  // fields from idea + all answers each time, so we always send the full list.
  const [answers, setAnswers] = useState<ClarifyAnswer[]>([])
  // Current clarify round (1-based); 0 before the first understand call.
  const [round, setRound] = useState(0)
  // True while an /understand request is in flight (disables buttons).
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calls POST /api/understand, then decides where to go next:
  // - backend returned questions and we still have rounds left → clarify screen
  // - otherwise (fields are specific enough, or out of rounds) → review screen
  async function understand(text: string, allAnswers: ClarifyAnswer[], nextRound: number) {
    setBusy(true)
    setError(null)
    try {
      const res = await api.understand({ idea: text, answers: allAnswers })
      if (res.questions.length > 0 && nextRound <= MAX_CLARIFY_ROUNDS) {
        setRound(nextRound)
        setStep({ kind: 'clarify', questions: res.questions, fields: res.fields })
      } else {
        setStep({ kind: 'review', fields: res.fields })
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  // Starts the patent scan and follows it to completion. runSearch handles the
  // start-job + poll loop; we just update the progress bar on each poll.
  async function search(fields: IdeaFields) {
    setError(null)
    setStep({ kind: 'searching', scanned: 0, total: 0 })
    try {
      const result = await runSearch({ fields }, (scanned, total) =>
        setStep({ kind: 'searching', scanned, total }),
      )
      setStep({ kind: 'results', result })
    } catch (e) {
      // On failure, drop back to review so the user can retry without retyping.
      setError(String(e))
      setStep({ kind: 'review', fields })
    }
  }

  // Clears everything and returns to the idea input screen.
  function reset() {
    setIdea('')
    setAnswers([])
    setRound(0)
    setError(null)
    setStep({ kind: 'input' })
  }

  return (
    <main>
      <h1>Patent Matcher</h1>
      <p className="muted">Is your idea already patented? Find the closest patents in seconds.</p>
      {error && <p className="error">{error}</p>}

      {step.kind === 'input' && (
        <IdeaInput
          busy={busy}
          onSubmit={(text) => {
            setIdea(text)
            understand(text, [], 1)
          }}
        />
      )}
      {step.kind === 'clarify' && (
        <ClarifyPanel
          // key={round} remounts the panel each round so old answers don't linger in the inputs
          key={round}
          questions={step.questions}
          round={round}
          maxRounds={MAX_CLARIFY_ROUNDS}
          busy={busy}
          onAnswer={(newAnswers) => {
            const all = [...answers, ...newAnswers]
            setAnswers(all)
            understand(idea, all, round + 1)
          }}
          // "Search anyway": use whatever fields we have, even if vague
          onSkip={() => setStep({ kind: 'review', fields: step.fields })}
        />
      )}
      {step.kind === 'review' && <FieldsReview fields={step.fields} onConfirm={search} onBack={reset} />}
      {step.kind === 'searching' && <SearchProgress scanned={step.scanned} total={step.total} />}
      {step.kind === 'results' && <Results result={step.result} onReset={reset} />}
    </main>
  )
}
