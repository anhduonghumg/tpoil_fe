// features/purchase-term/ui/PurchaseTermFilterDrawer.tsx

import React, { useEffect } from "react";
import { Button, DatePicker, Drawer, Form, Input, Select, Space } from "antd";
import dayjs, { Dayjs } from "dayjs";
import type {
  PaymentMode,
  PurchaseOrderStatus,
  PurchaseOrderType,
  TermPurchaseOrderListQuery,
} from "../types";

type FilterFormValues = {
  period?: "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";
  dateRange?: [Dayjs, Dayjs];
  keyword?: string;
  supplierCustomerId?: string;
  productId?: string;
  supplierLocationId?: string;
  status?: PurchaseOrderStatus;
  orderType?: PurchaseOrderType;
  paymentMode?: PaymentMode;
  pricingStatus?: string;
};

type Props = {
  open: boolean;
  query: TermPurchaseOrderListQuery;
  onClose: () => void;
  onApply: (query: TermPurchaseOrderListQuery) => void;
};

function getDefaultRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(29, "day"), dayjs()];
}

function rangeByPeriod(
  period?: FilterFormValues["period"],
): [Dayjs, Dayjs] | undefined {
  const today = dayjs();

  switch (period) {
    case "LAST_7_DAYS":
      return [today.subtract(6, "day"), today];
    case "LAST_30_DAYS":
      return [today.subtract(29, "day"), today];
    case "THIS_MONTH":
      return [today.startOf("month"), today.endOf("month")];
    default:
      return undefined;
  }
}

export function PurchaseTermFilterDrawer({
  open,
  query,
  onClose,
  onApply,
}: Props) {
  const [form] = Form.useForm<FilterFormValues>();

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      period: query.fromDate && query.toDate ? "CUSTOM" : "LAST_30_DAYS",
      dateRange:
        query.fromDate && query.toDate
          ? [dayjs(query.fromDate), dayjs(query.toDate)]
          : getDefaultRange(),
      keyword: query.keyword,
      supplierCustomerId: query.supplierCustomerId,
      status: query.status,
      orderType: query.orderType,
      paymentMode: query.paymentMode,
    });
  }, [open, query, form]);

  const handlePeriodChange = (period: FilterFormValues["period"]) => {
    const range = rangeByPeriod(period);
    if (range) {
      form.setFieldsValue({ dateRange: range });
    }
  };

  const handleApply = async () => {
    const values = await form.validateFields();

    onApply({
      ...query,
      keyword: values.keyword || undefined,
      supplierCustomerId: values.supplierCustomerId || undefined,
      status: values.status || undefined,
      orderType: values.orderType || undefined,
      paymentMode: values.paymentMode || undefined,
      fromDate: values.dateRange?.[0]?.format("YYYY-MM-DD"),
      toDate: values.dateRange?.[1]?.format("YYYY-MM-DD"),
      page: 1,
    });

    onClose();
  };

  const handleReset = () => {
    const range = getDefaultRange();

    form.setFieldsValue({
      period: "LAST_30_DAYS",
      dateRange: range,
      keyword: undefined,
      supplierCustomerId: undefined,
      productId: undefined,
      supplierLocationId: undefined,
      status: undefined,
      orderType: undefined,
      paymentMode: undefined,
      pricingStatus: undefined,
    });
  };

  return (
    <Drawer
      title={<span className="text-[20px] font-medium">Lọc đơn TERM</span>}
      open={open}
      onClose={onClose}
      width={700}
      destroyOnClose
      className="term-filter-drawer"
      footer={
        <div className="flex items-center justify-between">
          <Button type="link" onClick={handleReset}>
            Bộ lọc mặc định
          </Button>

          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" onClick={handleApply}>
              Áp dụng
            </Button>
          </Space>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3">
          <Form.Item label="Kỳ" name="period">
            <Select
              size="small"
              onChange={handlePeriodChange}
              options={[
                { label: "7 ngày gần nhất", value: "LAST_7_DAYS" },
                { label: "30 ngày gần nhất", value: "LAST_30_DAYS" },
                { label: "Tháng này", value: "THIS_MONTH" },
                { label: "Tùy chọn", value: "CUSTOM" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Từ ngày" shouldUpdate>
            {() => {
              const range = form.getFieldValue("dateRange") as
                | [Dayjs, Dayjs]
                | undefined;

              return (
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={range?.[0]}
                  onChange={(d) => {
                    const current = form.getFieldValue("dateRange") || [];
                    form.setFieldsValue({
                      period: "CUSTOM",
                      dateRange: [d, current[1]],
                    });
                  }}
                />
              );
            }}
          </Form.Item>

          <Form.Item label="Đến ngày" shouldUpdate>
            {() => {
              const range = form.getFieldValue("dateRange") as
                | [Dayjs, Dayjs]
                | undefined;

              return (
                <DatePicker
                  size="small"
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={range?.[1]}
                  onChange={(d) => {
                    const current = form.getFieldValue("dateRange") || [];
                    form.setFieldsValue({
                      period: "CUSTOM",
                      dateRange: [current[0], d],
                    });
                  }}
                />
              );
            }}
          </Form.Item>
        </div>

        <div className="border-t border-slate-100 mb-4" />

        <Form.Item label="Từ khóa" name="keyword">
          <Input
            size="small"
            placeholder="Mã đơn, NCC, hợp đồng..."
            allowClear
          />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3">
          <Form.Item label="NCC" name="supplierCustomerId">
            <Input size="small" placeholder="Chọn hoặc nhập NCC" allowClear />
          </Form.Item>

          <Form.Item label="Mặt hàng" name="productId">
            <Input
              size="small"
              placeholder="Chọn mặt hàng"
              allowClear
              disabled
            />
          </Form.Item>

          <Form.Item label="Kho NCC" name="supplierLocationId">
            <Input
              size="small"
              placeholder="Chọn kho NCC"
              allowClear
              disabled
            />
          </Form.Item>

          <Form.Item label="Trạng thái đơn" name="status">
            <Select
              size="small"
              allowClear
              placeholder="Tất cả"
              options={[
                { label: "Nháp", value: "DRAFT" },
                { label: "Đã duyệt", value: "APPROVED" },
                { label: "Đang xử lý", value: "IN_PROGRESS" },
                { label: "Hoàn tất", value: "COMPLETED" },
                { label: "Đã hủy", value: "CANCELLED" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Loại đơn" name="orderType">
            <Select
              size="small"
              allowClear
              placeholder="Tất cả"
              options={[
                { label: "Đơn lẻ", value: "SINGLE" },
                { label: "Đơn lô", value: "LOT" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Thanh toán" name="paymentMode">
            <Select
              size="small"
              allowClear
              placeholder="Tất cả"
              options={[
                { label: "Trả trước", value: "PREPAID" },
                { label: "Trả sau", value: "POSTPAID" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Trạng thái giá" name="pricingStatus">
            <Select
              allowClear
              placeholder="Tất cả"
              disabled
              options={[
                { label: "Chưa tính giá", value: "NONE" },
                { label: "Đã tạm tính", value: "ESTIMATE" },
                { label: "Đã có bill", value: "BILL_NORMALIZE" },
                { label: "Đã chốt giá", value: "FINAL" },
                { label: "Đã post", value: "POSTED" },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
}
