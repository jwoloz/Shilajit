import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import type { Prisma } from '@prisma/client'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreateBeliefSchema = z.object({
  content: z.string().min(1),
  category: z
    .enum(['ETHICS', 'COSMOLOGY', 'PRACTICE', 'RELATIONSHIPS', 'PURPOSE', 'DEATH', 'OTHER'])
    .optional(),
  insightIds: z.array(z.string()).default([]),
})

export async function GET(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const beliefs = await prisma.belief.findMany({
      where: { seekerId: seeker.id },
      include: { insights: { select: { id: true, content: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(beliefs)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const { insightIds, ...data } = CreateBeliefSchema.parse(await request.json())

    const belief = await prisma.belief.create({
      data: {
        content: data.content,
        category: data.category,
        seeker: { connect: { id: seeker.id } },
        insights: insightIds.length > 0 ? { connect: insightIds.map((id) => ({ id })) } : undefined,
      } satisfies Prisma.BeliefCreateInput,
    })
    return ok(belief)
  } catch (e) {
    return handleError(e)
  }
}
