import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { JourneyRepository } from '@/lib/db/repositories/journey'
import type { CreateJourneyInput } from '@shilajit/types'

export function useJourneys() {
  return useQuery({
    queryKey: ['journeys'],
    queryFn: () => JourneyRepository.findAll(),
  })
}

export function useJourney(id: string) {
  return useQuery({
    queryKey: ['journey', id],
    queryFn: () => JourneyRepository.findById(id),
  })
}

export function useCreateJourney() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateJourneyInput) => {
      const journey = JourneyRepository.create(input)
      return Promise.resolve(journey)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journeys'] }),
  })
}

export function useDeleteJourney() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      JourneyRepository.softDelete(id)
      return Promise.resolve()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journeys'] }),
  })
}
