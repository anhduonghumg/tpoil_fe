// features/price-bulletins/types.ts
export type PriceBulletinStatus = "DRAFT" | "PUBLISHED" | "VOID";

export type ProductOption = {
  id: string;
  code?: string | null;
  name: string;
  label: string;
};
export type RegionOption = {
  id: string;
  code: string;
  name: string;
  label: string;
};

export type PriceBulletinListQuery = {
  keyword?: string;
  status?: PriceBulletinStatus;
  page?: number;
  pageSize?: number;
};

export type PriceBulletinItemInput = {
  productId: string;
  regionId: string;
  price: number;
  note?: string;
};

export type PriceBulletinDetail = PriceBulletinListItem & {
  items: Array<{
    id: string;
    productId: string;
    regionId: string;
    price: string | number;
    note?: string | null;
    product?: { id: string; code?: string | null; name: string; uom?: string };
    region?: { id: string; code: string; name: string };
  }>;
};

export type CreatePriceBulletinPayload = {
  effectiveFrom: string;
  effectiveTo?: string;
  note?: string;
  fileUrl?: string;
  fileChecksum?: string;
  items: PriceBulletinItemInput[];
};

export type UpdatePriceBulletinPayload = Partial<CreatePriceBulletinPayload>;

export type PriceBulletinItemLite = {
  id: string;
  price: number;
  product: { id: string; code: string; name: string };
  region: { id: string; code: string; name: string };
};

export type PriceBulletinListItem = {
  id: string;
  status: PriceBulletinStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  publishedAt?: string | null;
  note?: string | null;
  items?: PriceBulletinItemLite[];
};

export type PriceImportLine = {
  lineNo: number;
  productNameRaw: string;
  productId?: string;
  regionId: string;
  price: number;
  effectiveFrom: string;
  conflict?: {
    type: "EXIST_SAME_DATE" | "OLDER_THAN_CURRENT";
    message: string;
  };
};

export type PriceImportPreviewResponse = {
  effectiveFrom: string;
  lines: PriceImportLine[];
};
