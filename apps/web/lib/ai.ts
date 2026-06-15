import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CompanionMessage, JourneyAnalysis } from '@shilajit/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const geminiAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '')

// ─── Doctrine ─────────────────────────────────────────────────────────────────

interface DoctrineInsight {
  content: string
  resonance: number
}

interface DoctrineBelief {
  content: string
  category: string | null
}

interface DoctrineRitual {
  name: string
  description: string
}

interface DoctrineContext {
  insights: DoctrineInsight[]
  beliefs: DoctrineBelief[]
  rituals: DoctrineRitual[]
  additionalContext?: string
}

export async function generateSacredText(context: DoctrineContext): Promise<string> {
  const prompt = buildDoctrinePrompt(context)
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a sacred scribe who transforms personal psychedelic experiences, insights,
and beliefs into a living doctrine. Write in the first-person voice of the seeker.
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
    parts.push('## Core Insights')
    context.insights.forEach((i) => parts.push(`- [resonance: ${i.resonance}/10] ${i.content}`))
  }
  if (context.beliefs.length > 0) {
    parts.push('\n## My Beliefs')
    context.beliefs.forEach((b) => parts.push(`- [${b.category ?? 'GENERAL'}] ${b.content}`))
  }
  if (context.rituals.length > 0) {
    parts.push('\n## My Rituals')
    context.rituals.forEach((r) => parts.push(`- ${r.name}: ${r.description}`))
  }
  if (context.additionalContext) {
    parts.push('\n## Additional Context\n' + context.additionalContext)
  }
  parts.push('\nWrite my Sacred Text as a cohesive document with chapters addressing ethics, cosmology, practices, and relationship with death and rebirth.')
  return parts.join('\n')
}

// ─── Insight extraction ───────────────────────────────────────────────────────

export async function extractInsightsFromEntry(entryContent: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Extract 2-5 distinct insights from this psychedelic journey entry. Return JSON: { "insights": ["..."] }. Each insight should be a clear, actionable learning.',
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

// ─── Audio transcription (Whisper) ───────────────────────────────────────────

export async function transcribeAudio(audioBase64: string): Promise<string> {
  const buffer = Buffer.from(audioBase64, 'base64')
  const file = new File([buffer], 'recording.m4a', { type: 'audio/mp4' })
  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
  })
  return response.text
}

// ─── Image OCR / text extraction (GPT-4o Vision) ─────────────────────────────

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all visible text from this image. If there is no text, describe what you see in a few sentences. Return only the extracted content, no preamble.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 1000,
  })
  return response.choices[0]?.message?.content ?? ''
}

// ─── Journey analysis ─────────────────────────────────────────────────────────

interface JourneyWithContext {
  substance: string
  intentions: string | null
  notes: Array<{ content: string | null; type: string; phase: string | null; mood: number | null }>
  entries: Array<{ content: string; phase: string }>
  insights: Array<{ content: string }>
  doseEvents: Array<{ doseMg: number; doseUnit: string; takenAt: Date }>
}

