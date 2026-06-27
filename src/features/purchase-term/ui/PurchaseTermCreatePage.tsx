import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";

import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useSupplierLocationsSelect } from "../../purchases/hooks";
import { TermPurchaseOrdersApi } from "../api";
import { useCreateTermPurchaseOrder, useValidateTermPurchaseContract } from "../hooks";
import type {
  CreateTermPricingPayload,
  CreateTermPurchaseOrderPayload,
  TermTransportMode,
  UUID,
} from "../types";

const { Text, Title } = Typography;

type TermLineForm = {
  productId?: UUID;
  supplierLocationId?: UUID;
  orderedQty?: number;
  taxRate?: number;
};

type PriceDayForm = {
  quoteDate?: Dayjs;
  priceUsdPerBbl?: number;
};

type FormValues = {
  sheetTitle?: string;
  estimateLabel?: string;
  billNo?: string;
  supplierCustomerId?: UUID;
  supplierLocationId?: UUID;
  orderDate?: Dayjs;
  expectedDate?: Dayjs;
  transportMode?: TermTransportMode;
  deliveryLocation?: string;
  contractNote?: string;
  paymentNote?: string;
  note?: string;

  lines?: TermLineForm[];

  billDate?: Dayjs;
  plattsBaseDate?: Dayjs;
  qtyBasisSelected?: "ACTUAL" | "V15";
  priceDays?: PriceDayForm[];
  mopsAvgUsdPerBbl?: number;
  premiumUsdPerBbl?: number;
  specialConsumptionTaxUsdPerBbl?: number;
  fxRateDate?: Dayjs;
  fxRate?: number;
  billBarrelQty?: number;
  tankQtyLiter?: number;
  insuranceRate?: number;
  inspectionFeeVnd?: number;
  transportFeeVnd?: number;
  storageFeeVnd?: number;
  transportDeductionVnd?: number;
  transportLossRate?: number;
  envTaxVndPerLiter?: number;
  extraCostVndPerLiter?: number;
  accruedCostVndPerLiter?: number;
  contractPaymentRate?: number;
  bankGuaranteeRate?: number;
  pricingNote?: string;
};

type CreatedTermDetail = {
  id: UUID;
  lines?: Array<{ id: UUID; orderedQty?: number | null }>;
};

function toDate(value?: Dayjs) {
  return value ? value.format("YYYY-MM-DD") : undefined;
}

function cleanNumber(value?: number | null) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function fmt(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(Number(value));
}

function averagePriceDays(days?: PriceDayForm[]) {
  const prices = (days || [])
    .map((item) => cleanNumber(item?.priceUsdPerBbl))
    .filter((value): value is number => value !== undefined);

  if (!prices.length) return undefined;
  return prices.reduce((sum, value) => sum + value, 0) / prices.length;
}

