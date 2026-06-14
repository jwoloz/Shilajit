import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { getDb } from './db'
import { generateId } from './utils'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleJourneyReminder(
  journeyId: string,
  message: string,
  delayMinutes: number
): Promise<string | null> {
  const granted = await requestNotificationPermissions()
  if (!granted) return null

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Journey Reminder',
      body: message,
      data: { journeyId },
    },
    trigger: { seconds: delayMinutes * 60 },
  })

  const db = getDb()
  db.runSync(
    `INSERT INTO reminders (id, journey_id, notification_id, message, scheduled_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      generateId(),
      journeyId,
      notificationId,
      message,
      new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    ]
  )

  return notificationId
}

export async function cancelReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId)
  const db = getDb()
  db.runSync('UPDATE reminders SET fired = 1 WHERE notification_id = ?', [notificationId])
}

export async function cancelAllJourneyReminders(journeyId: string): Promise<void> {
  const db = getDb()
  const rows = db.getAllSync(
    'SELECT notification_id FROM reminders WHERE journey_id = ? AND fired = 0',
    [journeyId]
  ) as Array<{ notification_id: string }>

  await Promise.all(
    rows.map((r) => Notifications.cancelScheduledNotificationAsync(r.notification_id))
  )
  db.runSync('UPDATE reminders SET fired = 1 WHERE journey_id = ?', [journeyId])
}

export function getPendingReminders(
  journeyId: string
): Array<{ id: string; message: string; scheduledAt: string; notificationId: string }> {
  const db = getDb()
  const rows = db.getAllSync(
    'SELECT id, message, scheduled_at, notification_id FROM reminders WHERE journey_id = ? AND fired = 0 ORDER BY scheduled_at ASC',
    [journeyId]
  )
  return rows.map((r) => ({
    id: r.id as string,
    message: r.message as string,
    scheduledAt: r.scheduled_at as string,
    notificationId: r.notification_id as string,
  }))
}
