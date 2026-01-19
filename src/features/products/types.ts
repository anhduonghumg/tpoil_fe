export type QtyUom = "LITER" | "KG" | "UNIT";

export type Product = {
  id: string;
  code: string | null;
  name: string;
  nameMisa: string;
  uom: QtyUom;
  createdAt: string;
  updatedAt: string;
};

export type ProductListQuery = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type ProductUpsertPayload = {
  code?: string;
  name: string;
  nameMisa: string;
  uom?: QtyUom;
};

export type ProductOption = {
  id: string;
  code: string | null;
  name: string;
  uom: QtyUom;
};
