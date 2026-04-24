import React from "react";
import { Button, Input, Space } from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { TermPurchaseOrderListQuery } from "../types";

type Props = {
  keyword: string;
  query: TermPurchaseOrderListQuery;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onOpenFilter: () => void;
  onCreate: () => void;
};

function formatDateRange(query: TermPurchaseOrderListQuery) {
  if (!query.fromDate || !query.toDate) return "Chưa chọn";
  return `${dayjs(query.fromDate).format("DD/MM/YYYY")} - ${dayjs(
    query.toDate,
  ).format("DD/MM/YYYY")}`;
}

export function PurchaseTermToolbar({
  keyword,
  query,
  onKeywordChange,
  onSearch,
  onOpenFilter,
  onCreate,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 16px",
        borderBottom: "1px solid #eef2f7",
        background: "#fff",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <Button
        size="small"
        icon={<SettingOutlined />}
        style={{ width: 40, borderRadius: 9, flex: "0 0 auto" }}
      />

      <Input
        size="small"
        allowClear
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        onPressEnter={onSearch}
        placeholder="Nhập số đơn hoặc từ khóa"
        style={{
          width: 430,
          borderRadius: 9,
          flex: "0 1 430px",
        }}
      />

      <Button
        size="small"
        icon={<FilterOutlined />}
        onClick={onOpenFilter}
        style={{
          borderRadius: 9,
          fontWeight: 600,
          flex: "0 0 auto",
        }}
      >
        Lọc
      </Button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: "#475569",
          minWidth: 260,
          flex: "1 1 auto",
          overflow: "hidden",
        }}
      >
        <span>Ngày HD:</span>
        <span style={{ color: "#1677ff", fontWeight: 500 }}>
          {formatDateRange(query)}
        </span>
      </div>

      <Space size={10} style={{ flex: "0 0 auto" }}>
        <Button size="small" style={{ borderRadius: 9 }}>
          Đơn hàng trước
        </Button>

        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
          style={{ borderRadius: 9 }}
        >
          Tạo đơn
        </Button>
      </Space>
    </div>
  );
}
