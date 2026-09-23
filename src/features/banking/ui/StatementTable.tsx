import React from "react";
import { Button, Dropdown, Space, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import { DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import type { BankTransactionItem } from "../types";
import { MATCH_STATUS, SignedAmount, accountText, dateText, formatMoney, stack, statusTag } from "../lib/format";
import "../../../shared/ui/data-grid.css";

type Props = {
  data: BankTransactionItem[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number, pageSize: number) => void;
  onOpenMatch: (row: BankTransactionItem) => void;
  selectedRowKeys?: React.Key[];
  onChangeSelectedRowKeys?: (keys: React.Key[]) => void;
  onDeleteOne: (row: BankTransactionItem) => void;
};

export function canDeleteBankTransaction(row: BankTransactionItem) {
  return row.matchStatus === "UNMATCHED" && row.isConfirmed !== true;
}

export function StatementTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onChangePage,
  onOpenMatch,
  selectedRowKeys = [],
  onChangeSelectedRowKeys,
  onDeleteOne,
}: Props) {
  const columns: ColumnsType<BankTransactionItem> = [
    {
      title: "Ngày / tài khoản",
      dataIndex: "txnDate",
      width: 135,
      render: (value, row) => stack(dateText(value), accountText(row.bankAccount)),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (value, row) => <SignedAmount direction={row.direction} value={value} />,
    },
    {
      title: "Nội dung / đối tác",
      dataIndex: "description",
      render: (_, row) => (
        <Tooltip title={row.description} placement="topLeft">
          {stack(row.description, `${row.counterpartyName || "Chưa rõ đối tác"}${row.counterpartyAcc ? ` · ${row.counterpartyAcc}` : ""}`)}
        </Tooltip>
      ),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingAmount",
      width: 130,
      align: "right",
      render: (value, row) =>
        stack(<span className="data-grid-num">{formatMoney(value)}</span>, `Đã phân bổ ${formatMoney(row.allocatedAmount)}`),
    },
    {
      title: "Trạng thái",
      dataIndex: "matchStatus",
      width: 125,
      render: (value, row) => (
        <div className="data-grid-stack">
          <span>{statusTag(MATCH_STATUS, value)}</span>
          <span className="data-grid-sub">{row.isConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}</span>
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 104,
      fixed: "right",
      align: "right",
      render: (_, row) => {
        const done = row.matchStatus === "MANUAL_MATCHED" || row.matchStatus === "AUTO_MATCHED";
        return (
          <Space size={2}>
            <Button size="small" type={done ? "default" : "primary"} onClick={() => onOpenMatch(row)}>
              {done ? "Xem" : "Đối soát"}
            </Button>
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: "delete",
                    danger: true,
                    icon: <DeleteOutlined />,
                    disabled: !canDeleteBankTransaction(row),
                    label: canDeleteBankTransaction(row) ? "Xóa giao dịch" : "Chỉ xóa được dòng chưa khớp",
                    onClick: () => onDeleteOne(row),
                  },
                ],
              }}
            >
              <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thêm thao tác" />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const rowSelection: TableRowSelection<BankTransactionItem> = {
    selectedRowKeys,
    onChange: (keys) => onChangeSelectedRowKeys?.(keys),
    getCheckboxProps: (record) => ({ disabled: !canDeleteBankTransaction(record) }),
  };

  return (
    <Table
      className="data-grid"
      size="small"
      rowKey="id"
      rowSelection={rowSelection}
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1000 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} giao dịch`,
        onChange: onChangePage,
      }}
    />
  );
}
