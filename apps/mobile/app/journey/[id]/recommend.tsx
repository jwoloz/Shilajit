import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { JourneyRecommendation, JourneyAnalysis } from '@shilajit/types'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'

export default function RecommendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', id],
    queryFn: async () => {
      const res = await api.get<JourneyRecommendation[]>(`/api/journeys/${id}/recommend`)
      return res.data ?? []
    },
  })

  const { data: analysis } = useQuery({
    queryKey: ['analysis', id],
    queryFn: async () => {
      const res = await api.get<JourneyAnalysis>(`/api/journeys/${id}/analysis`)
      return res.data ?? null
    },
  })

  const generateRecommendations = useMutation({
    mutationFn: () => api.post(`/api/journeys/${id}/recommend`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations', id] }),
  })

  const generateAnalysis = useMutation({
    mutationFn: () => api.post(`/api/journeys/${id}/analysis`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis', id] }),
  })

  const latest = recommendations[0]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Guidance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Journey Analysis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Journey Analysis</Text>
          {analysis ? (
            <>
              {analysis.themes.length > 0 && (
                <Section label="Themes" items={analysis.themes} />
              )}
              {analysis.emotionalArc && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Emotional Arc</Text>
                  <Text style={styles.fieldValue}>{analysis.emotionalArc}</Text>
                </View>
              )}
              {analysis.integrationAreas.length > 0 && (
                <Section label="Integration Areas" items={analysis.integrationAreas} />
              )}
              {analysis.synchronicities.length > 0 && (
                <Section label="Synchronicities" items={analysis.synchronicities} />
              )}
            </>
          ) : (
            <Text style={styles.muted}>
              Add notes to your journey, then generate an analysis.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.btn, generateAnalysis.isPending && styles.disabled]}
            onPress={() => generateAnalysis.mutate()}
            disabled={generateAnalysis.isPending}
          >
            {generateAnalysis.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {analysis ? 'Refresh Analysis' : 'Generate Analysis'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recommendations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Steps & Tools</Text>
          {latest ? (
            <Text style={styles.recommendContent}>{latest.content}</Text>
          ) : (
            <Text style={styles.muted}>
              Get personalized recommendations based on your journey notes and insights.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.btn, generateRecommendations.isPending && styles.disabled]}
            onPress={() => generateRecommendations.mutate()}
            disabled={generateRecommendations.isPending}
          >
            {generateRecommendations.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {latest ? 'Refresh Recommendations' : 'Get Recommendations'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* History */}
        {recommendations.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Previous Recommendations</Text>
            {recommendations.slice(1).map((r) => (
              <View key={r.id} style={styles.historyItem}>
                <Text style={styles.historyDate}>
                  {new Date(r.generatedAt).toLocaleDateString()}
                </Text>
                <Text style={styles.historyContent} numberOfLines={3}>{r.content}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ label, items }: { label: string; items: string[] }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {items.map((item, i) => (
        <Text key={i} style={styles.bullet}>• {item}</Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  back: { color: Colors.primary, fontSize: 16 },
  title: Typography.h2,
  scroll: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md,
  },
  cardTitle: Typography.h3,
  muted: { ...Typography.caption, lineHeight: 20 },
  field: { gap: 4 },
  fieldLabel: { ...Typography.caption, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { ...Typography.body, lineHeight: 22 },
  bullet: { ...Typography.body, lineHeight: 22, paddingLeft: 4 },
  recommendContent: { ...Typography.body, lineHeight: 24 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  historyItem: {
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, gap: 4,
  },
  historyDate: Typography.small,
  historyContent: Typography.caption,
})
