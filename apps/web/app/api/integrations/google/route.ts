import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, handleError, getAuthenticatedSeekerId, seekerFromSupabaseId } from '@/lib/api-helpers'
import { exportJourneyToDoc, exportMetricsToSheet } from '@/lib/integrations/google'

const ExportDocSchema = z.object({ journeyId: z.string(), accessToken: z.string() })
const ExportSheetSchema = z.object({ accessToken: z.string() })

export async function POST(request: NextRequest) {
  try {
    const supabaseId = await getAuthenticatedSeekerId(request)
    const seeker = await seekerFromSupabaseId(supabaseId)

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'export-doc') {
      const { journeyId, accessToken } = ExportDocSchema.parse(await request.json())
      const docUrl = await exportJourneyToDoc(journeyId, seeker.id, accessToken)
      return ok({ docUrl })
    }

    if (action === 'export-sheet') {
      const { accessToken } = ExportSheetSchema.parse(await request.json())
      const sheetUrl = await exportMetricsToSheet(seeker.id, accessToken)
      return ok({ sheetUrl })
    }

    return ok({ message: 'No action specified' })
  } catch (e) {
    return handleError(e)
  }
}
