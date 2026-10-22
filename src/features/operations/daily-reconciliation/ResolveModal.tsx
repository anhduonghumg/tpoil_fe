import { useEffect, useState } from "react";
import { Alert, Input, Modal, Radio, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { STATUS } from "./api";

export const qty = (n: any) => (n == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(n)));
const label = { fontSize: 12, display: "block", marginBottom: 2 } as const;

/** Why a note alone cannot resolve the row (mirrors UNACCEPTABLE in the backend logic). */
export function blockedReason(r: any): string | null {
  if (r.status === "INVALID") return `Dòng ${r.external?.rowNo ?? ""} sheet ${r.external?.sheet ?? ""} bị lỗi: ${(r.external?.errors ?? []).join("; ")}. Nhờ NCC sửa file rồi bấm "Thay file".`;
  if (r.status === "UNMAPPED") return `Mã hàng "${r.external?.productCode || "?"}" chưa ghép với mặt hàng của mình. Bấm "Thay file" và chọn mặt hàng.`;
  if (r.status === "NOT_COMPARABLE") return "Phiếu của mình chưa đủ số lượng (lít TT / lít 15) để so. Bổ sung trên phiếu rồi bấm \"Cập nhật số liệu\".";
  return null;
}

type Props = {
  row?: any; payload: any; busy: boolean;
  onClose: () => void; onSubmit: (body: { key: string; internalKey?: string; note: string; accepted: boolean }) => void;
};

export default function ResolveModal({ row, payload, busy, onClose, onSubmit }: Props) {
  const [pick, setPick] = useState<string>();
  const [note, setNote] = useState("");
  useEffect(() => { setPick(row?.internal?.key); setNote(row?.note ?? ""); }, [row]);
  if (!row) return null;

  const status: (typeof STATUS)[string] = STATUS[row.status] ?? { label: row.status, tone: "default" };
  const blocked = blockedReason(row);
  const candidates: any[] = (payload.internal ?? []).filter((i: any) => row.candidates?.includes(i.key));
  const chosen = candidates.find((c) => c.key === pick) ?? row.internal;
  const needsPick = row.status === "AMBIGUOUS";
  const ext = row.external;
  const q = (o: any) => (o ? `${qty(o.actualQty)}${o.v15Qty != null ? ` · L15 ${qty(o.v15Qty)}` : ""}` : "—");
  const compare = [
    { key: "date", field: "Ngày", ncc: ext?.date, mine: chosen?.date },
    { key: "plate", field: "Biển xe", ncc: ext?.plate, mine: chosen?.plate },
    { key: "doc", field: "Phiếu / lệnh", ncc: [ext?.receiptNo, ext?.orderNo].filter(Boolean).join(" / "), mine: [chosen?.orderNo, chosen?.receiptNo].filter(Boolean).join(" / ") },
    { key: "qty", field: "Số lượng (TT)", ncc: ext && q(ext), mine: chosen && q(chosen) },
  ].map((r) => r.key === "date" ? { ...r, ncc: r.ncc && dayjs(r.ncc).format("DD/MM/YYYY"), mine: r.mine && dayjs(r.mine).format("DD/MM/YYYY") } : r);

  return (
    <Modal
      open width={560} onCancel={onClose} okText="Lưu" cancelText="Đóng" confirmLoading={busy}
      title={<span style={{ fontSize: 14 }}>Xử lý dòng <Tag color={status.tone} style={{ marginLeft: 6 }}>{status.label}</Tag></span>}
      okButtonProps={{ size: "small", disabled: !!blocked || !note.trim() || (needsPick && !pick), style: blocked ? { display: "none" } : undefined }}
      cancelButtonProps={{ size: "small" }}
      onOk={() => onSubmit({ key: row.key, internalKey: candidates.length ? pick : undefined, note: note.trim(), accepted: true })}
    >
      <Table className="data-grid" size="small" pagination={false} rowKey="key" dataSource={compare} style={{ marginBottom: 10 }} columns={[
        { title: "", dataIndex: "field", width: 110, render: (v) => <span className="data-grid-sub">{v}</span> },
        { title: "File NCC", dataIndex: "ncc", render: (v) => v || <span className="data-grid-empty">—</span> },
        { title: "Hệ thống", dataIndex: "mine", render: (v) => v || <span className="data-grid-empty">—</span> },
      ]} />

      {blocked && <Alert type="error" showIcon style={{ fontSize: 12 }} message={blocked} />}

      {!blocked && (candidates.length > 1 || (needsPick && candidates.length > 0)) && (
        <div style={{ marginBottom: 10 }}>
          <Typography.Text type="secondary" style={label}>{needsPick ? "Chọn phiếu của mình ứng với dòng này" : "Phiếu của mình"}</Typography.Text>
          <Radio.Group value={pick} onChange={(e) => setPick(e.target.value)} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
            {candidates.map((c) => (
              <Radio key={c.key} value={c.key} style={{ fontSize: 12 }}>
                {[c.orderNo, c.receiptNo].filter(Boolean).join(" / ") || "Phiếu"} · {c.plate || "—"} · {q(c)}
              </Radio>
            ))}
          </Radio.Group>
        </div>
      )}
      {!blocked && needsPick && !candidates.length && (
        <Typography.Text type="warning" style={label}>Không có phiếu nào của mình cùng ngày, xe và mặt hàng.</Typography.Text>
      )}

      {!blocked && (
        <>
          <Typography.Text type="secondary" style={label}>Lý do / ghi chú{status.todo ? ` — ${status.todo.toLowerCase()}` : ""}</Typography.Text>
          <Input.TextArea size="small" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={row.status === "POTENTIAL_DUPLICATE" ? "VD: Xe chạy 2 chuyến trong ngày" : "VD: NCC ghi nhầm số lượng, đã báo sửa"} />
        </>
      )}
    </Modal>
  );
}