export async function analyzeJourneyNotes(journey: JourneyWithContext): Promise<JourneyAnalysis> {
  const allContent = [
    journey.intentions ? `Intention: ${journey.intentions}` : '',
    ...journey.entries.map((e) => `[${e.phase}] ${e.content}`),
    ...journey.notes.filter((n) => n.content).map((n) => `[${n.type}/${n.phase}] ${n.content}`),
    ...journey.insights.map((i) => `Insight: ${i.content}`),
    journey.doseEvents.length > 0
      ? `Doses: ${journey.doseEvents.map((d) => `${d.doseMg}${d.doseUnit} at ${new Date(d.takenAt).toLocaleTimeString()}`).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a psychedelic integration specialist. Analyze the journey notes and return a structured JSON analysis.
Return exactly this shape:
{
  "themes": ["theme1", "theme2"],
  "emotionalArc": "description of emotional journey",
  "physicalSensations": ["sensation1", "sensation2"],
  "synchronicities": ["synchronicity1"],
  "integrationAreas": ["area1", "area2"],
  "rawSummary": "2-3 paragraph summary"
}`,
      },
      {
        role: 'user',
        content: `Substance: ${journey.substance}\n\nJourney content:\n${allContent}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  try {
    return JSON.parse(response.choices[0]?.message?.content ?? '{}') as JourneyAnalysis
  } catch {
    return {
      themes: [],
      emotionalArc: '',
      physicalSensations: [],
      synchronicities: [],
      integrationAreas: [],
      rawSummary: '',
    }
  }
}

// ─── Recommendations ──────────────────────────────────────────────────────────

interface RecommendContext {
  journey: { substance: string; intentions: string | null; scheduledAt: Date }
  notes: Array<{ content: string | null; type: string }>
  insights: Array<{ content: string; resonance: number }>
  beliefs: Array<{ content: string; category: string | null }>
}

export async function generateRecommendations(context: RecommendContext): Promise<string> {
  const notesSummary = context.notes
    .filter((n) => n.content)
    .slice(0, 20)
    .map((n) => `- [${n.type}] ${n.content}`)
    .join('\n')

  const insightsSummary = context.insights
    .slice(0, 10)
    .map((i) => `- (${i.resonance}/10) ${i.content}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a psychedelic integration guide. Based on a seeker's journey notes and insights,
provide concrete, actionable next steps and tool recommendations organized by category:

**Integration Practices** — somatic, contemplative, creative
**Resources** — books, modalities, practitioners
**Tools** — apps, journaling prompts, rituals
**Cautions** — if any patterns warrant attention

Write in second person, warm and direct. Use markdown formatting.`,
      },
      {
        role: 'user',
        content: `Substance: ${context.journey.substance}\nIntentions: ${context.journey.intentions ?? 'not set'}

Notes:
${notesSummary || 'No notes yet'}

Key Insights:
${insightsSummary || 'No insights yet'}

Existing Beliefs:
${context.beliefs.map((b) => `- ${b.content}`).join('\n') || 'None yet'}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  })

  return response.choices[0]?.message?.content ?? ''
}

// ─── AI Companion ─────────────────────────────────────────────────────────────

interface CompanionContext {
  audioBase64?: string
  text?: string
  history: CompanionMessage[]
  provider: 'gemini' | 'claude'
  journeyContext: {
    journey: { substance: string; intentions: string | null } | null
    coreInsights: Array<{ content: string }>
    beliefs: Array<{ content: string }>
  }
}

const COMPANION_SYSTEM = (ctx: CompanionContext['journeyContext']) => `
You are a compassionate psychedelic journey companion. You are present with the seeker during or after their experience.

${ctx.journey ? `Current journey: ${ctx.journey.substance}
Intentions: ${ctx.journey.intentions ?? 'not set'}` : ''}

${ctx.coreInsights.length > 0 ? `Seeker's core insights from past journeys:\n${ctx.coreInsights.map((i) => `- ${i.content}`).join('\n')}` : ''}

${ctx.beliefs.length > 0 ? `Seeker's beliefs:\n${ctx.beliefs.map((b) => `- ${b.content}`).join('\n')}` : ''}

Guidelines:
- Be present, non-judgmental, and curious
- Reflect back what you hear; don't interpret too quickly
- Ask open questions that help the seeker go deeper
- If they seem distressed, ground them gently
- Keep responses concise — this is a conversation, not a lecture
- Never diagnose, prescribe, or give medical advice
`.trim()

export async function companionChat(ctx: CompanionContext): Promise<{ text: string; timestamp: string }> {
  // Transcribe audio first if provided
  let userText = ctx.text ?? ''
  if (ctx.audioBase64 && !userText) {
    userText = await transcribeAudio(ctx.audioBase64)
  }

  const timestamp = new Date().toISOString()

  if (ctx.provider === 'gemini') {
    const model = geminiAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: COMPANION_SYSTEM(ctx.journeyContext),
    })
    const chat = model.startChat({
      history: ctx.history.slice(-20).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })
    const result = await chat.sendMessage(userText)
    return { text: result.response.text(), timestamp }
  }

  // Claude
  const messages = [
    ...ctx.history.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userText },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: COMPANION_SYSTEM(ctx.journeyContext),
    messages,
  })

  const text =
    response.content[0]?.type === 'text' ? response.content[0].text : ''
  return { text, timestamp }
}
