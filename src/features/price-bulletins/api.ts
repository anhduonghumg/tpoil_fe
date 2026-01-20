// features/price-bulletins/api.ts
import { apiCall } from "../../shared/lib/api";
import { ApiResponse, Paged } from "../departments/types";
import type {
  PriceBulletinDetail,
  PriceBulletinListItem,
  PriceBulletinListQuery,
  CreatePriceBulletinPayload,
  UpdatePriceBulletinPayload,
  ProductOption,
  RegionOption,
} from "./types";

export const PriceBulletinsApi = {
  list: (query: PriceBulletinListQuery) =>
    apiCall<ApiResponse<Paged<PriceBulletinListItem>>>("priceBulletins.list", {
      query,
    }).then((r) => r.data!.data),

  detail: (id: string) =>
    apiCall<ApiResponse<PriceBulletinDetail>>("priceBulletins.detail", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  create: (data: CreatePriceBulletinPayload) =>
    apiCall<ApiResponse<any>>("priceBulletins.create", { data }).then(
      (r) => (r.data!.data ?? r.data) as any,
    ),

  update: (id: string, data: UpdatePriceBulletinPayload) =>
    apiCall<ApiResponse<any>>("priceBulletins.update", {
      params: { id },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  publish: (id: string) =>
    apiCall<ApiResponse<any>>("priceBulletins.publish", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  void: (id: string) =>
    apiCall<ApiResponse<any>>("priceBulletins.void", { params: { id } }).then(
      (r) => (r.data!.data ?? r.data) as any,
    ),

  productsSelect: (keyword = "") =>
    apiCall<ApiResponse<{ items: ProductOption[] }>>(
      "priceBulletins.productsSelect",
      { query: { keyword } },
    ).then((r) => r.data!.data ?? { items: [] }),

  regionsSelect: (keyword = "") =>
    apiCall<ApiResponse<RegionOption[]>>("priceBulletins.regionsSelect", {
      query: { keyword },
    }).then((r) => r.data!.data ?? []),

  // =========================
  // PDF Import
  // =========================
  importPdfPreview: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiCall<ApiResponse<{ runId: string }>>(
      "priceBulletins.importPdfPreview",
      {
        data: formData,
      },
    ).then((r) => r.data!.data);
  },

  importPdfStatus: (runId: string) =>
    apiCall<ApiResponse<{ status: string; error?: string }>>(
      "priceBulletins.importPdfStatus",
      {
        params: { runId },
      },
    ).then((r) => r.data!.data),

  getImportPreviewData: (runId: string) =>
    apiCall<ApiResponse<any>>("priceBulletins.getImportPreviewData", {
      params: { runId },
    }).then((r) => r.data!.data),

  updatePreviewLine: (runId: string, rowNo: number, data: any) =>
    apiCall<ApiResponse<any>>("priceBulletins.updatePreviewLine", {
      params: { runId, rowNo },
      data,
    }).then((r) => r.data!.data),

  importPdfCommit: (data: {
    effectiveFrom: string;
    isOverride: boolean;
    lines: any[];
  }) =>
    apiCall<ApiResponse<any>>("priceBulletins.importPdfCommit", {
      data,
    }).then((r) => r.data!.data),
};
