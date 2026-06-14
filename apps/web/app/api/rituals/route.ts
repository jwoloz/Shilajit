import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreateRitualSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  frequency: z.string().optional(),
  beliefIds: z.array(z.string()).default([]),
})

export async function GET() {
  try {
    const supabaseId = await getAuthenticatedSeekerId()
    const seeker = await seekerFromSupabaseId(supabaseId)

    const rituals = await prisma.ritual.findMany({
      where: { seekerId: seeker.id },
      include: { beliefs: { select: { id: true, content: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(rituals)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId()
    const seeker = await seekerFromSupabaseId(supabaseId)
    const { beliefIds, ...data } = CreateRitualSchema.parse(await request.json())

    const ritual = await prisma.ritual.create({
      data: {
        ...data,
        seekerId: seeker.id,
        beliefs: beliefIds.length > 0 ? { connect: beliefIds.map((id) => ({ id })) } : undefined,
      },
    })
    return ok(ritual)
  } catch (e) {
    return handleError(e)
  }
}
