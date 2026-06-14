import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert,
} from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDoses, useLogDose } from '@/hooks/useDoses'
import { useJourney } from '@/hooks/useJourneys'
import { scheduleJourneyReminder, cancelReminder, getPendingReminders } from '@/lib/notifications'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'

function useLiveTimer(startIso: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - new Date(startIso).getTime()) / 1000))
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startIso).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startIso])
  return elapsed
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const REMINDER_PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '2 hrs', minutes: 120 },
]

export default function DoseTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: journey } = useJourney(id)
  const { data: doses = [] } = useDoses(id)
  const logDose = useLogDose(id)

  const sessionElapsed = useLiveTimer(journey?.scheduledAt ?? new Date().toISOString())
  const lastDoseElapsed = useLiveTimer(doses[doses.length - 1]?.takenAt ?? new Date().toISOString())

  const [showLogModal, setShowLogModal] = useState(false)
  const [doseAmount, setDoseAmount] = useState('')
  const [doseNotes, setDoseNotes] = useState('')
  const [reminders, setReminders] = useState(getPendingReminders(id))

  const totalDose = doses.reduce((sum, d) => sum + d.doseMg, 0)

  async function handleLogDose() {
    if (!doseAmount || !journey) return
    await logDose.mutateAsync({
      substance: journey.substance,
      doseMg: parseFloat(doseAmount),
      doseUnit: journey.doseUnit,
      notes: doseNotes || undefined,
    })
    setDoseAmount('')
    setDoseNotes('')
    setShowLogModal(false)
  }

  async function handleSetReminder(minutes: number) {
    const notifId = await scheduleJourneyReminder(
      id,
      `${minutes} minutes have passed. How are you feeling?`,
      minutes
    )
    if (notifId) {
      setReminders(getPendingReminders(id))
      Alert.alert('Reminder set', `You'll be notified in ${minutes} minutes`)
    } else {
      Alert.alert('Permission needed', 'Enable notifications to use reminders')
    }
  }

  async function handleCancelReminder(notifId: string) {
    await cancelReminder(notifId)
    setReminders(getPendingReminders(id))
  }

  if (!journey) return null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dose Timeline</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Live timers */}
        <View style={styles.timerRow}>
          <View style={styles.timerCard}>
            <Text style={styles.timerValue}>{formatElapsed(sessionElapsed)}</Text>
            <Text style={styles.timerLabel}>session time</Text>
          </View>
          <View style={styles.timerCard}>
            <Text style={[styles.timerValue, { color: Colors.accent }]}>
              {doses.length > 0 ? formatElapsed(lastDoseElapsed) : '—'}
            </Text>
            <Text style={styles.timerLabel}>since last dose</Text>
          </View>
          <View style={styles.timerCard}>
            <Text style={[styles.timerValue, { color: Colors.success }]}>
              {totalDose > 0 ? `${totalDose}${journey.doseUnit}` : '—'}
            </Text>
            <Text style={styles.timerLabel}>total dose</Text>
          </View>
        </View>

        {/* Log dose button */}
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowLogModal(true)}>
          <Text style={styles.logBtnText}>+ Log Dose Now</Text>
        </TouchableOpacity>

        {/* Reminders */}
        <Text style={styles.sectionTitle}>Set Reminder</Text>
        <View style={styles.reminderPresets}>
          {REMINDER_PRESETS.map(({ label, minutes }) => (
            <TouchableOpacity
              key={minutes}
              style={styles.reminderPreset}
              onPress={() => handleSetReminder(minutes)}
            >
              <Text style={styles.reminderPresetText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {reminders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Reminders</Text>
            {reminders.map((r) => (
              <View key={r.id} style={styles.reminderItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderMsg}>{r.message}</Text>
                  <Text style={styles.reminderTime}>at {formatTime(r.scheduledAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCancelReminder(r.notificationId)}>
                  <Text style={styles.cancelReminder}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Dose timeline */}
        <Text style={styles.sectionTitle}>Timeline</Text>
        {doses.length === 0 ? (
          <Text style={styles.muted}>No doses logged yet</Text>
        ) : (
          doses.map((dose, i) => (
            <View key={dose.id} style={styles.doseRow}>
              <View style={styles.doseTimeline}>
                <View style={styles.doseCircle} />
                {i < doses.length - 1 && <View style={styles.doseLine} />}
              </View>
              <View style={styles.doseInfo}>
                <Text style={styles.doseTime}>{formatTime(dose.takenAt)}</Text>
                <Text style={styles.doseAmount}>
                  {dose.doseMg} {dose.doseUnit}
                  <Text style={styles.doseCumulative}> (cumulative: {dose.cumulativeMg?.toFixed(1)})</Text>
                </Text>
                {dose.notes && <Text style={styles.doseNotes}>{dose.notes}</Text>}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log dose modal */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Dose</Text>
            <TouchableOpacity onPress={handleLogDose} disabled={!doseAmount}>
              <Text style={[styles.save, !doseAmount && styles.disabled]}>Log</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Amount ({journey.doseUnit})</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 1.5"
              placeholderTextColor={Colors.textMuted}
              value={doseAmount}
              onChangeText={setDoseAmount}
              autoFocus
            />
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="How are you feeling? Any notable effects?"
              placeholderTextColor={Colors.textMuted}
              multiline
              value={doseNotes}
              onChangeText={setDoseNotes}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  back: { color: Colors.primary, fontSize: 16 },
  title: Typography.h2,
  scroll: { padding: Spacing.md, gap: Spacing.md },
  timerRow: { flexDirection: 'row', gap: Spacing.sm },
  timerCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  timerValue: { ...Typography.h2, color: Colors.primary, fontVariant: ['tabular-nums'] },
  timerLabel: Typography.small,
  logBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { ...Typography.h3, marginTop: Spacing.sm },
  reminderPresets: { flexDirection: 'row', gap: Spacing.sm },
  reminderPreset: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reminderPresetText: Typography.caption,
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reminderMsg: Typography.body,
  reminderTime: Typography.small,
  cancelReminder: { color: Colors.danger, fontSize: 20 },
  muted: { ...Typography.caption, textAlign: 'center', padding: Spacing.md },
  doseRow: { flexDirection: 'row', gap: Spacing.md },
  doseTimeline: { alignItems: 'center', width: 20 },
  doseCircle: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.primary, marginTop: 4,
  },
  doseLine: { flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 4 },
  doseInfo: { flex: 1, paddingBottom: Spacing.md },
  doseTime: { ...Typography.caption, color: Colors.primaryLight },
  doseAmount: Typography.body,
  doseCumulative: { ...Typography.small, color: Colors.textMuted },
  doseNotes: { ...Typography.small, fontStyle: 'italic', marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: Typography.h3,
  cancel: { color: Colors.textMuted, fontSize: 16 },
  save: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
  modalBody: { padding: Spacing.md, gap: Spacing.sm },
  fieldLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
  },
  success: { color: Colors.success },
})
