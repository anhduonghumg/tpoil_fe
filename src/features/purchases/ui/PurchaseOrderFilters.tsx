import React, { useEffect, useState } from "react";
import { Button, DatePicker, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import type {
  PurchaseOrderListQuery,
  PurchaseOrderType,
  PurchasePaymentMode,
  PurchaseOrderStatus,
} from "../types";
import { SearchOutlined } from "@ant-design/icons";

export type PurchaseOrderFiltersProps = {
  value: PurchaseOrderListQuery;
  onChange: (next: PurchaseOrderListQuery) => void;
};

export default function PurchaseOrderFilters({
  value,
  onChange,
}: PurchaseOrderFiltersProps) {
  const [draftKeyword, setDraftKeyword] = useState(value.keyword ?? "");

  useEffect(() => setDraftKeyword(value.keyword ?? ""), [value.keyword]);

  const apply = () =>
    onChange({ ...value, keyword: draftKeyword.trim(), page: 1 });

  return (
    <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
      <Space wrap size={8}>
        <Input
          size="small"
          value={draftKeyword}
          placeholder="Tìm mã đơn hoặc tên NCC"
          style={{ width: 260 }}
          onChange={(e) => setDraftKeyword(e.target.value)}
          onPressEnter={apply}
          allowClear
        />

        <Select<PurchaseOrderStatus>
          size="small"
          value={value.status}
          placeholder="Trạng thái"
          style={{ width: 150 }}
          allowClear
          options={[
            { value: "DRAFT", label: "Nháp" },
            { value: "APPROVED", label: "Đã duyệt" },
            { value: "IN_PROGRESS", label: "Đang thực hiện" },
            { value: "COMPLETED", label: "Hoàn tất" },
            { value: "CANCELLED", label: "Đã huỷ" },
          ]}
          onChange={(v) =>
            onChange({ ...value, status: v ?? undefined, page: 1 })
          }
        />

        <Select<PurchaseOrderType>
          size="small"
          value={value.orderType}
          placeholder="Loại đơn"
          style={{ width: 130 }}
          allowClear
          options={[
            { value: "SINGLE", label: "Mua lẻ" },
            { value: "LOT", label: "Mua lô" },
          ]}
          onChange={(v) =>
            onChange({ ...value, orderType: v ?? undefined, page: 1 })
          }
        />

        <Select<PurchasePaymentMode>
          size="small"
          value={value.paymentMode}
          placeholder="Thanh toán"
          style={{ width: 140 }}
          allowClear
          options={[
            { value: "PREPAID", label: "Trong ngày" },
            { value: "POSTPAID", label: "Trả chậm" },
          ]}
          onChange={(v) =>
            onChange({ ...value, paymentMode: v ?? undefined, page: 1 })
          }
        />

        <DatePicker
          size="small"
          value={value.dateFrom ? dayjs(value.dateFrom) : null}
          placeholder="Từ ngày"
          format="YYYY-MM-DD"
          onChange={(d) =>
            onChange({
              ...value,
              dateFrom: d ? d.format("YYYY-MM-DD") : undefined,
              page: 1,
            })
          }
        />

        <DatePicker
          size="small"
          value={value.dateTo ? dayjs(value.dateTo) : null}
          placeholder="Đến ngày"
          format="YYYY-MM-DD"
          onChange={(d) =>
            onChange({
              ...value,
              dateTo: d ? d.format("YYYY-MM-DD") : undefined,
              page: 1,
            })
          }
        />

        <Button
          size="small"
          type="primary"
          onClick={apply}
          icon={<SearchOutlined />}
        >
          Tìm kiếm
        </Button>
      </Space>

      <Button
        size="small"
        onClick={() =>
          onChange({
            keyword: "",
            status: undefined,
            orderType: undefined,
            paymentMode: undefined,
            dateFrom: undefined,
            dateTo: undefined,
            page: 1,
            limit: value.limit ?? 20,
          })
        }
      >
        Reset
      </Button>
    </Space>
  );
}
