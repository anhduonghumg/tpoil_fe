import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
  Divider,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import type {
  PriceRegionOption,
  PurchaseOrderType,
  PurchasePaymentMode,
  UpsertPurchaseOrderPayload,
  UUID,
} from "../types";
import { useCreatePurchaseOrder, usePriceRegionsSelect } from "../hooks";
import PurchaseOrderLinesEditor from "./po/PurchaseOrderLinesEditor";
import PaymentPlanEditor from "./po/PaymentPlanEditor";
import { notify } from "../../../shared/lib/notification";
import { PartySelect } from "../../../shared/ui/PartySelect";

type ProductOption = { id: UUID; name: string; code?: string | null };

export type PurchaseOrderUpsertOverlayProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (poId: string) => void;
  products: ProductOption[];
  onSearchProducts: (keyword: string) => void;
  defaultOrderNo?: string;
};

export default function PurchaseOrderUpsertOverlay(
  props: PurchaseOrderUpsertOverlayProps
) {
  const {
    open,
    onClose,
    onCreated,
    products,
    onSearchProducts,
    defaultOrderNo,
  } = props;

  const [form] = Form.useForm<UpsertPurchaseOrderPayload>();

  const [regionKeyword, setRegionKeyword] = useState("");
  const regionsQuery = usePriceRegionsSelect(regionKeyword);

  const createMut = useCreatePurchaseOrder();

  const regions: PriceRegionOption[] = regionsQuery.data ?? [];

  const regionDefault = useMemo(() => {
    const v1 = regions.find((x) => x.code === "VUNG_I");
    return v1?.code ?? "VUNG_I";
  }, [regions]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      orderNo: defaultOrderNo ?? "",
      orderType: "SINGLE",
      paymentMode: "PREPAID",
      priceRegionCode: regionDefault,
      orderDate: dayjs(),
      expectedDate: null,
      note: null,
      paymentPlans: [],
      lines: [
        {
          productId: "" as any,
          orderedQty: 0,
          unitPrice: null,
          discount: 0,
          taxRate: null,
        },
      ],
      supplierCustomerId: null as any,
    });
  }, [open, regionDefault, defaultOrderNo]);

  const paymentMode = Form.useWatch("paymentMode", form) as
    | PurchasePaymentMode
    | undefined;
  const regionCode = Form.useWatch("priceRegionCode", form) as
    | string
    | undefined;
  const orderDate = Form.useWatch("orderDate", form) as string | undefined;

  const lines = Form.useWatch("lines", form) ?? [];
  const paymentPlans = Form.useWatch("paymentPlans", form) ?? [];

  const canSubmit = useMemo(() => {
    const v = form.getFieldsValue();
    if (!v.orderNo?.trim()) return false;
    if (!v.supplierCustomerId) return false;
    if (!v.priceRegionCode) return false;
    if (!v.orderDate) return false;
    if (!v.lines?.length) return false;

    const hasValidLine = v.lines.some(
      (l) => l.productId && (Number(l.orderedQty) || 0) > 0
    );
    if (!hasValidLine) return false;

    return true;
  }, [form, lines]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const cleanLines = (values.lines || []).filter(
        (l) => l.productId && (Number(l.orderedQty) || 0) > 0
      );

      const payload: UpsertPurchaseOrderPayload = {
        ...values,
        orderNo: values.orderNo.trim(),
        expectedDate: values.expectedDate ?? null,
        note: values.note ?? null,
        lines: cleanLines.map((l) => ({
          productId: l.productId,
          orderedQty: Number(l.orderedQty) || 0,
          unitPrice: l.unitPrice == null ? null : Number(l.unitPrice),
          discount: l.discount == null ? 0 : Number(l.discount),
          taxRate: l.taxRate == null ? null : Number(l.taxRate),
        })),
        paymentPlans: paymentMode === "POSTPAID" ? paymentPlans || [] : [],
      };

      const res = await createMut.mutateAsync(payload);
      const poId = (res as any)?.po?.id ?? (res as any)?.id;
      if (poId) onCreated?.(poId);
      onClose();
    } catch (e: any) {
      if (e?.errorFields) return;
      notify.error("Không tạo được đơn. Vui lòng kiểm tra lại.");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Thêm đơn mua hàng"
      width={1100}
      centered
      okText="Lưu nháp"
      okButtonProps={{ loading: createMut.isPending, disabled: !canSubmit }}
      cancelButtonProps={{ disabled: createMut.isPending }}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.5fr",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <Form.Item
            name="orderNo"
            label="Số đơn"
            rules={[{ required: true, message: "Nhập số đơn" }]}
            style={{ marginBottom: 0 }}
          >
            <Input size="small" placeholder="VD: PO-2026-0001" />
          </Form.Item>

          <Form.Item
            name="supplierCustomerId"
            label="Nhà cung cấp"
            rules={[{ required: true, message: "Chọn nhà cung cấp" }]}
            style={{ marginBottom: 0 }}
          >
            <PartySelect
              partyRole="SUPPLIER"
              placeholder="Chọn nhà cung cấp"
              value={form.getFieldValue("supplierCustomerId")}
              onChange={(v) => form.setFieldValue("supplierCustomerId", v)}
            />
          </Form.Item>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.2fr 1.2fr",
            gap: 10,
            marginBottom: 6,
            alignItems: "end",
          }}
        >
          <Form.Item
            name="priceRegionCode"
            label="Vùng"
            rules={[{ required: true, message: "Chọn vùng" }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              size="small"
              showSearch
              filterOption={false}
              onSearch={setRegionKeyword}
              loading={regionsQuery.isLoading}
              options={regions.map((r) => ({
                value: r.code,
                label: `${r.name} (${r.code})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="orderDate"
            label="Ngày chứng từ"
            rules={[{ required: true, message: "Chọn ngày chứng từ" }]}
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              size="small"
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
            />
          </Form.Item>
          <Form.Item
            name="orderType"
            label="Loại đơn"
            rules={[{ required: true }]}
            style={{ marginBottom: 0 }}
          >
            <Radio.Group size="small">
              <Radio.Button value="SINGLE">Mua lẻ</Radio.Button>
              <Radio.Button value="LOT">Mua lô</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="paymentMode"
            label="Thanh toán"
            rules={[{ required: true }]}
            style={{ marginBottom: 0 }}
          >
            <Radio.Group size="small">
              <Radio.Button value="PREPAID">Trong ngày</Radio.Button>
              <Radio.Button value="POSTPAID">Trả chậm</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </div>
        <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 10 }}>
          <Input.TextArea
            placeholder="Ghi chú cho NCC hoặc nội bộ"
            autoSize={{ minRows: 2, maxRows: 3 }}
          />
        </Form.Item>
        <Divider style={{ margin: "10px 0" }} />

        <Typography.Title level={5} style={{ margin: "0 0 6px 0" }}>
          Hàng hoá
        </Typography.Title>

        <Form.Item name="lines" style={{ marginBottom: 0 }}>
          <PurchaseOrderLinesEditor
            value={lines}
            onChange={(next) => form.setFieldValue("lines", next)}
            regionCode={regionCode || "VUNG_I"}
            onDate={orderDate || dayjs().format("YYYY-MM-DD")}
            products={products}
            onSearchProducts={onSearchProducts}
          />
        </Form.Item>

        {paymentMode === "POSTPAID" && (
          <>
            <Divider style={{ margin: "10px 0" }} />
            <Typography.Title level={5} style={{ margin: "0 0 6px 0" }}>
              Kế hoạch thanh toán
            </Typography.Title>

            <Form.Item name="paymentPlans" style={{ marginBottom: 6 }}>
              <PaymentPlanEditor
                value={paymentPlans}
                onChange={(next) => form.setFieldValue("paymentPlans", next)}
              />
            </Form.Item>

            <Typography.Text type="secondary">
              Bạn có thể để trống và nhập sau. Phần này chủ yếu để in PO gửi nhà
              cung cấp.
            </Typography.Text>
          </>
        )}

        <div style={{ marginTop: 10 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Typography.Text type="secondary">
              Duyệt đơn sẽ thực hiện ở màn chi tiết (Drawer) sau khi tạo.
            </Typography.Text>

            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => {
                const cur = form.getFieldValue("lines") || [];
                form.setFieldValue("lines", [
                  ...cur,
                  {
                    productId: "" as any,
                    orderedQty: 0,
                    unitPrice: null,
                    discount: 0,
                    taxRate: null,
                  },
                ]);
              }}
            >
              + Thêm dòng nhanh
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
