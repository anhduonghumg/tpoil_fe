// shared/utils/exportExcel.ts
import * as XLSX from "xlsx";
import dayjs from "dayjs";

export type ExportColumn<T> = {
  key: keyof T | string;
  label: string;
  accessor?: (record: T) => any;
};

export async function exportToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string
) {
  if (!rows?.length || !columns?.length) return;

  const headers = columns.map((c) => c.label);
  const dataset = rows.map((r) => {
    const obj: Record<string, any> = {};
    columns.forEach((c) => {
      const value = c.accessor ? c.accessor(r) : (r as any)[c.key];
      obj[c.label] = value ?? "";
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(dataset, { header: headers });
  const colWidths = headers.map((h) => ({
    wch:
      Math.max(h.length, ...dataset.map((row) => String(row[h] ?? "").length)) +
      2,
  }));
  (ws as any)["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const stamp = dayjs().format("YYYYMMDD_HHmm");
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`);
}
