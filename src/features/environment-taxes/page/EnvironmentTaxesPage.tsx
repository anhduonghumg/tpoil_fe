import React, { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useProductSelect } from "../../products/hooks";
import {
  useCreateEnvironmentTax,
  useDeleteEnvironmentTax,
  useEnvironmentTaxes,
  useUpdateEnvironmentTax,
} from "../hooks";
import type { EnvironmentTaxRate, ProductItem } from "../types";

const { RangePicker } = DatePicker;
const { Text } = Typography;

type FormValues = {
  productId: string;
  effectiveFrom: dayjs.Dayjs;
  effectiveTo?: dayjs.Dayjs;
  taxVndPerLiter: number;
  status?: string;
  note?: string;
};

function formatMoney(v?: number | string | null) {
  if (!v && v !== 0) return "-";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(v));
}

function productLabel(product?: ProductItem | null, productId?: string) {
  if (!product) return productId || "-";
  return product.code ? `${product.code} - ${product.name}` : product.name;
}

export default function EnvironmentTaxesPage() {
  const [productId, setProductId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>("ACTIVE");
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<EnvironmentTaxRate | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const productsQuery = useProductSelect("");
  const create = useCreateEnvironmentTax();
  const update = useUpdateEnvironmentTax();
  const remove = useDeleteEnvironmentTax();

  const query = useMemo(
    () => ({
      productId,
      status,
      fromDate: range?.[0]?.format("YYYY-MM-DD"),
      toDate: range?.[1]?.format("YYYY-MM-DD"),
      page,
      pageSize,
    }),
    [page, pageSize, productId, range, status],
  );

  const taxesQuery = useEnvironmentTaxes(query);
  const products: ProductItem[] = (productsQuery.data ?? []).map((p: any) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: "ACTIVE",
    });
    setOpen(true);
  };

  const openEdit = (row: EnvironmentTaxRate) => {
    setEditing(row);
    form.setFieldsValue({
      productId: row.productId,
      effectiveFrom: dayjs(row.effectiveFrom),
      effectiveTo: row.effectiveTo ? dayjs(row.effectiveTo) : undefined,
      taxVndPerLiter: Number(row.taxVndPerLiter),
      status: row.status || "ACTIVE",
      note: row.note || undefined,
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      productId: v.productId,
      effectiveFrom: v.effectiveFrom.format("YYYY-MM-DD"),
      effectiveTo: v.effectiveTo?.format("YYYY-MM-DD"),
      taxVndPerLiter: Number(v.taxVndPerLiter),
      status: v.status,
      note: v.note,
    };

    if (editing) {
      await update.mutateAsync({ id: editing.id, data: payload });
      message.success("Đã cập nhật phí BVMT");
    } else {
      await create.mutateAsync(payload);
      message.success("Đã tạo phí BVMT");
    }

    close();
  };

  const del = async (id: string) => {
    await remove.mutateAsync(id);
    message.success("Đã xóa phí BVMT");
  };

  const columns: ColumnsType<EnvironmentTaxRate> = [
    {
      title: "Sản phẩm",
      dataIndex: "product",
      width: 260,
      fixed: "left",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>
            {row.product?.code || row.product?.name || row.productId}
          </div>
          {row.product?.code && (
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.product.name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Hiệu lực từ",
      dataIndex: "effectiveFrom",
      width: 130,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Hiệu lực đến",
      dataIndex: "effectiveTo",
      width: 130,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Phí BVMT/lít",
      dataIndex: "taxVndPerLiter",
      width: 150,
      align: "right",
      render: (v) => <b>{formatMoney(v)}</b>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (v) =>
        v === "ACTIVE" ? (
          <Tag color="green">Đang dùng</Tag>
        ) : (
          <Tag>Ngừng dùng</Tag>
        ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      ellipsis: true,
      render: (v) => v || "-",
    },
    {
      title: "",
      width: 100,
      fixed: "right",
      render: (_, row) => (
        <Space size={4}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          />
          <Popconfirm
            title="Xóa phí BVMT?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => del(row.id)}
          >
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              loading={remove.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ display: "flex" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) 170px 260px auto",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div>
          <Text
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 4,
              color: "#64748b",
            }}
          >
            Sản phẩm
          </Text>
          <Select
            allowClear
            showSearch
            placeholder="Tất cả sản phẩm"
            value={productId}
            onChange={(v) => {
              setPage(1);
              setProductId(v);
            }}
            loading={productsQuery.isLoading}
            options={products.map((p) => ({
              value: p.id,
              label: productLabel(p),
            }))}
            optionFilterProp="label"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <Text
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 4,
              color: "#64748b",
            }}
          >
            Trạng thái
          </Text>
          <Select
            allowClear
            placeholder="Tất cả"
            value={status}
            onChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
            options={[
              { value: "ACTIVE", label: "Đang dùng" },
              { value: "INACTIVE", label: "Ngừng dùng" },
            ]}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <Text
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 4,
              color: "#64748b",
            }}
          >
            Khoảng hiệu lực
          </Text>
          <RangePicker
            value={range}
            onChange={(v) => {
              setPage(1);
              setRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null);
            }}
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
          />
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm phí BVMT
        </Button>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={taxesQuery.data?.items ?? []}
        loading={taxesQuery.isLoading}
        scroll={{ x: 1080 }}
        pagination={{
          current: page,
          pageSize,
          total: taxesQuery.data?.total ?? 0,
          size: "small",
          showSizeChanger: true,
          showTotal: (t) => `Tổng ${t} dòng`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        open={open}
        title={editing ? "Cập nhật phí BVMT" : "Thêm phí BVMT"}
        onCancel={close}
        width={520}
        footer={
          <Space>
            <Button onClick={close}>Hủy</Button>
            <Button
              type="primary"
              loading={create.isPending || update.isPending}
              onClick={save}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item
            name="productId"
            label="Sản phẩm"
            rules={[{ required: true, message: "Chọn sản phẩm" }]}
          >
            <Select
              showSearch
              placeholder="Chọn sản phẩm"
              loading={productsQuery.isLoading}
              options={products.map((p) => ({
                value: p.id,
                label: productLabel(p),
              }))}
              optionFilterProp="label"
            />
          </Form.Item>

          <Space size={12} style={{ width: "100%" }}>
            <Form.Item
              name="effectiveFrom"
              label="Hiệu lực từ"
              rules={[{ required: true, message: "Chọn ngày hiệu lực" }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              name="effectiveTo"
              label="Hiệu lực đến"
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>

          <Form.Item
            name="taxVndPerLiter"
            label="Phí BVMT/lít"
            rules={[{ required: true, message: "Nhập phí BVMT" }]}
          >
            <InputNumber
              min={0}
              precision={6}
              style={{ width: "100%" }}
              addonAfter="VND/lít"
            />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { value: "ACTIVE", label: "Đang dùng" },
                { value: "INACTIVE", label: "Ngừng dùng" },
              ]}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Ghi chú nếu có" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