function calculatePreview(values?: FormValues) {
  const lines = values?.lines || [];
  const qtyFromLines = lines.reduce((sum, line) => sum + Number(line?.orderedQty || 0), 0);
  const qty = cleanNumber(values?.tankQtyLiter) ?? qtyFromLines;
  const mops = cleanNumber(values?.mopsAvgUsdPerBbl) ?? averagePriceDays(values?.priceDays) ?? 0;
  const premium = cleanNumber(values?.premiumUsdPerBbl) ?? 0;
  const specialTax = cleanNumber(values?.specialConsumptionTaxUsdPerBbl) ?? 0;
  const fxRate = cleanNumber(values?.fxRate) ?? 0;
  const envTax = cleanNumber(values?.envTaxVndPerLiter) ?? 0;
  const extraCost = cleanNumber(values?.extraCostVndPerLiter) ?? 0;
  const accruedCost = cleanNumber(values?.accruedCostVndPerLiter) ?? 0;
  const insuranceRate = cleanNumber(values?.insuranceRate) ?? 0;
  const transportLossRate = cleanNumber(values?.transportLossRate) ?? 0;
  const inspectionFeeVnd = cleanNumber(values?.inspectionFeeVnd) ?? 0;
  const transportFeeVnd = cleanNumber(values?.transportFeeVnd) ?? 0;
  const storageFeeVnd = cleanNumber(values?.storageFeeVnd) ?? 0;
  const transportDeductionVnd = cleanNumber(values?.transportDeductionVnd) ?? 0;
  const vatRate = Number(lines[0]?.taxRate ?? 8) / 100;

  const fobUsdPerBbl = mops + premium + specialTax;
  const billBarrelQty = cleanNumber(values?.billBarrelQty) ?? (qty ? qty / 159 : 0);
  const amountUsd = fobUsdPerBbl * billBarrelQty;
  const amountVnd = amountUsd * fxRate;
  const baseVndPerLiter = fxRate ? (fobUsdPerBbl * fxRate) / 159 : 0;
  const insuranceAmount = amountVnd * insuranceRate;
  const lossAmount = amountVnd * transportLossRate;
  const billTotal = amountVnd + insuranceAmount + inspectionFeeVnd + transportFeeVnd + storageFeeVnd + lossAmount - transportDeductionVnd;
  const unitAverage = qty ? billTotal / qty : 0;
  const unitBeforeVat = unitAverage + envTax + extraCost + accruedCost;
  const amountBeforeVat = unitBeforeVat * qty;
  const vatAmount = amountBeforeVat * vatRate;
  const totalAmount = amountBeforeVat + vatAmount;
  const contractPaymentRate = cleanNumber(values?.contractPaymentRate) ?? 100;
  const contractPaymentAmount = amountBeforeVat * contractPaymentRate / 100;
  const bankGuaranteeRate = cleanNumber(values?.bankGuaranteeRate) ?? 0;
  const bankGuaranteeFee = amountBeforeVat * bankGuaranteeRate / 100;

  return {
    qty,
    mops,
    premium,
    fobUsdPerBbl,
    billBarrelQty,
    amountUsd,
    amountVnd,
    insuranceAmount,
    inspectionFeeVnd,
    transportFeeVnd,
    storageFeeVnd,
    lossAmount,
    transportDeductionVnd,
    billTotal,
    unitAverage,
    fxRate,
    unitBeforeVat,
    amountBeforeVat,
    vatAmount,
    totalAmount,
    contractPaymentRate,
    contractPaymentAmount,
    bankGuaranteeRate,
    bankGuaranteeFee,
    vatRate,
  };
}

function buildEstimatePayload(values: FormValues, created: CreatedTermDetail): CreateTermPricingPayload {
  if (!created.lines?.length) {
    throw new Error("TERM_LINES_NOT_FOUND_AFTER_CREATE");
  }

  const priceDays = (values.priceDays || [])
    .filter((item) => item?.quoteDate && cleanNumber(item.priceUsdPerBbl) !== undefined)
    .map((item) => ({
      quoteDate: toDate(item.quoteDate)!,
      priceUsdPerBbl: Number(item.priceUsdPerBbl),
    }));

  return {
    billDate: toDate(values.billDate) ?? toDate(values.orderDate)!,
    qtyBasisSelected: values.qtyBasisSelected ?? "V15",
    qtyBasisLocked: false,
    plattsBaseDate: toDate(values.plattsBaseDate) ?? toDate(values.priceDays?.[0]?.quoteDate) ?? toDate(values.orderDate),
    plattsDaysBefore: 11,
    plattsDaysAfter: 0,
    priceDays,
    mopsAvgUsdPerBbl: cleanNumber(values.mopsAvgUsdPerBbl) ?? averagePriceDays(values.priceDays),
    premiumUsdPerBbl: cleanNumber(values.premiumUsdPerBbl),
    specialConsumptionTaxUsdPerBbl: cleanNumber(values.specialConsumptionTaxUsdPerBbl),
    fxRateDate: toDate(values.fxRateDate) ?? toDate(values.orderDate),
    fxStage: "ESTIMATE",
    fxRate: cleanNumber(values.fxRate),
    billBarrelQty: cleanNumber(values.billBarrelQty),
    tankQtyLiter: cleanNumber(values.tankQtyLiter),
    insuranceRate: cleanNumber(values.insuranceRate),
    inspectionFeeVnd: cleanNumber(values.inspectionFeeVnd),
    transportFeeVnd: cleanNumber(values.transportFeeVnd),
    storageFeeVnd: cleanNumber(values.storageFeeVnd),
    transportLossRate: cleanNumber(values.transportLossRate),
    envTaxVndPerLiter: cleanNumber(values.envTaxVndPerLiter),
    extraCostVndPerLiter: cleanNumber(values.extraCostVndPerLiter),
    contractPaymentRate: cleanNumber(values.contractPaymentRate),
    bankGuaranteeRate: cleanNumber(values.bankGuaranteeRate),
    note: values.pricingNote?.trim() || undefined,
    lines: created.lines.map((line) => {
      const qty = Number(line.orderedQty || 0);
      return {
        purchaseOrderLineId: line.id,
        qtyActual: qty,
        qtyV15: qty,
      };
    }),
  };
}

