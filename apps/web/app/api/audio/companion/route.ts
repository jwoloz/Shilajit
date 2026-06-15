import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { ok, handleError, getAuthenticatedSeekerId, seekerFromSupabaseId } from '@/lib/api-helpers'
import { companionChat } from '@/lib/ai'

const CompanionSchema = z.object({
  audioBase64: z.string().optional(),
  text: z.string().optional(),
  journeyId: z.string(),
  provider: z.enum(['gemini', 'claude']),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.string(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const body = CompanionSchema.parse(await request.json())

    // Fetch journey context for the system prompt
    const [journey, insights, beliefs] = await Promise.all([
      prisma.journey.findFirst({
        where: { id: body.journeyId, seekerId: seeker.id },
        include: { doseEvents: true },
      }),
      prisma.insight.findMany({
        where: { seekerId: seeker.id, isCore: true },
        take: 10,
      }),
      prisma.belief.findMany({ where: { seekerId: seeker.id }, take: 5 }),
    ])

    const response = await companionChat({
      audioBase64: body.audioBase64,
      text: body.text,
      history: body.history,
      provider: body.provider,
      journeyContext: { journey, coreInsights: insights, beliefs },
    })

    return ok(response)
  } catch (e) {
    return handleError(e)
  }
}
