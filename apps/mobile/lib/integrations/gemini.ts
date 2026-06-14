import { api } from '@/lib/api/client'
import type { CompanionMessage, CompanionResponse } from '@shilajit/types'

/**
 * Sends audio or text to the Gemini companion via our Next.js API.
 * The backend handles context injection (journey intentions, insights, beliefs)
 * and calls Google Gemini with the audio payload directly (supports audio natively).
 */
export async function sendToGemini(opts: {
  audioBase64?: string
  text?: string
  journeyId: string
  history: CompanionMessage[]
}): Promise<CompanionResponse> {
  const result = await api.post<CompanionResponse>('/api/audio/companion', {
    ...opts,
    provider: 'gemini',
  })

  if (result.error) throw new Error(result.error.message)
  return result.data
}
