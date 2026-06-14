import OpenAI from 'openai'
import type { Insight, Belief, Ritual } from '@shilajit/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface DoctrineContext {
  insights: Insight[]
  beliefs: Belief[]
  rituals: Ritual[]
  additionalContext?: string
}

export async function generateSacredText(context: DoctrineContext): Promise<string> {
  const { insights, beliefs, rituals, additionalContext } = context

  const prompt = buildDoctrinePrompt({ insights, beliefs, rituals, additionalContext })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a sacred scribe who transforms personal psychedelic experiences, insights,
and beliefs into a living doctrine. Write in the first-person voice of the seeker.
The text should feel like a personal sacred text — not religious dogma, but deeply personal wisdom.
Use evocative, poetic language while remaining grounded in the seeker's actual experiences.`,
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 2000,
  })

  return response.choices[0]?.message?.content ?? ''
}

function buildDoctrinePrompt(context: DoctrineContext): string {
  const parts: string[] = ['Synthesize the following into my Sacred Text:\n']

  if (context.insights.length > 0) {
    parts.push('## Core Insights from my Journeys')
    context.insights.forEach((i) => parts.push(`- [resonance: ${i.resonance}/10] ${i.content}`))
  }

  if (context.beliefs.length > 0) {
    parts.push('\n## My Beliefs')
    context.beliefs.forEach((b) => parts.push(`- [${b.category ?? 'GENERAL'}] ${b.content}`))
  }

  if (context.rituals.length > 0) {
    parts.push('\n## My Rituals and Practices')
    context.rituals.forEach((r) => parts.push(`- ${r.name}: ${r.description}`))
  }

  if (context.additionalContext) {
    parts.push('\n## Additional Context')
    parts.push(context.additionalContext)
  }

  parts.push(
    '\nWrite my Sacred Text as a cohesive document with chapters. ' +
      'Begin with a preamble that captures the essence of my path, ' +
      'then address ethics, cosmology, practices, and my relationship with death and rebirth.'
  )

  return parts.join('\n')
}

export async function extractInsightsFromEntry(entryContent: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Extract 2-5 distinct insights from this psychedelic journey entry. ' +
          'Return a JSON array of strings. Each insight should be a clear, actionable learning.',
      },
      { role: 'user', content: entryContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    return Array.isArray(parsed.insights) ? parsed.insights : []
  } catch {
    return []
  }
}
