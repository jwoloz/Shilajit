import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreateJourneySchema = z.object({
  substance: z.string().min(1),
  doseMg: z.number().positive().optional(),
  doseUnit: z.string().default('mg'),
  sporeSource: z.string().optional(),
  scheduledAt: z.string().datetime(),
  intentions: z.string().optional(),
  setting: z.string().optional(),
})

export async function GET() {
  try {
    const supabaseId = await getAuthenticatedSeekerId()
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journeys = await prisma.journey.findMany({
      where: { seekerId: seeker.id },
      orderBy: { scheduledAt: 'desc' },
      include: { _count: { select: { entries: true, insights: true } } },
    })

    return ok(journeys)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId()
    const seeker = await seekerFromSupabaseId(supabaseId)
    const body = CreateJourneySchema.parse(await request.json())

    const journey = await prisma.journey.create({
      data: { ...body, seekerId: seeker.id },
    })

    return ok(journey)
  } catch (e) {
    return handleError(e)
  }
}
