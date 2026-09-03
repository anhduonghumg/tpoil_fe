import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useVatRatesSelect } from "../../tax-rates/hooks";
import { SalesOrdersApi } from "../../sales/api";
import { useSalesOrderDetail } from "../../sales/hooks";
import { notify } from "../../../shared/lib/notification";
import { PurchasesApi } from "../api";
import {
  useActivePurchaseContract,
  useCreatePurchaseOrder,
  usePriceRegionsSelect,
  usePurchaseOrderDetail,
  useSupplierLocationsSelect,
  useUpdatePurchaseOrder,
} from "../hooks";
import type { UpsertPurchaseOrderPayload } from "../types";
import { useQuery } from "@tanstack/react-query";
import { SupplierLocationsApi } from "../../supplierLocations/api";
import { decodeWarehouseSource, WarehouseSourceSelect } from "../../supplierLocations/ui/WarehouseSourceSelect";
import "../../commercial-lots/commercial-lots.css";
import "../retail-purchase.css";

type LineForm = {
  key: string;
  productId?: string;
  receivingScope?: string;
  orderedQty?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxRate?: number;
  taxRateConfigId?: string;
  releaseCode?: "TP" | "NCC";
  isTaxAuto?: boolean;
  isPriceAuto?: boolean;
};

type FormValues = {
  orderDate: dayjs.Dayjs;
  expectedDate?: dayjs.Dayjs;
  supplierCustomerId: string;
  customerPartyId?: string;
  priceRegionCode: string;
  paymentMode: "PREPAID" | "POSTPAID";
  releaseCode: "TP" | "NCC";
  paymentTermDays?: number;
  note?: string;
  lines: LineForm[];
};

const emptyLine = (): LineForm => ({
  key: `${Date.now()}-${Math.random()}`,
  orderedQty: 0,
  discountAmount: 0,
  taxRate: 10,
});

const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

