import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { TribePost } from '@shilajit/types'
import { Colors, Spacing, Typography, Radius } from '@/constants/theme'
import { formatRelative } from '@/lib/utils'

export default function TribeScreen() {
  const qc = useQueryClient()
  const [shareVisible, setShareVisible] = useState(false)
  const [content, setContent] = useState('')

  const { data } = useQuery({
    queryKey: ['tribe'],
    queryFn: async () => {
      const res = await api.get<{ posts: TribePost[] }>('/api/tribe')
      return res.data ?? { posts: [] }
    },
  })

  const share = useMutation({
    mutationFn: () =>
      api.post('/api/tribe', { content, type: 'REFLECTION', visibility: 'TRIBE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tribe'] })
      setContent('')
      setShareVisible(false)
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tribe</Text>
        <TouchableOpacity onPress={() => setShareVisible(true)}>
          <Text style={styles.shareBtn}>Share</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data?.posts ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.muted}>The tribe is quiet. Be the first to share.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              <Text style={styles.handle}>{item.seeker?.tribeHandle ?? 'Unnamed Seeker'}</Text>
              <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
            <Text style={styles.resonances}>◆ {item.resonances}</Text>
          </View>
        )}
      />

      <Modal visible={shareVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShareVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share with Tribe</Text>
            <TouchableOpacity onPress={() => share.mutate()} disabled={!content.trim()}>
              <Text style={[styles.post_, !content.trim() && styles.disabled]}>Post</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="What truth have you discovered?"
            placeholderTextColor={Colors.textMuted}
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
          />
        </SafeAreaView>
      </Modal>
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
  shareBtn: { color: Colors.primary, fontWeight: '600', fontSize: 16 },
  list: { padding: Spacing.md, gap: Spacing.sm },
  muted: { ...Typography.caption, textAlign: 'center', padding: Spacing.xl },
  post: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  handle: { ...Typography.caption, color: Colors.primaryLight, fontWeight: '600' },
  time: Typography.small,
  postContent: { ...Typography.body, lineHeight: 22 },
  resonances: { color: Colors.primary, fontSize: 12 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: Typography.h3,
  cancel: { color: Colors.textMuted, fontSize: 16 },
  post_: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
  input: {
    flex: 1,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 18,
    textAlignVertical: 'top',
  },
})
