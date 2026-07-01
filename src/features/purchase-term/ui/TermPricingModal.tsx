import React, { useEffect } from "react";
import {
  Button,
  ConfigProvider,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type {
  CreateTermPricingPayload,
  TermPricingCostPayload,
  TermPricingStage,
  TermPricingStageType,
  TermPurchaseOrderDetail,
} from "../types";
import { useFetchEnvironmentTax, useFetchVcbFxRate } from "../hooks";
import { TermPurchaseOrdersApi } from "../api";
import { notify } from "../../../shared/lib/notification";

const { Text } = Typography;

type PricingKind = Extract<
  TermPricingStageType,
  "ESTIMATE" | "BILL_NORMALIZE" | "FINAL" | "BOSS_SHEET"
>;

type FormCost = {
  name?: string;
  amountVnd?: number;
  note?: string;
};

type FormValues = {
  billDate: dayjs.Dayjs;
  qtyBasisSelected: "ACTUAL" | "V15";

  plattsBaseDate?: dayjs.Dayjs;

  mopsAvgUsdPerBbl?: number;
  premiumUsdPerBbl?: number;
  specialConsumptionTaxUsdPerBbl?: number;

  fxRateDate?: dayjs.Dayjs;
  fxRate?: number;

  billBarrelQty?: number;
  tankQtyLiter?: number;

  insuranceRate?: number;
  inspectionFeeVnd?: number;
  transportFeeVnd?: number;
  storageFeeVnd?: number;
  transportLossRate?: number;

  envTaxVndPerLiter?: number;
  extraCostVndPerLiter?: number;
  retailPriceVndPerLiter?: number;

  note?: string;
  costs?: FormCost[];
};

type Props = {
  open: boolean;
  kind: PricingKind;
  data: TermPurchaseOrderDetail;
  initialStage?: TermPricingStage | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermPricingPayload) => void;
};

const titleMap: Record<PricingKind, string> = {
  ESTIMATE: "Tạo bảng giá tạm",
  BILL_NORMALIZE: "Tạo bảng xuất hóa đơn",
  FINAL: "Tạo bảng chính thức",
  BOSS_SHEET: "Tạo bảng sếp",
};

Object.assign(titleMap, {
  ESTIMATE: "Tạo bảng giá tạm tính",
  BILL_NORMALIZE: "Tạo bảng xuất hóa đơn",
  FINAL: "Tạo bảng chính thức",
  BOSS_SHEET: "Tạo bảng sếp",
});

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function formatNumber(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(Number(value));
}

