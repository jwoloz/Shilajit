import { useState, useCallback } from 'react'
import { sendToGemini } from '@/lib/integrations/gemini'
import { sendToClaude } from '@/lib/integrations/claude-audio'
import { speak, stopSpeaking } from '@/lib/audio'
import type { CompanionMessage, CompanionProvider } from '@shilajit/types'

export function useCompanion(journeyId: string, provider: CompanionProvider = 'claude') {
  const [history, setHistory] = useState<CompanionMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(
    async (opts: { audioBase64?: string; text?: string }) => {
      setThinking(true)
      setError(null)

      const userMsg: CompanionMessage = {
        role: 'user',
        content: opts.text ?? '[audio message]',
        timestamp: new Date().toISOString(),
      }
      setHistory((h) => [...h, userMsg])

      try {
        const fn = provider === 'gemini' ? sendToGemini : sendToClaude
        const response = await fn({ ...opts, journeyId, history })

        const assistantMsg: CompanionMessage = {
          role: 'assistant',
          content: response.text,
          timestamp: response.timestamp,
        }
        setHistory((h) => [...h, assistantMsg])
        speak(response.text)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Companion error')
      } finally {
        setThinking(false)
      }
    },
    [journeyId, provider, history]
  )

  const clear = useCallback(() => {
    stopSpeaking()
    setHistory([])
    setError(null)
  }, [])

  return { history, thinking, error, send, clear }
}
