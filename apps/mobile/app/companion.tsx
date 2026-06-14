import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useState, useRef } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCompanion } from '@/hooks/useCompanion'
import { startRecording, stopRecording, getAudioBase64, stopSpeaking } from '@/lib/audio'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import type { CompanionProvider } from '@shilajit/types'

export default function CompanionScreen() {
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>()
  const [provider, setProvider] = useState<CompanionProvider>('claude')
  const { history, thinking, error, send, clear } = useCompanion(journeyId ?? '', provider)

  const [recording, setRecording] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const scrollRef = useRef<ScrollView>(null)

  async function handleRecord() {
    if (recording) {
      setRecording(false)
      const uri = await stopRecording()
      if (!uri) return
      const base64 = await getAudioBase64(uri)
      await send({ audioBase64: base64 })
    } else {
      await startRecording()
      setRecording(true)
    }
  }

  async function handleSendText() {
    if (!textInput.trim()) return
    const text = textInput
    setTextInput('')
    await send({ text })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopSpeaking(); router.back() }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Companion</Text>
        <View style={styles.providerToggle}>
          {(['claude', 'gemini'] as CompanionProvider[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.providerBtn, provider === p && styles.providerBtnActive]}
              onPress={() => setProvider(p)}
            >
              <Text style={[styles.providerBtnText, provider === p && styles.providerBtnTextActive]}>
                {p === 'claude' ? 'Claude' : 'Gemini'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {history.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌀</Text>
          <Text style={styles.emptyTitle}>Your Journey Companion</Text>
          <Text style={styles.emptyBody}>
            I'm here with you. Share what you're experiencing — speak or type. I have context
            of your intentions and past insights.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {history.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === 'assistant' && styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {thinking && (
            <View style={styles.assistantBubble}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          )}
          {error && (
            <View style={styles.errorBubble}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.inputModeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, inputMode === 'voice' && styles.modeBtnActive]}
              onPress={() => setInputMode('voice')}
            >
              <Text style={styles.modeBtnText}>🎙️ Voice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, inputMode === 'text' && styles.modeBtnActive]}
              onPress={() => setInputMode('text')}
            >
              <Text style={styles.modeBtnText}>⌨️ Type</Text>
            </TouchableOpacity>
            {history.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clear}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {inputMode === 'voice' ? (
            <TouchableOpacity
              style={[styles.recordBtn, recording && styles.recordBtnActive]}
              onPress={handleRecord}
              disabled={thinking}
            >
              <Text style={styles.recordIcon}>{recording ? '⏹' : '🎙️'}</Text>
              <Text style={styles.recordLabel}>
                {recording ? 'Tap to send' : thinking ? 'Thinking...' : 'Tap to speak'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.textRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Share what you're feeling..."
                placeholderTextColor={Colors.textMuted}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSendText}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!textInput.trim() || thinking) && styles.disabled]}
                onPress={handleSendText}
                disabled={!textInput.trim() || thinking}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm,
  },
  back: { color: Colors.primary, fontSize: 16 },
  title: { ...Typography.h2, flex: 1 },
  providerToggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.full, padding: 2 },
  providerBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  providerBtnActive: { backgroundColor: Colors.primary },
  providerBtnText: { ...Typography.small, color: Colors.textMuted },
  providerBtnTextActive: { color: '#fff' },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md,
  },
  emptyIcon: { fontSize: 60 },
  emptyTitle: Typography.h2,
  emptyBody: { ...Typography.body, textAlign: 'center', color: Colors.textMuted, lineHeight: 24 },
  chat: { flex: 1 },
  chatContent: { padding: Spacing.md, gap: Spacing.md },
  bubble: { maxWidth: '85%', borderRadius: Radius.md, padding: Spacing.md },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface },
  bubbleText: { ...Typography.body, lineHeight: 22, color: '#fff' },
  assistantText: { color: Colors.text },
  errorBubble: { backgroundColor: '#1A0808', borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: Colors.danger },
  inputArea: {
    padding: Spacing.md, gap: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputModeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: Typography.caption,
  clearBtn: { padding: Spacing.sm },
  clearBtnText: { color: Colors.textMuted, fontSize: 14 },
  recordBtn: {
    height: 100, backgroundColor: Colors.surface, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.border,
  },
  recordBtnActive: { borderColor: Colors.danger, backgroundColor: '#1A0F0F' },
  recordIcon: { fontSize: 36 },
  recordLabel: Typography.caption,
  textRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  textInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, color: Colors.text, fontSize: 16,
    maxHeight: 100, textAlignVertical: 'top',
  },
  sendBtn: {
    width: 44, height: 44, backgroundColor: Colors.primary,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
  disabled: { opacity: 0.4 },
})
