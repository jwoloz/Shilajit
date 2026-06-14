import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { SacredText } from '@shilajit/types'
import { Colors, Spacing, Typography } from '@/constants/theme'

export default function DoctrineScreen() {
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)

  const { data: texts = [] } = useQuery({
    queryKey: ['doctrine'],
    queryFn: async () => {
      const res = await api.get<SacredText[]>('/api/doctrine/generate')
      return res.data ?? []
    },
  })

  const latest = texts[0]

  const generate = useMutation({
    mutationFn: () =>
      api.post<SacredText>('/api/doctrine/generate', {
        includeInsights: true,
        includeBeliefs: true,
        includeRituals: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctrine'] }),
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Sacred Text</Text>
        <Text style={styles.subtitle}>
          {texts.length > 0 ? `Version ${latest.version}` : 'Your doctrine has not been written yet'}
        </Text>

        <TouchableOpacity
          style={[styles.generateBtn, generate.isPending && styles.disabled]}
          onPress={() => generate.mutate()}
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>
              {texts.length > 0 ? 'Regenerate Doctrine' : 'Generate My Doctrine'}
            </Text>
          )}
        </TouchableOpacity>

        {latest && (
          <View style={styles.textCard}>
            <Text style={styles.doctrineText}>{latest.content}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: Spacing.md },
  title: Typography.h1,
  subtitle: Typography.caption,
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  textCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  doctrineText: { ...Typography.body, lineHeight: 26 },
})
