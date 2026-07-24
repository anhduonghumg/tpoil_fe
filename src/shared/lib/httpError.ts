// shared/lib/httpError.ts
export function extractApiError(err: any): { code?: string; message: string } {
  const r = err?.response?.data;
  if (!r) return { message: err?.message || "Có lỗi xảy ra" };

  const nestedMessage = r?.message;
  const code = r?.error?.code ?? nestedMessage?.code;
  const details = r?.error?.details;

  if (code === "VALIDATION_ERROR" && Array.isArray(details?.messages)) {
    return { code, message: details.messages.join("\n") };
  }
  if (code === "CONFLICT" && Array.isArray(details?.fields)) {
    return { code, message: `Trùng dữ liệu tại: ${details.fields.join(", ")}` };
  }
  const message =
    typeof nestedMessage === "string"
      ? nestedMessage
      : Array.isArray(nestedMessage)
      ? nestedMessage.join("\n")
      : nestedMessage?.message || r?.error?.message || err?.message;

  return { code, message: message || "Có lỗi xảy ra" };
}
