import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Đọc khối dữ liệu người dùng copy từ Excel / Google Sheets.
 *
 * Hình dạng mong đợi: cột đầu là ngày, mỗi cột sau là giá của một mặt hàng, dòng
 * đầu có thể là tiêu đề. Chuyện tách cột và đọc số để riêng ở đây (không dính
 * React) để còn thử được từng trường hợp một.
 */

/** Định dạng ngày hay gặp khi copy từ bảng tính Việt Nam. */
const DATE_FORMATS = [
  "D/M/YYYY",
  "DD/MM/YYYY",
  "D-M-YYYY",
  "DD-MM-YYYY",
  "D.M.YYYY",
  "DD.MM.YYYY",
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "D/M/YY",
  "DD/MM/YY",
];

export type PastedCell = {
  columnIndex: number;
  raw: string;
  /** null nghĩa là ô trống, hoặc có chữ mà không đọc ra số. */
  value: number | null;
  invalid: boolean;
};

export type PastedRow = {
  /** Số dòng trong khối đã dán, để chỉ đúng chỗ khi báo lỗi. */
  lineNo: number;
  rawDate: string;
  /** YYYY-MM-DD, null nếu không đọc được ngày. */
  date: string | null;
  cells: PastedCell[];
};

export type ParsedPaste = {
  /** Nhãn từng cột giá; rỗng khi khối dán không có dòng tiêu đề. */
  headers: string[];
  columnCount: number;
  rows: PastedRow[];
  /** Dòng có nội dung nhưng cột ngày không đọc được. */
  invalidDateRows: PastedRow[];
};

export const EMPTY_PASTE: ParsedPaste = {
  headers: [],
  columnCount: 0,
  rows: [],
  invalidDateRows: [],
};

/**
 * Số kiểu Việt: "92,26" là chín mươi hai phẩy hai sáu, không phải chín nghìn.
 * Có cả dấu chấm lẫn dấu phẩy thì dấu đứng sau là dấu thập phân.
 */
export function parsePastedNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s '"$]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    // Nhiều dấu phẩy thì không đoán bừa — trả về không đọc được để người dùng tự sửa.
    if (cleaned.indexOf(",") !== cleaned.lastIndexOf(",")) return null;
    normalized = cleaned.replace(",", ".");
  }

  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parsePastedDate(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const parsed = dayjs(cleaned, DATE_FORMATS, true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

/**
 * Bảng tính luôn dán ra dấu tab. Dấu chấm phẩy và khoảng trắng chỉ là đường lui
 * cho dữ liệu chép tay; chốt một dấu tách cho cả khối để các cột không lệch nhau.
 */
function splitLines(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [] as string[][];

  const delimiter = lines.some((line) => line.includes("\t"))
    ? "\t"
    : lines.some((line) => line.includes(";"))
      ? ";"
      : null;

  return lines.map((line) =>
    (delimiter ? line.split(delimiter) : line.trim().split(/\s+/)).map((cell) => cell.trim()),
  );
}

export function parsePastedPrices(text: string): ParsedPaste {
  const table = splitLines(text);
  if (!table.length) return EMPTY_PASTE;

  // Dòng đầu không đọc ra ngày thì coi là tiêu đề — đó là chỗ lấy tên mặt hàng.
  const hasHeader = parsePastedDate(table[0][0] ?? "") === null;
  const headerCells = hasHeader ? table[0] : [];
  const bodyOffset = hasHeader ? 1 : 0;

  const columnCount = Math.max(0, ...table.map((cells) => cells.length - 1));

  const rows: PastedRow[] = table.slice(bodyOffset).map((cells, index) => ({
    lineNo: index + bodyOffset + 1,
    rawDate: cells[0] ?? "",
    date: parsePastedDate(cells[0] ?? ""),
    cells: Array.from({ length: columnCount }, (_, column) => {
      const raw = cells[column + 1] ?? "";
      const value = parsePastedNumber(raw);
      return {
        columnIndex: column,
        raw,
        value,
        invalid: raw.trim().length > 0 && value === null,
      };
    }),
  }));

  return {
    headers: Array.from({ length: columnCount }, (_, column) => headerCells[column + 1] ?? ""),
    columnCount,
    rows: rows.filter((row) => row.date !== null),
    invalidDateRows: rows.filter(
      // Dòng trống hoàn toàn (ngày trống, giá trống) là dòng ngăn cách trong bảng
      // tính, bỏ qua chứ không kêu lỗi.
      (row) => row.date === null && (row.rawDate.trim() || row.cells.some((cell) => cell.raw.trim())),
    ),
  };
}

type ProductOption = { id: string; code?: string | null; name: string };

/* Bỏ dấu trước khi so: tiêu đề trong file hay viết không dấu ("xang e10") còn tên
   mặt hàng trong hệ thống thì có dấu ("Xăng E10 RON 95 Mức 3"). */
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

/**
 * Đoán mặt hàng từ nhãn cột. Chỉ nhận khi đúng một ứng viên — tiêu đề "DO" khớp
 * cả DO01SV lẫn DO05SII, đoán bừa một cái là ghi giá vào nhầm mặt hàng.
 */
export function guessProductId(
  header: string,
  products: ProductOption[],
): string | undefined {
  const target = normalize(header);
  if (!target) return undefined;

  const uniqueMatch = (predicate: (product: ProductOption) => boolean) => {
    const matches = products.filter(predicate);
    return matches.length === 1 ? matches[0].id : undefined;
  };

  return (
    uniqueMatch((product) => normalize(product.code ?? "") === target) ??
    uniqueMatch((product) => normalize(product.name) === target) ??
    uniqueMatch((product) => normalize(product.code ?? "").startsWith(target)) ??
    uniqueMatch((product) => normalize(product.code ?? "").includes(target)) ??
    uniqueMatch((product) => normalize(product.name).includes(target))
  );
}
