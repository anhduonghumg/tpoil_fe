import React from "react";
import { Modal, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { BankImportPreviewResponse, BankImportPreviewRow } from "../types";

type Props = {
  open: boolean;
  data: BankImportPreviewResponse | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function money(n?: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

export function ImportPreviewModal({
  open,
  data,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  const columns: ColumnsType<BankImportPreviewRow> = [
    {
      title: "#",
      dataIndex: "rowNo",
      width: 70,
    },
    {
      title: "Ngày GD",
      dataIndex: "txnDate",
      width: 120,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Loại",
      dataIndex: "direction",
      width: 90,
      render: (v) => (v === "OUT" ? "Chi" : "Thu"),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Nội dung",
      dataIndex: "description",
      ellipsis: true,
    },
    {
      title: "Ref",
      dataIndex: "externalRef",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Kết quả",
      dataIndex: "isDuplicate",
      width: 120,
      render: (v) =>
        v ? <Tag color="orange">Trùng</Tag> : <Tag color="green">Hợp lệ</Tag>,
    },
  ];

  return (
    <Modal
      open={open}
      title="Xem trước sao kê"
      width={1100}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Xác nhận import"
      cancelText="Đóng"
      confirmLoading={loading}
    >
      {data && (
        <>
          <Space size={24} wrap style={{ marginBottom: 12 }}>
            <Typography.Text>
              <strong>File:</strong> {data.fileName}
            </Typography.Text>
            <Typography.Text>
              <strong>Tài khoản:</strong> {data.bankAccount.bankCode} -{" "}
              {data.bankAccount.accountNo}
            </Typography.Text>
            <Typography.Text>
              <strong>Template:</strong>{" "}
              {data.template
                ? `${data.template.name} v${data.template.version}`
                : "Chưa chọn"}
            </Typography.Text>
          </Space>

          <Space size={24} wrap style={{ marginBottom: 12 }}>
            <Tag color="blue">Tổng dòng: {data.summary.totalRows}</Tag>
            <Tag color="green">Hợp lệ: {data.summary.validCount}</Tag>
            <Tag color="orange">Trùng: {data.summary.duplicatedCount}</Tag>
          </Space>

          <Table
            rowKey={(r) => `${r.rowNo}-${r.fingerprint}`}
            size="small"
            columns={columns}
            dataSource={data.rows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 900 }}
          />
        </>
      )}
    </Modal>
  );
}
