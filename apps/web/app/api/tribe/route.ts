import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'

const CreatePostSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['INSIGHT', 'RITUAL', 'DOCTRINE_EXCERPT', 'REFLECTION']),
  visibility: z.enum(['PRIVATE', 'TRIBE', 'PUBLIC']).default('TRIBE'),
})

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedSeekerId(request)
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)

    const posts = await prisma.tribePost.findMany({
      where: { visibility: { in: ['TRIBE', 'PUBLIC'] } },
      include: { seeker: { select: { tribeHandle: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    return ok({
      posts,
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)
    const body = CreatePostSchema.parse(await request.json())

    const post = await prisma.tribePost.create({
      data: { ...body, seekerId: seeker.id } as any,
      include: { seeker: { select: { tribeHandle: true } } },
    })
    return ok(post)
  } catch (e) {
    return handleError(e)
  }
}
