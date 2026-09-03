import React from "react";
import { Alert, Descriptions, Modal, Typography } from "antd";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import type { InvoiceCreditAssessment } from "../types";
import { formatMoney } from "./labels";

/**
 * Backend bọc lỗi công nợ khác nhau tùy đường trả về (error / message / thân trần), nên
 * bóc hết các lớp rồi mới đọc mã. Không phải lỗi công nợ thì trả null để phía gọi cứ
 * xử lý như lỗi thường.
 */
export function creditAssessmentFromError(error: any): InvoiceCreditAssessment | null {
  const body = error?.response?.data;
  const payload =
    body?.error && typeof body.error === "object"
      ? body.error
      : body?.message && typeof body.message === "object"
        ? body.message
        : body;
  if (!["CREDIT_CONFIRMATION_REQUIRED", "CREDIT_CONFIRMATION_STALE"].includes(payload?.code)) {
    return null;
  }
  return payload?.detail ?? body?.detail ?? null;
}

/**
 * Chốt chặn cuối trước khi phát hành cho khách đang vượt chính sách công nợ. Dùng chung
 * cho mọi đường phát hành — trong hộp chi tiết hóa đơn và ở tab "Chưa xuất HĐ" — để một
 * khách vượt hạn mức thì đường nào cũng phải qua đúng một cửa này.
 */
export function CreditWarningModal({
  open,
  assessment,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  assessment: InvoiceCreditAssessment | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { can } = useCan();
  const canOverrideCredit =
    can(PERMS.SYSTEM_RBAC_ADMIN) || can(PERMS.SALES_INVOICE_CREDIT_OVERRIDE);

  return (
    <Modal
      open={open}
      title="Cảnh báo công nợ trước khi phát hành"
      okText="Vẫn phát hành"
      cancelText="Quay lại"
      okButtonProps={{ danger: true, disabled: !canOverrideCredit }}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      {assessment && (
        <>
          <Alert
            showIcon
            type="warning"
            style={{ marginBottom: 12 }}
            message="Khách hàng đang vượt chính sách công nợ"
            description={
              assessment.riskCodes.includes("CUSTOMER_HAS_OVERDUE_DEBT")
                ? "Khách hàng có công nợ quá hạn. Hãy kiểm tra trước khi tiếp tục."
                : "Hóa đơn này sẽ làm dư nợ vượt hạn mức đã cấu hình."
            }
          />
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Dư nợ hiện tại">
              {formatMoney(assessment.actualDebtBefore)}
            </Descriptions.Item>
            <Descriptions.Item label="Nợ quá hạn">
              {formatMoney(assessment.overdueAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="Hóa đơn sắp phát hành">
              {formatMoney(assessment.invoiceAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="Dư nợ sau phát hành">
              <strong>{formatMoney(assessment.actualDebtAfter)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Hạn mức">
              {assessment.creditLimit == null
                ? "Chưa cấu hình"
                : formatMoney(assessment.creditLimit)}
            </Descriptions.Item>
            <Descriptions.Item label="Vượt hạn mức">
              <Typography.Text type="danger" strong>
                {formatMoney(assessment.exceededBy)}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đơn đã duyệt chưa HĐ" span={2}>
              {formatMoney(assessment.committedUninvoicedAmount)}
            </Descriptions.Item>
          </Descriptions>
          {!canOverrideCredit && (
            <Alert
              showIcon
              type="error"
              style={{ marginTop: 12 }}
              message="Tài khoản chưa có quyền xác nhận vượt hạn mức công nợ."
            />
          )}
        </>
      )}
    </Modal>
  );
}
