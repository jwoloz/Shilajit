'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface DoseEvent {
  id: string
  substance: string
  doseMg: number
  doseUnit: string
  takenAt: string
  cumulativeMg: number
  notes: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function timeSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`
}

export default function DosesPage() {
  const params = useParams()
  const router = useRouter()
  const journeyId = params.id as string
  const supabase = createSupabaseBrowserClient()

  const [doses, setDoses] = useState<DoseEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [journeySubstance, setJourneySubstance] = useState('')

  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('mg')
  const [noteText, setNoteText] = useState('')

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return null }
    return session.access_token
  }, [supabase, router])

  const fetchDoses = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const [dosesRes, journeyRes] = await Promise.all([
        fetch(`/api/journeys/${journeyId}/doses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/journeys/${journeyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      const dosesJson = await dosesRes.json()
      if (dosesJson.data) setDoses(dosesJson.data)
      else setError(dosesJson.error?.message || 'Failed to load doses')

      const journeyJson = await journeyRes.json()
      if (journeyJson.data) {
        setJourneySubstance(journeyJson.data.substance || '')
        setUnit(journeyJson.data.doseUnit || 'mg')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [journeyId, getToken])

  useEffect(() => {
    fetchDoses()
  }, [fetchDoses])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    setSubmitError('')

    const token = await getToken()
    if (!token) return

    const body: Record<string, unknown> = {
      substance: journeySubstance || 'Unknown',
      doseMg: parseFloat(amount),
      doseUnit: unit,
      takenAt: new Date().toISOString(),
    }
    if (noteText.trim()) body.notes = noteText.trim()

    try {
      const res = await fetch(`/api/journeys/${journeyId}/doses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.data) {
        setAmount('')
        setNoteText('')
        fetchDoses()
      } else {
        setSubmitError(json.error?.message || 'Failed to log dose')
      }
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const totalDose = doses.length > 0 ? doses[doses.length - 1].cumulativeMg : 0
  const lastDose = doses.length > 0 ? doses[doses.length - 1] : null

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: '1.5rem' }}>
        <Link href={`/journeys/${journeyId}`} className="btn btn-ghost" style={{ minHeight: 40, padding: '0 0.875rem', fontSize: '0.875rem' }}>
          ← Journey
        </Link>
        <h1 style={{ flex: 1, fontSize: '1.375rem' }}>Dose Log</h1>
      </div>

      {/* Summary */}
      {doses.length > 0 && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{totalDose.toFixed(1)}</div>
            <div className="stat-label">Total {unit}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{doses.length}</div>
            <div className="stat-label">Doses Logged</div>
          </div>
          {lastDose && (
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last dose</div>
              <div style={{ color: 'var(--accent-light)', fontWeight: 600, marginTop: '0.25rem' }}>
                {lastDose.doseMg} {lastDose.doseUnit} · {timeSince(lastDose.takenAt)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Dose Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Log Dose</h2>
        <form onSubmit={handleSubmit}>
          <div className="row" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 2 }}>
              <label className="label" htmlFor="amount">Amount *</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label" htmlFor="unit">Unit</label>
              <select
                id="unit"
                className="input"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              >
                <option value="mg">mg</option>
                <option value="g">g</option>
                <option value="mcg">mcg</option>
                <option value="tabs">tabs</option>
                <option value="caps">caps</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="doseNote">Note (optional)</label>
            <input
              id="doseNote"
              type="text"
              className="input"
              placeholder="e.g. booster, onset felt at T+45min…"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
          </div>

          {submitError && (
            <div className="error-msg" style={{ marginBottom: '1rem' }}>{submitError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting || !amount || parseFloat(amount) <= 0}
          >
            {submitting ? 'Logging…' : 'Log Dose Now'}
          </button>
        </form>
      </div>

      {/* Dose Timeline */}
      {loading ? (
        <div className="loading">Loading doses…</div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : doses.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚗️</div>
          <h3>No doses logged yet</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Log your first dose above to start tracking.
          </p>
        </div>
      ) : (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Timeline</h2>
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: 16,
              top: 12,
              bottom: 12,
              width: 2,
              background: 'var(--border)',
              zIndex: 0,
            }} />

            <div className="stack">
              {doses.map((dose, i) => (
                <div key={dose.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', position: 'relative' }}>
                  {/* Dot */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: i === doses.length - 1 ? 'var(--accent)' : 'var(--surface)',
                    border: `2px solid ${i === doses.length - 1 ? 'var(--accent-light)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    flexShrink: 0,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: i === doses.length - 1 ? '#fff' : 'var(--text-muted)',
                  }}>
                    {i + 1}
                  </div>

                  <div className="card" style={{ flex: 1, padding: '0.875rem' }}>
                    <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--accent-light)' }}>
                        {dose.doseMg} {dose.doseUnit}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {formatTime(dose.takenAt)}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Cumulative: {dose.cumulativeMg.toFixed(1)} {dose.doseUnit}
                    </p>
                    {dose.notes && (
                      <p style={{ color: 'var(--text)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {dose.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
