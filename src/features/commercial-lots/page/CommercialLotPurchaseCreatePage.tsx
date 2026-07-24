import React, { useMemo, useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useSupplierLocationsSelect } from "../../purchases/hooks";
import type { UpsertPurchaseOrderPayload } from "../../purchases/types";
import {
  useActivePurchaseContract,
  useCreateCommercialLot,
} from "../hooks";
import { formatMoney } from "../ui/labels";
import "../commercial-lots.css";

type LineForm = {
  key: string;
  productId?: string;
  orderedQty?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxRate?: number;
};

type FormValues = {
  orderNo: string;
  orderDate: dayjs.Dayjs;
  expectedDate?: dayjs.Dayjs;
  supplierCustomerId: string;
  receivingWarehouseId: string;
  paymentMode: "PREPAID" | "POSTPAID";
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

function defaultOrderNo() {
  return `LO-${dayjs().format("YYYYMMDD-HHmm")}`;
}

export default function CommercialLotPurchaseCreatePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [initialLine] = useState(emptyLine);
  const [productKeyword, setProductKeyword] = useState("");
  const supplierId = Form.useWatch("supplierCustomerId", form);
  const orderDate = Form.useWatch("orderDate", form);
  const paymentMode = Form.useWatch("paymentMode", form);
  const lines = Form.useWatch("lines", form) ?? [initialLine];
  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useSupplierLocationsSelect(supplierId, "");
  const contractQuery = useActivePurchaseContract(
    supplierId,
    orderDate?.format("YYYY-MM-DD"),
  );
  const createMutation = useCreateCommercialLot();
  const contract = contractQuery.data;
  const hasValidContract =
    contract?.code === "CONTRACT_OK" ||
    contract?.code === "CONTRACT_EXPIRING_SOON";

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

  const columns: ColumnsType<LineForm> = [
    {
      title: "Mặt hàng",
      dataIndex: "productId",
      width: 330,
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
          />
        </Form.Item>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "orderedQty",
      width: 160,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "orderedQty"]}
          rules={[{ required: true, type: "number", min: 0.001 }]}
          noStyle
        >
          <InputNumber
            size="small"
            min={0.001}
            precision={3}
            controls={false}
            placeholder="0"
          />
        </Form.Item>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 180,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "unitPrice"]} noStyle>
          <InputNumber size="small" min={0} controls={false} placeholder="0" />
        </Form.Item>
      ),
    },
    {
      title: "Chiết khấu/đv",
      dataIndex: "discountAmount",
      width: 160,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "discountAmount"]} noStyle>
          <InputNumber size="small" min={0} controls={false} placeholder="0" />
        </Form.Item>
      ),
    },
    {
      title: "Thuế",
      dataIndex: "taxRate",
      width: 110,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "taxRate"]} noStyle>
          <InputNumber
            size="small"
            min={0}
            max={100}
            controls={false}
            addonAfter="%"
          />
        </Form.Item>
      ),
    },
    {
      title: "",
      key: "action",
      width: 54,
      render: (_, __, index) => (
        <Button
          danger
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          title="Xóa dòng"
          disabled={lines.length === 1}
          onClick={() => {
            const next = [...lines];
            next.splice(index, 1);
            form.setFieldValue("lines", next);
          }}
        />
      ),
    },
  ];

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (!hasValidContract) return;
      const termDays =
        values.paymentMode === "POSTPAID"
          ? Number(values.paymentTermDays ?? 7)
          : 0;
      const payload: UpsertPurchaseOrderPayload & {
        supplierLocationId?: string;
      } = {
      orderNo: values.orderNo.trim(),
      supplierCustomerId: values.supplierCustomerId,
      supplierLocationId: values.receivingWarehouseId,
      orderType: "LOT",
      paymentMode: values.paymentMode,
      priceRegionCode: "VUNG_I",
      orderDate: values.orderDate.format("YYYY-MM-DD"),
      expectedDate: values.expectedDate?.format("YYYY-MM-DD") ?? null,
      paymentTermType:
        values.paymentMode === "POSTPAID" ? "NET_DAYS" : "SAME_DAY",
      paymentTermDays: values.paymentMode === "POSTPAID" ? termDays : null,
      totalAmount,
      note: values.note?.trim() || null,
      paymentPlans:
        values.paymentMode === "POSTPAID"
          ? [
              {
                dueDate: values.orderDate
                  .add(termDays, "day")
                  .format("YYYY-MM-DD"),
                amount: totalAmount,
              },
            ]
          : [],
      lines: values.lines.map((line) => ({
        productId: line.productId!,
        supplierLocationId: values.receivingWarehouseId,
        orderedQty: Number(line.orderedQty),
        unitPrice: line.unitPrice == null ? null : Number(line.unitPrice),
        discountAmount: Number(line.discountAmount ?? 0),
        taxRate: line.taxRate == null ? null : Number(line.taxRate),
      })),
      };
      const result = await createMutation.mutateAsync(payload);
      const id = result?.po?.id ?? result?.id;
      navigate(id ? `/commercial-purchases/lots/${id}` : "/commercial-purchases/lots");
    } catch {
      // Field errors and API errors are displayed by their owning controls/mutation.
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
            onClick={() => navigate("/commercial-purchases/lots")}
          />
          <div>
            <Typography.Title level={3} className="commercial-lot-title">
              Tạo đơn mua thương mại lô
            </Typography.Title>
          </div>
        </Space>
      </div>

      <Form<FormValues>
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          orderNo: defaultOrderNo(),
          orderDate: dayjs(),
          paymentMode: "PREPAID",
          paymentTermDays: 7,
          lines: [initialLine],
        }}
      >
        <div className="commercial-lot-form-band">
          <div className="commercial-lot-form-grid">
            <Form.Item
              className="commercial-lot-field-order-no"
              name="orderNo"
              label="Số đơn"
              rules={[{ required: true, message: "Nhập số đơn" }]}
            >
              <Input size="small" placeholder="LO-YYYYMMDD-..." />
            </Form.Item>
            <Form.Item
              className="commercial-lot-field-order-date"
              name="orderDate"
              label="Ngày đặt hàng"
              rules={[{ required: true, message: "Chọn ngày đặt hàng" }]}
            >
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              className="commercial-lot-field-expected-date"
              name="expectedDate"
              label="Ngày nhận dự kiến"
            >
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
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
                  form.setFieldValue("supplierCustomerId", value);
                  form.setFieldValue("receivingWarehouseId", undefined);
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
                  {hasValidContract ? (
                    <CheckCircleFilled />
                  ) : (
                    <ExclamationCircleFilled />
                  )}
                  <span>
                    {hasValidContract
                      ? `${contract.contractCode} · đến ${dayjs(contract.endDate).format("DD/MM/YYYY")}`
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
            <Form.Item
              className="commercial-lot-field-warehouse"
              name="receivingWarehouseId"
              label="Kho nhận dự kiến"
              rules={[{ required: true, message: "Chọn kho nhận dự kiến" }]}
            >
              <Select
                size="small"
                showSearch
                disabled={!supplierId}
                loading={warehousesQuery.isFetching}
                placeholder="Chọn kho"
                options={(warehousesQuery.data ?? []).map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.label,
                }))}
              />
            </Form.Item>

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
                <InputNumber
                  size="small"
                  min={1}
                  max={365}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ) : (
              <div className="commercial-lot-field-term-days" />
            )}
            <Form.Item
              className="commercial-lot-field-note"
              name="note"
              label="Ghi chú"
            >
              <Input size="small" placeholder="Thông tin cần lưu ý" />
            </Form.Item>
          </div>
        </div>

        <div className="commercial-lot-section">
          <div className="commercial-lot-section-title">
            <Typography.Title level={5} style={{ margin: 0 }}>
              Hàng hóa
            </Typography.Title>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => form.setFieldValue("lines", [...lines, emptyLine()])}
            >
              Thêm dòng
            </Button>
          </div>
          <Table<LineForm>
            className="commercial-lot-lines"
            rowKey="key"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={lines}
            scroll={{ x: 1000 }}
            footer={() => (
              <div style={{ textAlign: "right" }}>
                <Typography.Text type="secondary">Tổng dự kiến: </Typography.Text>
                <Typography.Text strong>
                  {formatMoney(totalAmount)} đ
                </Typography.Text>
              </div>
            )}
          />
        </div>

        <div className="commercial-lot-footer">
          <Button
            size="small"
            onClick={() => navigate("/commercial-purchases/lots")}
          >
            Hủy
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            loading={createMutation.isPending}
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