function parseVietnameseNumber(value?: string): number {
  if (!value) return NaN;
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function formatVietnameseNumber(value: number | string | null | undefined, info?: { userTyping: boolean; input: string }): string {
  if (info?.userTyping) return info.input;
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseVietnameseNumber(value) : Number(value);
  if (!Number.isFinite(num)) return "";
  return formatNumber(num, 5);
}

export function TermPricingModal({
  open,
  kind,
  data,
  initialStage,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const fxMutation = useFetchVcbFxRate();
  const envTaxMutation = useFetchEnvironmentTax();

  const fetchFx = async () => {
    try {
      const fxRateDate = form.getFieldValue("fxRateDate");

      if (!fxRateDate) {
        notify.warning("Vui lòng chọn ngày tỷ giá");
        return;
      }

      const res = await fxMutation.mutateAsync({
        date: fxRateDate.format("YYYY-MM-DD"),
        currencyCode: "USD",
      });

      const rate = Number(
        res?.sellRate ??
          res?.sell ??
          res?.rate ??
          res?.data?.sellRate ??
          res?.data?.sell ??
          res?.data?.rate ??
          res?.data?.data?.sellRate ??
          res?.data?.data?.sell ??
          0,
      );

      if (!rate) {
        notify.warning("Không có tỷ giá VCB cho ngày đã chọn");
        return;
      }

      form.setFieldsValue({
        fxRate: rate,
      });
    } catch (e) {
      console.error(e);
      notify.error("Lấy tỷ giá VCB thất bại");
    }
  };

  const fetchEnvironmentTax = async () => {
    try {
      const billDate = form.getFieldValue("billDate");
      const productId = data.lines?.[0]?.productId;

      if (!billDate) {
        notify.warning("Vui lòng chọn ngày bill");
        return;
      }

      if (!productId) {
        notify.warning("Không tìm thấy sản phẩm để lấy phí BVMT");
        return;
      }

      const res = await envTaxMutation.mutateAsync({
        productId,
        date: billDate.format("YYYY-MM-DD"),
      });

      const rawTax =
        res?.taxVndPerLiter ??
        res?.envTaxVndPerLiter ??
        res?.rate ??
        res?.data?.taxVndPerLiter ??
        res?.data?.envTaxVndPerLiter ??
        res?.data?.rate;

      if (rawTax === null || rawTax === undefined || rawTax === "") {
        notify.warning("Không có phí BVMT cho sản phẩm/ngày bill");
        return;
      }

      form.setFieldsValue({
        envTaxVndPerLiter: Number(rawTax),
      });
    } catch (e) {
      console.error(e);
      notify.error("Lấy phí BVMT thất bại");
    }
  };

  const fetchPlattsAverage = async () => {
    try {
      const baseDate = form.getFieldValue("plattsBaseDate");
      const productId = data.lines?.[0]?.productId;

      if (!baseDate) {
        notify.warning("Vui lòng chọn ngày mốc Platts");
        return;
      }

      if (!productId) {
        notify.warning("Không tìm thấy sản phẩm để lấy giá Platts");
        return;
      }

      const res = await TermPurchaseOrdersApi.getPlattsAverage({
        productId,
        baseDate: baseDate.format("YYYY-MM-DD"),
      });

      const avg = Number(
        res?.avgPriceUsdPerBbl ??
          res?.mopsAvgUsdPerBbl ??
          res?.average ??
          res?.avg ??
          0,
      );

      if (!avg) {
        notify.warning("Không có dữ liệu Platts cho khoảng ngày này");
        return;
      }

      form.setFieldsValue({
        mopsAvgUsdPerBbl: avg,
      });
    } catch (e) {
      console.error(e);
      notify.error("Lấy giá trung bình Platts thất bại");
    }
  };

  useEffect(() => {
    if (!open) return;

    const confirmedReceipts =
      data.receipts?.filter((x) => x.status === "CONFIRMED") || [];

    const tankQty =
      confirmedReceipts.reduce(
        (sum, x) => sum + Number(x.standardQtyV15 || x.qty || 0),
        0,
      ) || Number(data.totalQty || 0);

    const defaultValues: Partial<FormValues> = {
      billDate: dayjs(),
      qtyBasisSelected: "V15",

      plattsBaseDate: dayjs(),

      premiumUsdPerBbl: data.premium ?? undefined,
      specialConsumptionTaxUsdPerBbl: 0,

      fxRateDate: dayjs(),

      billBarrelQty: undefined,
      tankQtyLiter: tankQty || undefined,

      insuranceRate: 0.0002,
      inspectionFeeVnd: undefined,
      transportFeeVnd: undefined,
      storageFeeVnd: undefined,
      transportLossRate: 0.0003,

      envTaxVndPerLiter: undefined,
      extraCostVndPerLiter: undefined,
      retailPriceVndPerLiter: undefined,

      costs: [],
    };

    if (!initialStage) {
      form.setFieldsValue(defaultValues);
      return;
    }

    const priceDays = initialStage.priceDays || [];
    const lastPriceDay = priceDays[priceDays.length - 1];

    form.setFieldsValue({
      ...defaultValues,
      billDate: initialStage.fxRateDate ? dayjs(initialStage.fxRateDate) : defaultValues.billDate,
      qtyBasisSelected: "V15",
      plattsBaseDate: lastPriceDay?.priceDate ? dayjs(lastPriceDay.priceDate) : defaultValues.plattsBaseDate,
      mopsAvgUsdPerBbl: initialStage.mopsAvgUsdPerBbl ?? undefined,
      premiumUsdPerBbl: initialStage.premiumUsdPerBbl ?? defaultValues.premiumUsdPerBbl,
      specialConsumptionTaxUsdPerBbl: initialStage.specialConsumptionTaxUsdPerBbl ?? defaultValues.specialConsumptionTaxUsdPerBbl,
      fxRateDate: initialStage.fxRateDate ? dayjs(initialStage.fxRateDate) : defaultValues.fxRateDate,
      fxRate: initialStage.fxRate ?? undefined,
      billBarrelQty: initialStage.billBarrelQty ?? undefined,
      tankQtyLiter: initialStage.tankQtyLiter ?? defaultValues.tankQtyLiter,
      insuranceRate: initialStage.insuranceRate ?? defaultValues.insuranceRate,
      inspectionFeeVnd: initialStage.inspectionFeeVnd ?? undefined,
      transportFeeVnd: initialStage.transportFeeVnd ?? undefined,
      storageFeeVnd: initialStage.storageFeeVnd ?? undefined,
      transportLossRate: initialStage.transportLossRate ?? defaultValues.transportLossRate,
      envTaxVndPerLiter: initialStage.envTaxVndPerLiter ?? undefined,
      extraCostVndPerLiter: initialStage.extraCostVndPerLiter ?? undefined,
      retailPriceVndPerLiter: initialStage.retailPriceVndPerLiter ?? undefined,
      note: initialStage.note ?? undefined,
      costs: (initialStage.costs || []).map((cost) => ({
        name: cost.name || undefined,
        amountVnd: cost.amountVnd ?? undefined,
        note: cost.note || undefined,
      })),
    });
  }, [open, kind, data, form, initialStage]);

  const submit = async () => {
    const v = await form.validateFields();

    const costs: TermPricingCostPayload[] = (v.costs || [])
      .filter((x) => x?.name || x?.amountVnd)
      .map((x, index) => ({
        costType: "OTHER",
        name: x.name?.trim() || `Chi phí khác ${index + 1}`,
        amountVnd: Number(x.amountVnd || 0),
        note: x.note?.trim() || undefined,
        sortOrder: index + 1,
      }));

    const confirmedReceipts =
      data.receipts?.filter((x) => x.status === "CONFIRMED") || [];

    const lines = data.lines.map((line) => {
      const receiptsOfLine = confirmedReceipts.filter(
        (r) => r.purchaseOrderLineId === line.id,
      );

      const qtyActual =
        receiptsOfLine.reduce((sum, r) => sum + Number(r.qty || 0), 0) ||
        Number(line.orderedQty || 0);

      const qtyV15 =
        receiptsOfLine.reduce(
          (sum, r) => sum + Number(r.standardQtyV15 || r.qty || 0),
          0,
        ) || qtyActual;

      return {
        purchaseOrderLineId: line.id,
        qtyActual,
        qtyV15,
      };
    });

    onSubmit({
      billDate: v.billDate.format("YYYY-MM-DD"),
      qtyBasisSelected: v.qtyBasisSelected,
      qtyBasisLocked: kind === "FINAL",

      plattsBaseDate: v.plattsBaseDate?.format("YYYY-MM-DD"),
      plattsDaysBefore: 5,
      plattsDaysAfter: 5,

      mopsAvgUsdPerBbl: toNumber(v.mopsAvgUsdPerBbl),
      premiumUsdPerBbl: toNumber(v.premiumUsdPerBbl),
      specialConsumptionTaxUsdPerBbl: toNumber(
        v.specialConsumptionTaxUsdPerBbl,
      ),

      fxRateDate: v.fxRateDate?.format("YYYY-MM-DD"),
      fxStage:
        kind === "FINAL" || kind === "BOSS_SHEET" ? "OFFICIAL" : "ESTIMATE",
      fxRate: toNumber(v.fxRate),

      billBarrelQty: toNumber(v.billBarrelQty),
      tankQtyLiter: toNumber(v.tankQtyLiter),

      insuranceRate: toNumber(v.insuranceRate),
      inspectionFeeVnd: toNumber(v.inspectionFeeVnd),
      transportFeeVnd: toNumber(v.transportFeeVnd),
      storageFeeVnd: toNumber(v.storageFeeVnd),
      transportLossRate: toNumber(v.transportLossRate),

      envTaxVndPerLiter: toNumber(v.envTaxVndPerLiter),
      extraCostVndPerLiter: toNumber(v.extraCostVndPerLiter),
      retailPriceVndPerLiter: toNumber(v.retailPriceVndPerLiter),

      note: v.note?.trim() || undefined,

      lines,
      costs,
    });
  };

  const costColumns: ColumnsType<FormCost & { index: number }> = [
    {
      title: "Tên chi phí",
      render: (_, row) => (
        <Form.Item name={["costs", row.index, "name"]} noStyle>
          <Input placeholder="VD: phí local, phí cầu cảng..." />
        </Form.Item>
      ),
    },
    {
      title: "Số tiền",
      width: 180,
      render: (_, row) => (
        <Form.Item name={["costs", row.index, "amountVnd"]} noStyle>
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
        </Form.Item>
      ),
    },
    {
      title: "Ghi chú",
      width: 260,
      render: (_, row) => (
        <Form.Item name={["costs", row.index, "note"]} noStyle>
          <Input />
        </Form.Item>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={titleMap[kind]}
      width={1080}
      onCancel={onCancel}
      onOk={submit}
      okText="Tạo bảng"
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnHidden
      centered
    >
      <ConfigProvider
        theme={{
          components: {
            Form: {
              itemMarginBottom: 4,
              verticalLabelPadding: "0 0 2px",
            },
            Divider: {
              marginLG: 12,
            },
          },
        }}
      >
        <Form form={form} layout="vertical" size="small">
          <Divider orientation="left">1. Platts / giá gốc</Divider>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <Form.Item
              name="billDate"
              label="Ngày bill"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>

            <div style={{ display: "grid", gap: 4 }}>
              <Form.Item
                name="plattsBaseDate"
                label="Ngày mốc Platts"
                style={{ marginBottom: 0 }}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Button
                size="small"
                type="link"
                onClick={fetchPlattsAverage}
                style={{
                  padding: 0,
                  height: "auto",
                  justifyContent: "flex-start",
                }}
              >
                Lấy giá TB Platts
              </Button>
            </div>

            <Form.Item name="mopsAvgUsdPerBbl" label="Giá Platts TB">
              <InputNumber style={{ width: "100%" }} addonAfter="USD/bbl" />
            </Form.Item>

            <Form.Item name="premiumUsdPerBbl" label="Premium">
              <InputNumber style={{ width: "100%" }} addonAfter="USD/bbl" />
            </Form.Item>

            <Form.Item name="specialConsumptionTaxUsdPerBbl" label="Thuế TTĐB">
              <InputNumber style={{ width: "100%" }} addonAfter="USD/bbl" />
            </Form.Item>

            <Form.Item name="qtyBasisSelected" label="Cơ sở số lượng">
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: "Thực nhận", value: "ACTUAL" },
                  { label: "V15", value: "V15" },
                ]}
              />
            </Form.Item>
          </div>

          <Divider orientation="left">2. Tỷ giá & số lượng</Divider>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <Form.Item name="fxRateDate" label="Ngày tỷ giá">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>

            <div style={{ display: "grid", gap: 4 }}>
              <Form.Item
                name="fxRate"
                label="Tỷ giá VCB"
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonAfter="VND/USD"
                />
              </Form.Item>

              <Button
                size="small"
                type="link"
                loading={fxMutation.isPending}
                onClick={fetchFx}
                style={{
                  padding: 0,
                  height: "auto",
                  justifyContent: "flex-start",
                }}
              >
                Lấy VCB
              </Button>
            </div>

            <Form.Item name="billBarrelQty" label="Số thùng BILL">
              <InputNumber
                min={0}
                precision={5}
                parser={parseVietnameseNumber}
                formatter={formatVietnameseNumber}
                style={{ width: "100%" }}
                addonAfter="thùng"
              />
            </Form.Item>

            <Form.Item name="tankQtyLiter" label="Số lượng bồn">
              <InputNumber min={0} style={{ width: "100%" }} addonAfter="L" />
            </Form.Item>
          </div>

          <Divider orientation="left">3. Chi phí chuẩn</Divider>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <Form.Item name="insuranceRate" label="Bảo hiểm">
              <InputNumber min={0} step={0.0001} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="inspectionFeeVnd" label="Phí giám định">
              <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
            </Form.Item>

            <Form.Item name="transportFeeVnd" label="Cước vận chuyển">
              <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
            </Form.Item>

            <Form.Item name="storageFeeVnd" label="Phí thuê kho">
              <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
            </Form.Item>

            <Form.Item name="transportLossRate" label="Hao hụt vận chuyển">
              <InputNumber min={0} step={0.0001} style={{ width: "100%" }} />
            </Form.Item>

            <div style={{ display: "grid", gap: 4 }}>
              <Form.Item
                name="envTaxVndPerLiter"
                label="Thuế BVMT/lít"
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonAfter="đ/L"
                />
              </Form.Item>

              <Button
                size="small"
                type="link"
                loading={envTaxMutation.isPending}
                onClick={fetchEnvironmentTax}
                style={{
                  padding: 0,
                  height: "auto",
                  justifyContent: "flex-start",
                }}
              >
                Lấy BVMT
              </Button>
            </div>

            <Form.Item
              name="extraCostVndPerLiter"
              label="Chi phí phát sinh/lít"
            >
              <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ/L" />
            </Form.Item>

            {kind === "BOSS_SHEET" ? (
              <Form.Item name="retailPriceVndPerLiter" label="Giá bán lẻ">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonAfter="đ/L"
                />
              </Form.Item>
            ) : null}
          </div>

          <Divider orientation="left">4. Chi phí phát sinh khác</Divider>

          <Form.List name="costs">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Button onClick={() => add({})}>+ Thêm chi phí</Button>

                <Table
                  size="small"
                  bordered
                  pagination={false}
                  rowKey="index"
                  dataSource={fields.map((_, index) => ({
                    ...(form.getFieldValue(["costs", index]) || {}),
                    index,
                  }))}
                  columns={[
                    ...costColumns,
                    {
                      title: "",
                      width: 80,
                      align: "center",
                      render: (_, row) => (
                        <Button
                          danger
                          size="small"
                          onClick={() => remove(row.index)}
                        >
                          Xóa
                        </Button>
                      ),
                    },
                  ]}
                />
              </Space>
            )}
          </Form.List>

          <Divider orientation="left">5. Ghi chú</Divider>

          <Form.Item name="note">
            <Input.TextArea rows={2} placeholder="Ghi chú bảng giá..." />
          </Form.Item>

          <Text type="secondary">
            Hệ thống sẽ tự lấy giá Platts trung bình mặc định trong khoảng 5
            ngày trước và 5 ngày sau ngày mốc.
          </Text>
        </Form>
      </ConfigProvider>
    </Modal>
  );
}
