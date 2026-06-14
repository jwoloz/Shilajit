import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InsightRepository } from '@/lib/db/repositories/insight'
import type { CreateInsightInput } from '@shilajit/types'

export function useInsights(opts?: { coreOnly?: boolean; journeyId?: string }) {
  return useQuery({
    queryKey: ['insights', opts],
    queryFn: () => InsightRepository.findAll(opts),
  })
}

export function useCreateInsight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInsightInput) => {
      const insight = InsightRepository.create(input)
      return Promise.resolve(insight)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  })
}

export function useToggleCore(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (isCore: boolean) => {
      InsightRepository.update(id, { isCore })
      return Promise.resolve()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  })
}
