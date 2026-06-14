import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useJourneys } from '@/hooks/useJourneys'
import { useInsights } from '@/hooks/useInsights'
import { JourneyCard } from '@/components/JourneyCard'
import { Colors, Spacing, Typography } from '@/constants/theme'

export default function HomeScreen() {
  const { data: journeys = [] } = useJourneys()
  const { data: coreInsights = [] } = useInsights({ coreOnly: true })

  const lastJourney = journeys[0]
  const daysSinceLast = lastJourney
    ? Math.floor((Date.now() - new Date(lastJourney.scheduledAt).getTime()) / 86400000)
    : null

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Welcome back, Seeker</Text>

        {daysSinceLast !== null && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{daysSinceLast}</Text>
              <Text style={styles.statLabel}>days since last journey</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{journeys.length}</Text>
              <Text style={styles.statLabel}>total journeys</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{coreInsights.length}</Text>
              <Text style={styles.statLabel}>core insights</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.cta} onPress={() => router.push('/journey/new')}>
          <Text style={styles.ctaText}>+ Begin a Journey</Text>
        </TouchableOpacity>

        {lastJourney && (
          <>
            <Text style={styles.sectionTitle}>Last Journey</Text>
            <JourneyCard journey={lastJourney} />
          </>
        )}

        {coreInsights.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Core Insights</Text>
            {coreInsights.slice(0, 3).map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <Text style={styles.insightText}>{insight.content}</Text>
                <Text style={styles.resonance}>{'◆'.repeat(insight.resonance)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: Spacing.md },
  greeting: { ...Typography.h1, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { ...Typography.h2, color: Colors.primary },
  statLabel: { ...Typography.small, textAlign: 'center', marginTop: 4 },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
  },
  ctaText: { ...Typography.body, color: '#fff', fontWeight: '600' },
  sectionTitle: { ...Typography.h3, marginTop: Spacing.sm },
  insightCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  insightText: Typography.body,
  resonance: { color: Colors.primary, fontSize: 10 },
})
