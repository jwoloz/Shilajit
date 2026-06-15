import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SignOutButton from '@/app/components/SignOutButton'

interface Journey {
  id: string
  substance: string
  doseMg: number | null
  doseUnit: string
  scheduledAt: string
  status: string
  intentions: string | null
  _count: {
    entries: number
    insights: number
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return 'badge-accent'
  if (status === 'COMPLETE') return 'badge-green'
  return ''
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  let journeys: Journey[] = []
  let fetchError = ''

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/journeys`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
    const json = await res.json()
    if (json.data) {
      journeys = json.data
    } else {
      fetchError = json.error?.message || 'Failed to load journeys'
    }
  } catch (e) {
    fetchError = 'Network error — could not load journeys'
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="row-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>My Journeys</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {session.user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* New Journey Button */}
      <Link href="/journeys/new" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Journey
      </Link>

      {fetchError && (
        <div className="error-msg" style={{ marginBottom: '1rem' }}>{fetchError}</div>
      )}

      {/* Journey List */}
      {journeys.length === 0 && !fetchError ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
          <h3>No journeys yet</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Start your first journey to track your experience.
          </p>
        </div>
      ) : (
        <div className="stack">
          {journeys.map((journey) => (
            <Link
              key={journey.id}
              href={`/journeys/${journey.id}`}
              className="card"
              style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}
            >
              <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ color: 'var(--text)' }}>{journey.substance}</h3>
                <span className={`badge ${statusBadgeClass(journey.status)}`}>
                  {journey.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                {formatDate(journey.scheduledAt)}
                {journey.doseMg ? ` · ${journey.doseMg} ${journey.doseUnit}` : ''}
              </p>
              {journey.intentions && (
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.75rem',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {journey.intentions}
                </p>
              )}
              <div className="row" style={{ gap: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  📝 {journey._count.entries} entries
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  💡 {journey._count.insights} insights
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
