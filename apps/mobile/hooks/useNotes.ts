import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NoteRepository } from '@/lib/db/repositories/note'
import { api } from '@/lib/api/client'
import type { CreateNoteInput } from '@shilajit/types'

export function useNotes(journeyId: string) {
  return useQuery({
    queryKey: ['notes', journeyId],
    queryFn: () => NoteRepository.findByJourney(journeyId),
  })
}

export function useCreateNote(journeyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNoteInput) => {
      const note = NoteRepository.create(journeyId, input)
      return Promise.resolve(note)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', journeyId] }),
  })
}

export function useDeleteNote(journeyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => {
      NoteRepository.softDelete(noteId)
      return Promise.resolve()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', journeyId] }),
  })
}

export function useAnalyzeJourneyNotes(journeyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/api/journeys/${journeyId}/analysis`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', journeyId] }),
  })
}
