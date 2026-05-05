import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

import { useProductSelect } from "../../products/hooks";
import {
  useDeletePlattsPrice,
  usePlattsPrices,
  useUpsertPlattsPrice,
} from "../hooks";
import type { PlattsQuote } from "../types";

const { Title, Text } = Typography;

type ProductItem = {
  id: string;
  code?: string;
  name: string;
};

type RowItem = {
  key: string;
  date: string;
  day: number;
  weekday: string;
  isSaturday: boolean;
  isSunday: boolean;
  [productId: string]: any;
};

type EditState = {
  open: boolean;
  product?: ProductItem;
  quoteDate?: string;
  quote?: PlattsQuote;
};

function dateKey(date: Dayjs) {
  return date.format("YYYY-MM-DD");
}

function normDate(value: string) {
  return dayjs(value).format("YYYY-MM-DD");
}

function weekdayLabel(date: Dayjs) {
  const d = date.day();
  if (d === 0) return "CN";
  if (d === 6) return "T7";
  return `T${d + 1}`;
}

function formatPrice(v?: number | string | null) {
  if (!v && v !== 0) return "";

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v));
}

function buildRows(
  month: Dayjs,
  products: ProductItem[],
  quotes: PlattsQuote[],
): RowItem[] {
  const map = new Map<string, PlattsQuote>();

  quotes.forEach((q) => {
    map.set(`${q.productId}_${normDate(q.quoteDate)}`, q);
  });

  return Array.from({ length: month.daysInMonth() }, (_, i) => {
    const d = month.date(i + 1);
    const key = dateKey(d);

    const row: RowItem = {
      key,
      date: key,
      day: i + 1,
      weekday: weekdayLabel(d),
      isSaturday: d.day() === 6,
      isSunday: d.day() === 0,
    };

    products.forEach((p) => {
      row[p.id] = map.get(`${p.id}_${key}`) ?? null;
    });

    return row;
  });
}

function PriceCell({
  quote,
  onClick,
}: {
  quote: PlattsQuote | null;
  onClick: () => void;
}) {
  const hasValue = !!quote;

  return (
    <div
      onClick={onClick}
      className={`platts-price-cell ${hasValue ? "has-value" : "empty"}`}
    >
      {hasValue ? formatPrice(quote.priceUsdPerBbl) : "+"}
    </div>
  );
}

