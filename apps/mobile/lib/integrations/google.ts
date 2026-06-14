import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as SecureStore from 'expo-secure-store'
import { api } from '@/lib/api/client'

WebBrowser.maybeCompleteAuthSession()

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
]

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
}

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'shilajit' })
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
    },
    discovery
  )
  return { request, response, promptAsync, redirectUri }
}

export async function saveGoogleToken(accessToken: string, expiresIn: number): Promise<void> {
  await SecureStore.setItemAsync('google_access_token', accessToken)
  await SecureStore.setItemAsync(
    'google_token_expires',
    String(Date.now() + expiresIn * 1000)
  )
}

export async function getGoogleToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync('google_access_token')
  const expires = await SecureStore.getItemAsync('google_token_expires')
  if (!token || !expires) return null
  if (Date.now() > Number(expires)) return null
  return token
}

export async function exportJourneyToGoogleDocs(journeyId: string): Promise<string | null> {
  const token = await getGoogleToken()
  if (!token) return null

  const result = await api.post<{ docUrl: string }>('/api/integrations/google/export-doc', {
    journeyId,
    accessToken: token,
  })
  return result.data?.docUrl ?? null
}

export async function exportMetricsToSheets(): Promise<string | null> {
  const token = await getGoogleToken()
  if (!token) return null

  const result = await api.post<{ sheetUrl: string }>('/api/integrations/google/export-sheet', {
    accessToken: token,
  })
  return result.data?.sheetUrl ?? null
}

export function isConnected(): Promise<boolean> {
  return getGoogleToken().then((t) => t !== null)
}
