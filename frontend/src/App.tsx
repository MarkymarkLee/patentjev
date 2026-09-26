import { useState } from 'react'
import { api, runSearch } from './api/client'
import type { ClarifyAnswer, ClarifyQuestion, IdeaFields, SearchResult } from './api/types'
import { ClarifyPanel } from './components/ClarifyPanel'
import { FieldsReview } from './components/FieldsReview'
import { IdeaInput } from './components/IdeaInput'
import { Results } from './components/Results'
import { SearchProgress } from './components/SearchProgress'

const MAX_CLARIFY_ROUNDS = 2

type Step =
  | { kind: 'input' }
  | { kind: 'clarify'; questions: ClarifyQuestion[]; fields: IdeaFields }
  | { kind: 'review'; fields: IdeaFields }
  | { kind: 'searching'; scanned: number; total: number }
  | { kind: 'results'; result: SearchResult }

export default function App() {
  const [step, setStep] = useState<Step>({ kind: 'input' })
  const [idea, setIdea] = useState('')
  const [answers, setAnswers] = useState<ClarifyAnswer[]>([])
  const [round, setRound] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function search(fields: IdeaFields) {
    setError(null)
    setStep({ kind: 'searching', scanned: 0, total: 0 })
    try {
      const result = await runSearch({ fields }, (scanned, total) =>
        setStep({ kind: 'searching', scanned, total }),
      )
      setStep({ kind: 'results', result })
    } catch (e) {
      setError(String(e))
      setStep({ kind: 'review', fields })
    }
  }

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
          onSkip={() => setStep({ kind: 'review', fields: step.fields })}
        />
      )}
      {step.kind === 'review' && <FieldsReview fields={step.fields} onConfirm={search} onBack={reset} />}
      {step.kind === 'searching' && <SearchProgress scanned={step.scanned} total={step.total} />}
      {step.kind === 'results' && <Results result={step.result} onReset={reset} />}
    </main>
  )
}
