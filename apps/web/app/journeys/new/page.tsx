'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function NewJourneyPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const now = new Date()
  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
  const defaultDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  const [form, setForm] = useState({
    substance: '',
    scheduledAt: defaultDateTime,
    doseMg: '',
    doseUnit: 'mg',
    intentions: '',
    setting: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth')
      return
    }

    const body: Record<string, unknown> = {
      substance: form.substance.trim(),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      doseUnit: form.doseUnit,
    }
    if (form.doseMg) body.doseMg = parseFloat(form.doseMg)
    if (form.intentions.trim()) body.intentions = form.intentions.trim()
    if (form.setting.trim()) body.setting = form.setting.trim()

    try {
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.data) {
        router.push(`/journeys/${json.data.id}`)
      } else {
        setError(json.error?.message || 'Failed to create journey')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: '1.5rem', gap: '0.75rem' }}>
        <Link href="/dashboard" className="btn btn-ghost" style={{ minHeight: 40, padding: '0 0.875rem', fontSize: '0.875rem' }}>
          ← Back
        </Link>
        <h1 style={{ flex: 1 }}>New Journey</h1>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label className="label" htmlFor="substance">Substance *</label>
          <input
            id="substance"
            name="substance"
            className="input"
            placeholder="e.g. Psilocybin, LSD, MDMA"
            value={form.substance}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="scheduledAt">Date &amp; Time</label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            className="input"
            value={form.scheduledAt}
            onChange={handleChange}
            required
          />
        </div>

        <div className="row" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 2 }}>
            <label className="label" htmlFor="doseMg">Initial Dose (optional)</label>
            <input
              id="doseMg"
              name="doseMg"
              type="number"
              min="0"
              step="0.01"
              className="input"
              placeholder="0"
              value={form.doseMg}
              onChange={handleChange}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" htmlFor="doseUnit">Unit</label>
            <select
              id="doseUnit"
              name="doseUnit"
              className="input"
              value={form.doseUnit}
              onChange={handleChange}
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
          <label className="label" htmlFor="intentions">Intentions (optional)</label>
          <textarea
            id="intentions"
            name="intentions"
            className="input"
            placeholder="What do you hope to explore or understand?"
            value={form.intentions}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="setting">Setting (optional)</label>
          <textarea
            id="setting"
            name="setting"
            className="input"
            placeholder="Where and with whom? Indoor, nature, alone, with sitter..."
            value={form.setting}
            onChange={handleChange}
            rows={2}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading || !form.substance.trim()}
        >
          {loading ? 'Creating…' : 'Begin Journey'}
        </button>
      </form>
    </div>
  )
}