export default function PlattsPricesPage() {
  const [month, setMonth] = useState(dayjs().startOf("month"));
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [edit, setEdit] = useState<EditState>({ open: false });
  const [form] = Form.useForm();

  const query = useMemo(
    () => ({
      month: month.format("YYYY-MM"),
    }),
    [month],
  );

  const productsQuery = useProductSelect("");
  const quotesQuery = usePlattsPrices(query);
  const upsert = useUpsertPlattsPrice(query);
  const remove = useDeletePlattsPrice();

  const products: ProductItem[] = (productsQuery.data ?? []).map((p: any) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  const quotes: PlattsQuote[] = quotesQuery.data ?? [];

  const visibleProducts = useMemo(() => {
    if (!productFilter.length) return products;
    return products.filter((p) => productFilter.includes(p.id));
  }, [products, productFilter]);

  const rows = useMemo(
    () => buildRows(month, visibleProducts, quotes),
    [month, visibleProducts, quotes],
  );

  const openEditor = (p: ProductItem, date: string, q?: PlattsQuote | null) => {
    setEdit({
      open: true,
      product: p,
      quoteDate: date,
      quote: q ?? undefined,
    });

    form.setFieldsValue({
      priceUsdPerBbl: q ? Number(q.priceUsdPerBbl) : undefined,
      note: q?.note,
    });
  };

  const close = () => {
    setEdit({ open: false });
    form.resetFields();
  };

  const save = async () => {
    const v = await form.validateFields();

    await upsert.mutateAsync({
      productId: edit.product!.id,
      quoteDate: edit.quoteDate!,
      priceUsdPerBbl: Number(v.priceUsdPerBbl),
      note: v.note,
    });

    message.success("Đã lưu giá Platts");
    close();
  };

  const del = async () => {
    if (!edit.quote?.id) return;

    await remove.mutateAsync(edit.quote.id);

    message.success("Đã xóa giá Platts");
    close();
  };

  const columns: ColumnsType<RowItem> = [
    {
      title: "Thứ",
      dataIndex: "weekday",
      width: 72,
      fixed: "left",
      align: "center",
      render: (value, row) => (
        <Tag
          color={row.isSunday ? "red" : row.isSaturday ? "gold" : "default"}
          style={{
            width: 48,
            textAlign: "center",
            margin: 0,
            fontWeight: 800,
          }}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "day",
      width: 76,
      fixed: "left",
      align: "center",
      render: (value) => (
        <span style={{ fontWeight: 900, color: "#0f172a" }}>
          {String(value).padStart(2, "0")}
        </span>
      ),
    },
    ...visibleProducts.map((p) => ({
      title: (
        <div style={{ textAlign: "center", lineHeight: 1.25 }}>
          <div style={{ fontWeight: 900, color: "#0f172a" }}>
            {p.code || p.name}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {p.name}
          </div>
        </div>
      ),
      dataIndex: p.id,
      width: 132,
      align: "center" as const,
      render: (q: PlattsQuote | null, row: RowItem) => (
        <PriceCell quote={q} onClick={() => openEditor(p, row.date, q)} />
      ),
    })),
  ];

  const visibleProductIds = new Set(visibleProducts.map((p) => p.id));
  const filledCount = quotes.filter(
    (q) =>
      normDate(q.quoteDate).startsWith(month.format("YYYY-MM")) &&
      visibleProductIds.has(q.productId),
  ).length;

  const totalCell = month.daysInMonth() * visibleProducts.length;
  const missingCount = Math.max(0, totalCell - filledCount);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: 12 }}>
      <style>
        {`
          .platts-page-card {
            border-radius: 16px !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: 0 8px 24px rgba(15,23,42,.04) !important;
          }

          .platts-toolbar {
            display: grid;
            grid-template-columns: 220px minmax(280px, 1fr) 120px 120px;
            gap: 10px;
            align-items: end;
          }

          .platts-table .ant-table {
            border-radius: 14px;
            overflow: hidden;
          }

          .platts-table .ant-table-thead > tr > th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 900 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 10px 8px !important;
          }

          .platts-table .ant-table-tbody > tr > td {
            padding: 6px 8px !important;
            border-bottom: 1px solid #eef2f7 !important;
            background: #fff;
          }

          .platts-table .ant-table-tbody > tr:hover > td {
            background: #f8fafc !important;
          }

          .platts-price-cell {
            height: 34px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 13px;
            transition: all .12s ease;
            user-select: none;
          }

          .platts-price-cell.has-value {
            font-weight: 900;
            color: #065f46;
            background: #dcfce7;
            border: 1px solid #86efac;
          }

          .platts-price-cell.empty {
            font-weight: 700;
            color: #94a3b8;
            background: #f8fafc;
            border: 1px solid #eef2f7;
          }

          .platts-price-cell:hover {
            border-color: #1677ff !important;
            background: #eff6ff !important;
            color: #1677ff !important;
            transform: translateY(-1px);
          }

          @media (max-width: 900px) {
            .platts-toolbar {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div style={{ maxWidth: 1580, margin: "0 auto" }}>
        <Card
          size="small"
          className="platts-page-card"
          style={{ marginBottom: 10 }}
          styles={{ body: { padding: 12 } }}
        >
          <div className="platts-toolbar">
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 4,
                  color: "#64748b",
                }}
              >
                Tháng
              </div>

              <DatePicker
                picker="month"
                value={month}
                onChange={(v) => v && setMonth(v.startOf("month"))}
                style={{ width: "100%" }}
                format="YYYY-MM"
                allowClear={false}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 4,
                  color: "#64748b",
                }}
              >
                Sản phẩm hiển thị
              </div>

              <Select
                mode="multiple"
                placeholder="Tất cả sản phẩm"
                value={productFilter}
                onChange={setProductFilter}
                loading={productsQuery.isLoading}
                options={products.map((p) => ({
                  value: p.id,
                  label: p.code || p.name,
                }))}
                style={{ width: "100%" }}
                maxTagCount="responsive"
              />
            </div>

            <div
              style={{
                background: "#ecfdf5",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b" }}>Đã nhập</div>
              <b>{filledCount}</b>
            </div>

            <div
              style={{
                background: "#fff7ed",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b" }}>Còn trống</div>
              <b>{missingCount}</b>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="platts-page-card"
          styles={{ body: { padding: 4 } }}
        >
          <div className="platts-table">
            <Table
              size="small"
              bordered={false}
              columns={columns}
              dataSource={rows}
              pagination={false}
              loading={quotesQuery.isLoading || productsQuery.isLoading}
              scroll={{
                x: 260 + visibleProducts.length * 132,
                y: "calc(100vh - 255px)",
              }}
            />
          </div>
        </Card>

        <Modal
          open={edit.open}
          title="Cập nhật giá Platts"
          onCancel={close}
          width={420}
          footer={
            <Space>
              {edit.quote && (
                <Button danger loading={remove.isPending} onClick={del}>
                  Xóa
                </Button>
              )}

              <Button onClick={close}>Hủy</Button>

              <Button type="primary" loading={upsert.isPending} onClick={save}>
                Lưu
              </Button>
            </Space>
          }
        >
          <Space size={6} wrap style={{ marginBottom: 12 }}>
            <Tag color="blue">{edit.product?.code || edit.product?.name}</Tag>
            <Tag>{edit.product?.name}</Tag>
            <Tag color="green">
              {edit.quoteDate ? dayjs(edit.quoteDate).format("DD/MM/YYYY") : ""}
            </Tag>
          </Space>

          <Form form={form} layout="vertical" size="small">
            <Form.Item
              name="priceUsdPerBbl"
              label="Giá Platts (USD/thùng)"
              rules={[{ required: true, message: "Nhập giá Platts" }]}
            >
              <InputNumber
                min={0}
                precision={6}
                style={{ width: "100%" }}
                addonAfter="USD/bbl"
              />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={3} placeholder="Ghi chú nếu có" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
