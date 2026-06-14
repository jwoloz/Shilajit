import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Journey } from '@shilajit/types'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import { formatRelative } from '@/lib/utils'

interface Props {
  journey: Journey
  onPress?: () => void
}

export function JourneyCard({ journey, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <Text style={styles.substance}>{journey.substance}</Text>
        <Text style={styles.date}>{formatRelative(journey.scheduledAt)}</Text>
      </View>

      {journey.doseMg && (
        <Text style={styles.dose}>
          {journey.doseMg} {journey.doseUnit}
          {journey.sporeSource ? ` · ${journey.sporeSource}` : ''}
        </Text>
      )}

      {journey.intentions && (
        <Text style={styles.intentions} numberOfLines={2}>
          {journey.intentions}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  substance: { ...Typography.h3 },
  date: Typography.small,
  dose: { ...Typography.caption, color: Colors.primaryLight },
  intentions: { ...Typography.caption, fontStyle: 'italic' },
})
