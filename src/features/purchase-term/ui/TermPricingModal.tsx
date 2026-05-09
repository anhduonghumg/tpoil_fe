import React, { useEffect } from "react";
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
} from "antd";
import dayjs from "dayjs";
import type {
  CreateTermPricingPayload,
  TermPurchaseOrderDetail,
} from "../types";

type PricingKind = "ESTIMATE" | "BILL_NORMALIZE" | "FINAL";

type FormValues = {
  billDate: dayjs.Dayjs;
  qtyBasisSelected: "ACTUAL" | "V15";
  qtyBasisLocked?: boolean;

  plattsBaseDate?: dayjs.Dayjs;
  plattsDaysBefore?: number;
  plattsDaysAfter?: number;

  mopsAvgUsdPerBbl?: number;
  premiumUsdPerBbl?: number;

  fxRateDate?: dayjs.Dayjs;
  fxStage?: "ESTIMATE" | "OFFICIAL";
  fxRate?: number;

  envTaxAmountVnd?: number;
  vatAmountVnd?: number;
  note?: string;

  lines: Array<{
    purchaseOrderLineId: string;
    qtyActual?: number;
    qtyV15?: number;
    note?: string;
  }>;
};

type Props = {
  open: boolean;
  kind: PricingKind;
  data: TermPurchaseOrderDetail;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermPricingPayload) => void;
};

const titleMap: Record<PricingKind, string> = {
  ESTIMATE: "Tạo bảng giá tạm",
  BILL_NORMALIZE: "Tạo bảng xuất hóa đơn",
  FINAL: "Tạo bảng tỷ giá chính thức",
};

export function TermPricingModal({
  open,
  kind,
  data,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;

    const confirmedReceipts =
      data.receipts?.filter((x) => x.status === "CONFIRMED") || [];

    form.setFieldsValue({
      billDate: dayjs(),
      qtyBasisSelected: "V15",
      qtyBasisLocked: kind === "FINAL",
      plattsBaseDate: dayjs(),
      plattsDaysBefore: 5,
      plattsDaysAfter: 5,
      premiumUsdPerBbl: data.termPremiumUsdPerBbl ?? data.premium ?? undefined,
      fxRateDate: dayjs(),
      fxStage: kind === "FINAL" ? "OFFICIAL" : "ESTIMATE",
      lines: data.lines.map((line) => {
        const receiptOfLine = confirmedReceipts.find(
          (r) => r.purchaseOrderLineId === line.id,
        );

        return {
          purchaseOrderLineId: line.id,
          qtyActual: receiptOfLine?.qty ?? line.orderedQty,
          qtyV15:
            receiptOfLine?.standardQtyV15 ??
            receiptOfLine?.qty ??
            line.orderedQty,
        };
      }),
    });
  }, [open, kind, data, form]);

  const lines = Form.useWatch("lines", form) || [];

  const submit = async () => {
    const v = await form.validateFields();

    onSubmit({
      billDate: v.billDate.format("YYYY-MM-DD"),
      qtyBasisSelected: v.qtyBasisSelected,
      qtyBasisLocked: v.qtyBasisLocked,

      plattsBaseDate: v.plattsBaseDate?.format("YYYY-MM-DD"),
      plattsDaysBefore: v.plattsDaysBefore ?? 5,
      plattsDaysAfter: v.plattsDaysAfter ?? 5,

      mopsAvgUsdPerBbl: v.mopsAvgUsdPerBbl,
      premiumUsdPerBbl: v.premiumUsdPerBbl,

      fxRateDate: v.fxRateDate?.format("YYYY-MM-DD"),
      fxStage: v.fxStage,
      fxRate: v.fxRate,

      envTaxAmountVnd: v.envTaxAmountVnd,
      vatAmountVnd: v.vatAmountVnd,
      note: v.note?.trim() || undefined,

      lines: (v.lines || []).map((x) => ({
        purchaseOrderLineId: x.purchaseOrderLineId,
        qtyActual: Number(x.qtyActual || 0),
        qtyV15: Number(x.qtyV15 || 0),
        note: x.note?.trim() || undefined,
      })),
    });
  };

  return (
    <Modal
      open={open}
      title={titleMap[kind]}
      width={980}
      onCancel={onCancel}
      onOk={submit}
      okText="Lưu bảng giá"
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <Form.Item
            name="billDate"
            label="Ngày bảng giá"
            rules={[{ required: true, message: "Chọn ngày bảng giá" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="qtyBasisSelected"
            label="Cơ sở số lượng"
            rules={[{ required: true }]}
          >
            <Radio.Group
              options={[
                { label: "Thực nhận", value: "ACTUAL" },
                { label: "V15", value: "V15" },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>

          <Form.Item name="plattsBaseDate" label="Ngày mốc Platts">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="premiumUsdPerBbl" label="Premium">
            <InputNumber
              style={{ width: "100%" }}
              addonAfter="USD/bbl"
              disabled={kind === "ESTIMATE"}
            />
          </Form.Item>

          <Form.Item name="plattsDaysBefore" label="Số ngày lùi">
            <InputNumber min={0} max={30} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="plattsDaysAfter" label="Số ngày tiến">
            <InputNumber min={0} max={30} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="mopsAvgUsdPerBbl" label="Giá TB thủ công">
            <InputNumber style={{ width: "100%" }} addonAfter="USD/bbl" />
          </Form.Item>

          <Form.Item name="fxRate" label="Tỷ giá">
            <InputNumber style={{ width: "100%" }} addonAfter="VND/USD" />
          </Form.Item>

          <Form.Item name="fxRateDate" label="Ngày tỷ giá">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="fxStage" label="Loại tỷ giá">
            <Select
              options={[
                { value: "ESTIMATE", label: "Tạm tính" },
                { value: "OFFICIAL", label: "Chính thức" },
              ]}
            />
          </Form.Item>

          <Form.Item name="envTaxAmountVnd" label="Thuế BVMT">
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
          </Form.Item>

          <Form.Item name="vatAmountVnd" label="VAT">
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
          </Form.Item>
        </div>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Table
          size="small"
          bordered
          rowKey="purchaseOrderLineId"
          pagination={false}
          dataSource={data.lines.map((line, index) => ({
            ...line,
            formIndex: index,
          }))}
          columns={[
            {
              title: "Sản phẩm",
              dataIndex: "productName",
              width: 220,
            },
            {
              title: "Kho",
              dataIndex: "supplierLocationName",
              width: 200,
              render: (v) => v || "--",
            },
            {
              title: "Qty thực",
              width: 160,
              render: (_, row: any) => (
                <Form.Item name={["lines", row.formIndex, "qtyActual"]} noStyle>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    addonAfter="L"
                  />
                </Form.Item>
              ),
            },
            {
              title: "Qty V15",
              width: 160,
              render: (_, row: any) => (
                <Form.Item name={["lines", row.formIndex, "qtyV15"]} noStyle>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    addonAfter="L"
                  />
                </Form.Item>
              ),
            },
            {
              title: "Ghi chú",
              render: (_, row: any) => (
                <Form.Item name={["lines", row.formIndex, "note"]} noStyle>
                  <Input />
                </Form.Item>
              ),
            },
          ]}
        />

        <div style={{ display: "none" }}>
          {lines.map((_, index) => (
            <Form.Item
              key={index}
              name={["lines", index, "purchaseOrderLineId"]}
            >
              <Input />
            </Form.Item>
          ))}
        </div>
      </Form>
    </Modal>
  );
}
