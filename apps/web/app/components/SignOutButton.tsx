'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <button className="btn btn-ghost" onClick={handleSignOut} style={{ minHeight: 40, padding: '0 0.875rem', fontSize: '0.875rem' }}>
      Sign out
    </button>
  )
}
