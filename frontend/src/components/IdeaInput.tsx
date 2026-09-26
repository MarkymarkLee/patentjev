// Screen 1: free-text idea box. Submitting calls POST /api/understand (via App).
import { useState } from 'react'

export function IdeaInput({ onSubmit, busy }: { onSubmit: (idea: string) => void; busy: boolean }) {
  const [idea, setIdea] = useState('')
  return (
    <form
      className="idea-form card"
      onSubmit={(e) => {
        e.preventDefault()
        if (idea.trim()) onSubmit(idea.trim())
      }}
    >
      <div className="form-heading"><div><label htmlFor="idea">What are you building?</label><p>Start with a plain-language description. We’ll identify the core problem, mechanism, and user.</p></div><span className="form-step">01 / 01</span></div>
      <textarea
        id="idea"
        rows={5}
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="e.g. A smart ring that estimates blood glucose from light sensors and alerts diabetics before a low."
      />
      <div className="form-footer"><span className="field-hint">Be specific about what makes your idea different.</span><button type="submit" disabled={busy || !idea.trim()}>{busy ? 'Reading your idea…' : <>Start discovery <span>↗</span></>}</button></div>
    </form>
  )
}
