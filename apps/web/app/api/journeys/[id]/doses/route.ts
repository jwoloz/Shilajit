import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, err, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreateDoseSchema = z.object({
  substance: z.string().min(1),
  doseMg: z.number().positive(),
  doseUnit: z.string().default('mg'),
  takenAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
    })
    if (!journey) return err('Journey not found', 404)

    const doses = await prisma.doseEvent.findMany({
      where: { journeyId: params.id },
      orderBy: { takenAt: 'asc' },
    })
    return ok(doses)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
    })
    if (!journey) return err('Journey not found', 404)

    const body = CreateDoseSchema.parse(await request.json())

    // Calculate cumulative dose
    const existing = await prisma.doseEvent.findMany({
      where: { journeyId: params.id },
    })
    const cumulative = existing.reduce((sum: number, d: { doseMg: number }) => sum + d.doseMg, 0) + body.doseMg

    const dose = await prisma.doseEvent.create({
      data: {
        ...body,
        journeyId: params.id,
        takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
        cumulativeMg: cumulative,
      } as any,
    })
    return ok(dose)
  } catch (e) {
    return handleError(e)
  }
}
