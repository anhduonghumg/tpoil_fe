import React, { useMemo } from "react";
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { PaymentPlanLine } from "../../types";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

type Props = {
  value: PaymentPlanLine[];
  onChange: (v: PaymentPlanLine[]) => void;
  disabled?: boolean;
};

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export default function PaymentPlanEditor({
  value,
  onChange,
  disabled,
}: Props) {
  const rows = (value || []).map((x, idx) => ({ ...x, key: `${idx}` }));

  const add = () =>
    onChange([
      ...(value || []),
      { dueDate: dayjs().format("YYYY-MM-DD"), amount: 0 },
    ]);
  const remove = (idx: number) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };
  const patch = (idx: number, p: Partial<PaymentPlanLine>) => {
    const next = [...(value || [])];
    next[idx] = { ...next[idx], ...p };
    onChange(next);
  };

  const total = useMemo(
    () => (value || []).reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [value]
  );

  const cols: ColumnsType<any> = [
    {
      title: "Ngày đến hạn",
      dataIndex: "dueDate",
      width: 160,
      render: (_: any, row: any, idx) => (
        <DatePicker
          disabled={disabled}
          value={row.dueDate ? dayjs(row.dueDate) : null}
          format="DD/MM/YYYY"
          style={{ width: "100%" }}
          onChange={(d) =>
            patch(idx, {
              dueDate: d
                ? d.format("YYYY-MM-DD")
                : dayjs().format("YYYY-MM-DD"),
            })
          }
        />
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 180,
      align: "right",
      render: (_: any, row: any, idx) => (
        <InputNumber
          disabled={disabled}
          value={Number(row.amount) || 0}
          min={0}
          style={{ width: "100%" }}
          addonAfter="đ"
          onChange={(v) => patch(idx, { amount: Number(v) || 0 })}
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (_: any, row: any, idx) => (
        <Input
          disabled={disabled}
          value={row.note ?? ""}
          placeholder="Ví dụ: Đợt 1"
          onChange={(e) => patch(idx, { note: e.target.value })}
        />
      ),
    },
    {
      title: (
        <>
          <Button
            onClick={add}
            disabled={disabled}
            icon={<PlusOutlined />}
          ></Button>
        </>
      ),
      width: 50,
      render: (_: any, __: any, idx) => (
        <Button
          danger
          disabled={disabled}
          onClick={() => remove(idx)}
          icon={<DeleteOutlined />}
        ></Button>
      ),
    },
  ];

  return (
    <div>
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Typography.Text type="secondary">
          Trả chậm có thể chia nhiều lần (phục vụ in PO)
        </Typography.Text>
      </Space>

      <Table
        size="middle"
        rowKey="key"
        columns={cols}
        dataSource={rows}
        pagination={false}
      />

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}
      >
        <Typography.Text strong>
          Tổng kế hoạch: {money(total)} đ
        </Typography.Text>
      </div>
    </div>
  );
}
