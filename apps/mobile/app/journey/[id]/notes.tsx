import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Image, ActivityIndicator, Alert,
} from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useNotes, useCreateNote } from '@/hooks/useNotes'
import { useJourney } from '@/hooks/useJourneys'
import { startRecording, stopRecording, transcribeAudio, playAudio } from '@/lib/audio'
import { DrawingCanvas } from '@/components/canvas/DrawingCanvas'
import { api } from '@/lib/api/client'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import type { NoteType, Phase } from '@shilajit/types'

const NOTE_MODES: { key: NoteType; icon: string; label: string }[] = [
  { key: 'TEXT', icon: '✍️', label: 'Text' },
  { key: 'AUDIO', icon: '🎙️', label: 'Audio' },
  { key: 'VISUAL', icon: '✏️', label: 'Draw' },
  { key: 'PHOTO', icon: '📷', label: 'Photo' },
]

function MoodSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderDots}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}>
            <View style={[styles.dot, n <= value && styles.dotActive]}>
              <Text style={[styles.dotText, n <= value && styles.dotTextActive]}>{n}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: journey } = useJourney(id)
  const { data: notes = [] } = useNotes(id)
  const createNote = useCreateNote(id)

  const [activeMode, setActiveMode] = useState<NoteType>('TEXT')
  const [phase, setPhase] = useState<Phase>('DURING')
  const [mood, setMood] = useState(5)
  const [bodyFeel, setBodyFeel] = useState(5)

  // Text mode
  const [textContent, setTextContent] = useState('')

  // Audio mode
  const [recording, setRecording] = useState(false)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')

  // Photo mode
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState('')

  async function handleStartRecording() {
    setAudioUri(null)
    setTranscription('')
    await startRecording()
    setRecording(true)
  }

  async function handleStopRecording() {
    setRecording(false)
    const uri = await stopRecording()
    setAudioUri(uri)
    if (uri) {
      setTranscribing(true)
      const text = await transcribeAudio(uri)
      setTranscription(text)
      setTranscribing(false)
    }
  }

  async function handlePickPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
      allowsEditing: true,
    })
    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setPhotoUri(asset.uri)
    setPhotoBase64(asset.base64 ?? null)

    if (asset.base64) {
      setOcrLoading(true)
      const res = await api.post<{ text: string }>('/api/audio/transcribe', {
        imageBase64: asset.base64,
        type: 'image',
      })
      setOcrText(res.data?.text ?? '')
      setOcrLoading(false)
    }
  }

  async function handleSaveNote(canvasData?: string) {
    const content =
      activeMode === 'TEXT' ? textContent :
      activeMode === 'AUDIO' ? transcription :
      activeMode === 'PHOTO' ? ocrText :
      undefined

    await createNote.mutateAsync({
      type: activeMode,
      content: content || undefined,
      canvasData: canvasData,
      phase,
      mood,
      bodyFeel,
    })

    // Reset
    setTextContent('')
    setAudioUri(null)
    setTranscription('')
    setPhotoUri(null)
    setOcrText('')
  }

  const PHASES: Phase[] = ['BEFORE', 'DURING', 'AFTER', 'INTEGRATION']

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {NOTE_MODES.map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.modeTab, activeMode === key && styles.modeTabActive]}
              onPress={() => setActiveMode(key)}
            >
              <Text style={styles.modeIcon}>{icon}</Text>
              <Text style={[styles.modeLabel, activeMode === key && styles.modeLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Phase selector */}
        <View style={styles.phaseRow}>
          {PHASES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.phaseBtn, phase === p && styles.phaseBtnActive]}
              onPress={() => setPhase(p)}
            >
              <Text style={[styles.phaseText, phase === p && styles.phaseTextActive]}>
                {p.slice(0, 4)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mood trackers */}
        <View style={styles.moodSection}>
          <MoodSlider label="Mood" value={mood} onChange={setMood} />
          <MoodSlider label="Body" value={bodyFeel} onChange={setBodyFeel} />
        </View>

        {/* Mode-specific input */}
        {activeMode === 'TEXT' && (
          <View style={styles.inputSection}>
            <TextInput
              style={styles.textInput}
              placeholder="What's arising right now?"
              placeholderTextColor={Colors.textMuted}
              multiline
              value={textContent}
              onChangeText={setTextContent}
            />
            <TouchableOpacity
              style={[styles.saveBtn, !textContent.trim() && styles.disabled]}
              onPress={() => handleSaveNote()}
              disabled={!textContent.trim()}
            >
              <Text style={styles.saveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeMode === 'AUDIO' && (
          <View style={styles.inputSection}>
            <TouchableOpacity
              style={[styles.recordBtn, recording && styles.recordBtnActive]}
              onPress={recording ? handleStopRecording : handleStartRecording}
            >
              <Text style={styles.recordIcon}>{recording ? '⏹' : '🎙️'}</Text>
              <Text style={styles.recordLabel}>{recording ? 'Tap to stop' : 'Hold to record'}</Text>
            </TouchableOpacity>
            {transcribing && <ActivityIndicator color={Colors.primary} />}
            {transcription ? (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionLabel}>Transcription</Text>
                <TextInput
                  style={styles.transcriptionText}
                  multiline
                  value={transcription}
                  onChangeText={setTranscription}
                />
                <TouchableOpacity style={styles.saveBtn} onPress={() => handleSaveNote()}>
                  <Text style={styles.saveBtnText}>Save Note</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {audioUri && !transcription && (
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => audioUri && playAudio(audioUri)}
              >
                <Text style={styles.playBtnText}>▶ Play Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeMode === 'VISUAL' && (
          <DrawingCanvas
            onSave={(canvasData) => handleSaveNote(canvasData)}
            height={280}
          />
        )}

        {activeMode === 'PHOTO' && (
          <View style={styles.inputSection}>
            <TouchableOpacity style={styles.cameraBtn} onPress={handlePickPhoto}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.cameraLabel}>Take Photo or Choose from Library</Text>
            </TouchableOpacity>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            )}
            {ocrLoading && (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.ocrLabel}>Extracting text from image...</Text>
              </View>
            )}
            {ocrText ? (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionLabel}>Extracted Text</Text>
                <TextInput
                  style={styles.transcriptionText}
                  multiline
                  value={ocrText}
                  onChangeText={setOcrText}
                />
                <TouchableOpacity style={styles.saveBtn} onPress={() => handleSaveNote()}>
                  <Text style={styles.saveBtnText}>Save Note</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Past notes */}
        {notes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Notes</Text>
            {notes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteType}>
                    {NOTE_MODES.find((m) => m.key === note.type)?.icon} {note.type}
                  </Text>
                  <Text style={styles.noteMeta}>
                    {note.phase} · mood {note.mood}/10
                  </Text>
                </View>
                {note.content ? <Text style={styles.noteContent}>{note.content}</Text> : null}
                {note.analysis ? (
                  <Text style={styles.noteAnalysis}>{note.analysis}</Text>
                ) : null}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  back: { color: Colors.primary, fontSize: 16 },
  title: Typography.h2,
  scroll: { padding: Spacing.md, gap: Spacing.md },
  modeTabs: { flexDirection: 'row', gap: Spacing.xs },
  modeTab: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeIcon: { fontSize: 20 },
  modeLabel: Typography.small,
  modeLabelActive: { color: '#fff' },
  phaseRow: { flexDirection: 'row', gap: Spacing.xs },
  phaseBtn: {
    flex: 1, padding: Spacing.xs, borderRadius: Radius.sm,
    backgroundColor: Colors.surface, alignItems: 'center',
  },
  phaseBtnActive: { backgroundColor: Colors.primary },
  phaseText: Typography.small,
  phaseTextActive: { color: '#fff' },
  moodSection: { gap: Spacing.sm },
  sliderRow: { gap: 6 },
  sliderLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  sliderDots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  dotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotText: { ...Typography.small, color: Colors.textMuted },
  dotTextActive: { color: '#fff' },
  inputSection: { gap: Spacing.sm },
  textInput: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: 16, minHeight: 160, textAlignVertical: 'top',
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
  recordBtn: {
    height: 120, backgroundColor: Colors.surface, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 2, borderColor: Colors.border,
  },
  recordBtnActive: { borderColor: Colors.danger, backgroundColor: '#1A0F0F' },
  recordIcon: { fontSize: 40 },
  recordLabel: Typography.caption,
  transcriptionBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm,
  },
  transcriptionLabel: { ...Typography.caption, color: Colors.primary },
  transcriptionText: { color: Colors.text, fontSize: 15, lineHeight: 22, minHeight: 100, textAlignVertical: 'top' },
  playBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  playBtnText: { color: Colors.primary, fontWeight: '600' },
  cameraBtn: {
    height: 120, backgroundColor: Colors.surface, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  cameraIcon: { fontSize: 40 },
  cameraLabel: Typography.caption,
  photoPreview: { height: 200, borderRadius: Radius.md },
  ocrLabel: Typography.caption,
  sectionTitle: { ...Typography.h3, marginTop: Spacing.sm },
  noteCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  noteType: { ...Typography.caption, color: Colors.primary },
  noteMeta: Typography.small,
  noteContent: { ...Typography.body, lineHeight: 22 },
  noteAnalysis: { ...Typography.caption, fontStyle: 'italic', color: Colors.textMuted, marginTop: 4 },
})
