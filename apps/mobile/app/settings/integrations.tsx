import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking,
} from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSpotifyAuth, getSpotifyToken, saveSpotifyToken } from '@/lib/integrations/spotify'
import { useGoogleAuth, getGoogleToken, saveGoogleToken, exportJourneyToGoogleDocs } from '@/lib/integrations/google'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'

export default function IntegrationsScreen() {
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)

  const { promptAsync: spotifyPrompt, response: spotifyResponse } = useSpotifyAuth()
  const { promptAsync: googlePrompt, response: googleResponse } = useGoogleAuth()

  useEffect(() => {
    getSpotifyToken().then((t) => setSpotifyConnected(!!t))
    getGoogleToken().then((t) => setGoogleConnected(!!t))
  }, [])

  useEffect(() => {
    if (spotifyResponse?.type === 'success') {
      const { access_token, expires_in } = spotifyResponse.params
      saveSpotifyToken(access_token, Number(expires_in)).then(() => setSpotifyConnected(true))
    }
  }, [spotifyResponse])

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { access_token, expires_in } = googleResponse.params
      saveGoogleToken(access_token, Number(expires_in)).then(() => setGoogleConnected(true))
    }
  }, [googleResponse])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Integrations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <IntegrationCard
          icon="🎵"
          name="Spotify"
          description="Log what's playing during your journey. Build session playlists automatically."
          connected={spotifyConnected}
          onConnect={() => spotifyPrompt()}
          onDisconnect={() => {
            // Remove from secure store
            setSpotifyConnected(false)
          }}
          docsUrl="https://developer.spotify.com"
        />

        <IntegrationCard
          icon="🧠"
          name="Brain.fm"
          description="Open Brain.fm focus music during your journey. Sessions are logged."
          connected={false}
          onConnect={() => Linking.openURL('https://app.brain.fm')}
          isExternal
        />

        <IntegrationCard
          icon="📄"
          name="Google Workspace"
          description="Export journey notes to Google Docs. Export aggregated metrics to Google Sheets."
          connected={googleConnected}
          onConnect={() => googlePrompt()}
          onDisconnect={() => setGoogleConnected(false)}
          docsUrl="https://console.cloud.google.com"
        />

        <IntegrationCard
          icon="🏠"
          name="Google Home"
          description='Add hands-free voice notes during your journey. Say "Hey Google, add a Shilajit note: ..."'
          connected={false}
          onConnect={() =>
            Alert.alert(
              'Google Home Setup',
              'Configure your Google Home webhook in the Shilajit web dashboard. ' +
                'You will need to set up a Google Actions project linked to your API URL.',
              [{ text: 'OK' }]
            )
          }
          badge="Setup required"
        />

        <IntegrationCard
          icon="✨"
          name="Gemini Audio"
          description="Use Google Gemini as your journey companion. Speaks natively with audio input."
          connected={true}
          alwaysOn
          onConnect={() => {}}
          badge="Powered by API key"
        />

        <IntegrationCard
          icon="🤖"
          name="Claude Companion"
          description="Use Claude as your journey companion with voice transcription + text-to-speech."
          connected={true}
          alwaysOn
          onConnect={() => {}}
          badge="Powered by API key"
        />
      </ScrollView>
    </SafeAreaView>
  )
}

interface IntegrationCardProps {
  icon: string
  name: string
  description: string
  connected: boolean
  alwaysOn?: boolean
  isExternal?: boolean
  badge?: string
  onConnect: () => void
  onDisconnect?: () => void
  docsUrl?: string
}

function IntegrationCard({
  icon, name, description, connected, alwaysOn, isExternal, badge, onConnect, onDisconnect,
}: IntegrationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.cardName}>{name}</Text>
            {badge && <Text style={styles.badge}>{badge}</Text>}
          </View>
          <Text style={styles.cardDesc}>{description}</Text>
        </View>
        {!alwaysOn && (
          <TouchableOpacity
            style={[styles.connectBtn, connected && styles.connectedBtn]}
            onPress={connected && onDisconnect ? onDisconnect : onConnect}
          >
            <Text style={[styles.connectBtnText, connected && styles.connectedBtnText]}>
              {connected ? 'Connected' : isExternal ? 'Open' : 'Connect'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardIcon: { fontSize: 32, marginTop: 2 },
  cardName: Typography.h3,
  cardDesc: { ...Typography.caption, lineHeight: 18, marginTop: 4 },
  badge: {
    fontSize: 10, color: Colors.accent, fontWeight: '600',
    backgroundColor: '#1A1000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  connectBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, alignSelf: 'flex-start',
  },
  connectedBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  connectBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  connectedBtnText: { color: Colors.textMuted },
})
