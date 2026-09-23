import type {
  BankImportAmountMode,
  BankImportColumnMap,
  BankImportNormalizeRule,
} from "./types";

export type BankImportPresetKey = "BIDV" | "MB" | "AGRIBANK" | "VCB" | "VIETIN";

export type BankImportTemplatePreset = {
  key: BankImportPresetKey;
  bankCode: string;
  bankName: string;
  name: string;
  fileLabel: string;
  amountMode: BankImportAmountMode;
  columnMap: BankImportColumnMap;
  normalizeRule: BankImportNormalizeRule;
  note: string;
};

export const BANK_IMPORT_TEMPLATE_PRESETS: BankImportTemplatePreset[] = [
  {
    key: "BIDV",
    bankCode: "BIDV",
    bankName: "BIDV",
    name: "BIDV - Báo cáo chi tiết số dư",
    fileLabel: ".xlsx · tiêu đề dòng 12",
    amountMode: "DEBIT_CREDIT",
    columnMap: {
      sheetName: "RPT_THONGKEDVTV",
      headerRow: 12,
      date: "Ngày hiệu lực",
      description: "Mô tả",
      debit: "Ghi nợ",
      credit: "Ghi có",
      externalRef: "Số tham chiếu",
      balance: "Số dư",
    },
    normalizeRule: { skipEmptyRows: true, fileFormat: "XLSX" },
    note: "Đúng cấu trúc file BIDV đã cung cấp; người chuyển thường nằm trong nội dung giao dịch.",
  },
  {
    key: "MB",
    bankCode: "MB",
    bankName: "MB Bank",
    name: "MB - Sao kê chi tiết tài khoản",
    fileLabel: ".xlsx · tiêu đề dòng 7",
    amountMode: "DEBIT_CREDIT",
    columnMap: {
      sheetName: "Thông tin giao dịch",
      headerRow: 7,
      date: "NGÀY GIAO DỊCH",
      valueDate: "NGÀY HẠCH TOÁN",
      description: "NỘI DUNG",
      debit: "PHÁT SINH NỢ",
      credit: "PHÁT SINH CÓ",
      counterpartyName: "ĐƠN VỊ THỤ HƯỞNG/ĐƠN VỊ CHUYỂN",
      externalRef: "BÚT TOÁN",
      balance: "SỐ DƯ",
    },
    normalizeRule: { skipEmptyRows: true, fileFormat: "XLSX" },
    note: "Giữ riêng ngày giao dịch, ngày hạch toán, người chuyển và mã bút toán.",
  },
  {
    key: "AGRIBANK",
    bankCode: "AGRIBANK",
    bankName: "Agribank",
    name: "Agribank - Lịch sử giao dịch",
    fileLabel: ".xlsx · tiêu đề dòng 1",
    amountMode: "SIGNED_AMOUNT",
    columnMap: {
      sheetName: "Sheet 1",
      headerRow: 1,
      date: "Thời gian giao dịch",
      valueDate: "Ngày hạch toán",
      description: "Nội dung",
      amount: "Số tiền giao dịch",
      counterpartyAcc: "Tài khoản đối ứng",
      externalRef: "Số ID",
      balance: "Số dư cuối",
    },
    normalizeRule: { skipEmptyRows: true, fileFormat: "XLSX" },
    note: "Số tiền dùng một cột có dấu +/- và có thể được Excel lưu dưới dạng chuỗi.",
  },
  {
    key: "VCB",
    bankCode: "VCB",
    bankName: "Vietcombank",
    name: "VCB - Sao kê tài khoản",
    fileLabel: ".xls dạng HTML · tiêu đề dòng 11",
    amountMode: "DEBIT_CREDIT",
    columnMap: {
      headerRow: 11,
      date: "Ngày giao dịch",
      description: "Mô tả",
      debit: "Số tiền ghi nợ",
      credit: "Số tiền ghi có",
      externalRef: "Số tham chiếu",
    },
    normalizeRule: { skipEmptyRows: true, fileFormat: "HTML_XLS" },
    note: "Hỗ trợ đúng file VCB xuất dưới dạng bảng HTML nhưng mang đuôi .xls.",
  },
  {
    key: "VIETIN",
    bankCode: "VIETIN",
    bankName: "VietinBank",
    name: "VietinBank - Lịch sử giao dịch eFAST",
    fileLabel: ".xls 97-2003 · tiêu đề dòng 25",
    amountMode: "DEBIT_CREDIT",
    columnMap: {
      sheetName: "LICH SU GIAO DICH",
      headerRow: 25,
      // Ngày phát sinh là lúc tiền thực sự đi/về — căn cứ trừ công nợ; ngày hạch toán để riêng.
      date: "Ngày phát sinh giao dịch/ Transaction date",
      valueDate: "Ngày hạch toán/Accounting date",
      description: "Mô tả giao dịch/ Transaction description",
      debit: "Nợ/ Debit",
      credit: "Có / Credit",
      counterpartyAcc: "Số tài khoản đối ứng/ Corresponsive account",
      counterpartyName: "Tên tài khoản đối ứng/ Corresponsive name",
      externalRef: "Số giao dịch/ Transaction number",
      balance: "Số dư TK/ Account Balance",
    },
    normalizeRule: { skipEmptyRows: true, fileFormat: "BINARY_XLS" },
    note: "File eFAST là Excel 97-2003 thật; có sẵn số tài khoản và tên người chuyển.",
  },
];

export const BANK_IMPORT_TEMPLATE_PRESET_BY_KEY = Object.fromEntries(
  BANK_IMPORT_TEMPLATE_PRESETS.map((preset) => [preset.key, preset]),
) as Record<BankImportPresetKey, BankImportTemplatePreset>;

export function findPresetByBankCode(bankCode?: string) {
  const normalized = bankCode?.trim().toUpperCase();
  return BANK_IMPORT_TEMPLATE_PRESETS.find((preset) => preset.bankCode === normalized);
}
