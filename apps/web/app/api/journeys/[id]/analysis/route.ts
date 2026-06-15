import { NextRequest } from 'next/server'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, err, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'
import { analyzeJourneyNotes } from '@/lib/ai'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
      include: {
        notes: { orderBy: { timestamp: 'asc' } },
        entries: { orderBy: { timestamp: 'asc' } },
        doseEvents: { orderBy: { takenAt: 'asc' } },
      },
    })
    if (!journey) return err('Journey not found', 404)

    return ok(journey)
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
      include: {
        notes: { orderBy: { timestamp: 'asc' } },
        entries: { orderBy: { timestamp: 'asc' } },
        doseEvents: { orderBy: { takenAt: 'asc' } },
        insights: true,
      },
    })
    if (!journey) return err('Journey not found', 404)

    const analysis = await analyzeJourneyNotes(journey)
    return ok(analysis)
  } catch (e) {
    return handleError(e)
  }
}
