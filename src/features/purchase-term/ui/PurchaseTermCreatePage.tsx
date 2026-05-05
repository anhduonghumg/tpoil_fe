import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";

import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useCreateTermPurchaseOrder } from "../hooks";
import { useSupplierLocationsSelect } from "../../purchases/hooks";

import type { CreateTermPurchaseOrderPayload, UUID } from "../types";

const { Title, Text } = Typography;

type TermLineForm = {
  productId?: UUID;
  supplierLocationId?: UUID;
  orderedQty?: number;
  unitPrice?: number;
  taxRate?: number;
  discountAmount?: number;
};

type FormValues = {
  supplierCustomerId: UUID;
  supplierLocationId?: UUID;

  orderDate: Dayjs;
  expectedDate?: Dayjs;

  contractNo?: string;
  deliveryLocation?: string;

  paymentNote?: string;
  note?: string;

  premium?: number;

  lines: TermLineForm[];
};

function toDate(value?: Dayjs) {
  return value ? value.format("YYYY-MM-DD") : undefined;
}

function cleanNumber(value?: number | null) {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function money(value?: number) {
  if (!value) return "0";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export default function TermPurchaseOrderCreatePage() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();

  const [locKeyword, setLocKeyword] = useState("");

  const supplierCustomerId = Form.useWatch("supplierCustomerId", form);
  const lines = Form.useWatch("lines", form) ?? [];
  const premium = Form.useWatch("premium", form);

  const createMutation = useCreateTermPurchaseOrder();
  const productsQuery = useProductSelect("");
  const locQuery = useSupplierLocationsSelect(supplierCustomerId, locKeyword);

  const productOptions = useMemo(
    () =>
      (productsQuery.data ?? []).map((p: any) => ({
        value: p.id,
        label: p.code ? `${p.code} - ${p.name}` : p.name,
      })),
    [productsQuery.data],
  );

  const locationOptions = useMemo(
    () =>
      (locQuery.data ?? []).map((l: any) => ({
        value: l.id,
        label: l.label ?? l.name ?? l.code ?? l.id,
      })),
    [locQuery.data],
  );

  const summary = useMemo(() => {
    const totalQty = lines.reduce(
      (sum: number, line: TermLineForm) => sum + Number(line?.orderedQty || 0),
      0,
    );

    const totalAmount = lines.reduce((sum: number, line: TermLineForm) => {
      const qty = Number(line?.orderedQty || 0);
      const price = Number(line?.unitPrice || 0);
      const discount = Number(line?.discountAmount || 0);
      return sum + qty * price - discount;
    }, 0);

    return {
      totalLine: lines.length,
      totalQty,
      totalAmount,
    };
  }, [lines]);

  const initialValues: Partial<FormValues> = {
    orderDate: dayjs(),
    lines: [
      {
        taxRate: 10,
        discountAmount: 0,
      },
    ],
  };

  const onFinish = async (values: FormValues) => {
    const linesPayload = (values.lines ?? [])
      .filter((line) => line.productId && cleanNumber(line.orderedQty))
      .map((line) => ({
        productId: line.productId!,
        supplierLocationId:
          line.supplierLocationId || values.supplierLocationId,
        orderedQty: Number(line.orderedQty),
        unitPrice: cleanNumber(line.unitPrice),
        taxRate: cleanNumber(line.taxRate),
        discountAmount: cleanNumber(line.discountAmount) ?? 0,
      }));

    if (!linesPayload.length) {
      message.error("Cần ít nhất 1 dòng hàng");
      return;
    }

    const payload: CreateTermPurchaseOrderPayload = {
      bizType: "TERM",
      orderType: "SINGLE",
      supplierCustomerId: values.supplierCustomerId,
      supplierLocationId: values.supplierLocationId,
      orderDate: toDate(values.orderDate)!,
      expectedDate: toDate(values.expectedDate),
      contractNo: values.contractNo?.trim() || undefined,
      deliveryLocation: values.deliveryLocation?.trim() || undefined,
      paymentNote: values.paymentNote?.trim() || undefined,
      note: values.note?.trim() || undefined,
      billInfo: {
        premium: cleanNumber(values.premium),
      },
      lines: linesPayload,
    };

    const result = await createMutation.mutateAsync(payload);

    message.success("Đã tạo đơn TERM");
    navigate(`/purchase-terms/${result.id}`);
  };

  const lineColumns: ColumnsType<any> = [
    {
      title: "Sản phẩm",
      width: 240,
      render: (_, __, index) => (
        <Form.Item
          name={[index, "productId"]}
          rules={[{ required: true, message: "Chọn sản phẩm" }]}
          style={{ margin: 0 }}
        >
          <Select
            showSearch
            placeholder="Chọn sản phẩm"
            optionFilterProp="label"
            loading={productsQuery.isLoading}
            options={productOptions}
          />
        </Form.Item>
      ),
    },
    {
      title: "Kho nhận hàng",
      width: 220,
      render: (_, __, index) => (
        <Form.Item name={[index, "supplierLocationId"]} style={{ margin: 0 }}>
          <Select
            showSearch
            allowClear
            disabled={!supplierCustomerId}
            placeholder="Mặc định theo đơn"
            filterOption={false}
            onSearch={setLocKeyword}
            loading={locQuery.isLoading}
            options={locationOptions}
          />
        </Form.Item>
      ),
    },
    {
      title: "Số lượng",
      width: 150,
      render: (_, __, index) => (
        <Form.Item
          name={[index, "orderedQty"]}
          rules={[{ required: true, message: "Nhập SL" }]}
          style={{ margin: 0 }}
        >
          <InputNumber min={0.001} style={{ width: "100%" }} addonAfter="L" />
        </Form.Item>
      ),
    },
    {
      title: "Giá tạm",
      width: 150,
      render: (_, __, index) => (
        <Form.Item name={[index, "unitPrice"]} style={{ margin: 0 }}>
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ/L" />
        </Form.Item>
      ),
    },
    {
      title: "VAT",
      width: 110,
      render: (_, __, index) => (
        <Form.Item name={[index, "taxRate"]} style={{ margin: 0 }}>
          <InputNumber
            min={0}
            max={100}
            style={{ width: "100%" }}
            addonAfter="%"
          />
        </Form.Item>
      ),
    },
    {
      title: "Giảm trừ",
      width: 140,
      render: (_, __, index) => (
        <Form.Item name={[index, "discountAmount"]} style={{ margin: 0 }}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      ),
    },
  ];

  return (
    <div style={{ height: "calc(100vh - 96px)", overflow: "auto" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto", height: "100%" }}>
        <Card
          size="small"
          style={{
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            marginBottom: 10,
          }}
          styles={{ body: { padding: 10 } }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <Title level={4} style={{ margin: "6px 0 0" }}>
                Tạo đơn mua TERM
              </Title>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Tạo đơn vận hành TERM. Mỗi dòng có thể chọn kho nhận hàng riêng.
                Bảng giá, tỷ giá và bảng sếp xử lý ở màn chi tiết.
              </Text>
            </div>

            <Space>
              <Button onClick={() => navigate(-1)}>Quay lại</Button>
              <Button
                type="primary"
                loading={createMutation.isPending}
                onClick={() => form.submit()}
              >
                Lưu đơn TERM
              </Button>
            </Space>
          </div>
        </Card>

        <Form<FormValues>
          form={form}
          layout="vertical"
          size="small"
          initialValues={initialValues}
          onFinish={onFinish}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 280px",
              gap: 10,
              alignItems: "start",
            }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Card
                size="small"
                style={{
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                }}
                styles={{ body: { padding: 12 } }}
              >
                <div
                  style={{ fontWeight: 900, marginBottom: 10, fontSize: 14 }}
                >
                  1. Thông tin đơn
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <Form.Item
                    name="supplierCustomerId"
                    label="Nhà cung cấp"
                    rules={[{ required: true, message: "Chọn nhà cung cấp" }]}
                  >
                    <PartySelect
                      partyRole="SUPPLIER"
                      placeholder="Chọn nhà cung cấp"
                      onChange={(value) => {
                        form.setFieldsValue({
                          supplierCustomerId: value || undefined,
                          supplierLocationId: undefined,
                          lines: (form.getFieldValue("lines") ?? []).map(
                            (line: TermLineForm) => ({
                              ...line,
                              supplierLocationId: undefined,
                            }),
                          ),
                        });
                        setLocKeyword("");
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="supplierLocationId"
                    label="Kho nhận mặc định"
                  >
                    <Select
                      showSearch
                      allowClear
                      disabled={!supplierCustomerId}
                      placeholder={
                        supplierCustomerId ? "Chọn kho nhận" : "Chọn NCC trước"
                      }
                      filterOption={false}
                      onSearch={setLocKeyword}
                      loading={locQuery.isLoading}
                      options={locationOptions}
                      onChange={(value) => {
                        const currentLines = form.getFieldValue("lines") ?? [];
                        form.setFieldsValue({
                          supplierLocationId: value,
                          lines: currentLines.map((line: TermLineForm) => ({
                            ...line,
                            supplierLocationId:
                              line.supplierLocationId || value,
                          })),
                        });
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="orderDate"
                    label="Ngày đơn"
                    rules={[{ required: true, message: "Chọn ngày đơn" }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item name="expectedDate" label="Ngày dự kiến">
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <Form.Item name="contractNo" label="Số hợp đồng">
                    <Input placeholder="Tự điền theo NCC nếu có" />
                  </Form.Item>

                  <Form.Item name="deliveryLocation" label="Địa điểm giao hàng">
                    <Input placeholder="Tự điền theo NCC/kho nếu có" />
                  </Form.Item>

                  <Form.Item name="premium" label="Premium">
                    <InputNumber
                      style={{ width: "100%" }}
                      addonAfter="USD/bbl"
                      placeholder="Nếu có"
                    />
                  </Form.Item>

                  <Form.Item label="Loại nghiệp vụ">
                    <Input value="TERM" readOnly />
                  </Form.Item>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: 8,
                  }}
                >
                  <Form.Item name="paymentNote" label="Điều khoản / Thanh toán">
                    <Input.TextArea
                      rows={2}
                      placeholder="VD: Thanh toán sau khi có hóa đơn/chốt giá..."
                    />
                  </Form.Item>

                  <Form.Item name="note" label="Ghi chú nội bộ">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </div>
              </Card>

              <Card
                size="small"
                style={{
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                }}
                styles={{ body: { padding: 12 } }}
              >
                <Form.List name="lines">
                  {(fields, { add, remove }) => (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          marginBottom: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 14 }}>
                          2. Chi tiết hàng hóa
                        </div>

                        <Button
                          type="primary"
                          onClick={() =>
                            add({
                              supplierLocationId:
                                form.getFieldValue("supplierLocationId"),
                              taxRate: 10,
                              discountAmount: 0,
                            })
                          }
                        >
                          Thêm dòng
                        </Button>
                      </div>

                      <Form.Item noStyle shouldUpdate>
                        {() => (
                          <Table
                            size="small"
                            bordered
                            rowKey="key"
                            pagination={false}
                            columns={[
                              ...lineColumns,
                              {
                                title: "",
                                width: 70,
                                align: "center",
                                render: (_, __, index) => (
                                  <Button
                                    danger
                                    size="small"
                                    disabled={fields.length <= 1}
                                    onClick={() => remove(index)}
                                  >
                                    Xóa
                                  </Button>
                                ),
                              },
                            ]}
                            dataSource={fields}
                            scroll={{ x: 1120, y: 260 }}
                          />
                        )}
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </Card>
            </Space>

            <div style={{ position: "sticky", top: 12 }}>
              <Card
                size="small"
                style={{
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                }}
                styles={{ body: { padding: 12 } }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  Tóm tắt đơn
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Số dòng</span>
                  <b>{summary.totalLine}</b>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Tổng lượng</span>
                  <b>{money(summary.totalQty)} L</b>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Tạm tính</span>
                  <b>{money(summary.totalAmount)}</b>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Premium</span>
                  <b>{premium ? `${premium} USD/bbl` : "--"}</b>
                </div>

                <div style={{ marginTop: 10 }}>
                  <Tag color="blue">TERM</Tag>
                  <Tag color="green">1 bộ giá chung</Tag>
                  <Tag color="gold">Nhiều dòng hàng</Tag>
                </div>
              </Card>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
