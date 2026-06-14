import { api } from '@/lib/api/client'
import type { CompanionMessage, CompanionResponse } from '@shilajit/types'

/**
 * Sends audio or text to the Claude companion via our Next.js API.
 * The backend transcribes audio via Whisper, then sends the text to Claude
 * with full journey context as the system prompt.
 */
export async function sendToClaude(opts: {
  audioBase64?: string
  text?: string
  journeyId: string
  history: CompanionMessage[]
}): Promise<CompanionResponse> {
  const result = await api.post<CompanionResponse>('/api/audio/companion', {
    ...opts,
    provider: 'claude',
  })

  if (result.error) throw new Error(result.error.message)
  return result.data
}
