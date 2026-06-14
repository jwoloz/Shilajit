import { getDb } from '@/lib/db'
import { api } from '@/lib/api/client'
import { JourneyRepository } from '@/lib/db/repositories/journey'
import type { SyncPullResponse } from '@shilajit/types'

function getSyncState(): { lastSyncedAt: string | null } {
  const db = getDb()
  const row = db.getFirstSync('SELECT last_synced_at FROM sync_state WHERE id = 1') as Record<string, unknown> | null
  return { lastSyncedAt: (row?.last_synced_at as string) ?? null }
}

function setSyncState(lastSyncedAt: string): void {
  const db = getDb()
  db.runSync('UPDATE sync_state SET last_synced_at = ? WHERE id = 1', [lastSyncedAt])
}

export async function sync(): Promise<{ success: boolean; error?: string }> {
  try {
    const { lastSyncedAt } = getSyncState()

    // Push local unsynced changes
    const unsyncedJourneys = JourneyRepository.getUnsynced()
    if (unsyncedJourneys.length > 0) {
      const result = await api.post('/api/sync', {
        lastSyncedAt,
        journeys: unsyncedJourneys,
        entries: [],
        insights: [],
        beliefs: [],
        rituals: [],
      })
      if (result.error) throw new Error(result.error.message)
    }

    // Pull remote changes
    const pullUrl = lastSyncedAt ? `/api/sync?since=${encodeURIComponent(lastSyncedAt)}` : '/api/sync'
    const pullResult = await api.get<SyncPullResponse>(pullUrl)
    if (pullResult.error) throw new Error(pullResult.error.message)

    const { syncedAt, journeys } = pullResult.data
    const db = getDb()

    // Upsert pulled journeys
    for (const journey of journeys) {
      db.runSync(
        `INSERT OR REPLACE INTO journeys
         (id, substance, dose_mg, dose_unit, spore_source, scheduled_at, intentions, setting, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          journey.id,
          journey.substance,
          journey.doseMg ?? null,
          journey.doseUnit,
          journey.sporeSource ?? null,
          journey.scheduledAt,
          journey.intentions ?? null,
          journey.setting ?? null,
          journey.createdAt,
          journey.updatedAt,
          syncedAt,
        ]
      )
    }

    // Mark local records as synced
    unsyncedJourneys.forEach((j) => JourneyRepository.markSynced(j.id as string))

    setSyncState(syncedAt)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sync failed' }
  }
}
