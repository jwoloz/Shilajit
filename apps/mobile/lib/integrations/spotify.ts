import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as SecureStore from 'expo-secure-store'
import { api } from '@/lib/api/client'

WebBrowser.maybeCompleteAuthSession()

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? ''
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
]

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
}

export function useSpotifyAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'shilajit' })
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SCOPES,
      usePKCE: true,
      redirectUri,
    },
    discovery
  )
  return { request, response, promptAsync, redirectUri }
}

export async function saveSpotifyToken(accessToken: string, expiresIn: number): Promise<void> {
  await SecureStore.setItemAsync('spotify_access_token', accessToken)
  await SecureStore.setItemAsync(
    'spotify_token_expires',
    String(Date.now() + expiresIn * 1000)
  )
}

export async function getSpotifyToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync('spotify_access_token')
  const expires = await SecureStore.getItemAsync('spotify_token_expires')
  if (!token || !expires) return null
  if (Date.now() > Number(expires)) return null
  return token
}

export async function getCurrentlyPlaying(): Promise<{
  trackName: string
  artist: string
  trackId: string
} | null> {
  const token = await getSpotifyToken()
  if (!token) return null

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 204 || !res.ok) return null

  const data = await res.json()
  if (!data?.item) return null

  return {
    trackId: data.item.id,
    trackName: data.item.name,
    artist: data.item.artists?.[0]?.name ?? '',
  }
}

export async function logTrack(
  journeyId: string,
  track: { trackId: string; trackName: string; artist: string }
): Promise<void> {
  await api.post(`/api/journeys/${journeyId}/tracks`, {
    source: 'SPOTIFY',
    ...track,
  })
}

export async function openBrainFm(): Promise<void> {
  await WebBrowser.openBrowserAsync('https://app.brain.fm')
}
