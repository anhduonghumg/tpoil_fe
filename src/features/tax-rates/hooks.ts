import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { VatRatesApi } from "./api"
import type { UpsertVatRatePayload } from "./types"

const key = ["vat-rates"] as const

export const useVatRates = () =>
  useQuery({ queryKey: key, queryFn: VatRatesApi.list })

export const useVatRatesSelect = () =>
  useQuery({ queryKey: [...key, "select"], queryFn: VatRatesApi.select })

export const useCreateVatRate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertVatRatePayload) => VatRatesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export const useUpdateVatRate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpsertVatRatePayload> }) => VatRatesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export const useDeleteVatRate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: VatRatesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
