import { http } from "../../../shared/lib/http";

const API = "/daily-stock-reconciliations";
const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r;

export type Template = "TP" | "HGK";
export type Basis = "ACTUAL" | "V15";
export type Ref = { id: string; code: string; name: string };
export type Memory = {
  last: Partial<Record<Template, { supplierId: string; warehouseId: string; basis: Basis }>>;
  productMapping: Record<string, string>;
  warehouseBySource: Record<string, string>;
};
export type Lookups = { warehouses: Ref[]; suppliers: Ref[]; products: Ref[]; memory: Memory };
export type InspectGroup = {
  sheets: string[]; sourceWarehouse: string | null; productCodes: string[];
  rowCount: number; errorCount: number; dates: string[];
};
export type Inspection = {
  template: Template; mode: "TP" | "NCC"; fileDate: string | null; suggestedDate: string | null; groups: InspectGroup[];
};
export type SessionSummary = {
  id: string; dateFrom: string; dateTo: string; mode: "TP" | "NCC"; status: "DRAFT" | "CLOSED"; version: number;
  createdAt: string; updatedAt: string; warehouse: Ref; supplier: Ref;
  totalRows: number; matchedRows: number; pendingRows: number;
};
export type ImportOptions = {
  warehouseId: string; supplierId: string; template: Template; sheets: string[]; sourceWarehouse?: string;
  dateFrom: string; dateTo: string; basis: Basis; productMapping: Record<string, string>; version?: number;
};

const upload = (file: File, options?: ImportOptions) => {
  const fd = new FormData();
  fd.append("file", file);
  if (options) fd.append("options", JSON.stringify(options));
  return fd;
};

export const dailyReconApi = {
  lookups: async (): Promise<Lookups> => unwrap(await http.get(`${API}/lookups`)),
  sessions: async (params?: Partial<Pick<ImportOptions, "warehouseId" | "supplierId" | "dateFrom" | "dateTo">>): Promise<SessionSummary[]> =>
    unwrap(await http.get(`${API}/sessions`, { params })) || [],
  detail: async (id: string) => unwrap(await http.get(`${API}/sessions/${id}`)),
  inspect: async (file: File): Promise<Inspection> => unwrap(await http.post(`${API}/inspect`, upload(file))),
  create: async (file: File, options: ImportOptions) => unwrap(await http.post(`${API}/sessions`, upload(file, options))),
  replace: async (id: string, file: File, options: ImportOptions) => unwrap(await http.post(`${API}/sessions/${id}/import`, upload(file, options))),
  action: async (id: string, path: "refresh" | "close" | "decisions", body: Record<string, unknown>) =>
    unwrap(await http.post(`${API}/sessions/${id}/${path}`, body)),
  remove: async (id: string) => unwrap(await http.delete(`${API}/sessions/${id}`)),
  source: async (id: string, fileId: string): Promise<Blob> =>
    (await http.get(`${API}/sessions/${id}/files/${fileId}`, { responseType: "blob" })).data,
};

/** Dropdowns show codes only; the name stays searchable and appears on hover. */
export const codeOptions = (refs: Ref[]) => refs.map((r) => ({ value: r.id, label: r.code, title: r.name, search: `${r.code} ${r.name}` }));
export const TEMPLATE_LABEL: Record<Template, string> = {
  TP: "Phiếu xuất kho (hàng gửi kho TP)",
  HGK: "Hàng gửi kho lũy kế (hàng NCC chưa giao)",
};
export const MODE_LABEL = { TP: "Gửi kho (TP)", NCC: "NCC chưa giao" } as const;
/** Plain-language result of each row; `tone` drives colour, `todo` says what the user should do. */
export const STATUS: Record<string, { label: string; tone: "success" | "warning" | "error" | "default"; todo?: string }> = {
  MATCHED: { label: "Khớp", tone: "success" },
  CANCELLED: { label: "Phiếu hủy (cả hai bên)", tone: "default" },
  VARIANCE: { label: "Lệch số lượng", tone: "warning", todo: "Ghi lý do chênh lệch" },
  EXTERNAL_ONLY: { label: "NCC có – mình chưa có", tone: "error", todo: "Kiểm tra phiếu xuất/nhập còn thiếu, hoặc ghi lý do" },
  INTERNAL_ONLY: { label: "Mình có – NCC không có", tone: "error", todo: "Kiểm tra với NCC, hoặc ghi lý do" },
  AMBIGUOUS: { label: "Cần chọn phiếu", tone: "warning", todo: "Chọn đúng phiếu của mình cho dòng này" },
  POTENTIAL_DUPLICATE: { label: "Nghi trùng dòng", tone: "warning", todo: "Xác nhận đây là chuyến thật" },
  CANCEL_CONFLICT: { label: "Một bên đã hủy", tone: "error", todo: "Kiểm tra trạng thái hủy, ghi lý do" },
  WRONG_MODE: { label: "Sai loại hàng (TP/NCC)", tone: "error", todo: "Kiểm tra lô xuất, ghi lý do" },
  INVALID: { label: "Dòng trong file bị lỗi", tone: "error" },
  UNMAPPED: { label: "Chưa ghép mặt hàng", tone: "error" },
  NOT_COMPARABLE: { label: "Thiếu số lượng để so", tone: "error" },
};
