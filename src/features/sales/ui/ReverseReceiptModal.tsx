import { useEffect } from "react";
import { Alert, Form, Input, Modal, Radio } from "antd";
import type { ReverseReceiptPayload } from "../types";
import "../../banking/banking.css";

/**
 * Hỏi lý do và kiểu đảo trước khi đảo khoản thu:
 *   - Ghi nhận nhầm (mặc định): sổ công nợ và lãi công nợ trở về như chưa từng ghi.
 *   - Ngân hàng hoàn trả / hủy: tính từ hôm nay, vì khoảng giữa công ty đã thật sự cầm tiền.
 */
export function ReverseReceiptModal({
  open,
  title = "Đảo ghi nhận khoản thu",
  summary,
  warning,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  /** Mô tả khoản bị đảo, vd. "295.000.000 đ · Hoa Xuân Sơn La · 18/09/2026". */
  summary?: React.ReactNode;
  /** Cảnh báo thêm, vd. "Sẽ đảo cả khoản thu (3 bút phân bổ)". */
  warning?: React.ReactNode;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: ReverseReceiptPayload) => void;
}) {
  const [form] = Form.useForm<Required<ReverseReceiptPayload>>();

  useEffect(() => {
    if (open) form.setFieldsValue({ mode: "CORRECTION", reason: "" });
  }, [open, form]);

  return (
    <Modal
      className="banking-modal"
      open={open}
      title={title}
      okText="Đảo ghi nhận"
      okButtonProps={{ danger: true }}
      cancelText="Hủy"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={560}
      destroyOnHidden
    >
      {summary ? <Alert type="info" style={{ marginBottom: 12 }} message={summary} /> : null}
      <Form className="banking-form" form={form} layout="vertical" onFinish={(values) => onConfirm({ reason: values.reason.trim(), mode: values.mode })}>
        <Form.Item name="reason" label="Lý do đảo" rules={[{ required: true, whitespace: true, message: "Nhập lý do đảo" }]}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="vd. Ghi nhầm khách — tiền của Hoa Xuân, không phải Hoa Xuân Sơn La" />
        </Form.Item>
        <Form.Item name="mode" label="Kiểu đảo">
          <Radio.Group style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Radio value="CORRECTION">
              <b>Ghi nhận nhầm</b> (sai khách, sai số tiền)
              <div className="banking-hint">Sổ công nợ và lãi công nợ trở về như chưa từng ghi nhận.</div>
            </Radio>
            <Radio value="BANK_REVERSAL">
              <b>Ngân hàng hoàn trả / hủy giao dịch</b>
              <div className="banking-hint">Công nợ tăng lại tính từ hôm nay; khoảng trước đó vẫn tính là đã thu.</div>
            </Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
      {warning ? <Alert type="warning" showIcon message={warning} /> : null}
      <div className="banking-hint" style={{ marginTop: 10 }}>
        Sau khi đảo: khoản thu chuyển "Đã đảo", kế hoạch thu mở lại nếu thiếu, giao dịch quay lại hàng đợi Thu tiền để ghi nhận lại.
      </div>
    </Modal>
  );
}
