import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { JourneyRepository } from '@/lib/db/repositories/journey'
import { InsightRepository } from '@/lib/db/repositories/insight'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import { formatDate } from '@/lib/utils'
import type { Phase } from '@shilajit/types'

const PHASES: { key: Phase; label: string }[] = [
  { key: 'BEFORE', label: 'Before' },
  { key: 'DURING', label: 'During' },
  { key: 'AFTER', label: 'After' },
  { key: 'INTEGRATION', label: 'Integration' },
]

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const [phase, setPhase] = useState<Phase>('BEFORE')
  const [entryText, setEntryText] = useState('')
  const [insightText, setInsightText] = useState('')
  const [activeTab, setActiveTab] = useState<'journal' | 'insights'>('journal')

  const { data: journey } = useQuery({
    queryKey: ['journey', id],
    queryFn: () => JourneyRepository.findById(id),
  })

  const { data: insights = [] } = useQuery({
    queryKey: ['insights', id],
    queryFn: () => InsightRepository.findAll({ journeyId: id }),
  })

  const addInsight = useMutation({
    mutationFn: () => {
      const insight = InsightRepository.create({ content: insightText, journeyId: id })
      return Promise.resolve(insight)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights', id] })
      setInsightText('')
    },
  })

  if (!journey) return null

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.substance}>{journey.substance}</Text>
            <Text style={styles.date}>{formatDate(journey.scheduledAt)}</Text>
          </View>
        </View>

        {journey.intentions && (
          <View style={styles.intentionBanner}>
            <Text style={styles.intentionLabel}>Intention</Text>
            <Text style={styles.intentionText}>{journey.intentions}</Text>
          </View>
        )}

        {/* Tab switcher */}
        <View style={styles.tabs}>
          {(['journal', 'insights'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'journal' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
            {/* Phase selector */}
            <View style={styles.phases}>
              {PHASES.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.phaseBtn, phase === key && styles.phaseBtnActive]}
                  onPress={() => setPhase(key)}
                >
                  <Text style={[styles.phaseText, phase === key && styles.phaseTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.journalInput}
              placeholder={`Write your ${phase.toLowerCase()} experience...`}
              placeholderTextColor={Colors.textMuted}
              multiline
              value={entryText}
              onChangeText={setEntryText}
            />
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
            <View style={styles.addInsight}>
              <TextInput
                style={styles.insightInput}
                placeholder="Capture an insight..."
                placeholderTextColor={Colors.textMuted}
                value={insightText}
                onChangeText={setInsightText}
                returnKeyType="done"
                onSubmitEditing={() => insightText.trim() && addInsight.mutate()}
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addInsight.mutate()}
                disabled={!insightText.trim()}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <Text style={styles.insightContent}>{insight.content}</Text>
                <View style={styles.insightMeta}>
                  <Text style={styles.resonance}>{'◆'.repeat(insight.resonance)}</Text>
                  {insight.isCore && <Text style={styles.coreBadge}>CORE</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
  headerInfo: { flex: 1 },
  substance: Typography.h2,
  date: Typography.caption,
  intentionBanner: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  intentionLabel: { ...Typography.small, color: Colors.primary, marginBottom: 2 },
  intentionText: Typography.body,
  tabs: { flexDirection: 'row', margin: Spacing.md, gap: Spacing.sm },
  tab: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: Typography.caption,
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll: { padding: Spacing.md, gap: Spacing.sm },
  phases: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  phaseBtn: {
    flex: 1,
    padding: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  phaseBtnActive: { backgroundColor: Colors.primary },
  phaseText: Typography.small,
  phaseTextActive: { color: '#fff' },
  journalInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 17,
    minHeight: 300,
    textAlignVertical: 'top',
    lineHeight: 26,
  },
  addInsight: { flexDirection: 'row', gap: Spacing.sm },
  insightInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  insightCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  insightContent: Typography.body,
  insightMeta: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  resonance: { color: Colors.primary, fontSize: 10 },
  coreBadge: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
