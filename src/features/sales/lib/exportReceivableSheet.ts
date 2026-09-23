import dayjs from "dayjs";
import { exportExcelWorkbook } from "../../../shared/utils/exportExcelExcelJS";

export type ReceivableSheetColumn<T> = {
  header: string;
  /** Độ rộng cột tính theo ký tự Excel. */
  width?: number;
  value: (row: T) => string | number | null | undefined;
  /** Cột tiền: ghi dạng SỐ (không phải chữ) để Excel cộng/lọc được, định dạng #,##0. */
  money?: boolean;
  /** Cột tỷ lệ %: ghi dạng số, hiển thị 0.00. */
  percent?: boolean;
  /** Cộng dồn vào dòng tổng cuối bảng. */
  total?: boolean;
};

const BORDER = {
  top: { style: "thin" as const, color: { argb: "FFC9D9F7" } },
  left: { style: "thin" as const, color: { argb: "FFC9D9F7" } },
  bottom: { style: "thin" as const, color: { argb: "FFC9D9F7" } },
  right: { style: "thin" as const, color: { argb: "FFC9D9F7" } },
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Xuất một bảng công nợ ra Excel với bố cục chung: tiêu đề, các dòng mô tả điều kiện lọc,
 * dòng tiêu đề cột nền xanh (cùng tông với .sales-grid trên màn), dữ liệu, dòng tổng.
 *
 * Số tiền ghi dạng số chứ không phải chuỗi đã định dạng — kế toán mở file ra cần cộng,
 * lọc, pivot được ngay.
 */
export async function exportReceivableSheet<T>(options: {
  fileName: string;
  title: string;
  /** Mỗi phần tử là một dòng mô tả: kỳ, bộ lọc đang bật… */
  info: string[];
  columns: ReceivableSheetColumn<T>[];
  rows: T[];
}) {
  const { fileName, title, info, columns, rows } = options;

  await exportExcelWorkbook(fileName, (workbook) => {
    workbook.creator = "TPOIL ERP";
    const sheet = workbook.addWorksheet("Công nợ");
    const lastColumn = columns.length;

    sheet.mergeCells(1, 1, 1, lastColumn);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title.toUpperCase();
    titleCell.font = { bold: true, size: 14, color: { argb: "FF173A70" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 24;

    const infoLines = [...info, `Xuất lúc ${dayjs().format("DD/MM/YYYY HH:mm")}`];
    infoLines.forEach((line, index) => {
      const rowNumber = 2 + index;
      sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
      const cell = sheet.getCell(rowNumber, 1);
      cell.value = line;
      cell.font = { italic: true, color: { argb: "FF5B6B82" } };
      cell.alignment = { horizontal: "center" };
    });

    const headerRowNumber = 2 + infoLines.length + 1;
    const header = sheet.getRow(headerRowNumber);
    columns.forEach((column, index) => {
      const cell = header.getCell(index + 1);
      cell.value = column.header;
      cell.font = { bold: true, color: { argb: "FF21418F" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF4FF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = BORDER;
      sheet.getColumn(index + 1).width = column.width ?? (column.money ? 18 : 16);
    });
    header.height = 32;
    sheet.views = [{ state: "frozen", ySplit: headerRowNumber, xSplit: 1 }];

    const totals = columns.map(() => 0);
    for (const record of rows) {
      const row = sheet.addRow(
        columns.map((column, index) => {
          const raw = column.value(record);
          if (column.money || column.percent) {
            const numeric = toNumber(raw);
            if (numeric !== null && column.total) totals[index] += numeric;
            return numeric;
          }
          return raw ?? "";
        }),
      );
      row.eachCell({ includeEmpty: true }, (cell, index) => {
        const column = columns[index - 1];
        cell.border = BORDER;
        if (column?.money) {
          cell.numFmt = "#,##0";
          cell.alignment = { horizontal: "right" };
        } else if (column?.percent) {
          cell.numFmt = "0.00";
          cell.alignment = { horizontal: "right" };
        }
      });
    }

    if (columns.some((column) => column.total)) {
      const totalRow = sheet.addRow(
        columns.map((column, index) => (index === 0 ? "TỔNG CỘNG" : column.total ? totals[index] : "")),
      );
      totalRow.eachCell({ includeEmpty: true }, (cell, index) => {
        const column = columns[index - 1];
        cell.font = { bold: true, color: { argb: "FF173A70" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F8FC" } };
        cell.border = BORDER;
        if (column?.money) {
          cell.numFmt = "#,##0";
          cell.alignment = { horizontal: "right" };
        }
      });
    }
  });
}
