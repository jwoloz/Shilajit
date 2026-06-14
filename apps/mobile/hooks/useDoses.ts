import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DoseRepository } from '@/lib/db/repositories/dose'
import type { CreateDoseEventInput } from '@shilajit/types'

export function useDoses(journeyId: string) {
  return useQuery({
    queryKey: ['doses', journeyId],
    queryFn: () => DoseRepository.findByJourney(journeyId),
  })
}

export function useLogDose(journeyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDoseEventInput) => {
      const dose = DoseRepository.create(journeyId, input)
      return Promise.resolve(dose)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doses', journeyId] }),
  })
}

export function useDeleteDose(journeyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (doseId: string) => {
      DoseRepository.softDelete(doseId)
      return Promise.resolve()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doses', journeyId] }),
  })
}
