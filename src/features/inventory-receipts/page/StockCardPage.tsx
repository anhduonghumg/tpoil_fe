import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import "../../../shared/ui/data-grid.css";
import { ProductsApi } from "../../products/api";
import { SupplierLocationsApi } from "../../supplierLocations/api";
import { useStockCard } from "../hooks";
import type { StockCardEntry, StockCardQuery } from "../types";
import { ReceiptDetailModal } from "../ui/ReceiptDetailModal";
import "../inventory-receipts.css";

const { RangePicker } = DatePicker;

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

/**
 * Sổ cái kho ghi đủ mọi loại bút toán, không riêng phiếu nhập — nên nghiệp vụ phải
 * đọc từ `posting.kind`. Gọi tên theo dấu của số lượng như trước sẽ biến một lệnh
 * xuất bán thành "đảo nhập".
 */
const POSTING_KIND_META: Record<string, { label: string; color: string }> = {
  OPENING_BALANCE: { label: "Số dư đầu kỳ", color: "default" },
  RECEIPT: { label: "Nhập kho", color: "green" },
  SALES_ISSUE: { label: "Xuất bán", color: "orange" },
  MOVEMENT_DISPATCH: { label: "Chuyển đi", color: "blue" },
  MOVEMENT_ARRIVAL: { label: "Chuyển đến", color: "blue" },
  OWNERSHIP_TRANSFER: { label: "Đổi chủ hàng", color: "purple" },
  ADJUSTMENT: { label: "Điều chỉnh", color: "gold" },
  REVERSAL: { label: "Đảo bút toán", color: "default" },
};

function formatDateRange(range: [Dayjs, Dayjs] | null) {
  return {
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
  };
}

/**
 * Thẻ kho: sổ chi tiết của MỘT kho × MỘT mặt hàng. Tồn đầu kỳ, từng bút toán theo
 * thứ tự thời gian kèm số dư chạy, tồn cuối kỳ — thứ duy nhất trả lời được "vì sao
 * tồn ra đúng con số đó" khi đối chiếu với đo bồn thực tế.
 */
