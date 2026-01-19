import { Table, Select, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { PriceImportLine } from "../types";

type Props = {
  lines: PriceImportLine[];
  productOptions: { label: string; value: string }[];
  onChange: (lineNo: number, patch: Partial<PriceImportLine>) => void;
};

export const PriceImportReviewTable: React.FC<Props> = ({
  lines,
  productOptions,
  onChange,
}) => {
  const columns: ColumnsType<PriceImportLine> = [
    {
      title: "Sản phẩm",
      width: 260,
      render: (_, row) => (
        <Select
          style={{ width: "100%" }}
          placeholder={row.productNameRaw}
          options={productOptions}
          value={row.productId}
          status={!row.productId ? "error" : undefined}
          onChange={(v) => onChange(row.lineNo, { productId: v })}
        />
      ),
    },
    {
      title: "Vùng",
      dataIndex: "regionId",
      width: 120,
    },
    {
      title: "Giá",
      dataIndex: "price",
      width: 140,
      align: "right",
      render: (v) => v.toLocaleString("vi-VN"),
    },
    {
      title: "Áp dụng từ",
      dataIndex: "effectiveFrom",
      width: 130,
      render: (v) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      title: "Trạng thái",
      width: 220,
      render: (_, row) =>
        row.conflict ? (
          <Tag color="orange">{row.conflict.message}</Tag>
        ) : (
          <Tag color="green">OK</Tag>
        ),
    },
  ];

  return (
    <Table
      rowKey="lineNo"
      columns={columns}
      dataSource={lines}
      pagination={false}
      size="small"
    />
  );
};
