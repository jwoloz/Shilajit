'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Phase = 'BEFORE' | 'DURING' | 'AFTER' | 'INTEGRATION'

interface Entry {
  id: string
  content: string
  phase: Phase
  timestamp: string
}

const PHASES: Phase[] = ['BEFORE', 'DURING', 'AFTER', 'INTEGRATION']

const PHASE_LABELS: Record<Phase, string> = {
  BEFORE: 'Before',
  DURING: 'During',
  AFTER: 'After',
  INTEGRATION: 'Integration',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function EntriesPage() {
  const params = useParams()
  const router = useRouter()
  const journeyId = params.id as string
  const supabase = createSupabaseBrowserClient()

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [phase, setPhase] = useState<Phase>('DURING')
  const [content, setContent] = useState('')
  const [autoExtract, setAutoExtract] = useState(false)
  const [filterPhase, setFilterPhase] = useState<Phase | 'ALL'>('ALL')

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return null }
    return session.access_token
  }, [supabase, router])

  const fetchEntries = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      // Entries are returned embedded in the journey GET response
      const journeyRes = await fetch(`/api/journeys/${journeyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await journeyRes.json()
      if (json.data?.entries) {
        setEntries(json.data.entries)
      } else {
        setError(json.error?.message || 'Failed to load entries')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [journeyId, getToken])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/journeys/${journeyId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          phase,
          timestamp: new Date().toISOString(),
          autoExtractInsights: autoExtract,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setContent('')
        fetchEntries()
      } else {
        setSubmitError(json.error?.message || 'Failed to save entry')
      }
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const displayed = filterPhase === 'ALL'
    ? entries
    : entries.filter(e => e.phase === filterPhase)

  const grouped = PHASES.reduce<Record<Phase, Entry[]>>((acc, p) => {
    acc[p] = displayed.filter(e => e.phase === p)
    return acc
  }, { BEFORE: [], DURING: [], AFTER: [], INTEGRATION: [] })

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: '1.5rem' }}>
        <Link href={`/journeys/${journeyId}`} className="btn btn-ghost" style={{ minHeight: 40, padding: '0 0.875rem', fontSize: '0.875rem' }}>
          ← Journey
        </Link>
        <h1 style={{ flex: 1, fontSize: '1.375rem' }}>Journal Entries</h1>
      </div>

      {/* Add Entry Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add Entry</h2>
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
                >
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="content">Entry</label>
            <textarea
              id="content"
              className="input"
              placeholder="What are you experiencing, feeling, noticing?"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>

          {(phase === 'AFTER' || phase === 'INTEGRATION') && (
            <div className="row" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="autoExtract"
                checked={autoExtract}
                onChange={e => setAutoExtract(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <label htmlFor="autoExtract" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}>
                Auto-extract insights with AI after saving
              </label>
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
            {submitting ? 'Saving…' : 'Save Entry'}
          </button>
        </form>
      </div>

      {/* Filter */}
      {entries.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="tabs">
            <button
              className={`tab ${filterPhase === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterPhase('ALL')}
            >
              All ({entries.length})
            </button>
            {PHASES.map(p => (
              entries.filter(e => e.phase === p).length > 0 && (
                <button
                  key={p}
                  className={`tab ${filterPhase === p ? 'active' : ''}`}
                  onClick={() => setFilterPhase(p)}
                >
                  {PHASE_LABELS[p]} ({entries.filter(e => e.phase === p).length})
                </button>
              )
            ))}
          </div>
        </div>
      )}

      {/* Entry List */}
      {loading ? (
        <div className="loading">Loading entries…</div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📓</div>
          <h3>No entries yet</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Write your first journal entry above.
          </p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <p>No {filterPhase.toLowerCase()} entries yet.</p>
        </div>
      ) : (
        <div className="stack-lg">
          {PHASES.filter(p => grouped[p].length > 0).map(p => (
            <div key={p}>
              <h3 className={`phase-${p}`} style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {PHASE_LABELS[p]}
              </h3>
              <div className="stack">
                {grouped[p].map(entry => (
                  <div key={entry.id} className="card">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      {formatTime(entry.timestamp)}
                    </p>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
