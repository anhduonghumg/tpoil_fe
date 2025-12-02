// shared/utils/downloadExcel.ts
import dayjs from "dayjs";

export interface DownloadExcelOptions {
  /** VD: "/api/contracts/expiry-report/export" */
  url: string;
  /** Tên file không có .xlsx, sẽ auto thêm */
  baseFileName: string;
  /** Query string cho GET */
  query?: Record<string, any>;
  /** Có gửi cookie hay không (session-based auth thì nên để true) */
  withCredentials?: boolean;
}

export async function excel({
  url,
  baseFileName,
  query = {},
  withCredentials = true,
}: DownloadExcelOptions): Promise<void> {
  // build query string
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    qs.append(key, String(value));
  });

  const fullUrl = qs.toString() ? `${url}?${qs.toString()}` : url;

  const resp = await fetch(fullUrl, {
    method: "GET",
    credentials: withCredentials ? "include" : "same-origin",
  });

  if (!resp.ok) {
    throw new Error(`Download Excel failed: HTTP ${resp.status}`);
  }

  const blob = await resp.blob();

  const ext = ".xlsx";
  const safeDate = dayjs().format("YYYY-MM-DD");
  const filename = `${baseFileName}_${safeDate}${ext}`;

  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}
