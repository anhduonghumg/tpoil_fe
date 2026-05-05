export type ProductItem = {
  id: string;
  code?: string | null;
  name: string;
};

export type PlattsQuote = {
  id: string;
  productId: string;
  quoteDate: string;
  source: "PLATTS";
  priceUsdPerBbl: string | number;
  note?: string | null;
  product?: ProductItem;
};

export type PlattsPriceListQuery = {
  month: string;
  productId?: string;
};

export type UpsertPlattsQuotePayload = {
  productId: string;
  quoteDate: string;
  priceUsdPerBbl: number;
  note?: string;
};

export type DeletePlattsQuoteResult = {
  id: string;
};
