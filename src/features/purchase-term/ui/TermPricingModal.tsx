import React, { useEffect } from "react";
import {
  Button,
  ConfigProvider,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
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
  TermPricingStageType,
  TermPurchaseOrderDetail,
} from "../types";
import { useFetchVcbFxRate } from "../hooks";

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
  plattsDaysBefore?: number;
  plattsDaysAfter?: number;

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

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function TermPricingModal({
  open,
  kind,
  data,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const fxMutation = useFetchVcbFxRate();

  const fetchFx = async () => {
    try {
      const res = await fxMutation.mutateAsync();
      form.setFieldValue("fxRate", Number(res.sell || 0));
    } catch (e) {
      console.error(e);
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

    form.setFieldsValue({
      billDate: dayjs(),
      qtyBasisSelected: "V15",

      plattsBaseDate: dayjs(),
      plattsDaysBefore: 5,
      plattsDaysAfter: 5,

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
      retailPriceVndPerLiter: kind === "BOSS_SHEET" ? undefined : undefined,

      costs: [],
    });
  }, [open, kind, data, form]);

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
      plattsDaysBefore: v.plattsDaysBefore ?? 5,
      plattsDaysAfter: v.plattsDaysAfter ?? 5,

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

            <Form.Item name="plattsBaseDate" label="Ngày mốc Platts">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
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

            <Form.Item name="envTaxVndPerLiter" label="Thuế BVMT/lít">
              <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ/L" />
            </Form.Item>

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
            Hệ thống sẽ tự sinh bảng sheet theo Platts, tỷ giá, số lượng và chi
            phí đã nhập.
          </Text>
        </Form>
      </ConfigProvider>
    </Modal>
  );
}
