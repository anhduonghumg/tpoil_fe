export type VatRate = {
  id: string
  name: string
  rate: number | string
  isExempt: boolean
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

export type UpsertVatRatePayload = {
  name: string
  rate: number
  isExempt?: boolean
  isActive?: boolean
  isDefault?: boolean
  sortOrder?: number
}
