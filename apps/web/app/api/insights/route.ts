import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreateInsightSchema = z.object({
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  resonance: z.number().int().min(1).max(10).default(5),
  isCore: z.boolean().default(false),
  journeyId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const { searchParams } = new URL(request.url)
    const coreOnly = searchParams.get('core') === 'true'
    const tag = searchParams.get('tag')

    const insights = await prisma.insight.findMany({
      where: {
        seekerId: seeker.id,
        ...(coreOnly ? { isCore: true } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: [{ resonance: 'desc' }, { createdAt: 'desc' }],
    })

    return ok(insights)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const body = CreateInsightSchema.parse(await request.json())

    const insight = await prisma.insight.create({
      data: { ...body, seekerId: seeker.id } as any,
    })
    return ok(insight)
  } catch (e) {
    return handleError(e)
  }
}
