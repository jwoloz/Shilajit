import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useJourney } from '@/hooks/useJourneys'
import { useDoses } from '@/hooks/useDoses'
import { useNotes } from '@/hooks/useNotes'
import { useInsights } from '@/hooks/useInsights'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import { formatDate } from '@/lib/utils'

interface NavCard {
  icon: string
  label: string
  sublabel: string
  route: string
  badge?: string | number
}

export default function JourneyHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: journey } = useJourney(id)
  const { data: doses = [] } = useDoses(id)
  const { data: notes = [] } = useNotes(id)
  const { data: insights = [] } = useInsights({ journeyId: id })

  if (!journey) return null

  const totalDose = doses.reduce((sum, d) => sum + d.doseMg, 0)

  const navCards: NavCard[] = [
    {
      icon: '💊',
      label: 'Dose Timeline',
      sublabel: doses.length > 0
        ? `${doses.length} doses · ${totalDose}${journey.doseUnit} total`
        : 'Log doses + set reminders',
      route: `/journey/${id}/doses`,
      badge: doses.length || undefined,
    },
    {
      icon: '📝',
      label: 'Notes',
      sublabel: 'Audio, text, drawing & photos',
      route: `/journey/${id}/notes`,
      badge: notes.length || undefined,
    },
    {
      icon: '💡',
      label: 'Insights',
      sublabel: insights.length > 0
        ? `${insights.length} insights captured`
        : 'Capture learnings from this journey',
      route: `/journey/${id}/insights` ,
      badge: insights.length || undefined,
    },
    {
      icon: '🔮',
      label: 'AI Guidance',
      sublabel: 'Analysis, next steps & recommendations',
      route: `/journey/${id}/recommend`,
    },
    {
      icon: '🌀',
      label: 'Companion',
      sublabel: 'Talk with Claude or Gemini during your journey',
      route: `/companion?journeyId=${id}`,
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Journeys</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Journey header */}
        <View style={styles.journeyCard}>
          <Text style={styles.substance}>{journey.substance}</Text>
          <Text style={styles.date}>{formatDate(journey.scheduledAt)}</Text>
          {journey.doseMg && (
            <Text style={styles.doseMeta}>
              {journey.doseMg} {journey.doseUnit}
              {journey.sporeSource ? ` · ${journey.sporeSource}` : ''}
            </Text>
          )}
          {journey.intentions && (
            <View style={styles.intentionBox}>
              <Text style={styles.intentionLabel}>Intention</Text>
              <Text style={styles.intentionText}>{journey.intentions}</Text>
            </View>
          )}
        </View>

        {/* Navigation cards */}
        {navCards.map(({ icon, label, sublabel, route, badge }) => (
          <TouchableOpacity
            key={label}
            style={styles.navCard}
            onPress={() => router.push(route as Parameters<typeof router.push>[0])}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>{icon}</Text>
            <View style={styles.navInfo}>
              <Text style={styles.navLabel}>{label}</Text>
              <Text style={styles.navSub}>{sublabel}</Text>
            </View>
            {badge ? (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{badge}</Text>
              </View>
            ) : null}
            <Text style={styles.navChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  back: { color: Colors.primary, fontSize: 16 },
  scroll: { padding: Spacing.md, gap: Spacing.md },
  journeyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  substance: Typography.h1,
  date: Typography.caption,
  doseMeta: { ...Typography.caption, color: Colors.primaryLight },
  intentionBox: {
    backgroundColor: Colors.background, borderRadius: Radius.sm, padding: Spacing.sm,
    marginTop: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  intentionLabel: { ...Typography.small, color: Colors.primary, marginBottom: 2 },
  intentionText: Typography.body,
  navCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  navIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  navInfo: { flex: 1 },
  navLabel: Typography.h3,
  navSub: { ...Typography.caption, marginTop: 2 },
  navBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, minWidth: 24, alignItems: 'center',
  },
  navBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  navChevron: { color: Colors.textMuted, fontSize: 24, marginLeft: 4 },
})
