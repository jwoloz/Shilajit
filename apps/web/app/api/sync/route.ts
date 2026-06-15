import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

// Pull: fetch all records updated after lastSyncedAt
export async function GET(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const sinceDate = since ? new Date(since) : new Date(0)

    const [journeys, entries, insights, beliefs, rituals] = await Promise.all([
      prisma.journey.findMany({
        where: { seekerId: seeker.id, updatedAt: { gte: sinceDate } },
        include: { entries: true },
      }),
      prisma.entry.findMany({
        where: { journey: { seekerId: seeker.id }, createdAt: { gte: sinceDate } },
      }),
      prisma.insight.findMany({
        where: { seekerId: seeker.id, updatedAt: { gte: sinceDate } },
      }),
      prisma.belief.findMany({
        where: { seekerId: seeker.id, updatedAt: { gte: sinceDate } },
      }),
      prisma.ritual.findMany({
        where: { seekerId: seeker.id, updatedAt: { gte: sinceDate } },
      }),
    ])

    return ok({
      syncedAt: new Date().toISOString(),
      journeys,
      entries,
      insights,
      beliefs,
      rituals,
    })
  } catch (e) {
    return handleError(e)
  }
}

const SyncPushSchema = z.object({
  lastSyncedAt: z.string().nullable(),
  journeys: z.array(z.any()),
  entries: z.array(z.any()),
  insights: z.array(z.any()),
  beliefs: z.array(z.any()),
  rituals: z.array(z.any()),
})

// Push: upsert local records to server (last-write-wins by updatedAt)
export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const payload = SyncPushSchema.parse(await request.json())

    await prisma.$transaction(async (tx) => {
      for (const j of payload.journeys) {
        if (j._deleted) {
          await tx.journey.deleteMany({ where: { id: j.id, seekerId: seeker.id } })
        } else {
          await tx.journey.upsert({
            where: { id: j.id },
            update: { ...j, seekerId: seeker.id, _deleted: undefined } as any,
            create: { ...j, seekerId: seeker.id, _deleted: undefined } as any,
          })
        }
      }

      for (const i of payload.insights) {
        if (i._deleted) {
          await tx.insight.deleteMany({ where: { id: i.id, seekerId: seeker.id } })
        } else {
          await tx.insight.upsert({
            where: { id: i.id },
            update: { ...i, seekerId: seeker.id, _deleted: undefined } as any,
            create: { ...i, seekerId: seeker.id, _deleted: undefined } as any,
          })
        }
      }
    })

    return ok({ syncedAt: new Date().toISOString() })
  } catch (e) {
    return handleError(e)
  }
}
