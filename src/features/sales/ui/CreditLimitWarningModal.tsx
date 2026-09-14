import React from "react";
import { Alert, Checkbox, Descriptions, Modal, Typography } from "antd";
import dayjs from "dayjs";
import type { SalesOrderCreditPreview } from "../types";
import { formatMoney } from "./labels";

/**
 * "Không nhắc lại với khách này hôm nay" — lưu ngay trên máy người dùng, không cần API.
 *
 * Gom vào MỘT khóa kèm ngày thay vì mỗi khách một khóa: sang ngày mới là cả gói hết hiệu
 * lực, localStorage không phình ra theo số khách × số ngày. Tắt nhắc chỉ là tiện lợi lúc
 * nhập liệu — luật thật nằm ở yêu cầu duyệt CREDIT, không tắt được bằng cách này.
 */
const CREDIT_MUTE_KEY = "sales:credit-warning-muted";

export function readMutedCustomers(): string[] {
  try {
    const raw = localStorage.getItem(CREDIT_MUTE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date?: string; customerIds?: string[] };
    if (parsed?.date !== dayjs().format("YYYY-MM-DD")) return [];
    return parsed.customerIds ?? [];
  } catch {
    return [];
  }
}

export function muteCustomerToday(customerPartyId: string) {
  try {
    const next = [...new Set([...readMutedCustomers(), customerPartyId])];
    localStorage.setItem(
      CREDIT_MUTE_KEY,
      JSON.stringify({ date: dayjs().format("YYYY-MM-DD"), customerIds: next }),
    );
  } catch {
    // Trình duyệt chặn lưu trữ (ẩn danh, chặn cookie) — cảnh báo hiện lại lần sau, chấp nhận được.
  }
}

/**
 * Cảnh báo vượt hạn mức trước khi lưu đơn. KHÔNG chặn: bấm "Vẫn lưu đơn" là đi tiếp.
 *
 * Chốt chặn thật nằm ở bước gửi duyệt — đơn sẽ sinh yêu cầu duyệt loại CREDIT mà chỉ kế
 * toán công nợ ký được. Hộp này chỉ để Sale biết trước điều đó, đỡ mất công chờ.
 */
export function CreditLimitWarningModal({
  preview,
  customerName,
  muted,
  onMutedChange,
  loading,
  onCancel,
  onConfirm,
}: {
  preview: SalesOrderCreditPreview | null;
  customerName?: string;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={Boolean(preview)}
      title="Khách hàng vượt hạn mức công nợ"
      width={640}
      okText="Vẫn lưu đơn"
      cancelText="Quay lại sửa"
      okButtonProps={{ danger: true }}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      {preview && (
        <>
          <Alert
            showIcon
            type="warning"
            style={{ marginBottom: 12 }}
            message={`Vượt hạn mức ${formatMoney(preview.exceededBy)} đ${
              customerName ? ` — ${customerName}` : ""
            }`}
            description="Đơn vẫn lưu được. Nhưng khi gửi duyệt, đơn sẽ cần kế toán công nợ ký thì mới đi tiếp."
          />
          <Descriptions
            bordered
            size="small"
            column={2}
            styles={{
              label: { width: 168, whiteSpace: "nowrap" },
              content: { whiteSpace: "nowrap" },
            }}
          >
            <Descriptions.Item label="Hạn mức">
              {preview.creditLimit == null
                ? "Chưa cấu hình"
                : `${formatMoney(preview.creditLimit)} đ`}
            </Descriptions.Item>
            <Descriptions.Item label="Nợ quá hạn">
              {formatMoney(preview.overdueAmount)} đ
            </Descriptions.Item>
            <Descriptions.Item label="Công nợ hiện tại">
              {formatMoney(preview.exposureBefore)} đ
            </Descriptions.Item>
            <Descriptions.Item label="Giá trị đơn này">
              {formatMoney(preview.orderValue)} đ
            </Descriptions.Item>
            <Descriptions.Item label="Công nợ sau đơn này">
              <strong>{formatMoney(preview.exposureAfter)} đ</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Vượt hạn mức">
              <Typography.Text type="danger" strong>
                {formatMoney(preview.exceededBy)} đ
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
          <Checkbox
            checked={muted}
            onChange={(event) => onMutedChange(event.target.checked)}
            style={{ marginTop: 12 }}
          >
            Không nhắc lại với khách hàng này trong hôm nay
          </Checkbox>
        </>
      )}
    </Modal>
  );
}
