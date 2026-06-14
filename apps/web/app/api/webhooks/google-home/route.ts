import { NextRequest } from 'next/server'
import { prisma } from '@shilajit/db'
import { ok, err, handleError } from '@/lib/api-helpers'

/**
 * Google Home webhook via Dialogflow fulfillment.
 * Handles intents:
 *   - AddJourneyNote: creates a TEXT note on the active journey
 *   - LogDose: logs a dose event
 *   - GetSessionStatus: returns current session stats
 *
 * Set this URL as the Dialogflow webhook:
 *   https://your-domain.com/api/webhooks/google-home
 *
 * Auth: Dialogflow sends a secret header configured in the Dialogflow console.
 */
export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.GOOGLE_HOME_WEBHOOK_SECRET
    if (webhookSecret) {
      const auth = request.headers.get('authorization')
      if (auth !== `Bearer ${webhookSecret}`) {
        return err('Unauthorized', 401)
      }
    }

    const body = await request.json()
    const intent = body?.queryResult?.intent?.displayName as string
    const params = body?.queryResult?.parameters ?? {}
    const seekerEmail = body?.originalDetectIntentRequest?.payload?.user?.email as string | undefined

    if (!seekerEmail) {
      return ok({ fulfillmentText: "I couldn't identify your account. Please sign in to Shilajit." })
    }

    // Resolve seeker from email
    const seeker = await prisma.seeker.findFirst({
      where: { username: seekerEmail },
    })
    if (!seeker) {
      return ok({ fulfillmentText: 'No Shilajit account found for this Google account.' })
    }

    // Find active journey (most recent in the last 24h)
    const activeJourney = await prisma.journey.findFirst({
      where: {
        seekerId: seeker.id,
        scheduledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { scheduledAt: 'desc' },
    })

    if (intent === 'AddJourneyNote') {
      const noteText = params.note as string
      if (!activeJourney) {
        return ok({ fulfillmentText: 'No active journey found in the last 24 hours.' })
      }
      await prisma.note.create({
        data: {
          type: 'TEXT',
          content: noteText,
          journeyId: activeJourney.id,
          seekerId: seeker.id,
          phase: 'DURING',
        },
      })
      return ok({ fulfillmentText: `Note added to your ${activeJourney.substance} journey.` })
    }

    if (intent === 'LogDose') {
      const doseMg = parseFloat(params.dose) || 0
      if (!activeJourney || !doseMg) {
        return ok({ fulfillmentText: 'Could not log dose. No active journey or dose amount unclear.' })
      }
      const existing = await prisma.doseEvent.findMany({ where: { journeyId: activeJourney.id } })
      const cumulative = existing.reduce((s, d) => s + d.doseMg, 0) + doseMg
      await prisma.doseEvent.create({
        data: {
          substance: activeJourney.substance,
          doseMg,
          doseUnit: activeJourney.doseUnit,
          journeyId: activeJourney.id,
          cumulativeMg: cumulative,
        },
      })
      return ok({
        fulfillmentText: `Logged ${doseMg}${activeJourney.doseUnit} of ${activeJourney.substance}. Total: ${cumulative}${activeJourney.doseUnit}.`,
      })
    }

    if (intent === 'GetSessionStatus') {
      if (!activeJourney) {
        return ok({ fulfillmentText: 'No active journey found.' })
      }
      const doses = await prisma.doseEvent.findMany({ where: { journeyId: activeJourney.id } })
      const total = doses.reduce((s, d) => s + d.doseMg, 0)
      const elapsed = Math.floor((Date.now() - new Date(activeJourney.scheduledAt).getTime()) / 60000)
      return ok({
        fulfillmentText: `${elapsed} minutes into your ${activeJourney.substance} journey. Total dose: ${total}${activeJourney.doseUnit}.`,
      })
    }

    return ok({ fulfillmentText: "I didn't understand that. Try: 'add a note', 'log a dose', or 'session status'." })
  } catch (e) {
    return handleError(e)
  }
}
