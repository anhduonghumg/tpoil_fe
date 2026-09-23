import React from "react";
import { Button, Space, Switch, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BankImportTemplate } from "../types";

type Props = {
  data: BankImportTemplate[];
  loading?: boolean;
  onEdit: (row: BankImportTemplate) => void;
  onToggleActive: (row: BankImportTemplate) => void;
};

export default function BankImportTemplateTable({
  data,
  loading,
  onEdit,
  onToggleActive,
}: Props) {
  const columns: ColumnsType<BankImportTemplate> = [
    {
      title: "Ngân hàng",
      dataIndex: "bankCode",
      key: "bankCode",
      width: 115,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Tên template",
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Phiên bản {row.version}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Cấu trúc file",
      key: "structure",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {row.columnMap.sheetName || "Sheet đầu tiên"}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Tiêu đề dòng {row.columnMap.headerRow || 1} ·{" "}
            {row.normalizeRule?.fileFormat === "HTML_XLS" ? ".xls HTML" : row.normalizeRule?.fileFormat === "BINARY_XLS" ? ".xls 97-2003" : ".xlsx"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Ánh xạ chính",
      key: "mapping",
      render: (_, row) => (
        <Tooltip
          placement="topLeft"
          title={
            <pre style={{ margin: 0 }}>
              {JSON.stringify(row.columnMap, null, 2)}
            </pre>
          }
        >
          <Space size={[4, 4]} wrap style={{ cursor: "help" }}>
            <Tag>Ngày: {row.columnMap.date || "—"}</Tag>
            {row.columnMap.amount ? (
              <Tag color="purple">Tiền +/-: {row.columnMap.amount}</Tag>
            ) : (
              <>
                {row.columnMap.credit ? <Tag color="green">Thu: {row.columnMap.credit}</Tag> : null}
                {row.columnMap.debit ? <Tag color="red">Chi: {row.columnMap.debit}</Tag> : null}
              </>
            )}
            {row.columnMap.externalRef ? <Tag>Ref: {row.columnMap.externalRef}</Tag> : null}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Trạng thái",
      key: "isActive",
      width: 120,
      render: (_, row) =>
        row.isActive ? (
          <Tag color="green">Đang dùng</Tag>
        ) : (
          <Tag>Ngưng dùng</Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 155,
      fixed: "right",
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => onEdit(row)}>
            Sửa
          </Button>
          <Switch checked={row.isActive} onChange={() => onToggleActive(row)} />
        </Space>
      ),
    },
  ];

  return (
    <Table
      className="data-grid"
      size="small"
      bordered
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1100 }}
      pagination={{ pageSize: 20, showSizeChanger: false }}
    />
  );
}
