// In-browser fake backend so the UI can be built before the real one exists.
// It mimics the real API's shapes and timing; none of the logic here (the
// word-count scoring, hardcoded patents) reflects how the real backend works.
import type { Api } from './client'
import type { FieldName, PatentMatch, SearchStatus } from './types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const GATE = 0.6
const TOTAL = 3000

const QUESTIONS: Record<FieldName, string> = {
  problem: 'What specific problem does this solve, and for what situation?',
  mechanism: 'How does it work — what sensor, method, or technique does it use?',
  user: 'Who exactly uses it — consumers, clinicians, farmers, manufacturers?',
}

const MATCHES: PatentMatch[] = [
  {
    publication_number: 'US-2021123456-A1',
    title: 'Wearable device for continuous non-invasive glucose monitoring',
    abstract:
      'A wrist-worn device uses optical sensors to estimate blood glucose levels continuously and alerts the user via a paired mobile application when levels leave a configured range.',
    url: 'https://patents.google.com/patent/US2021123456A1',
    score: 0.91,
    tier: 'very_similar',
    breakdown: { same_problem: 0.94, same_mechanism: 0.82, same_user: 0.9 },
  },
  {
    publication_number: 'US-10987654-B2',
    title: 'Smart ring with photoplethysmography for metabolic tracking',
    abstract:
      'A ring-form wearable captures PPG signals and applies a trained model to infer metabolic markers, syncing results to a cloud dashboard.',
    url: 'https://patents.google.com/patent/US10987654B2',
    score: 0.84,
    tier: 'very_similar',
    breakdown: { same_problem: 0.8, same_mechanism: 0.88, same_user: 0.77 },
  },
  {
    publication_number: 'EP-3456789-A1',
    title: 'Sweat-based biomarker patch for athletes',
    abstract:
      'An adhesive patch analyses sweat composition to report hydration and electrolyte levels to athletes during exercise.',
    url: 'https://patents.google.com/patent/EP3456789A1',
    score: 0.68,
    tier: 'related',
    breakdown: null,
  },
]

// Fake job store: we only remember when each job started, and derive progress
// from elapsed time, so the progress bar fills over `durationMs`.
const jobs = new Map<string, { started: number; durationMs: number }>()

export const mockApi: Api = {
  async understand({ idea, answers }) {
    await sleep(600)
    // Fake "specificity" score: longer ideas score higher; answered fields pass.
    // Short ideas (< ~12 words) trigger clarify questions, so you can test that screen.
    const answered = new Set(answers.map((a) => a.field))
    const words = idea.trim().split(/\s+/).length
    const base = Math.min(0.9, 0.3 + words / 40)
    const scores = {
      problem: answered.has('problem') ? 0.85 : base,
      mechanism: answered.has('mechanism') ? 0.85 : base - 0.1,
      user: answered.has('user') ? 0.85 : base + 0.05,
    }
    const answerFor = (f: FieldName) => answers.find((a) => a.field === f)?.answer
    return {
      fields: {
        problem: answerFor('problem') ?? idea,
        mechanism: answerFor('mechanism') ?? idea,
        user: answerFor('user') ?? 'Unspecified',
      },
      scores,
      questions: (Object.keys(scores) as FieldName[])
        .filter((f) => scores[f] < GATE)
        .map((field) => ({ field, question: QUESTIONS[field] })),
    }
  },

  async startSearch() {
    await sleep(200)
    const job_id = crypto.randomUUID()
    jobs.set(job_id, { started: Date.now(), durationMs: 4000 })
    return { job_id }
  },

  async searchStatus(jobId): Promise<SearchStatus> {
    const job = jobs.get(jobId)
    if (!job) return { status: 'error', scanned: 0, total: 0, result: null, error: 'Unknown job' }
    const frac = Math.min(1, (Date.now() - job.started) / job.durationMs)
    const scanned = Math.round(frac * TOTAL)
    if (frac < 1) return { status: 'running', scanned, total: TOTAL, result: null, error: null }
    return {
      status: 'done',
      scanned: TOTAL,
      total: TOTAL,
      error: null,
      result: {
        domain: 'Wearable health sensors (A61B5)',
        scanned: TOTAL,
        very_similar_count: MATCHES.filter((m) => m.tier === 'very_similar').length,
        fallback: false,
        matches: MATCHES,
      },
    }
  },
}
