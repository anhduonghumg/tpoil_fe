import { Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TermPricingSheetRow } from "../types";

const { Text } = Typography;

function money(v?: number | null, digits = 0) {
  if (v === null || v === undefined) return "";

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(v));
}

type Props = {
  rows?: TermPricingSheetRow[];
  loading?: boolean;
};

export default function TermPricingSheetTable({ rows, loading }: Props) {
  const columns: ColumnsType<TermPricingSheetRow> = [
    {
      title: "STT",
      dataIndex: "rowNo",
      width: 70,
      align: "center",
      fixed: "left",
    },

    {
      title: "Nội dung",
      dataIndex: "label",
      width: 360,
      render(value, row) {
        return (
          <Text
            strong={row.isBold}
            style={{
              color: row.isHighlighted ? "#1677ff" : undefined,
            }}
          >
            {value}
          </Text>
        );
      },
    },

    {
      title: "Giá trị",
      width: 220,
      align: "right",

      render(_, row) {
        const digits = row.unit?.includes("USD") ? 6 : 0;

        return (
          <Text
            strong={row.isBold}
            style={{
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {money(row.calculatedValue, digits)}
          </Text>
        );
      },
    },

    {
      title: "ĐVT",
      dataIndex: "unit",
      width: 120,
    },

    {
      title: "Công thức",
      dataIndex: "formula",
      width: 320,
      render(value) {
        return value ? <Text type="secondary">{value}</Text> : null;
      },
    },

    {
      title: "Ghi chú",
      dataIndex: "note",
      width: 260,

      render(value) {
        return value ? <Text type="secondary">{value}</Text> : null;
      },
    },
  ];

  return (
    <Table<TermPricingSheetRow>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={rows || []}
      bordered
      pagination={false}
      sticky
      scroll={{
        x: 1200,
        y: "calc(100vh - 320px)",
      }}
      rowClassName={(row) => {
        if (row.isHighlighted) {
          return "term-sheet-row-highlight";
        }

        if (row.isResult) {
          return "term-sheet-row-result";
        }

        return "";
      }}
    />
  );
}
