// features/price-bulletins/api.ts
import { apiCall } from "../../shared/lib/api";
import { http } from "../../shared/lib/http";
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

  /**
   * Ảnh thông báo giá và quyết định điều chỉnh giá, dựng từ chính bảng giá này.
   * Dùng http trực tiếp vì apiCall không hỗ trợ responseType blob.
   */
  noticePng: (id: string) =>
    http
      .request<Blob>({ method: "GET", url: `/price-bulletins/${id}/notice.png`, responseType: "blob" })
      .then((response) => response.data),

  decisionPdf: (id: string) =>
    http
      .request<Blob>({ method: "GET", url: `/price-bulletins/${id}/decision.pdf`, responseType: "blob" })
      .then((response) => response.data),

  /** Mặt hàng được phép lên bảng giá, đã sắp đúng thứ tự của mẫu văn bản. */
  productsSelect: () =>
    apiCall<ApiResponse<ProductOption[]>>("priceBulletins.productsSelect").then(
      (r) => r.data!.data ?? [],
    ),

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
