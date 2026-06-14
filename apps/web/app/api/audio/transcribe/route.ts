import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, handleError } from '@/lib/api-helpers'
import { transcribeAudio, extractTextFromImage } from '@/lib/ai'

const TranscribeSchema = z.union([
  z.object({ audioBase64: z.string(), type: z.literal('audio').optional() }),
  z.object({ imageBase64: z.string(), type: z.literal('image') }),
])

export async function POST(request: NextRequest) {
  try {
    const body = TranscribeSchema.parse(await request.json())

    if ('imageBase64' in body) {
      const text = await extractTextFromImage(body.imageBase64)
      return ok({ text })
    } else {
      const text = await transcribeAudio(body.audioBase64)
      return ok({ text })
    }
  } catch (e) {
    return handleError(e)
  }
}
