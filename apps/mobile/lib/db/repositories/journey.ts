import { getDb } from '../index'
import type { Journey, CreateJourneyInput } from '@shilajit/types'
import { generateId } from '@/lib/utils'

function rowToJourney(row: Record<string, unknown>): Journey {
  return {
    id: row.id as string,
    seekerId: 'local',
    substance: row.substance as string,
    doseMg: row.dose_mg as number | null,
    doseUnit: (row.dose_unit as string) ?? 'mg',
    sporeSource: row.spore_source as string | null,
    scheduledAt: row.scheduled_at as string,
    intentions: row.intentions as string | null,
    setting: row.setting as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export const JourneyRepository = {
  findAll(): Journey[] {
    const db = getDb()
    const rows = db.getAllSync(
      'SELECT * FROM journeys WHERE _deleted = 0 ORDER BY scheduled_at DESC'
    )
    return rows.map((row) => rowToJourney(row as Record<string, unknown>))
  },

  findById(id: string): Journey | null {
    const db = getDb()
    const row = db.getFirstSync('SELECT * FROM journeys WHERE id = ? AND _deleted = 0', [id])
    return row ? rowToJourney(row as Record<string, unknown>) : null
  },

  create(input: CreateJourneyInput): Journey {
    const db = getDb()
    const id = generateId()
    const now = new Date().toISOString()
    db.runSync(
      `INSERT INTO journeys (id, substance, dose_mg, dose_unit, spore_source, scheduled_at, intentions, setting, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.substance,
        input.doseMg ?? null,
        input.doseUnit ?? 'mg',
        input.sporeSource ?? null,
        input.scheduledAt,
        input.intentions ?? null,
        input.setting ?? null,
        now,
        now,
      ]
    )
    return this.findById(id)!
  },

  update(id: string, input: Partial<CreateJourneyInput>): Journey | null {
    const db = getDb()
    const now = new Date().toISOString()
    const fields = Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${toSnakeCase(k)} = ?`)
      .join(', ')
    const values = Object.values(input).filter((v) => v !== undefined)

    if (fields.length === 0) return this.findById(id)

    db.runSync(`UPDATE journeys SET ${fields}, updated_at = ? WHERE id = ?`, [...values, now, id])
    return this.findById(id)
  },

  softDelete(id: string): void {
    const db = getDb()
    db.runSync('UPDATE journeys SET _deleted = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id,
    ])
  },

  getUnsynced(): Record<string, unknown>[] {
    const db = getDb()
    return db.getAllSync('SELECT * FROM journeys WHERE synced_at IS NULL OR updated_at > synced_at')
  },

  markSynced(id: string): void {
    const db = getDb()
    db.runSync('UPDATE journeys SET synced_at = ? WHERE id = ?', [new Date().toISOString(), id])
  },
}

function toSnakeCase(key: string): string {
  const map: Record<string, string> = {
    doseMg: 'dose_mg',
    doseUnit: 'dose_unit',
    sporeSource: 'spore_source',
    scheduledAt: 'scheduled_at',
  }
  return map[key] ?? key
}
