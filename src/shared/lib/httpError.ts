// shared/lib/httpError.ts
export function extractApiError(err: any): { code?: string; message: string } {
  const r = err?.response?.data;
  if (!r) return { message: err?.message || "Có lỗi xảy ra" };

  const code = r?.error?.code;
  const details = r?.error?.details;

  if (code === "VALIDATION_ERROR" && Array.isArray(details?.messages)) {
    return { code, message: details.messages.join("\n") };
  }
  if (code === "CONFLICT" && Array.isArray(details?.fields)) {
    return { code, message: `Trùng dữ liệu tại: ${details.fields.join(", ")}` };
  }
  return { code, message: r?.message || "Có lỗi xảy ra" };
}
