export const TAX_EXEMPT_VALUE = -1

export const TAX_RATE_OPTIONS = [
  { value: 0, label: "0%" },
  { value: 5, label: "5%" },
  { value: 8, label: "8%" },
  { value: 10, label: "10%" },
  { value: TAX_EXEMPT_VALUE, label: "KCT" },
]

export function toTaxRate(value?: number | null) {
  return value === TAX_EXEMPT_VALUE ? 0 : Number(value ?? 0)
}
