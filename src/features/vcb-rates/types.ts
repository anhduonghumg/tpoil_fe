export type VcbFxRate = {
  id: string;
  rateDate: string;
  bankCode?: string | null;
  currencyCode: string;
  cashBuyRate?: number | string | null;
  transferBuyRate?: number | string | null;
  sellRate: number | string;
  source?: "MANUAL" | "VCB_IMPORT" | "VCB_SCRAPE" | "SYSTEM" | string;
  fetchedAt?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type VcbFxRateListQuery = {
  month: string;
  currencyCode?: string;
  bankCode?: string;
};

export type UpsertVcbFxRatePayload = {
  rateDate: string;
  bankCode?: string;
  currencyCode: string;
  cashBuyRate?: number;
  transferBuyRate?: number;
  sellRate: number;
  note?: string;
};

export type FetchVcbFxRatePayload = {
  rateDate?: string;
  currencyCode?: string;
};

export type DeleteVcbFxRateResult = {
  id: string;
};
