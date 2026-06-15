import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface Journey {
  id: string
  substance: string
  doseMg: number | null
  doseUnit: string
  scheduledAt: string
  status: string
  intentions: string | null
  setting: string | null
  entries: Array<{ id: string; phase: string; content: string; timestamp: string }>
  insights: Array<{ id: string; content: string; resonance: number }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface NavCardProps {
  href: string
  icon: string
  label: string
  count?: number
  description: string
}

function NavCard({ href, icon, label, count, description }: NavCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        {count !== undefined && (
          <span className="badge badge-accent">{count}</span>
        )}
      </div>
      <h3 style={{ color: 'var(--text)', marginBottom: '0.25rem', fontSize: '1rem' }}>{label}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{description}</p>
    </Link>
  )
}

export default async function JourneyPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  let journey: Journey | null = null
  let noteCount = 0
  let doseCount = 0

  try {
    const [journeyRes, notesRes, dosesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/journeys/${params.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/journeys/${params.id}/notes`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/journeys/${params.id}/doses`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      }),
    ])

    const journeyJson = await journeyRes.json()
    if (!journeyJson.data) {
      if (journeyRes.status === 404) notFound()
      redirect('/dashboard')
    }
    journey = journeyJson.data

    const notesJson = await notesRes.json()
    if (notesJson.data) noteCount = notesJson.data.length

    const dosesJson = await dosesRes.json()
    if (dosesJson.data) doseCount = dosesJson.data.length
  } catch {
    redirect('/dashboard')
  }

  if (!journey) notFound()

  const scheduledDate = new Date(journey.scheduledAt)
  const now = new Date()
  const isRecent = Math.abs(now.getTime() - scheduledDate.getTime()) < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="page">
      {/* Back */}
      <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: '1.25rem', minHeight: 40, padding: '0 0.875rem', fontSize: '0.875rem' }}>
        ← All Journeys
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="row-between" style={{ marginBottom: '0.5rem' }}>
          <h1>{journey.substance}</h1>
          <span className={`badge ${journey.status === 'COMPLETE' ? 'badge-green' : journey.status === 'ACTIVE' ? 'badge-accent' : ''}`}>
            {journey.status}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {formatDate(journey.scheduledAt)} at {formatTime(journey.scheduledAt)}
        </p>
        {journey.doseMg && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Initial dose: {journey.doseMg} {journey.doseUnit}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{journey.entries.length}</div>
          <div className="stat-label">Journal Entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{journey.insights.length}</div>
          <div className="stat-label">Insights</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{noteCount}</div>
          <div className="stat-label">Notes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{doseCount}</div>
          <div className="stat-label">Dose Events</div>
        </div>
      </div>

      {/* Intentions / Setting */}
      {(journey.intentions || journey.setting) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {journey.intentions && (
            <div style={{ marginBottom: journey.setting ? '0.75rem' : 0 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                Intentions
              </p>
              <p style={{ fontSize: '0.95rem' }}>{journey.intentions}</p>
            </div>
          )}
          {journey.setting && (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                Setting
              </p>
              <p style={{ fontSize: '0.95rem' }}>{journey.setting}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Grid */}
      <h2 style={{ marginBottom: '1rem' }}>Journey Log</h2>
      <div className="stack" style={{ marginBottom: '1.5rem' }}>
        <NavCard
          href={`/journeys/${journey.id}/entries`}
          icon="📓"
          label="Journal Entries"
          count={journey.entries.length}
          description="Record your experience before, during, after, and integration"
        />
        <NavCard
          href={`/journeys/${journey.id}/notes`}
          icon="🗒️"
          label="Notes"
          count={noteCount}
          description="Quick notes with mood and body feel tracking"
        />
        <NavCard
          href={`/journeys/${journey.id}/doses`}
          icon="⚗️"
          label="Dose Log"
          count={doseCount}
          description="Track dose timeline and cumulative amounts"
        />
        <NavCard
          href={`/insights`}
          icon="💡"
          label="Insights"
          count={journey.insights.length}
          description="Distilled learnings and realizations"
        />
      </div>

      {/* Recent entries preview */}
      {journey.entries.length > 0 && (
        <div>
          <div className="section-header">
            <h2>Recent Entries</h2>
            <Link href={`/journeys/${journey.id}/entries`} style={{ color: 'var(--accent-light)', fontSize: '0.875rem' }}>
              View all
            </Link>
          </div>
          <div className="stack">
            {journey.entries.slice(-3).reverse().map(entry => (
              <div key={entry.id} className="card">
                <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                  <span className={`badge phase-${entry.phase}`} style={{ fontSize: '0.7rem', background: 'transparent', border: 'none', padding: 0 }}>
                    {entry.phase}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
