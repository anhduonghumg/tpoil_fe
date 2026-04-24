import React, { useMemo } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { useCreateTermPurchaseOrder } from "../hooks";
import type {
  CreateTermPurchaseOrderLinePayload,
  CreateTermPurchaseOrderPayload,
} from "../types";

const { Text } = Typography;

type LineRow = CreateTermPurchaseOrderLinePayload & {
  key: string;
  productName?: string;
  supplierLocationName?: string;
};

type FormValues = {
  supplierCustomerId: string;
  supplierLocationId?: string;
  orderType: "SINGLE" | "LOT";
  paymentMode: "PREPAID" | "POSTPAID";
  paymentTermType?: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number;
  orderDate: Dayjs;
  expectedDate?: Dayjs;
  contractNo?: string;
  deliveryLocation?: string;
  note?: string;
  lines: LineRow[];
};

function newLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    productId: "",
    supplierLocationId: undefined,
    orderedQty: 0,
    unitPrice: undefined,
    taxRate: undefined,
    discountAmount: 0,
  };
}

function money(n?: number | null) {
  if (n == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(Math.round(Number(n || 0)));
}

function number(n?: number | null) {
  if (n == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

export default function PurchaseTermCreatePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateTermPurchaseOrder();

  const lines = Form.useWatch("lines", form) || [];
  const paymentMode = Form.useWatch("paymentMode", form);

  const summary = useMemo(() => {
    const totalQty = lines.reduce(
      (sum, x) => sum + Number(x?.orderedQty || 0),
      0,
    );
    const totalAmount = lines.reduce((sum, x) => {
      const qty = Number(x?.orderedQty || 0);
      const price = Number(x?.unitPrice || 0);
      const discount = Number(x?.discountAmount || 0);
      return sum + qty * price - discount;
    }, 0);

    return { totalQty, totalAmount };
  }, [lines]);

  const setLines = (next: LineRow[]) => form.setFieldValue("lines", next);

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    const current = form.getFieldValue("lines") || [];
    setLines(
      current.map((line: LineRow) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    );
  };

  const addLine = () => {
    const current = form.getFieldValue("lines") || [];
    setLines([...current, newLine()]);
  };

  const removeLine = (key: string) => {
    const current = form.getFieldValue("lines") || [];
    if (current.length <= 1) {
      message.warning("Đơn TERM cần ít nhất 1 dòng hàng");
      return;
    }
    setLines(current.filter((line: LineRow) => line.key !== key));
  };

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue({
      orderType: "SINGLE",
      paymentMode: "PREPAID",
      paymentTermType: "SAME_DAY",
      orderDate: dayjs(),
      lines: [newLine()],
    });
  };

  const validateBeforeSubmit = (values: FormValues) => {
    const validLines = (values.lines || []).filter(
      (x) => x.productId && Number(x.orderedQty || 0) > 0,
    );

    if (!validLines.length) {
      throw new Error("Vui lòng nhập ít nhất 1 dòng hàng hợp lệ");
    }

    if (
      values.paymentMode === "POSTPAID" &&
      values.paymentTermType === "NET_DAYS"
    ) {
      if (!values.paymentTermDays || Number(values.paymentTermDays) <= 0) {
        throw new Error("Vui lòng nhập số ngày công nợ");
      }
    }

    return validLines;
  };

  const onFinish = async (values: FormValues) => {
    try {
      const validLines = validateBeforeSubmit(values);

      const payload: CreateTermPurchaseOrderPayload = {
        supplierCustomerId: values.supplierCustomerId,
        supplierLocationId: values.supplierLocationId || undefined,
        orderType: values.orderType,
        paymentMode: values.paymentMode,
        paymentTermType: values.paymentTermType,
        paymentTermDays: values.paymentTermDays,
        orderDate: values.orderDate.format("YYYY-MM-DD"),
        expectedDate: values.expectedDate?.format("YYYY-MM-DD"),
        contractNo: values.contractNo?.trim() || undefined,
        deliveryLocation: values.deliveryLocation?.trim() || undefined,
        note: values.note?.trim() || undefined,
        lines: validLines.map((x) => ({
          productId: x.productId,
          supplierLocationId:
            x.supplierLocationId || values.supplierLocationId || undefined,
          orderedQty: Number(x.orderedQty || 0),
          unitPrice: x.unitPrice == null ? undefined : Number(x.unitPrice),
          taxRate: x.taxRate == null ? undefined : Number(x.taxRate),
          discountAmount: Number(x.discountAmount || 0),
        })),
      };

      const created = await createMutation.mutateAsync(payload);
      navigate(`/purchase-term/${created.id}`);
    } catch (err: any) {
      message.error(err?.message || "Không thể tạo đơn TERM");
    }
  };

  const columns: ColumnsType<LineRow> = [
    {
      title: "MẶT HÀNG",
      dataIndex: "productId",
      width: 230,
      render: (_, record) => (
        <Input
          value={record.productId}
          placeholder="productId"
          onChange={(e) =>
            updateLine(record.key, { productId: e.target.value })
          }
        />
      ),
    },
    {
      title: "KHO NCC",
      dataIndex: "supplierLocationId",
      width: 220,
      render: (_, record) => (
        <Input
          value={record.supplierLocationId}
          placeholder="Theo kho mặc định nếu bỏ trống"
          onChange={(e) =>
            updateLine(record.key, {
              supplierLocationId: e.target.value || undefined,
            })
          }
        />
      ),
    },
    {
      title: "SL ĐẶT",
      dataIndex: "orderedQty",
      width: 130,
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.orderedQty}
          style={{ width: "100%" }}
          onChange={(v) =>
            updateLine(record.key, { orderedQty: Number(v || 0) })
          }
        />
      ),
    },
    {
      title: "ĐƠN GIÁ TẠM",
      dataIndex: "unitPrice",
      width: 150,
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.unitPrice}
          style={{ width: "100%" }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => Number((v || "").replace(/,/g, "")) as any}
          onChange={(v) =>
            updateLine(record.key, {
              unitPrice: v == null ? undefined : Number(v),
            })
          }
        />
      ),
    },
    {
      title: "VAT %",
      dataIndex: "taxRate",
      width: 100,
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          max={100}
          value={record.taxRate}
          style={{ width: "100%" }}
          onChange={(v) =>
            updateLine(record.key, {
              taxRate: v == null ? undefined : Number(v),
            })
          }
        />
      ),
    },
    {
      title: "CK",
      dataIndex: "discountAmount",
      width: 130,
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.discountAmount}
          style={{ width: "100%" }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => Number((v || "").replace(/,/g, "")) as any}
          onChange={(v) =>
            updateLine(record.key, { discountAmount: Number(v || 0) })
          }
        />
      ),
    },
    {
      title: "THÀNH TIỀN",
      width: 150,
      align: "right",
      render: (_, record) => {
        const amount =
          Number(record.orderedQty || 0) * Number(record.unitPrice || 0) -
          Number(record.discountAmount || 0);
        return <Text strong>{money(amount)}</Text>;
      },
    },
    {
      title: "",
      width: 70,
      align: "center",
      render: (_, record) => (
        <Button danger type="link" onClick={() => removeLine(record.key)}>
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        height: "100%",
        background: "#fff",
        border: "1px solid #e6edf5",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #eef2f7",
          flex: "0 0 auto",
        }}
      >
        <Space size={10}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/purchase-term")}
          >
            Quay lại
          </Button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              Tạo đơn TERM
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Nhập đơn mua TERM theo hướng vận hành trước, kế toán xử lý sau
            </div>
          </div>
        </Space>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetForm}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={createMutation.isPending}
            onClick={() => form.submit()}
          >
            Lưu đơn
          </Button>
        </Space>
      </div>

      <div style={{ padding: 14, overflow: "auto", flex: "1 1 auto" }}>
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            orderType: "SINGLE",
            paymentMode: "PREPAID",
            paymentTermType: "SAME_DAY",
            orderDate: dayjs(),
            lines: [newLine()],
          }}
        >
          <div
            style={{
              border: "1px solid #eef2f7",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 10 }}>
              Thông tin chung
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <Form.Item
                label="Nhà cung cấp"
                name="supplierCustomerId"
                rules={[{ required: true, message: "Chọn nhà cung cấp" }]}
              >
                <Input placeholder="supplierCustomerId" />
              </Form.Item>

              <Form.Item label="Kho NCC mặc định" name="supplierLocationId">
                <Input placeholder="supplierLocationId" />
              </Form.Item>

              <Form.Item
                label="Loại đơn"
                name="orderType"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: "Đơn lẻ", value: "SINGLE" },
                    { label: "Đơn lô", value: "LOT" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Thanh toán"
                name="paymentMode"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: "Trả trước", value: "PREPAID" },
                    { label: "Trả sau", value: "POSTPAID" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Ngày đơn"
                name="orderDate"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item label="Ngày dự kiến" name="expectedDate">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item label="Số hợp đồng" name="contractNo">
                <Input placeholder="Tự lấy từ cấu hình NCC nếu để trống" />
              </Form.Item>

              <Form.Item label="Địa điểm giao hàng" name="deliveryLocation">
                <Input placeholder="Tự lấy từ cấu hình NCC nếu để trống" />
              </Form.Item>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #eef2f7",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Điều khoản</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <Form.Item label="Loại hạn thanh toán" name="paymentTermType">
                <Select
                  options={[
                    { label: "Trong ngày", value: "SAME_DAY" },
                    { label: "Công nợ theo ngày", value: "NET_DAYS" },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Số ngày công nợ" name="paymentTermDays">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  disabled={paymentMode !== "POSTPAID"}
                />
              </Form.Item>

              <Form.Item
                label="Ghi chú"
                name="note"
                style={{ gridColumn: "span 2" }}
              >
                <Input placeholder="Ghi chú ngắn cho đơn hàng" />
              </Form.Item>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #eef2f7",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 44,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #eef2f7",
                background: "#fbfdff",
              }}
            >
              <div style={{ fontWeight: 600 }}>Dòng hàng</div>
              <Button size="small" icon={<PlusOutlined />} onClick={addLine}>
                Thêm dòng
              </Button>
            </div>

            <Table
              rowKey="key"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={lines}
              scroll={{ x: 1220 }}
            />

            <div
              style={{
                padding: "10px 12px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 28,
                borderTop: "1px solid #eef2f7",
                background: "#fff",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Tổng SL: </span>
                <b>{number(summary.totalQty)}</b>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Tổng tiền tạm: </span>
                <b>{money(summary.totalAmount)}</b>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
