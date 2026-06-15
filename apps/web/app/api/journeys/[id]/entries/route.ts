import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@shilajit/db'
import { getAuthenticatedSeekerId, ok, err, handleError, seekerFromSupabaseId } from '@/lib/api-helpers'
import { extractInsightsFromEntry } from '@/lib/ai'

const CreateEntrySchema = z.object({
  content: z.string().min(1),
  phase: z.enum(['BEFORE', 'DURING', 'AFTER', 'INTEGRATION']),
  timestamp: z.string().datetime().optional(),
  autoExtractInsights: z.boolean().default(false),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const journey = await prisma.journey.findFirst({
      where: { id: params.id, seekerId: seeker.id },
    })
    if (!journey) return err('Journey not found', 404)

    const { autoExtractInsights, ...entryData } = CreateEntrySchema.parse(await request.json())

    const entry = await prisma.entry.create({
      data: { ...entryData, journeyId: params.id } as any,
    })

    // Optionally auto-extract insights via AI after AFTER/INTEGRATION entries
    if (autoExtractInsights && (entryData.phase === 'AFTER' || entryData.phase === 'INTEGRATION')) {
      const insights = await extractInsightsFromEntry(entryData.content)
      if (insights.length > 0) {
        await prisma.insight.createMany({
          data: insights.map((content) => ({
            content,
            seekerId: seeker.id,
            journeyId: params.id,
            tags: [],
          })) as any,
        })
      }
    }

    return ok(entry)
  } catch (e) {
    return handleError(e)
  }
}