function SheetRow({
  label,
  unit,
  note,
  children,
  strong,
}: {
  label: React.ReactNode;
  unit?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <tr>
      <td className={strong ? "term-sheet-label strong" : "term-sheet-label"}>{label}</td>
      <td className="term-sheet-unit">{unit}</td>
      <td className={strong ? "term-sheet-value strong" : "term-sheet-value"}>{children}</td>
      <td className="term-sheet-note">{note}</td>
    </tr>
  );
}

function SheetText({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: 25, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{children}</div>;
}

function RateAmountInput({ name, amount }: { name: keyof FormValues; amount: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", gap: 6, alignItems: "center" }}>
      <Form.Item name={name} noStyle>
        <InputNumber min={0} style={{ width: "100%" }} precision={6} />
      </Form.Item>
      <div style={{ textAlign: "right", fontWeight: 700 }}>{fmt(amount)}</div>
    </div>
  );
}

export default function TermPurchaseOrderCreatePage() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [locKeyword, setLocKeyword] = useState("");
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [fetchingPlatts, setFetchingPlatts] = useState(false);
  const [fetchingFx, setFetchingFx] = useState(false);
  const [showPlattsRows, setShowPlattsRows] = useState(false);
  const [showCostRows, setShowCostRows] = useState(false);

  const supplierCustomerId = Form.useWatch("supplierCustomerId", form);
  const orderDate = Form.useWatch("orderDate", form);
  const watched = Form.useWatch([], form) as FormValues | undefined;

  const createMutation = useCreateTermPurchaseOrder();
  const contractValidationQuery = useValidateTermPurchaseContract({
    supplierCustomerId,
    orderDate: toDate(orderDate),
  });
  const contractValidation = contractValidationQuery.data;
  const contractInvalid = !!supplierCustomerId && contractValidation?.valid === false;
  const contractLoading = !!supplierCustomerId && contractValidationQuery.isFetching;

  const productsQuery = useProductSelect("");
  const locQuery = useSupplierLocationsSelect(supplierCustomerId, locKeyword);

  const productOptions = useMemo(
    () =>
      (productsQuery.data ?? []).map((product: any) => ({
        value: product.id,
        label: product.code ? `${product.code} - ${product.name}` : product.name,
      })),
    [productsQuery.data],
  );

  const locationOptions = useMemo(
    () =>
      (locQuery.data ?? []).map((location: any) => ({
        value: location.id,
        label: location.label ?? location.name ?? location.code ?? location.id,
      })),
    [locQuery.data],
  );

  const preview = useMemo(() => calculatePreview(watched), [watched]);

  const fetchLast10Platts = async () => {
    const productId = form.getFieldValue(["lines", 0, "productId"]);
    const baseDate: Dayjs | undefined = form.getFieldValue("plattsBaseDate") || form.getFieldValue("billDate") || form.getFieldValue("orderDate");

    if (!productId) {
      message.warning("Chọn sản phẩm trước khi lấy giá Platts.");
      return;
    }

    if (!baseDate) {
      message.warning("Chọn ngày mốc Platts.");
      return;
    }

    setFetchingPlatts(true);
    try {
      const res = await TermPurchaseOrdersApi.getPlattsAverage({
        productId,
        baseDate: baseDate.format("YYYY-MM-DD"),
        limit: 11,
      });

      const items = (res?.items || []).map((item: any) => ({
        quoteDate: dayjs(item.quoteDate),
        priceUsdPerBbl: Number(item.priceUsdPerBbl),
      }));

      if (!items.length) {
        message.warning("Không tìm thấy giá Platts trước ngày đã chọn.");
        return;
      }

      form.setFieldsValue({
        priceDays: items,
        mopsAvgUsdPerBbl: Number(res?.avgPriceUsdPerBbl || averagePriceDays(items)),
      });

      message.success(`Đã lấy ${items.length} ngày giá Platts gần nhất.`);
    } catch (error) {
      console.error(error);
      message.error("Lấy giá Platts thất bại.");
    } finally {
      setFetchingPlatts(false);
    }
  };

  const fetchVcbFxRate = async () => {
    const fxRateDate: Dayjs | undefined = form.getFieldValue("fxRateDate") || form.getFieldValue("billDate") || form.getFieldValue("orderDate");

    if (!fxRateDate) {
      message.warning("Chọn ngày tỷ giá.");
      return;
    }

    setFetchingFx(true);
    try {
      const res = await TermPurchaseOrdersApi.getVcbFxRate({
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
        message.warning("Không có tỷ giá VCB cho ngày đã chọn.");
        return;
      }

      form.setFieldsValue({ fxRate: rate });
      message.success("Đã lấy tỷ giá VCB.");
    } catch (error) {
      console.error(error);
      message.error("Lấy tỷ giá VCB thất bại.");
    } finally {
      setFetchingFx(false);
    }
  };

  const initialValues: FormValues = {
    orderDate: dayjs(),
    expectedDate: dayjs().add(1, "day"),
    billDate: dayjs(),
    plattsBaseDate: dayjs(),
    qtyBasisSelected: "V15",
    fxRateDate: dayjs(),
    specialConsumptionTaxUsdPerBbl: 0,
    insuranceRate: 0,
    transportLossRate: 0,
    envTaxVndPerLiter: 0,
    extraCostVndPerLiter: 0,
    inspectionFeeVnd: 0,
    transportFeeVnd: 0,
    storageFeeVnd: 0,
    transportDeductionVnd: 0,
    accruedCostVndPerLiter: 0,
    contractPaymentRate: 100,
    bankGuaranteeRate: 0,
    transportMode: "PIPELINE",
    priceDays: Array.from({ length: 11 }).map((_, index) => ({
      quoteDate: dayjs().subtract(10 - index, "day"),
    })),
    lines: [
      {
        taxRate: 8,
      },
    ],
  };

  const onFinish = async (values: FormValues) => {
    if (contractValidation?.valid === false) {
      message.error(contractValidation.message || "Nhà cung cấp chưa có hợp đồng mua hàng TERM hợp lệ");
      return;
    }

    const line = values.lines?.[0];
    if (!line?.productId || !cleanNumber(line.orderedQty)) {
      message.error("Cần chọn sản phẩm và nhập sản lượng tạm tính.");
      return;
    }

    const previewAtSubmit = calculatePreview(values);
    const payload: CreateTermPurchaseOrderPayload = {
      supplierCustomerId: values.supplierCustomerId!,
      supplierLocationId: values.supplierLocationId,
      orderDate: toDate(values.orderDate)!,
      expectedDate: toDate(values.expectedDate),
      transportMode: values.transportMode,
      deliveryLocation: values.deliveryLocation?.trim() || undefined,
      paymentNote: values.paymentNote?.trim() || undefined,
      note: values.note?.trim() || undefined,
      billInfo: {
        premium: cleanNumber(values.premiumUsdPerBbl),
      },
      lines: [
        {
          productId: line.productId,
          supplierLocationId: line.supplierLocationId || values.supplierLocationId,
          orderedQty: Number(line.orderedQty),
          unitPrice: previewAtSubmit.unitBeforeVat || undefined,
          taxRate: cleanNumber(line.taxRate) ?? 8,
          discountAmount: 0,
        },
      ],
    };

    setSavingEstimate(true);
    let result: Awaited<ReturnType<typeof createMutation.mutateAsync>> | null = null;

    try {
      result = await createMutation.mutateAsync(payload);
      const createdDetail = (result as any).lines?.length ? (result as any) : await TermPurchaseOrdersApi.detail(result.id);

      await TermPurchaseOrdersApi.createEstimatePricing(result.id, buildEstimatePayload(values, createdDetail));

      message.success("Đã tạo hồ sơ TERM và bảng giá tạm tính.");
      navigate(`/purchase-terms/${result.id}`);
    } catch (error) {
      console.error(error);

      if (result?.id) {
        message.warning("Đã tạo hồ sơ TERM, nhưng bảng giá tạm tính chưa lưu được. Vui lòng kiểm tra lại.");
        navigate(`/purchase-terms/${result.id}?step=estimate`);
      }
    } finally {
      setSavingEstimate(false);
    }
  };

  return (
    <div style={{ height: "calc(100vh - 96px)", overflow: "auto", background: "#f6f8fb", padding: 10 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <Form<FormValues> form={form} layout="vertical" size="small" initialValues={initialValues} onFinish={onFinish}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>Bảng giá tạm tính TERM</Title>
              <Text type="secondary">Nhập hồ sơ theo đúng bố cục bảng giá tạm tính, sau khi lưu hệ thống tự tạo hồ sơ TERM.</Text>
            </div>
            <Space>
              <Button onClick={() => navigate(-1)}>Quay lại</Button>
              <Button type="primary" loading={createMutation.isPending || savingEstimate} disabled={contractInvalid || contractLoading || savingEstimate} onClick={() => form.submit()}>
                Lưu bảng giá tạm tính
              </Button>
            </Space>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 10, alignItems: "start" }}>
            <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
              <div className="term-sheet-title">BẢNG GIÁ TẠM TÍNH</div>
              <table className="term-sheet">
                <colgroup>
                  <col style={{ width: "44%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "27%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Nội dung</th>
                    <th>Đơn vị tính</th>
                    <th>Giá trị</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  <SheetRow label="Nhà cung cấp" note={contractLoading ? "Đang kiểm tra" : undefined}>
                    <Form.Item name="supplierCustomerId" rules={[{ required: true, message: "Chọn nhà cung cấp" }]} noStyle>
                      <PartySelect
                        partyRole="SUPPLIER"
                        placeholder="Chọn nhà cung cấp"
                        onChange={(value) => {
                          form.setFieldsValue({
                            supplierCustomerId: value || undefined,
                            supplierLocationId: undefined,
                            lines: [{ ...(form.getFieldValue(["lines", 0]) || {}), supplierLocationId: undefined }],
                          });
                          setLocKeyword("");
                        }}
                      />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Ngày giao nhận hàng dự kiến" note={<Form.Item name="contractNote" noStyle><Input placeholder="Laycan..." /></Form.Item>}>
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item name="orderDate" rules={[{ required: true, message: "Chọn ngày hồ sơ" }]} noStyle>
                        <DatePicker style={{ width: "50%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                      <Form.Item name="expectedDate" noStyle>
                        <DatePicker style={{ width: "50%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                    </Space.Compact>
                  </SheetRow>

                  <SheetRow label="Hình thức nhận hàng">
                    <Form.Item name="transportMode" rules={[{ required: true }]} noStyle>
                      <Select
                        options={[
                          { value: "PIPELINE", label: "Đường ống" },
                          { value: "SEA", label: "Đường biển" },
                        ]}
                      />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Kho đến">
                    <Form.Item name="supplierLocationId" noStyle>
                      <Select
                        showSearch
                        allowClear
                        disabled={!supplierCustomerId}
                        placeholder={supplierCustomerId ? "Chọn kho nhận" : "Chọn NCC trước"}
                        filterOption={false}
                        onSearch={setLocKeyword}
                        loading={locQuery.isLoading}
                        options={locationOptions}
                        onChange={(value) => {
                          const currentLine = form.getFieldValue(["lines", 0]) || {};
                          form.setFieldsValue({
                            supplierLocationId: value,
                            lines: [{ ...currentLine, supplierLocationId: currentLine.supplierLocationId || value }],
                          });
                        }}
                      />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Sản phẩm">
                    <Form.Item name={["lines", 0, "productId"]} rules={[{ required: true, message: "Chọn sản phẩm" }]} noStyle>
                      <Select showSearch placeholder="Chọn sản phẩm" optionFilterProp="label" loading={productsQuery.isLoading} options={productOptions} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Ngày" strong>
                    <SheetText>Giá Platts</SheetText>
                  </SheetRow>

                  <SheetRow label="Ngày mốc Platts">
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item name="plattsBaseDate" noStyle>
                        <DatePicker style={{ width: "55%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                      <Button loading={fetchingPlatts} onClick={fetchLast10Platts} style={{ width: "45%" }}>
                        Lấy 11 ngày
                      </Button>
                    </Space.Compact>
                  </SheetRow>
                  <SheetRow
                    label={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span>Giá Platts</span>
                        <Button size="small" type="link" onClick={() => setShowPlattsRows((value) => !value)}>
                          {showPlattsRows ? "Ẩn" : "Mở 11 ngày"}
                        </Button>
                      </div>
                    }
                    strong
                  >
                    <SheetText>{preview.mops ? `TB ${fmt(preview.mops, 3)}` : "Chưa có giá"}</SheetText>
                  </SheetRow>

                  {showPlattsRows
                    ? Array.from({ length: 11 }).map((_, index) => (
                        <SheetRow
                          key={index}
                          label={
                            <Form.Item name={["priceDays", index, "quoteDate"]} noStyle>
                              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                            </Form.Item>
                          }
                        >
                          <Form.Item name={["priceDays", index, "priceUsdPerBbl"]} noStyle>
                            <InputNumber min={0} style={{ width: "100%" }} precision={3} />
                          </Form.Item>
                        </SheetRow>
                      ))
                    : null}

                  <SheetRow label="Giá trung bình MOPS" unit="USD/thùng">
                    <Form.Item name="mopsAvgUsdPerBbl" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} precision={3} placeholder={preview.mops ? fmt(preview.mops, 3) : "Tự tính từ Platts"} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Premium" unit="USD/thùng">
                    <Form.Item name="premiumUsdPerBbl" noStyle>
                      <InputNumber style={{ width: "100%" }} precision={3} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="FOB" unit="USD/thùng" strong>
                    <SheetText>{fmt(preview.fobUsdPerBbl, 3)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Đơn giá thùng" unit="USD/thùng" strong>
                    <SheetText>{fmt(preview.fobUsdPerBbl, 3)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Số thùng BILL" unit="thùng">
                    <Form.Item name="billBarrelQty" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} precision={3} placeholder={preview.billBarrelQty ? fmt(preview.billBarrelQty, 3) : undefined} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Số tiền thanh toán" unit="USD">
                    <SheetText>{fmt(preview.amountUsd, 3)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Số lượng lít thực tế giao nhận tạm tính" unit="Lít">
                    <Form.Item name={["lines", 0, "orderedQty"]} rules={[{ required: true, message: "Nhập sản lượng" }]} noStyle>
                      <InputNumber min={0.001} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Số lượng thùng giao nhận tạm tính" unit="Thùng">
                    <SheetText>{fmt(preview.qty / 159, 3)}</SheetText>
                  </SheetRow>

                                    <SheetRow
                    label={
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span>Tỷ giá tạm tính</span>
                        <Button size="small" loading={fetchingFx} onClick={fetchVcbFxRate}>
                          Lấy VCB
                        </Button>
                      </div>
                    }
                    unit="VND/USD"
                  >
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item name="fxRateDate" noStyle>
                        <DatePicker style={{ width: "50%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                      <Form.Item name="fxRate" noStyle>
                        <InputNumber min={0} style={{ width: "50%" }} />
                      </Form.Item>
                    </Space.Compact>
                  </SheetRow>

                  <SheetRow label="Số tiền thanh toán" unit="VND">
                    <SheetText>{fmt(preview.amountVnd)}</SheetText>
                  </SheetRow>

                                    <SheetRow
                    label={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span>Chi phí & điều chỉnh BILL</span>
                        <Button size="small" type="link" onClick={() => setShowCostRows((value) => !value)}>
                          {showCostRows ? "Ẩn" : "Mở chi tiết"}
                        </Button>
                      </div>
                    }
                    unit="VND"
                    strong
                  >
                    <SheetText>{fmt(preview.billTotal - preview.amountVnd)}</SheetText>
                  </SheetRow>

                  {showCostRows ? (
                    <>
<SheetRow label="Bảo hiểm hàng hóa" unit="VND">
                    <RateAmountInput name="insuranceRate" amount={preview.insuranceAmount} />
                  </SheetRow>

                  <SheetRow label="Phí giám định đo" unit="VND">
                    <Form.Item name="inspectionFeeVnd" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Cước vận chuyển" unit="VND">
                    <Form.Item name="transportFeeVnd" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Phí thuê kho" unit="VND">
                    <Form.Item name="storageFeeVnd" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Hao hụt vận chuyển trừ thẳng vào lượng" unit="VND">
                    <RateAmountInput name="transportLossRate" amount={preview.lossAmount} />
                  </SheetRow>

                  <SheetRow label="Trừ cước/chi quỹ" unit="VND">
                    <Form.Item name="transportDeductionVnd" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                                      </>
                  ) : null}

<SheetRow label="Tổng tiền BILL" unit="VND" strong>
                    <SheetText>{fmt(preview.billTotal)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Số lượng bồn" unit="Lít">
                    <SheetText>{fmt(preview.qty)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Đơn giá/Lít TT bồn" unit="VND/lít" strong>
                    <SheetText>{fmt(preview.unitAverage, 3)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Quỹ bình ổn giá" unit="VND">
                    <SheetText>0</SheetText>
                  </SheetRow>

                  <SheetRow label="Thuế môi trường" unit="VND">
                    <Form.Item name="envTaxVndPerLiter" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Chi phí khác" unit="VND">
                    <Form.Item name="extraCostVndPerLiter" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Trích/chi quỹ" unit="VND/lít">
                    <Form.Item name="accruedCostVndPerLiter" noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label="Đơn giá trước VAT" unit="VND" strong>
                    <SheetText>{fmt(preview.unitBeforeVat, 3)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Thành tiền trước thuế VAT" unit="VND" strong>
                    <SheetText>{fmt(preview.amountBeforeVat)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Số lượng nhập" unit="Lít" strong>
                    <Form.Item name="tankQtyLiter" rules={[{ required: true, message: "Nhập số lượng nhập" }]} noStyle>
                      <InputNumber min={0.001} style={{ width: "100%" }} placeholder={preview.qty ? fmt(preview.qty) : undefined} />
                    </Form.Item>
                  </SheetRow>

                  <SheetRow label={<Form.Item name={["lines", 0, "taxRate"]} noStyle><InputNumber min={0} max={100} style={{ width: 80 }} addonAfter="%" /></Form.Item>} unit="VND">
                    <SheetText>{fmt(preview.vatAmount)}</SheetText>
                  </SheetRow>

                  <SheetRow label="Tổng tiền thanh toán tạm tính" unit="VND" strong>
                    <SheetText>{fmt(preview.totalAmount)}</SheetText>
                  </SheetRow>

                  <SheetRow
                    label={
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Giá trị thanh toán trước theo hợp đồng</span>
                        <Form.Item name="contractPaymentRate" noStyle>
                          <InputNumber min={0} max={100} style={{ width: 84 }} precision={3} addonAfter="%" />
                        </Form.Item>
                      </div>
                    }
                    unit="VND"
                    strong
                  >
                    <SheetText>{fmt(preview.contractPaymentAmount)}</SheetText>
                  </SheetRow>

                  <SheetRow
                    label={
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Phí bảo lãnh ngân hàng</span>
                        <Form.Item name="bankGuaranteeRate" noStyle>
                          <InputNumber min={0} style={{ width: 84 }} precision={3} addonAfter="%" />
                        </Form.Item>
                      </div>
                    }
                    unit="VND"
                    strong
                  >
                    <SheetText>{fmt(preview.bankGuaranteeFee)}</SheetText>
                  </SheetRow>
                </tbody>
              </table>

              <div style={{ marginTop: 8 }}>
                <Form.Item name="pricingNote" label="Ghi chú bảng giá" style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={2} />
                </Form.Item>
              </div>
            </Card>

            <Space direction="vertical" size={8} style={{ width: "100%", position: "sticky", top: 8 }}>
              <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Tóm tắt</div>
                <div className="term-summary-row"><span>Số lượng nhập</span><b>{fmt(preview.qty)} L</b></div>
                <div className="term-summary-row"><span>MOPS bình quân</span><b>{fmt(preview.mops, 3)}</b></div>
                <div className="term-summary-row"><span>FOB</span><b>{fmt(preview.fobUsdPerBbl, 3)}</b></div>
                <div className="term-summary-row"><span>Đơn giá</span><b>{fmt(preview.unitBeforeVat, 3)}</b></div>
                <div className="term-summary-row total"><span>Tạm thanh toán</span><b>{fmt(preview.totalAmount)}</b></div>
                <div style={{ marginTop: 10 }}>
                  <Tag color="blue">TERM</Tag>
                  <Tag color="gold">Bảng giá tạm tính</Tag>
                </div>
              </Card>

              {supplierCustomerId ? (
                <Alert
                  type={contractValidation?.valid ? "success" : contractInvalid ? "error" : "info"}
                  showIcon
                  message={
                    contractValidation?.valid
                      ? `Hợp đồng áp dụng: ${contractValidation.contract.code}`
                      : contractInvalid
                        ? contractValidation.message
                        : "Đang kiểm tra hợp đồng mua hàng TERM"
                  }
                  description={
                    contractValidation?.valid
                      ? `Hiệu lực: ${dayjs(contractValidation.contract.startDate).format("DD/MM/YYYY")} - ${dayjs(contractValidation.contract.endDate).format("DD/MM/YYYY")}`
                      : undefined
                  }
                />
              ) : null}

              <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
                <Form.Item name="paymentNote" label="Điều khoản thanh toán">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name="note" label="Ghi chú nội bộ" style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Card>
            </Space>
          </div>
        </Form>
      </div>

      <style>
        {`
          .term-sheet-title {
            text-align: center;
            font-weight: 900;
            font-size: 18px;
            padding: 4px 0 10px;
            letter-spacing: 0;
          }
          .term-sheet {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            background: #fff;
          }
          .term-sheet th,
          .term-sheet td {
            border: 1px solid #1f2937;
            padding: 2px 6px;
            vertical-align: middle;
            height: 31px;
          }
          .term-sheet th {
            text-align: center;
            font-weight: 900;
            background: #f8fafc;
          }
          .term-sheet-label {
            font-weight: 700;
          }
          .term-sheet-label.strong,
          .term-sheet-value.strong {
            font-weight: 900;
          }
          .term-sheet-unit {
            text-align: center;
            color: #334155;
          }
          .term-sheet-value {
            text-align: right;
          }
          .term-sheet-note {
            color: #475569;
          }
          .term-sheet .ant-form-item {
            margin-bottom: 0;
          }
          .term-sheet .ant-picker,
          .term-sheet .ant-select-selector,
          .term-sheet .ant-input,
          .term-sheet .ant-input-number,
          .term-sheet .ant-input-number-input {
            border-radius: 0;
          }
          .term-summary-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px solid #eef2f7;
          }
          .term-summary-row span {
            color: #64748b;
          }
          .term-summary-row.total {
            border-bottom: none;
            font-size: 15px;
          }
        `}
      </style>
    </div>
  );
}
