import { prisma } from '@shilajit/db'

const GOOGLE_API = 'https://www.googleapis.com'

async function googleFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GOOGLE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`Google API error: ${res.status}`)
  return res.json()
}

export async function exportJourneyToDoc(
  journeyId: string,
  seekerId: string,
  accessToken: string
): Promise<string> {
  const journey = await prisma.journey.findFirst({
    where: { id: journeyId, seekerId },
    include: {
      entries: { orderBy: { timestamp: 'asc' } },
      notes: { orderBy: { timestamp: 'asc' } },
      insights: { orderBy: { resonance: 'desc' } },
      doseEvents: { orderBy: { takenAt: 'asc' } },
    },
  })
  if (!journey) throw new Error('Journey not found')

  const docContent = buildDocContent(journey)

  // Create Google Doc
  const doc = await googleFetch('/drive/v3/files', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: `Journey: ${journey.substance} — ${new Date(journey.scheduledAt).toLocaleDateString()}`,
      mimeType: 'application/vnd.google-apps.document',
    }),
  })

  // Write content via Docs API
  await googleFetch(`/docs/v1/documents/${doc.id}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: docContent,
          },
        },
      ],
    }),
  })

  return `https://docs.google.com/document/d/${doc.id}/edit`
}

function buildDocContent(journey: {
  substance: string
  scheduledAt: Date
  intentions: string | null
  setting: string | null
  doseMg: number | null
  doseUnit: string
  doseEvents: Array<{ doseMg: number; doseUnit: string; takenAt: Date; notes: string | null }>
  entries: Array<{ phase: string; content: string; timestamp: Date }>
  notes: Array<{ type: string; content: string | null; mood: number | null; phase: string | null }>
  insights: Array<{ content: string; resonance: number; isCore: boolean }>
}): string {
  const lines: string[] = [
    `JOURNEY: ${journey.substance}`,
    `Date: ${new Date(journey.scheduledAt).toLocaleDateString()}`,
    '',
  ]

  if (journey.intentions) {
    lines.push('INTENTIONS', journey.intentions, '')
  }
  if (journey.setting) {
    lines.push('SETTING', journey.setting, '')
  }

  if (journey.doseEvents.length > 0) {
    lines.push('DOSE TIMELINE')
    journey.doseEvents.forEach((d) => {
      lines.push(
        `  ${new Date(d.takenAt).toLocaleTimeString()} — ${d.doseMg}${d.doseUnit}${d.notes ? ` (${d.notes})` : ''}`
      )
    })
    lines.push('')
  }

  const entryPhases = ['BEFORE', 'DURING', 'AFTER', 'INTEGRATION']
  entryPhases.forEach((phase) => {
    const phaseEntries = journey.entries.filter((e) => e.phase === phase)
    if (phaseEntries.length > 0) {
      lines.push(phase)
      phaseEntries.forEach((e) => lines.push(e.content, ''))
    }
  })

  if (journey.notes.filter((n) => n.content).length > 0) {
    lines.push('NOTES')
    journey.notes
      .filter((n) => n.content)
      .forEach((n) => {
        const moodStr = n.mood ? ` [mood: ${n.mood}/10]` : ''
        lines.push(`[${n.type}/${n.phase ?? '—'}]${moodStr}`, n.content!, '')
      })
  }

  if (journey.insights.length > 0) {
    lines.push('INSIGHTS')
    journey.insights.forEach((i) => {
      lines.push(`${i.isCore ? '★ ' : ''}${i.content} (${i.resonance}/10)`)
    })
  }

  return lines.join('\n')
}

export async function exportMetricsToSheet(seekerId: string, accessToken: string): Promise<string> {
  const journeys = await prisma.journey.findMany({
    where: { seekerId },
    include: {
      doseEvents: true,
      notes: true,
      insights: true,
    },
    orderBy: { scheduledAt: 'asc' },
  })

  // Create Spreadsheet
  const sheet = await googleFetch('/sheets/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: 'Shilajit Journey Metrics' },
      sheets: [{ properties: { title: 'Journeys' } }],
    }),
  })

  const headers = [
    'Date', 'Substance', 'Total Dose (mg)', 'Dose Events',
    'Notes', 'Insights', 'Avg Mood', 'Duration (min)',
  ]

  const rows = journeys.map((j: (typeof journeys)[number]) => {
    const totalDose = j.doseEvents.reduce((s: number, d: { doseMg: number }) => s + d.doseMg, 0)
    const moods = j.notes.filter((n: { mood: unknown }) => n.mood !== null).map((n: { mood: unknown }) => n.mood as number)
    const avgMood = moods.length > 0 ? (moods.reduce((a: number, b: number) => a + b, 0) / moods.length).toFixed(1) : ''
    return [
      new Date(j.scheduledAt).toLocaleDateString(),
      j.substance,
      totalDose || '',
      j.doseEvents.length,
      j.notes.length,
      j.insights.length,
      avgMood,
      '',
    ]
  })

  await googleFetch(
    `/sheets/v4/spreadsheets/${sheet.spreadsheetId}/values/Journeys!A1:append?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ values: [headers, ...rows] }),
    }
  )

  return `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`
}
