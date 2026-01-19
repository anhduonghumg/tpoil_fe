import React, { useEffect, useState } from "react";
import { Button, DatePicker, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import type {
  PurchaseOrderListQuery,
  PurchaseOrderType,
  PurchasePaymentMode,
} from "../types";

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
      <Space wrap>
        <Input
          value={draftKeyword}
          placeholder="Tìm số đơn hoặc tên NCC"
          style={{ width: 280 }}
          onChange={(e) => setDraftKeyword(e.target.value)}
          onPressEnter={apply}
          allowClear
        />

        <Select<PurchaseOrderType>
          value={value.orderType}
          placeholder="Loại đơn"
          style={{ width: 140 }}
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
          value={value.paymentMode}
          placeholder="Thanh toán"
          style={{ width: 150 }}
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

        <Button type="primary" onClick={apply}>
          Tìm kiếm
        </Button>
      </Space>

      <Space>
        <Button
          onClick={() =>
            onChange({
              keyword: "",
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
    </Space>
  );
}
