import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'
import { generateSacredText } from '@/lib/ai'

const GenerateDoctrineSchema = z.object({
  includeInsights: z.boolean().default(true),
  includeBeliefs: z.boolean().default(true),
  includeRituals: z.boolean().default(true),
  additionalContext: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const options = GenerateDoctrineSchema.parse(await request.json())

    const [insights, beliefs, rituals] = await Promise.all([
      options.includeInsights
        ? prisma.insight.findMany({ where: { seekerId: seeker.id }, orderBy: { resonance: 'desc' } })
        : [],
      options.includeBeliefs
        ? prisma.belief.findMany({ where: { seekerId: seeker.id } })
        : [],
      options.includeRituals
        ? prisma.ritual.findMany({ where: { seekerId: seeker.id } })
        : [],
    ])

    const content = await generateSacredText({
      insights,
      beliefs,
      rituals,
      additionalContext: options.additionalContext,
    })

    // Increment version from last sacred text
    const lastText = await prisma.sacredText.findFirst({
      where: { seekerId: seeker.id },
      orderBy: { version: 'desc' },
    })

    const sacredText = await prisma.sacredText.create({
      data: {
        content,
        seekerId: seeker.id,
        version: (lastText?.version ?? 0) + 1,
      },
    })

    return ok(sacredText)
  } catch (e) {
    return handleError(e)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const texts = await prisma.sacredText.findMany({
      where: { seekerId: seeker.id },
      orderBy: { version: 'desc' },
    })
    return ok(texts)
  } catch (e) {
    return handleError(e)
  }
}
