import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch,
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { JourneyRepository } from '@/lib/db/repositories/journey'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import type { CreateJourneyInput } from '@shilajit/types'

const COMMON_SUBSTANCES = ['Psilocybin', 'LSD', 'MDMA', 'Ayahuasca', 'DMT', 'Mescaline', 'Ketamine']

export default function NewJourneyScreen() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<CreateJourneyInput>>({
    scheduledAt: new Date().toISOString(),
    doseUnit: 'mg',
  })

  const create = useMutation({
    mutationFn: (input: CreateJourneyInput) => {
      const journey = JourneyRepository.create(input)
      return Promise.resolve(journey)
    },
    onSuccess: (journey) => {
      qc.invalidateQueries({ queryKey: ['journeys'] })
      router.replace(`/journey/${journey.id}`)
    },
  })

  const canSubmit = !!form.substance && !!form.scheduledAt

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Journey</Text>
          <TouchableOpacity
            onPress={() => canSubmit && create.mutate(form as CreateJourneyInput)}
            disabled={!canSubmit}
          >
            <Text style={[styles.save, !canSubmit && styles.disabled]}>Begin</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Substance *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
          {COMMON_SUBSTANCES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, form.substance === s && styles.pillActive]}
              onPress={() => setForm((f) => ({ ...f, substance: s }))}
            >
              <Text style={[styles.pillText, form.substance === s && styles.pillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Or type a substance..."
          placeholderTextColor={Colors.textMuted}
          value={form.substance ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, substance: v }))}
        />

        <Text style={styles.label}>Dose</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Amount"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={form.doseMg?.toString() ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, doseMg: v ? parseFloat(v) : undefined }))}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="mg"
            placeholderTextColor={Colors.textMuted}
            value={form.doseUnit ?? 'mg'}
            onChangeText={(v) => setForm((f) => ({ ...f, doseUnit: v }))}
          />
        </View>

        <Text style={styles.label}>Spore / Source / Strain</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Golden Teacher, Deadhead Chemist..."
          placeholderTextColor={Colors.textMuted}
          value={form.sporeSource ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, sporeSource: v }))}
        />

        <Text style={styles.label}>Intentions</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What do you seek from this journey?"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          value={form.intentions ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, intentions: v }))}
        />

        <Text style={styles.label}>Setting</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Where will you journey? Who will be present?"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          value={form.setting ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, setting: v }))}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: Typography.h2,
  cancel: { color: Colors.textMuted, fontSize: 16 },
  save: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
  label: { ...Typography.caption, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  pills: { flexGrow: 0, marginBottom: Spacing.sm },
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: Typography.caption,
  pillTextActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: Spacing.sm },
})
