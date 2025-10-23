// shared/utils/exportExcelExcelJS.ts
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { ExportColumn } from "../lib/exportExcel";
import { saveAs } from "file-saver";

export type StyledExportOptions<T = any> = {
  title?: string;
  sheetName?: string;
  autoFit?: boolean;
  columnWidths?: number[];
  headerFill?: string; // ví dụ "F2F3F5"
  border?: boolean;
};

export async function exportExcelStyled<T = any>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  opts: StyledExportOptions<T> = {}
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName || "Sheet1", {
    views: [{ state: "frozen", ySplit: opts.title ? 2 : 1 }],
  });

  // 1) Title
  let headerRowIndex = 1;
  if (opts.title) {
    ws.mergeCells(1, 1, 1, columns.length);
    const c = ws.getCell(1, 1);
    c.value = opts.title;
    c.font = { size: 16, bold: true };
    c.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(1).height = 26;
    headerRowIndex = 2;
  }

  // 2) Header
  const headerLabels = columns.map((c) => c.label);
  ws.getRow(headerRowIndex).values = headerLabels;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.height = 22;
  if (opts.headerFill) {
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: `FF${opts.headerFill.replace(/^#/, "").toUpperCase()}`,
        },
      };
    });
  }

  // 3) Data
  rows.forEach((r) => {
    ws.addRow(
      columns.map(
        (c) => (c.accessor ? c.accessor(r) : (r as any)[c.key as any]) ?? ""
      )
    );
  });

  // 4) Filter + Border
  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: ws.rowCount, column: columns.length },
  };
  if (opts.border) {
    for (let rr = headerRowIndex; rr <= ws.rowCount; rr++) {
      const row = ws.getRow(rr);
      for (let cc = 1; cc <= columns.length; cc++) {
        const cell = row.getCell(cc);
        cell.border = {
          top: { style: "thin", color: { argb: "FFDDDDDD" } },
          left: { style: "thin", color: { argb: "FFDDDDDD" } },
          bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
          right: { style: "thin", color: { argb: "FFDDDDDD" } },
        };
      }
    }
  }

  // 5) Column width
  if (opts.columnWidths?.length) {
    ws.columns = ws.columns?.map((col, i) => ({
      ...col!,
      width: opts.columnWidths![i] || 14,
    })) as any;
  } else if (opts.autoFit) {
    ws.columns?.forEach((col) => {
      let max = 10;
      col?.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, String(cell.value ?? "").length);
      });
      col!.width = Math.min(Math.max(max + 2, 10), 60);
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `${filename}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`
  );
}
