import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { sync } from '@/lib/sync'

export function useSync() {
  const qc = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; error?: string } | null>(null)

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    const result = await sync()
    setLastResult(result)
    setSyncing(false)
    if (result.success) {
      qc.invalidateQueries()
    }
    return result
  }, [qc])

  return { syncing, lastResult, sync: triggerSync }
}
