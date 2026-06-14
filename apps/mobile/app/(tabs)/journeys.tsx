import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useJourneys } from '@/hooks/useJourneys'
import { JourneyCard } from '@/components/JourneyCard'
import { Colors, Spacing, Typography } from '@/constants/theme'

export default function JourneysScreen() {
  const { data: journeys = [], isLoading } = useJourneys()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journeys</Text>
        <TouchableOpacity onPress={() => router.push('/journey/new')}>
          <Text style={styles.addBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : journeys.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No journeys yet</Text>
          <Text style={styles.muted}>Your first journey awaits.</Text>
        </View>
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={(j) => j.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <JourneyCard journey={item} onPress={() => router.push(`/journey/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  title: Typography.h1,
  addBtn: { fontSize: 28, color: Colors.primary },
  list: { padding: Spacing.md, gap: Spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  emptyTitle: Typography.h3,
  muted: { ...Typography.caption, textAlign: 'center', padding: Spacing.md },
})
