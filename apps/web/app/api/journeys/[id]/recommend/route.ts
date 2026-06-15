import { NextRequest } from 'next/server'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, err, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'
import { generateRecommendations } from '@/lib/ai'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
    })
    if (!journey) return err('Journey not found', 404)

    const recs = await prisma.journeyRecommendation.findMany({
      where: { journeyId: params.id },
      orderBy: { generatedAt: 'desc' },
    })
    return ok(recs)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const [journey, notes, insights, beliefs] = await Promise.all([
      prisma.journey.findFirst({ where: { id: params.id, seekerId: seeker.id } }),
      prisma.note.findMany({ where: { journeyId: params.id } }),
      prisma.insight.findMany({ where: { journeyId: params.id } }),
      prisma.belief.findMany({ where: { seekerId: seeker.id }, take: 10 }),
    ])

    if (!journey) return err('Journey not found', 404)

    const content = await generateRecommendations({ journey, notes, insights, beliefs })

    const rec = await prisma.journeyRecommendation.create({
      data: {
        content,
        journeyId: params.id,
        seekerId: seeker.id,
        categories: ['INTEGRATION', 'PRACTICE', 'TOOL', 'RESOURCE'],
      },
    })

    return ok(rec)
  } catch (e) {
    return handleError(e)
  }
}
