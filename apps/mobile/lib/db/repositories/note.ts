import { getDb } from '../index'
import type { Note, CreateNoteInput } from '@shilajit/types'
import { generateId } from '@/lib/utils'

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    journeyId: row.journey_id as string,
    seekerId: 'local',
    type: row.type as Note['type'],
    content: row.content as string | null,
    mediaUrl: row.media_uri as string | null,
    canvasData: row.canvas_data as string | null,
    phase: row.phase as Note['phase'],
    mood: row.mood as number | null,
    bodyFeel: row.body_feel as number | null,
    analysis: row.analysis as string | null,
    timestamp: row.timestamp as string,
    createdAt: row.created_at as string,
  }
}

export const NoteRepository = {
  findByJourney(journeyId: string): Note[] {
    const db = getDb()
    const rows = db.getAllSync(
      'SELECT * FROM notes WHERE journey_id = ? AND _deleted = 0 ORDER BY timestamp ASC',
      [journeyId]
    )
    return rows.map((r) => rowToNote(r as Record<string, unknown>))
  },

  findById(id: string): Note | null {
    const db = getDb()
    const row = db.getFirstSync('SELECT * FROM notes WHERE id = ? AND _deleted = 0', [id])
    return row ? rowToNote(row as Record<string, unknown>) : null
  },

  create(journeyId: string, input: CreateNoteInput): Note {
    const db = getDb()
    const id = generateId()
    const now = new Date().toISOString()

    db.runSync(
      `INSERT INTO notes (id, journey_id, type, content, media_uri, canvas_data, phase, mood, body_feel, timestamp, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        journeyId,
        input.type,
        input.content ?? null,
        input.mediaUrl ?? null,
        input.canvasData ?? null,
        input.phase ?? null,
        input.mood ?? null,
        input.bodyFeel ?? null,
        now,
        now,
      ]
    )
    return this.findById(id)!
  },

  updateAnalysis(id: string, analysis: string): void {
    const db = getDb()
    db.runSync('UPDATE notes SET analysis = ? WHERE id = ?', [analysis, id])
  },

  updateContent(id: string, content: string): void {
    const db = getDb()
    db.runSync('UPDATE notes SET content = ? WHERE id = ?', [content, id])
  },

  softDelete(id: string): void {
    const db = getDb()
    db.runSync('UPDATE notes SET _deleted = 1 WHERE id = ?', [id])
  },

  getMoodSeries(journeyId: string): Array<{ timestamp: string; mood: number; bodyFeel: number }> {
    const db = getDb()
    const rows = db.getAllSync(
      `SELECT timestamp, mood, body_feel FROM notes
       WHERE journey_id = ? AND mood IS NOT NULL AND _deleted = 0
       ORDER BY timestamp ASC`,
      [journeyId]
    )
    return rows.map((r) => ({
      timestamp: r.timestamp as string,
      mood: r.mood as number,
      bodyFeel: (r.body_feel as number) ?? 0,
    }))
  },

  getUnsynced(): Record<string, unknown>[] {
    const db = getDb()
    return db.getAllSync('SELECT * FROM notes WHERE synced_at IS NULL OR created_at > synced_at')
  },

  markSynced(id: string): void {
    const db = getDb()
    db.runSync('UPDATE notes SET synced_at = ? WHERE id = ?', [new Date().toISOString(), id])
  },
}
