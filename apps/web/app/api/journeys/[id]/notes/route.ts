import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, err, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreateNoteSchema = z.object({
  type: z.enum(['TEXT', 'AUDIO', 'VISUAL', 'PHOTO']),
  content: z.string().optional(),
  mediaUrl: z.string().optional(),
  canvasData: z.string().optional(),
  phase: z.enum(['BEFORE', 'DURING', 'AFTER', 'INTEGRATION']).optional(),
  mood: z.number().int().min(1).max(10).optional(),
  bodyFeel: z.number().int().min(1).max(10).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
    })
    if (!journey) return err('Journey not found', 404)

    const notes = await prisma.note.findMany({
      where: { journeyId: params.id },
      orderBy: { timestamp: 'asc' },
    })
    return ok(notes)
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

    const body = CreateNoteSchema.parse(await request.json())

    const note = await prisma.note.create({
      data: {
        ...body,
        journeyId: params.id,
        seekerId: seeker.id,
      },
    })
    return ok(note)
  } catch (e) {
    return handleError(e)
  }
}