export default function StockCardPage() {
  const navigate = useNavigate();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterForm] = Form.useForm<{
    warehouseId?: string;
    productId?: string;
    dates?: [Dayjs, Dayjs] | null;
  }>();
  const [dates, setDates] = useState<[Dayjs, Dayjs] | null>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [query, setQuery] = useState<StockCardQuery>(() => ({
    ...formatDateRange([dayjs().startOf("month"), dayjs().endOf("month")]),
  }));

  const warehousesQuery = useQuery({
    queryKey: ["inventory-receipts", "warehouses"],
    queryFn: () => SupplierLocationsApi.list({ isActive: true, page: 1, pageSize: 200 }),
    staleTime: 5 * 60_000,
  });
  const productsQuery = useQuery({
    queryKey: ["inventory-receipts", "products"],
    queryFn: () => ProductsApi.select(""),
    staleTime: 5 * 60_000,
  });
  const stockCard = useStockCard(query);

  const warehouseOptions = (warehousesQuery.data?.items ?? []).map((item) => ({
    value: item.id,
    label: `${item.code} - ${item.name}`,
  }));
  const productOptions = (productsQuery.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.code ?? ""} - ${item.name}`,
  }));
  const labelOf = (options: { value: string; label: string }[], id?: string) =>
    options.find((item) => item.value === id)?.label ?? id ?? "";

  const totals = useMemo(() => {
    const items = stockCard.data?.items ?? [];
    return {
      inQty: items.reduce((sum, item) => sum + Math.max(Number(item.actualQtyDelta), 0), 0),
      outQty: items.reduce((sum, item) => sum + Math.max(-Number(item.actualQtyDelta), 0), 0),
    };
  }, [stockCard.data?.items]);

  const applyFilters = (values: {
    warehouseId?: string;
    productId?: string;
    dates?: [Dayjs, Dayjs] | null;
  }) => {
    const range = values.dates ?? null;
    setDates(range);
    setQuery({
      warehouseId: values.warehouseId,
      productId: values.productId,
      ...formatDateRange(range),
    });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    const defaultRange: [Dayjs, Dayjs] = [dayjs().startOf("month"), dayjs().endOf("month")];
    filterForm.resetFields();
    setDates(defaultRange);
    setQuery(formatDateRange(defaultRange));
    setFilterOpen(false);
  };

  const filterPanel = (
    <Form
      className="inventory-receipts-filter-panel"
      form={filterForm}
      layout="vertical"
      size="small"
      onFinish={applyFilters}
    >
      <Form.Item name="warehouseId" label="Kho" rules={[{ required: true, message: "Chọn kho" }]}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn kho"
          options={warehouseOptions}
        />
      </Form.Item>
      <Form.Item name="productId" label="Mặt hàng" rules={[{ required: true, message: "Chọn mặt hàng" }]}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn mặt hàng"
          options={productOptions}
        />
      </Form.Item>
      <Form.Item name="dates" label="Khoảng thời gian">
        <RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button size="small" onClick={clearFilters}>Đặt lại</Button>
        <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
      </Space>
    </Form>
  );

  const filterTags: ActiveFilterTag[] = [
    query.warehouseId
      ? {
          key: "warehouse",
          label: `Kho: ${labelOf(warehouseOptions, query.warehouseId)}`,
          onClear: () => {
            filterForm.setFieldValue("warehouseId", undefined);
            setQuery((current) => ({ ...current, warehouseId: undefined }));
          },
        }
      : null,
    query.productId
      ? {
          key: "product",
          label: `Mặt hàng: ${labelOf(productOptions, query.productId)}`,
          onClear: () => {
            filterForm.setFieldValue("productId", undefined);
            setQuery((current) => ({ ...current, productId: undefined }));
          },
        }
      : null,
    dates
      ? {
          key: "dates",
          label: `Kỳ: ${dates[0].format("DD/MM/YYYY")} – ${dates[1].format("DD/MM/YYYY")}`,
          onClear: () => {
            filterForm.setFieldValue("dates", null);
            setDates(null);
            setQuery((current) => ({ ...current, dateFrom: undefined, dateTo: undefined }));
          },
        }
      : null,
  ].filter(Boolean) as ActiveFilterTag[];

  const columns: ColumnsType<StockCardEntry> = [
    {
      title: "Ngày",
      dataIndex: "effectiveAt",
      width: 130,
      render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Chứng từ",
      dataIndex: "documentNo",
      width: 300,
      // Dòng nào cũng mở ngược về chứng từ sinh ra nó, không riêng phiếu nhập —
      // truy ngược là toàn bộ lý do màn này tồn tại.
      render: (value, row) => {
        const source = row.source;
        const open =
          source?.type === "GOODS_RECEIPT"
            ? () => setSelectedReceiptId(source.id)
            : source?.type === "SALES_DELIVERY"
              ? () => navigate("/sales/deliveries")
              : source?.type === "SALES_RETURN"
                ? () => navigate("/sales/deliveries?tab=RETURNS")
              : source?.type === "WAREHOUSE_TRANSFER"
                ? () => navigate(`/operations/warehouse-transfers/${source.id}`)
                : null;

        if (!open) return <span className="data-grid-clip">{value}</span>;
        return (
          <Button type="link" className="inventory-receipt-link" onClick={open}>
            <span className="data-grid-clip">{value}</span>
          </Button>
        );
      },
    },
    {
      title: "Nghiệp vụ",
      width: 130,
      render: (_, row) => {
        const meta = POSTING_KIND_META[row.posting.kind];
        return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag>{row.posting.kind}</Tag>;
      },
    },
    {
      title: "Lô",
      dataIndex: ["lot", "lotNo"],
      width: 260,
      render: (value) => <span className="data-grid-clip">{value ?? "—"}</span>,
    },
    {
      title: "Chủ hàng",
      width: 200,
      render: (_, row) => (
        <span className="data-grid-clip">{`${row.owner.code ?? ""} - ${row.owner.name}`}</span>
      ),
    },
    {
      title: "Nhập",
      align: "right",
      width: 110,
      render: (_, row) => (Number(row.actualQtyDelta) > 0 ? formatQty(row.actualQtyDelta) : "-"),
    },
    {
      // Gom mọi thứ làm tồn giảm: xuất bán, chuyển đi, điều chỉnh giảm, đảo bút toán.
      title: "Xuất / giảm",
      align: "right",
      width: 110,
      render: (_, row) =>
        Number(row.actualQtyDelta) < 0 ? formatQty(Math.abs(Number(row.actualQtyDelta))) : "-",
    },
    {
      title: "Tồn cuối",
      dataIndex: "runningActualQty",
      align: "right",
      width: 120,
      render: (value) => <Typography.Text strong>{formatQty(value)}</Typography.Text>,
    },
  ];

  return (
    <div className="inventory-receipts-page">
      <div className="inventory-receipts-heading">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Thẻ kho
        </Typography.Title>
        <Typography.Text type="secondary">
          Sổ chi tiết của một kho và một mặt hàng: tồn đầu kỳ, từng lần hàng vào ra, tồn cuối kỳ.
        </Typography.Text>
      </div>

      <FilterToolbar
        right={
          <Space size={6}>
            <FilterButton
              count={Number(Boolean(query.warehouseId)) + Number(Boolean(query.productId))}
              open={filterOpen}
              onOpenChange={(open) => {
                setFilterOpen(open);
                if (open) {
                  filterForm.setFieldsValue({
                    warehouseId: query.warehouseId,
                    productId: query.productId,
                    dates,
                  });
                }
              }}
              content={filterPanel}
            />
            <RefreshButton loading={stockCard.isFetching} onClick={() => stockCard.refetch()} />
          </Space>
        }
      />

      <FilterTags items={filterTags} />

      {!query.warehouseId || !query.productId ? (
        <Empty description="Chọn kho và mặt hàng để xem thẻ kho" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div className="inventory-stock-card-summary">
            <div><span>Tồn đầu</span><strong>{formatQty(stockCard.data?.openingActualQty)}</strong></div>
            <div><span>Nhập trong kỳ</span><strong className="is-positive">{formatQty(totals.inQty)}</strong></div>
            <div><span>Xuất / giảm trong kỳ</span><strong className="is-negative">{formatQty(totals.outQty)}</strong></div>
            <div><span>Tồn cuối</span><strong>{formatQty(stockCard.data?.endingActualQty)}</strong></div>
          </div>
          {stockCard.data?.truncated ? (
            <Alert
              type="warning"
              showIcon
              message="Thẻ kho có trên 1.000 dòng; vui lòng thu hẹp khoảng ngày."
            />
          ) : null}
          <Table<StockCardEntry>
            className="data-grid"
            rowKey="id"
            size="small"
            bordered
            tableLayout="fixed"
            scroll={{ x: 1160 }}
            loading={stockCard.isLoading || stockCard.isFetching}
            columns={columns}
            dataSource={stockCard.data?.items ?? []}
            pagination={{ pageSize: 30, hideOnSinglePage: true }}
          />
        </Space>
      )}

      <ReceiptDetailModal
        receiptId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(undefined)}
      />
    </div>
  );
}