export default function RetailPurchaseCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  // Set when purchasing starts from a customer order: prefill lines and link on save.
  const salesOrderId = searchParams.get("salesOrderId") ?? undefined;
  const salesOrderQuery = useSalesOrderDetail(salesOrderId);
  const [form] = Form.useForm<FormValues>();
  const [initialLine] = useState(emptyLine);
  const [lineRows, setLineRows] = useState<LineForm[]>([initialLine]);
  const [productKeyword, setProductKeyword] = useState("");
  const [regionKeyword, setRegionKeyword] = useState("");

  const supplierId = Form.useWatch("supplierCustomerId", form);
  const orderDate = Form.useWatch("orderDate", form);
  const priceRegionCode = Form.useWatch("priceRegionCode", form) ?? "VUNG_I";
  const paymentMode = Form.useWatch("paymentMode", form);
  const lines = Form.useWatch("lines", form) ?? [initialLine];

  const productsQuery = useProductSelect(productKeyword);
  const regionsQuery = usePriceRegionsSelect(regionKeyword);
  const vatRatesQuery = useVatRatesSelect();
  const currentVatRate = (vatRatesQuery.data ?? []).find((rate) => rate.isDefault);
  const warehousesQuery = useSupplierLocationsSelect(supplierId, "");
  const areasQuery = useQuery({
    queryKey: ["supplierLocations", "areas", "active"],
    queryFn: () => SupplierLocationsApi.areas(true),
  });
  const selectableAreas = (areasQuery.data ?? []).filter((area) =>
    (warehousesQuery.data ?? []).some((warehouse) => warehouse.areaId === area.id),
  );
  const contractQuery = useActivePurchaseContract(
    supplierId,
    orderDate?.format("YYYY-MM-DD"),
  );

  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder(id);
  const detailQuery = usePurchaseOrderDetail(id);
  const lastQuoteKeyRef = useRef("");

  const contract = contractQuery.data;
  const hasValidContract =
    contract?.code === "CONTRACT_OK" || contract?.code === "CONTRACT_EXPIRING_SOON";

  useEffect(() => {
    const order = detailQuery.data as any;
    if (!id || !order) return;
    const loadedLines = (order.lines ?? []).map((line: any) => ({
      key: line.id,
      productId: line.productId,
      receivingScope: line.receivingWarehouse?.id
        ? `warehouse:${line.receivingWarehouse.id}`
        : line.plannedReceivingArea?.id
          ? `area:${line.plannedReceivingArea.id}`
          : undefined,
      orderedQty: Number(line.orderedQty),
      unitPrice: line.unitPrice == null ? undefined : Number(line.unitPrice),
      discountAmount: Number(line.discountAmount ?? 0),
      taxRate: Number(line.taxRate ?? 0),
      releaseCode: order.releaseCode ?? undefined,
    }));
    setLineRows(loadedLines);
    form.setFieldsValue({
      supplierCustomerId: order.supplier?.id ?? order.supplierCustomerId,
      orderDate: dayjs(order.orderDate),
      expectedDate: order.expectedDate ? dayjs(order.expectedDate) : undefined,
      paymentMode: order.paymentMode,
      releaseCode: order.releaseCode ?? undefined,
      note: order.note,
      lines: loadedLines,
    });
  }, [detailQuery.data, form, id]);

  useEffect(() => {
    const salesOrder = salesOrderQuery.data;
    if (id || !salesOrder?.lines?.length) return;
    const loadedLines = salesOrder.lines.map((line) => ({
      key: line.id,
      productId: line.productId,
      receivingScope: line.receivingWarehouse?.id
        ? `warehouse:${line.receivingWarehouse.id}`
        : undefined,
      orderedQty: Number(line.orderedActualQty),
      discountAmount: 0,
      taxRate: 10,
    }));
    setLineRows(loadedLines);
    form.setFieldsValue({
      orderDate: dayjs(salesOrder.orderDate),
      note: salesOrder.note ?? undefined,
      lines: loadedLines,
    });
  }, [salesOrderQuery.data, form, id]);

  const totalAmount = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.orderedQty ?? 0);
        const price = Number(line.unitPrice ?? 0);
        const discount = Number(line.discountAmount ?? 0);
        const taxRate = Number(line.taxRate ?? 0);
        const net = qty * Math.max(price - discount, 0);
        return sum + net * (1 + taxRate / 100);
      }, 0),
    [lines],
  );

  const quoteProductIds = useMemo(
    () => Array.from(new Set(lines.map((line) => line.productId).filter(Boolean))) as string[],
    [lines],
  );
  const quoteDate = orderDate?.format("YYYY-MM-DD");
  const quoteKey = useMemo(
    () =>
      quoteDate && quoteProductIds.length
        ? `${priceRegionCode}|${quoteDate}|${quoteProductIds.sort().join(",")}`
        : "",
    [priceRegionCode, quoteDate, quoteProductIds],
  );

  useEffect(() => {
    if (!quoteKey || quoteKey === lastQuoteKeyRef.current) return;
    lastQuoteKeyRef.current = quoteKey;
    let cancelled = false;

    PurchasesApi.quoteBatch({
      productIds: quoteProductIds,
      regionCode: priceRegionCode,
      onDate: quoteDate,
    })
      .then((result: any) => {
        if (cancelled) return;
        const priceByProduct = new Map(
          result.items.map((item: any) => [
            item.productId,
            item.price == null ? null : Number(item.price),
          ]),
        );
        const currentLines = form.getFieldValue("lines") ?? [];
        const nextLines = currentLines.map((line: LineForm) => {
          const price = line.productId ? priceByProduct.get(line.productId) : null;
          if (price == null || !Number.isFinite(price) || line.isPriceAuto === false) return line;
          return { ...line, unitPrice: price, isPriceAuto: true };
        });
        form.setFieldsValue({ lines: nextLines });
      })
      .catch(() => {
        // The price remains editable when no published price bulletin is available.
      });

    return () => {
      cancelled = true;
    };
  }, [form, priceRegionCode, quoteDate, quoteKey, quoteProductIds]);

  const updateLine = (index: number, patch: Partial<LineForm>) => {
    const currentLines = form.getFieldValue("lines") ?? [];
    form.setFieldsValue({
      lines: currentLines.map((line: LineForm, lineIndex: number) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    });
  };

  const syncReleaseCode = (releaseCode: "TP" | "NCC") => {
    const currentLines = form.getFieldValue("lines") ?? [];
    form.setFieldsValue({
      releaseCode,
      lines: currentLines.map((line: LineForm) => ({ ...line, releaseCode })),
    });
  };

  useEffect(() => {
    const vatRates = vatRatesQuery.data ?? [];
    if (!vatRates.length) return;
    const currentLines = form.getFieldValue("lines") ?? [];
    const nextLines = currentLines.map((line: LineForm) => {
      if (line.isTaxAuto === false) return line;
      const matched =
        currentVatRate ??
        vatRates.find(
          (rate) => !rate.isExempt && Number(rate.rate) === Number(line.taxRate ?? 0),
        );
      const matchedRate = matched?.isExempt ? 0 : Number(matched?.rate ?? 0);
      if (
        matched &&
        line.taxRateConfigId === matched.id &&
        Number(line.taxRate ?? 0) === matchedRate
      ) {
        return line;
      }
      return matched
        ? { ...line, taxRateConfigId: matched.id, taxRate: matchedRate, isTaxAuto: true }
        : line;
    });
    if (nextLines.some((line: LineForm, index: number) => line !== currentLines[index])) {
      form.setFieldsValue({ lines: nextLines });
    }
  }, [currentVatRate, form, lines, vatRatesQuery.data]);

  const addLine = () => {
    const nextLine = { ...emptyLine(), releaseCode: form.getFieldValue("releaseCode") };
    const currentLines = form.getFieldValue("lines") ?? [];
    form.setFieldsValue({ lines: [...currentLines, nextLine] });
    setLineRows((current) => [...current, nextLine]);
  };

  const removeLine = (index: number) => {
    const currentLines = form.getFieldValue("lines") ?? [];
    if (currentLines.length <= 1) return;
    form.setFieldsValue({
      lines: currentLines.filter((_: LineForm, lineIndex: number) => lineIndex !== index),
    });
    setLineRows((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const columns: ColumnsType<LineForm> = [
    {
      title: "Mặt hàng",
      dataIndex: "productId",
      width: 250,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "productId"]}
          rules={[{ required: true, message: "Chọn mặt hàng" }]}
          noStyle
        >
          <Select
            size="small"
            showSearch
            filterOption={false}
            placeholder="Chọn mặt hàng"
            loading={productsQuery.isFetching}
            onSearch={setProductKeyword}
            options={(productsQuery.data ?? []).map((product) => ({
              value: product.id,
              label: `${product.code} - ${product.name}`,
            }))}
            onChange={(productId) =>
              updateLine(index, { productId, unitPrice: undefined, isPriceAuto: true })
            }
          />
        </Form.Item>
      ),
    },
    {
      title: "Kho nhận",
      dataIndex: "receivingScope",
      width: 185,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "receivingScope"]}
          rules={[{ required: true, message: "Chọn kho nhận" }]}
          noStyle
        >
          <WarehouseSourceSelect
            size="small"
            disabled={!supplierId}
            loading={warehousesQuery.isFetching}
            placeholder="Chọn kho nhận"
            areas={selectableAreas}
            warehouses={warehousesQuery.data ?? []}
          />
        </Form.Item>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "orderedQty",
      width: 115,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "orderedQty"]}
          rules={[{ required: true, type: "number", min: 0.001 }]}
          noStyle
        >
          <InputNumber size="small" min={0.001} precision={3} controls={false} placeholder="0" />
        </Form.Item>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 135,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "unitPrice"]} noStyle>
          <InputNumber
            size="small"
            min={0}
            controls={false}
            placeholder="0"
            onChange={(unitPrice) =>
              updateLine(index, {
                unitPrice: unitPrice == null ? undefined : Number(unitPrice),
                isPriceAuto: false,
              })
            }
          />
        </Form.Item>
      ),
    },
    {
      title: "CK/đv",
      dataIndex: "discountAmount",
      width: 125,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "discountAmount"]} noStyle>
          <InputNumber size="small" min={0} controls={false} placeholder="0" />
        </Form.Item>
      ),
    },
    {
      title: "Thuế",
      dataIndex: "taxRateConfigId",
      width: 85,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "taxRateConfigId"]} noStyle>
          <Select
            size="small"
            loading={vatRatesQuery.isFetching}
            placeholder="Chọn thuế"
            options={(vatRatesQuery.data ?? []).map((rate) => ({
              value: rate.id,
              label: rate.name,
            }))}
            onChange={(taxRateConfigId) => {
              const selected = (vatRatesQuery.data ?? []).find(
                (rate) => rate.id === taxRateConfigId,
              );
              updateLine(index, {
                taxRateConfigId,
                taxRate: selected?.isExempt ? 0 : Number(selected?.rate ?? 0),
                isTaxAuto: false,
              });
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Mã rút",
      key: "releaseCode",
      width: 85,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "releaseCode"]}
          rules={[{ required: true, message: "Chọn TP hoặc NCC" }]}
          noStyle
        >
          <Select
            size="small"
            placeholder="TP/NCC"
            onChange={(value) => syncReleaseCode(value as "TP" | "NCC")}
            options={[
              { value: "TP", label: "TP" },
              { value: "NCC", label: "NCC" },
            ]}
          />
        </Form.Item>
      ),
    },
    {
      title: "",
      key: "action",
      width: 44,
      render: (_, __, index) => (
        <Button
          danger
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          title="Xóa dòng"
          disabled={lineRows.length === 1}
          onClick={() => removeLine(index)}
        />
      ),
    },
  ];

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (!hasValidContract) return;
      const termDays =
        values.paymentMode === "POSTPAID" ? Number(values.paymentTermDays ?? 7) : 0;

      const payload: UpsertPurchaseOrderPayload = {
        orderNo: "AUTO",
        supplierCustomerId: values.supplierCustomerId,
        orderType: "SINGLE",
        paymentMode: values.paymentMode,
        releaseCode: values.lines[0]?.releaseCode ?? values.releaseCode,
        priceRegionCode,
        orderDate: values.orderDate.format("YYYY-MM-DD"),
        expectedDate: values.expectedDate?.format("YYYY-MM-DD") ?? null,
        paymentTermType: values.paymentMode === "POSTPAID" ? "NET_DAYS" : "SAME_DAY",
        paymentTermDays: values.paymentMode === "POSTPAID" ? termDays : null,
        totalAmount,
        note: values.note?.trim() || null,
        paymentPlans:
          values.paymentMode === "POSTPAID"
            ? [
                {
                  dueDate: values.orderDate.add(termDays, "day").format("YYYY-MM-DD"),
                  amount: totalAmount,
                },
              ]
            : [],
        lines: values.lines.map((line) => {
          const receiving = decodeWarehouseSource(
            line.receivingScope!,
            (warehousesQuery.data ?? []) as any,
          );
          return {
            productId: line.productId!,
            supplierLocationId: receiving?.warehouseId,
            plannedReceivingAreaId: receiving?.warehouseId ? undefined : receiving?.areaId,
            orderedQty: Number(line.orderedQty),
            unitPrice: line.unitPrice == null ? null : Number(line.unitPrice),
            discountAmount: Number(line.discountAmount ?? 0),
            taxRate: line.taxRate == null ? null : Number(line.taxRate),
          };
        }),
      } as UpsertPurchaseOrderPayload;

      const result: any = id
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      const savedOrderId = result?.po?.id ?? result?.id ?? id;

      if (savedOrderId && salesOrderId) {
        // Started from a customer order: link the two instead of creating a new one.
        try {
          await SalesOrdersApi.attachPurchaseOrder(salesOrderId, savedOrderId);
          notify.success("Đã gắn đơn mua với đơn đặt hàng của khách");
        } catch {
          notify.warning("Đã lưu đơn mua nhưng chưa gắn được với đơn đặt hàng.");
        }
      } else if (savedOrderId && values.customerPartyId) {
        // Entering the customer here creates the sales order in the same step, so the
        // retail flow only needs the data once.
        try {
          await SalesOrdersApi.createFromPurchaseOrder(savedOrderId, {
            customerPartyId: values.customerPartyId,
          });
          notify.success("Đã tạo kèm đơn đặt hàng của khách");
        } catch {
          notify.warning(
            "Đã lưu đơn mua nhưng chưa tạo được đơn đặt hàng. Bạn có thể tạo lại ở màn chi tiết.",
          );
        }
      }

      navigate(savedOrderId ? `/purchase-orders/${savedOrderId}` : "/commercial-purchases/retail");
    } catch (error) {
      console.error("Error saving retail purchase order:", error);
    }
  };

  return (
    <div className="commercial-lot-page">
      <div className="commercial-lot-header">
        <Space align="start">
          <Button
            size="small"
            icon={<ArrowLeftOutlined />}
            title="Quay lại"
            onClick={() => navigate("/commercial-purchases/retail")}
          />
          <div>
            <Typography.Title level={3} className="commercial-lot-title">
              {id ? "Sửa đơn mua thương mại lẻ" : "Tạo đơn mua thương mại lẻ"}
            </Typography.Title>
          </div>
        </Space>
      </div>

      <Form<FormValues>
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          orderDate: dayjs(),
          paymentMode: "PREPAID",
          paymentTermDays: 7,
          priceRegionCode: "VUNG_I",
          lines: [initialLine],
        }}
      >
        <div className="commercial-lot-form-band">
          <div className="commercial-lot-form-grid">
            <Form.Item
              className="commercial-lot-field-order-date"
              name="orderDate"
              label="Ngày đặt hàng"
              rules={[{ required: true, message: "Chọn ngày đặt hàng" }]}
            >
              <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              className="commercial-lot-field-expected-date"
              name="expectedDate"
              label="Ngày nhận dự kiến"
            >
              <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              className="commercial-lot-field-region"
              name="priceRegionCode"
              label="Vùng giá"
              rules={[{ required: true, message: "Chọn vùng giá" }]}
            >
              <Select
                size="small"
                showSearch
                filterOption={false}
                loading={regionsQuery.isFetching}
                placeholder="Chọn vùng"
                onSearch={setRegionKeyword}
                options={(regionsQuery.data ?? []).map((region) => ({
                  value: region.code,
                  label: `${region.name} (${region.code})`,
                }))}
              />
            </Form.Item>

            <Form.Item
              className="commercial-lot-field-supplier"
              name="supplierCustomerId"
              label="Nhà cung cấp"
              rules={[{ required: true, message: "Chọn nhà cung cấp" }]}
            >
              <PartySelect
                partyRole="SUPPLIER"
                placeholder="Chọn nhà cung cấp"
                onChange={(value) => {
                  const currentLines = form.getFieldValue("lines") ?? [];
                  form.setFieldValue("supplierCustomerId", value);
                  form.setFieldsValue({
                    lines: currentLines.map((line: LineForm) => ({
                      ...line,
                      receivingScope: undefined,
                    })),
                  });
                }}
              />
            </Form.Item>

            <Form.Item
              className="commercial-lot-field-contract"
              label="Hợp đồng mua"
            >
              {!supplierId ? (
                <div className="commercial-lot-contract-state is-empty">
                  Chọn nhà cung cấp trước
                </div>
              ) : contractQuery.isFetching ? (
                <div className="commercial-lot-contract-state is-loading">
                  <LoadingOutlined />
                  <span>Đang kiểm tra hợp đồng...</span>
                </div>
              ) : contract ? (
                <div
                  className={`commercial-lot-contract-state ${
                    hasValidContract ? "is-valid" : "is-invalid"
                  }`}
                  title={contract.message}
                >
                  {hasValidContract ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
                  <span>
                    {hasValidContract
                      ? `${contract.contractCode} · đến ${dayjs(contract.endDate).format(
                          "DD/MM/YYYY",
                        )}`
                      : contract.message}
                  </span>
                </div>
              ) : (
                <div className="commercial-lot-contract-state is-invalid">
                  <ExclamationCircleFilled />
                  <span>Không có hợp đồng mua còn hiệu lực</span>
                </div>
              )}
            </Form.Item>

            {!id && !salesOrderId ? (
              <Form.Item
                className="commercial-lot-field-customer"
                name="customerPartyId"
                label="Khách hàng đặt (kinh doanh)"
                tooltip="Nhập khách đặt hàng để tạo luôn đơn bán, khỏi nhập lại lần hai"
              >
                <PartySelect
                  partyRole="SELLABLE"
                  displayMode="code"
                  placeholder="Chọn khách hàng đặt (nếu có)"
                />
              </Form.Item>
            ) : null}
            {salesOrderId && salesOrderQuery.data ? (
              <Form.Item className="commercial-lot-field-customer" label="Đơn khách đặt">
                <div className="commercial-lot-contract-state is-valid">
                  <CheckCircleFilled />
                  <span>
                    {salesOrderQuery.data.orderNo} · {salesOrderQuery.data.customer?.name}
                  </span>
                </div>
              </Form.Item>
            ) : null}

            <Form.Item
              className="commercial-lot-field-payment"
              name="paymentMode"
              label="Điều kiện thanh toán"
              rules={[{ required: true }]}
            >
              <Radio.Group size="small">
                <Radio.Button value="PREPAID">Trong ngày</Radio.Button>
                <Radio.Button value="POSTPAID">Trả chậm</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {paymentMode === "POSTPAID" ? (
              <Form.Item
                className="commercial-lot-field-term-days"
                name="paymentTermDays"
                label="Số ngày thanh toán"
                rules={[{ required: true, type: "number", min: 1 }]}
              >
                <InputNumber size="small" min={1} max={365} style={{ width: "100%" }} />
              </Form.Item>
            ) : (
              <div className="commercial-lot-field-term-days" />
            )}
            <Form.Item className="commercial-lot-field-note" name="note" label="Ghi chú">
              <Input size="small" placeholder="Thông tin cần lưu ý" />
            </Form.Item>
          </div>
        </div>

        <div className="commercial-lot-section">
          <div className="commercial-lot-section-title">
            <Typography.Title level={5} style={{ margin: 0 }}>
              Hàng hóa
            </Typography.Title>
            <Button size="small" icon={<PlusOutlined />} htmlType="button" onClick={addLine}>
              Thêm dòng
            </Button>
          </div>
          <Table<LineForm>
            className="commercial-lot-lines"
            rowKey="key"
            size="small"
            pagination={false}
            tableLayout="fixed"
            columns={columns}
            dataSource={lineRows}
            footer={() => (
              <div style={{ textAlign: "right" }}>
                <Typography.Text type="secondary">Tổng dự kiến: </Typography.Text>
                <Typography.Text strong>{formatMoney(totalAmount)} đ</Typography.Text>
              </div>
            )}
          />
        </div>
        <div className="commercial-lot-footer">
          <Button size="small" onClick={() => navigate("/commercial-purchases/retail")}>
            Hủy
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!hasValidContract}
            onClick={submit}
          >
            Lưu đơn
          </Button>
        </div>
      </Form>
    </div>
  );
}
