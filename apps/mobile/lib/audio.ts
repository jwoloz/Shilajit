import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import * as Speech from 'expo-speech'
import { api } from './api/client'

let activeRecording: Audio.Recording | null = null

export async function startRecording(): Promise<void> {
  await Audio.requestPermissionsAsync()
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  })
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  )
  activeRecording = recording
}

export async function stopRecording(): Promise<string | null> {
  if (!activeRecording) return null
  await activeRecording.stopAndUnloadAsync()
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
  const uri = activeRecording.getURI()
  activeRecording = null
  return uri
}

export async function playAudio(uri: string): Promise<void> {
  const { sound } = await Audio.Sound.createAsync({ uri })
  await sound.playAsync()
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) sound.unloadAsync()
  })
}

export async function transcribeAudio(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const result = await api.post<{ text: string }>('/api/audio/transcribe', { audioBase64: base64 })
  return result.data?.text ?? ''
}

export function speak(text: string): void {
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: 0.92,
  })
}

export function stopSpeaking(): void {
  Speech.stop()
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync()
}

export async function getAudioBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
}
