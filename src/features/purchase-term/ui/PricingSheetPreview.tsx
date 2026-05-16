import React from "react";
import { Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TermPricingSheetRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: TermPricingSheetRow[];
  loading?: boolean;
};

function renderValue(row: TermPricingSheetRow) {
  if (row.displayValue) {
    return row.displayValue;
  }

  if (row.calculatedValue !== null && row.calculatedValue !== undefined) {
    return new Intl.NumberFormat("vi-VN").format(
      Math.round(Number(row.calculatedValue)),
    );
  }

  if (row.inputValue !== null && row.inputValue !== undefined) {
    return new Intl.NumberFormat("vi-VN").format(
      Math.round(Number(row.inputValue)),
    );
  }

  return "-";
}

export function PricingSheetPreview({ rows, loading }: Props) {
  const columns: ColumnsType<TermPricingSheetRow> = [
    {
      title: "#",
      dataIndex: "rowNo",
      width: 10,
      align: "center",
      fixed: "left",
    },

    {
      title: "Nội dung",
      dataIndex: "label",
      width: 700,
      render: (_, row) => {
        const node = (
          <span>
            {row.code ? (
              <Text
                type="secondary"
                style={{
                  marginRight: 8,
                  fontSize: 12,
                }}
              >
                [{row.code}]
              </Text>
            ) : null}

            {row.label}
          </span>
        );

        if (row.isBold) {
          return <strong>{node}</strong>;
        }

        return node;
      },
    },

    {
      title: "Giá trị",
      width: 50,
      align: "right",

      render: (_, row) => {
        const value = renderValue(row);

        if (row.isHighlighted) {
          return (
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "#cf1322",
              }}
            >
              {value}
            </div>
          );
        }

        if (row.isBold) {
          return (
            <strong
              style={{
                fontSize: 14,
              }}
            >
              {value}
            </strong>
          );
        }

        return value;
      },
    },
  ];

  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #f0f0f0",
          fontWeight: 700,
          background: "#fafafa",
        }}
      >
        Preview bảng giá
      </div>

      <Table<TermPricingSheetRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        size="small"
        bordered
        pagination={false}
        scroll={{
          y: 620,
          x: 900,
        }}
        rowClassName={(row) => {
          if (row.isHighlighted) {
            return "pricing-sheet-highlight-row";
          }

          if (row.isBold) {
            return "pricing-sheet-bold-row";
          }

          return "";
        }}
      />

      <style>
        {`
          .pricing-sheet-highlight-row td {
            background: #fff2f0 !important;
          }

          .pricing-sheet-bold-row td {
            background: #fafafa;
          }

          .pricing-sheet-highlight-row:hover td {
            background: #ffe7e1 !important;
          }
        `}
      </style>
    </div>
  );
}
