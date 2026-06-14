import { getDb } from '../index'
import type { DoseEvent, CreateDoseEventInput } from '@shilajit/types'
import { generateId } from '@/lib/utils'

function rowToDose(row: Record<string, unknown>): DoseEvent {
  return {
    id: row.id as string,
    journeyId: row.journey_id as string,
    substance: row.substance as string,
    doseMg: row.dose_mg as number,
    doseUnit: (row.dose_unit as string) ?? 'mg',
    takenAt: row.taken_at as string,
    cumulativeMg: row.cumulative_mg as number | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  }
}

export const DoseRepository = {
  findByJourney(journeyId: string): DoseEvent[] {
    const db = getDb()
    const rows = db.getAllSync(
      'SELECT * FROM dose_events WHERE journey_id = ? AND _deleted = 0 ORDER BY taken_at ASC',
      [journeyId]
    )
    return rows.map((r) => rowToDose(r as Record<string, unknown>))
  },

  create(journeyId: string, input: CreateDoseEventInput): DoseEvent {
    const db = getDb()
    const id = generateId()
    const now = new Date().toISOString()

    // Calculate cumulative dose for this journey
    const previous = this.findByJourney(journeyId)
    const prevCumulative = previous.reduce((sum, d) => sum + d.doseMg, 0)
    const cumulativeMg = prevCumulative + input.doseMg

    db.runSync(
      `INSERT INTO dose_events (id, journey_id, substance, dose_mg, dose_unit, taken_at, cumulative_mg, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        journeyId,
        input.substance,
        input.doseMg,
        input.doseUnit ?? 'mg',
        input.takenAt ?? now,
        cumulativeMg,
        input.notes ?? null,
        now,
      ]
    )
    return this.findByJourney(journeyId).find((d) => d.id === id)!
  },

  softDelete(id: string): void {
    const db = getDb()
    db.runSync('UPDATE dose_events SET _deleted = 1 WHERE id = ?', [id])
  },

  getUnsynced(): Record<string, unknown>[] {
    const db = getDb()
    return db.getAllSync(
      'SELECT * FROM dose_events WHERE synced_at IS NULL OR created_at > synced_at'
    )
  },

  markSynced(id: string): void {
    const db = getDb()
    db.runSync('UPDATE dose_events SET synced_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id,
    ])
  },
}
