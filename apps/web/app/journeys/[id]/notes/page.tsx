'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Phase = 'BEFORE' | 'DURING' | 'AFTER' | 'INTEGRATION'

interface Note {
  id: string
  type: string
  content: string | null
  phase: Phase | null
  mood: number | null
  bodyFeel: number | null
  timestamp: string
}

const PHASES: Phase[] = ['BEFORE', 'DURING', 'AFTER', 'INTEGRATION']

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function MoodBar({ label, value }: { label: string; value: number }) {
  const pct = ((value - 1) / 9) * 100
  const color = value <= 3 ? '#f87171' : value <= 6 ? '#fcd34d' : '#6ee7b7'
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div className="row-between" style={{ marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</span>
        <span style={{ color, fontWeight: 600, fontSize: '0.875rem' }}>{value}/10</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function NotesPage() {
  const params = useParams()
  const router = useRouter()
  const journeyId = params.id as string
  const supabase = createSupabaseBrowserClient()

  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [content, setContent] = useState('')
  const [phase, setPhase] = useState<Phase>('DURING')
  const [mood, setMood] = useState(5)
  const [bodyFeel, setBodyFeel] = useState(5)
  const [showMoodFields, setShowMoodFields] = useState(false)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return null }
    return session.access_token
  }, [supabase, router])

  const fetchNotes = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/journeys/${journeyId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.data) {
        setNotes(json.data)
      } else {
        setError(json.error?.message || 'Failed to load notes')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [journeyId, getToken])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const token = await getToken()
    if (!token) return

    const body: Record<string, unknown> = {
      type: 'TEXT',
      content: content.trim(),
      phase,
    }
    if (showMoodFields) {
      body.mood = mood
      body.bodyFeel = bodyFeel
    }

    try {
      const res = await fetch(`/api/journeys/${journeyId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.data) {
        setContent('')
        setMood(5)
        setBodyFeel(5)
        setShowMoodFields(false)
        fetchNotes()
      } else {
        setSubmitError(json.error?.message || 'Failed to save note')
      }
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: '1.5rem' }}>
        <Link href={`/journeys/${journeyId}`} className="btn btn-ghost" style={{ minHeight: 40, padding: '0 0.875rem', fontSize: '0.875rem' }}>
          ← Journey
        </Link>
        <h1 style={{ flex: 1, fontSize: '1.375rem' }}>Notes</h1>
      </div>

      {/* Add Note Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Quick Note</h2>
        <form onSubmit={handleSubmit}>
          {/* Phase selector */}
          <div style={{ marginBottom: '1rem' }}>
            <span className="label">Phase</span>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {PHASES.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`tab ${phase === p ? 'active' : ''}`}
                  onClick={() => setPhase(p)}
                  style={{ fontSize: '0.8rem' }}
                >
                  {p === 'INTEGRATION' ? 'Integrate' : p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="note-content">Note</label>
            <textarea
              id="note-content"
              className="input"
              placeholder="Capture a moment, feeling, or observation…"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Toggle mood fields */}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 36, padding: '0 0.875rem', fontSize: '0.8rem', marginBottom: '1rem' }}
            onClick={() => setShowMoodFields(!showMoodFields)}
          >
            {showMoodFields ? '− Hide mood tracking' : '+ Add mood tracking'}
          </button>

          {showMoodFields && (
            <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">
                  Mood: <strong style={{ color: 'var(--text)' }}>{mood}</strong>/10
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mood}
                  onChange={e => setMood(Number(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">
                  Body Feel: <strong style={{ color: 'var(--text)' }}>{bodyFeel}</strong>/10
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={bodyFeel}
                  onChange={e => setBodyFeel(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {submitError && (
            <div className="error-msg" style={{ marginBottom: '1rem' }}>{submitError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Saving…' : 'Save Note'}
          </button>
        </form>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="loading">Loading notes…</div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗒️</div>
          <h3>No notes yet</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Add your first quick note above.
          </p>
        </div>
      ) : (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>All Notes ({notes.length})</h2>
          <div className="stack">
            {[...notes].reverse().map(note => (
              <div key={note.id} className="card">
                <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    {note.phase && (
                      <span className={`badge phase-${note.phase}`} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '0.7rem', fontWeight: 700 }}>
                        {note.phase}
                      </span>
                    )}
                    <span className="badge" style={{ fontSize: '0.65rem' }}>{note.type}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {formatTime(note.timestamp)}
                  </span>
                </div>

                {note.content && (
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: (note.mood || note.bodyFeel) ? '0.75rem' : 0, whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </p>
                )}

                {(note.mood || note.bodyFeel) && (
                  <div style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                    {note.mood && <MoodBar label="Mood" value={note.mood} />}
                    {note.bodyFeel && <MoodBar label="Body Feel" value={note.bodyFeel} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
