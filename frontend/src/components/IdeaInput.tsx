// Screen 1: free-text idea box. Submitting calls POST /api/understand (via App).
import { useState } from 'react'

export function IdeaInput({ onSubmit, busy }: { onSubmit: (idea: string) => void; busy: boolean }) {
  const [idea, setIdea] = useState('')
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        if (idea.trim()) onSubmit(idea.trim())
      }}
    >
      <label htmlFor="idea">Describe your startup idea</label>
      <textarea
        id="idea"
        rows={5}
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="e.g. A smart ring that estimates blood glucose from light sensors and alerts diabetics before a low."
      />
      <button type="submit" disabled={busy || !idea.trim()}>
        {busy ? 'Reading your idea…' : 'Check for similar patents'}
      </button>
    </form>
  )
}
