import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, err, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const UpdateJourneySchema = z.object({
  substance: z.string().min(1).optional(),
  doseMg: z.number().positive().optional(),
  doseUnit: z.string().optional(),
  sporeSource: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  intentions: z.string().optional(),
  setting: z.string().optional(),
})

async function resolveJourney(id: string, seekerId: string) {
  const journey = await prisma.journey.findFirst({
    where: { id, seekerId },
  })
  if (!journey) throw new Error('Not found')
  return journey
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
      include: { entries: { orderBy: { timestamp: 'asc' } }, insights: true },
    })

    if (!journey) return err('Journey not found', 404)
    return ok(journey)
  } catch (e) {
    return handleError(e)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    await resolveJourney(params.id, seeker.id)

    const body = UpdateJourneySchema.parse(await request.json())
    const journey = await prisma.journey.update({ where: { id: params.id }, data: body })
    return ok(journey)
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    await resolveJourney(params.id, seeker.id)

    await prisma.journey.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (e) {
    return handleError(e)
  }
}
