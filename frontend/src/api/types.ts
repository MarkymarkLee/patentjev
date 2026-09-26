// API contract between frontend and backend. Mirrored in frontend/API.md —
// change both together, and tell the backend side when you do.

export type FieldName = 'problem' | 'mechanism' | 'user'

// The three structured fields the LLM extracts from a free-text idea.
export interface IdeaFields {
  problem: string
  mechanism: string
  user: string
}

export interface ClarifyAnswer {
  field: FieldName
  answer: string
}

// POST /api/understand
export interface UnderstandRequest {
  idea: string
  answers: ClarifyAnswer[]
}

export interface ClarifyQuestion {
  field: FieldName
  question: string
}

export interface UnderstandResponse {
  fields: IdeaFields
  // Jev "specific enough to search?" score per field, 0–1
  scores: Record<FieldName, number>
  // One per field scoring under the gate threshold; empty = ready to search
  questions: ClarifyQuestion[]
}

// POST /api/search
export interface SearchRequest {
  fields: IdeaFields
}

export interface SearchStartResponse {
  job_id: string
}

export type Tier = 'very_similar' | 'related' | 'closest'

export interface Breakdown {
  same_problem: number
  same_mechanism: number
  same_user: number
}

export interface PatentMatch {
  publication_number: string
  title: string
  abstract: string
  url: string
  score: number
  tier: Tier
  // Stage 2 explain; null until/unless the backend computes it
  breakdown: Breakdown | null
}

export interface SearchResult {
  domain: string
  scanned: number
  very_similar_count: number
  // true when nothing cleared the thresholds and results are the top-3 fallback
  fallback: boolean
  matches: PatentMatch[]
}

// GET /api/search/{job_id}
export interface SearchStatus {
  status: 'running' | 'done' | 'error'
  scanned: number
  total: number
  result: SearchResult | null
  error: string | null
}
