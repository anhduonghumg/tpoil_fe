import { useEffect, useState } from "react";
import { Alert, Input, Modal } from "antd";
import { notify } from "../../../shared/lib/notification";
import { useBankingUndo, type BankingUndoRoute } from "../hooks";
import "../banking.css";

/* Một thao tác lùi lại cần lý do: hủy đề nghị, hủy hồ sơ chi, xóa lần chi ghi sai. */
export type UndoRequest = {
  title: string;
  /** Điều sẽ xảy ra khi xác nhận, để người dùng biết hệ quả trước khi bấm. */
  description: string;
  okText: string;
  successText: string;
  route: BankingUndoRoute;
  params: Record<string, string>;
};

export function UndoReasonModal({ request, onClose }: { request: UndoRequest | null; onClose: () => void }) {
  const undo = useBankingUndo();
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [request]);

  const submit = async () => {
    if (!request) return;
    if (reason.trim().length < 3) return void notify.error("Nhập lý do");
    await undo.mutateAsync({ route: request.route, params: request.params, reason: reason.trim() });
    notify.success(request.successText);
    onClose();
  };

  return (
    <Modal className="banking-modal" open={Boolean(request)} title={request?.title} okText={request?.okText} okButtonProps={{ danger: true }} cancelText="Đóng" confirmLoading={undo.isPending} onCancel={onClose} onOk={submit} destroyOnHidden width={480}>
      {request ? <Alert type="warning" style={{ marginBottom: 12 }} message={request.description} /> : null}
      <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do (được lưu vào nhật ký)" />
    </Modal>
  );
}
