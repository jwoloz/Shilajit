'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface Insight {
  id: string
  content: string
  resonance: number
  isCore: boolean
  tags: string[]
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ResonanceDots({ value }: { value: number }) {
  return (
    <div className="row" style={{ gap: 3 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i < value ? 'var(--accent-light)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

export default function InsightsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [filterCore, setFilterCore] = useState(false)

  const [content, setContent] = useState('')
  const [resonance, setResonance] = useState(5)
  const [isCore, setIsCore] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return null }
    return session.access_token
  }, [supabase, router])

  const fetchInsights = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const url = filterCore ? '/api/insights?core=true' : '/api/insights'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.data) {
        setInsights(json.data)
      } else {
        setError(json.error?.message || 'Failed to load insights')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [getToken, filterCore])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const token = await getToken()
    if (!token) return

    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          resonance,
          isCore,
          tags,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setContent('')
        setResonance(5)
        setIsCore(false)
        setTagInput('')
        fetchInsights()
      } else {
        setSubmitError(json.error?.message || 'Failed to save insight')
      }
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const displayed = filterCore ? insights.filter(i => i.isCore) : insights

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Insights</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Distilled learnings from your journeys
        </p>
      </div>

      {/* Add Insight Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Capture Insight</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="insight-content">Insight *</label>
            <textarea
              id="insight-content"
              className="input"
              placeholder="What did you learn or realize?"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">
              Resonance: <strong style={{ color: 'var(--text)' }}>{resonance}</strong>/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={resonance}
              onChange={e => setResonance(Number(e.target.value))}
            />
            <div className="row-between" style={{ marginTop: '0.375rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Mild</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Profound</span>
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tags">Tags (optional, comma-separated)</label>
            <input
              id="tags"
              type="text"
              className="input"
              placeholder="ego, love, nature, fear…"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              style={{ minHeight: 48 }}
            />
          </div>

          {/* Core toggle */}
          <div className="row" style={{ marginBottom: '1.25rem', gap: '0.75rem' }}>
            <div
              role="switch"
              aria-checked={isCore}
              tabIndex={0}
              onClick={() => setIsCore(!isCore)}
              onKeyDown={e => e.key === ' ' && setIsCore(!isCore)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: isCore ? 'var(--accent)' : 'var(--border)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: isCore ? 21 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Core insight</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Core insights shape your Sacred Text
              </p>
            </div>
          </div>

          {submitError && (
            <div className="error-msg" style={{ marginBottom: '1rem' }}>{submitError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Saving…' : 'Save Insight'}
          </button>
        </form>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <div className="tabs">
          <button
            className={`tab ${!filterCore ? 'active' : ''}`}
            onClick={() => setFilterCore(false)}
          >
            All ({insights.length})
          </button>
          <button
            className={`tab ${filterCore ? 'active' : ''}`}
            onClick={() => setFilterCore(true)}
          >
            ⭐ Core ({insights.filter(i => i.isCore).length})
          </button>
        </div>
      </div>

      {/* Insights List */}
      {loading ? (
        <div className="loading">Loading insights…</div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💡</div>
          <h3>{filterCore ? 'No core insights yet' : 'No insights yet'}</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {filterCore
              ? 'Mark insights as Core to see them here.'
              : 'Capture your first insight above.'}
          </p>
        </div>
      ) : (
        <div className="stack">
          {displayed.map(insight => (
            <div key={insight.id} className="card">
              <div className="row-between" style={{ marginBottom: '0.75rem' }}>
                <ResonanceDots value={insight.resonance} />
                <div className="row" style={{ gap: '0.5rem' }}>
                  {insight.isCore && (
                    <span className="badge badge-accent">⭐ Core</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {formatDate(insight.createdAt)}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: insight.tags.length ? '0.75rem' : 0 }}>
                {insight.content}
              </p>

              {insight.tags.length > 0 && (
                <div className="row" style={{ flexWrap: 'wrap', gap: '0.375rem' }}>
                  {insight.tags.map(tag => (
                    <span key={tag} className="badge" style={{ fontSize: '0.7rem' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
