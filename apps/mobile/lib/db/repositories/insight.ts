import { getDb } from '../index'
import type { Insight, CreateInsightInput } from '@shilajit/types'
import { generateId } from '@/lib/utils'
import type { SQLiteBindValue } from 'expo-sqlite'

function rowToInsight(row: Record<string, unknown>): Insight {
  return {
    id: row.id as string,
    seekerId: 'local',
    journeyId: row.journey_id as string | null,
    content: row.content as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    resonance: row.resonance as number,
    isCore: Boolean(row.is_core),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export const InsightRepository = {
  findAll(opts?: { coreOnly?: boolean; journeyId?: string }): Insight[] {
    const db = getDb()
    const conditions = ['_deleted = 0']
    const params: SQLiteBindValue[] = []

    if (opts?.coreOnly) {
      conditions.push('is_core = 1')
    }
    if (opts?.journeyId) {
      conditions.push('journey_id = ?')
      params.push(opts.journeyId)
    }

    const rows = db.getAllSync(
      `SELECT * FROM insights WHERE ${conditions.join(' AND ')} ORDER BY resonance DESC, created_at DESC`,
      params
    )
    return rows.map((r) => rowToInsight(r as Record<string, unknown>))
  },

  findById(id: string): Insight | null {
    const db = getDb()
    const row = db.getFirstSync('SELECT * FROM insights WHERE id = ? AND _deleted = 0', [id])
    return row ? rowToInsight(row as Record<string, unknown>) : null
  },

  create(input: CreateInsightInput): Insight {
    const db = getDb()
    const id = generateId()
    const now = new Date().toISOString()
    db.runSync(
      `INSERT INTO insights (id, journey_id, content, tags, resonance, is_core, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.journeyId ?? null,
        input.content,
        JSON.stringify(input.tags ?? []),
        input.resonance ?? 5,
        input.isCore ? 1 : 0,
        now,
        now,
      ]
    )
    return this.findById(id)!
  },

  update(id: string, input: Partial<CreateInsightInput>): Insight | null {
    const db = getDb()
    const now = new Date().toISOString()
    if (input.tags !== undefined) {
      db.runSync('UPDATE insights SET tags = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(input.tags),
        now,
        id,
      ])
    }
    if (input.resonance !== undefined) {
      db.runSync('UPDATE insights SET resonance = ?, updated_at = ? WHERE id = ?', [
        input.resonance,
        now,
        id,
      ])
    }
    if (input.isCore !== undefined) {
      db.runSync('UPDATE insights SET is_core = ?, updated_at = ? WHERE id = ?', [
        input.isCore ? 1 : 0,
        now,
        id,
      ])
    }
    return this.findById(id)
  },

  softDelete(id: string): void {
    const db = getDb()
    db.runSync('UPDATE insights SET _deleted = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id,
    ])
  },
}
