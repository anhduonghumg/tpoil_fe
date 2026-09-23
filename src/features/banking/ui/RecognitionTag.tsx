import { Tag, Tooltip } from "antd";
import type { BankRecognition } from "../types";

/* Màu theo độ tin cậy: xanh = căn cứ chắc chắn (STK, MST, số HĐ, tên do ngân hàng ghi),
   vàng = tìm thấy tên trong nội dung nên cần người xem, đỏ = chưa biết là ai. */
const CONFIDENCE_COLOR = { HIGH: "green", MEDIUM: "gold", LOW: "red" } as const;

const KIND_LABEL: Record<BankRecognition["kind"], string> = {
  CUSTOMER: "Khách",
  SUPPLIER: "NCC",
  INTERNAL: "Chuyển nội bộ",
  BANK_FEE: "Phí / lãi NH",
  UNKNOWN: "Chưa rõ",
};

export function recognitionLabel(recognition?: BankRecognition | null) {
  if (!recognition) return "—";
  if (recognition.party) return recognition.party.partyName;
  if (recognition.kind === "INTERNAL" || recognition.kind === "BANK_FEE") return KIND_LABEL[recognition.kind];
  if (recognition.candidates.length) return `${recognition.candidates.length} khách có thể là`;
  return "Chưa rõ đối tượng";
}

/** Ô hai dòng: đối tượng nhận ra + căn cứ nhận diện. Rê chuột xem các khách có thể là. */
export function RecognitionTag({ recognition }: { recognition?: BankRecognition | null }) {
  if (!recognition) return <span className="data-grid-empty">—</span>;
  const color = recognition.kind === "INTERNAL" || recognition.kind === "BANK_FEE" ? "purple" : CONFIDENCE_COLOR[recognition.confidence];
  const tooltip = recognition.candidates.length > 1 ? (
    <div>
      <div style={{ marginBottom: 4 }}>{recognition.reason}</div>
      {recognition.candidates.map((candidate) => (
        <div key={candidate.partyId}>
          • {candidate.partyName} <span style={{ opacity: 0.7 }}>({candidate.reason})</span>
        </div>
      ))}
    </div>
  ) : (
    recognition.reason
  );
  return (
    <Tooltip title={tooltip} placement="topLeft">
      <div className="data-grid-stack">
        <span className="data-grid-clip">
          <Tag color={color} style={{ margin: "0 4px 0 0", fontSize: 11, lineHeight: "16px" }}>
            {recognition.kind === "CUSTOMER" || recognition.kind === "SUPPLIER"
              ? recognition.confidence === "HIGH"
                ? "Chắc chắn"
                : recognition.confidence === "MEDIUM"
                  ? "Cần xem"
                  : "Chưa rõ"
              : KIND_LABEL[recognition.kind]}
          </Tag>
          <span className="data-grid-strong">{recognitionLabel(recognition)}</span>
        </span>
        <span className="data-grid-clip data-grid-sub">{recognition.reportedReceipt ? "Sale đã báo khoản này · " : ""}{recognition.reason}</span>
      </div>
    </Tooltip>
  );
}
