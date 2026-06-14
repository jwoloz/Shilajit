import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/auth'
import { getDb } from '@/lib/db'
import type { Session } from '@supabase/supabase-js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
})

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    // Initialize local DB
    getDb()
    setDbReady(true)

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!dbReady) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="auth" />
        )}
        <Stack.Screen name="journey/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="journey/[id]" />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  )
}
