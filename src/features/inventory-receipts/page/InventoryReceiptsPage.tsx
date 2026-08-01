import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { ProductsApi } from "../../products/api";
import { SupplierLocationsApi } from "../../supplierLocations/api";
import {
  useConfirmInventoryReceipt,
  useInventoryReceiptDetail,
  useInventoryReceipts,
  useStockCard,
  useVoidInventoryReceipt,
} from "../hooks";
import type {
  InventoryReceipt,
  InventoryReceiptListQuery,
  StockCardEntry,
  StockCardQuery,
} from "../types";
import "../inventory-receipts.css";

const { RangePicker } = DatePicker;

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "gold" },
  CONFIRMED: { label: "Đã nhập kho", color: "green" },
  VOID: { label: "Đã đảo", color: "default" },
};

const SOURCE_META: Record<string, string> = {
  COMMERCIAL_LOT_WITHDRAWAL: "Rút lô mua hàng",
  PURCHASE_RECEIPT: "Nhập từ đơn mua",
};

function formatDateRange(range: [Dayjs, Dayjs] | null) {
  return {
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
  };
}

export default function InventoryReceiptsPage() {
  const navigate = useNavigate();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>();
  const [receiptFilterOpen, setReceiptFilterOpen] = useState(false);
  const [stockFilterOpen, setStockFilterOpen] = useState(false);
  const [receiptFilterForm] = Form.useForm<{
    warehouseId?: string;
    productId?: string;
    receiptDates?: [Dayjs, Dayjs] | null;
  }>();
  const [stockFilterForm] = Form.useForm<{
    warehouseId?: string;
    productId?: string;
    stockDates?: [Dayjs, Dayjs] | null;
  }>();
  const [receiptDates, setReceiptDates] = useState<[Dayjs, Dayjs] | null>(null);
  const [receiptQuery, setReceiptQuery] = useState<InventoryReceiptListQuery>({
    page: 1,
    limit: 20,
  });
  const [stockDates, setStockDates] = useState<[Dayjs, Dayjs] | null>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [stockQuery, setStockQuery] = useState<StockCardQuery>(() => ({
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
  const receipts = useInventoryReceipts(receiptQuery);
  const detail = useInventoryReceiptDetail(selectedReceiptId);
  const stockCard = useStockCard(stockQuery);
  const confirmReceipt = useConfirmInventoryReceipt();
  const voidReceipt = useVoidInventoryReceipt();

  const warehouseOptions = (warehousesQuery.data?.items ?? []).map((item) => ({
    value: item.id,
    label: `${item.code} - ${item.name}`,
  }));
  const productOptions = (productsQuery.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.code ?? ""} - ${item.name}`,
  }));

  const receiptColumns: ColumnsType<InventoryReceipt> = [
    {
      title: "Số phiếu",
      dataIndex: "receiptNo",
      render: (value, row) => (
        <Button type="link" className="inventory-receipt-link" onClick={() => setSelectedReceiptId(row.id)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Ngày nhập",
      dataIndex: "receiptDate",
      width: 130,
      render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Nguồn nhập",
      width: 180,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>{SOURCE_META[row.sourceType] ?? row.sourceType}</span>
          <Typography.Text type="secondary">{row.sourceNo ?? "-"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Nhà cung cấp",
      render: (_, row) => `${row.supplier.code ?? ""} - ${row.supplier.name}`,
    },
    {
      title: "Kho nhận",
      render: (_, row) => `${row.warehouse.code} - ${row.warehouse.name}`,
    },
    {
      title: "Số lượng",
      dataIndex: "totalActualQty",
      align: "right",
      width: 120,
      render: formatQty,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 125,
      render: (value) => {
        const meta = STATUS_META[value] ?? { label: value, color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "",
      width: 190,
      align: "center",
      render: (_, row) => (
        <Space size={4}>
          {row.status === "DRAFT" ? (
            <>
              <Popconfirm
                title="Xác nhận nhập kho"
                description="Xác nhận đã nhận hàng thực tế? Tồn kho sẽ được cộng ngay."
                onConfirm={() => confirmReceipt.mutate(row.id)}
              >
                <Button size="small" type="primary" loading={confirmReceipt.isPending}>
                  Xác nhận
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Hủy đề nghị"
                description="Hủy đề nghị nhập hàng này?"
                onConfirm={() => voidReceipt.mutate(row.id)}
              >
                <Button size="small" danger loading={voidReceipt.isPending}>
                  Hủy
                </Button>
              </Popconfirm>
            </>
          ) : null}
          <Button type="text" icon={<EyeOutlined />} title="Xem chi tiết" onClick={() => setSelectedReceiptId(row.id)} />
        </Space>
      ),
    },
  ];

  const stockColumns: ColumnsType<StockCardEntry> = [
    {
      title: "Ngày",
      dataIndex: "effectiveAt",
      width: 130,
      render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Chứng từ",
      dataIndex: "documentNo",
      render: (value, row) => row.goodsReceiptId ? (
        <Button type="link" className="inventory-receipt-link" onClick={() => setSelectedReceiptId(row.goodsReceiptId!)}>
          {value}
        </Button>
      ) : value,
    },
    {
      title: "Nghiệp vụ",
      width: 115,
      render: (_, row) => Number(row.actualQtyDelta) >= 0
        ? <Tag color="green">Nhập kho</Tag>
        : <Tag color="orange">Đảo nhập</Tag>,
    },
    { title: "Lô", dataIndex: ["lot", "lotNo"] },
    {
      title: "Chủ hàng",
      render: (_, row) => `${row.owner.code ?? ""} - ${row.owner.name}`,
    },
    {
      title: "Nhập",
      align: "right",
      width: 110,
      render: (_, row) => Number(row.actualQtyDelta) > 0 ? formatQty(row.actualQtyDelta) : "-",
    },
    {
      title: "Giảm/đảo",
      align: "right",
      width: 110,
      render: (_, row) => Number(row.actualQtyDelta) < 0 ? formatQty(Math.abs(Number(row.actualQtyDelta))) : "-",
    },
    {
      title: "Tồn cuối",
      dataIndex: "runningActualQty",
      align: "right",
      width: 120,
      render: (value) => <Typography.Text strong>{formatQty(value)}</Typography.Text>,
    },
  ];

  const stockTotals = useMemo(() => {
    const items = stockCard.data?.items ?? [];
    return {
      receiptQty: items.reduce((sum, item) => sum + Math.max(Number(item.actualQtyDelta), 0), 0),
      reversalQty: items.reduce((sum, item) => sum + Math.max(-Number(item.actualQtyDelta), 0), 0),
    };
  }, [stockCard.data?.items]);

  const activeReceiptFilterCount = Number(Boolean(receiptQuery.warehouseId))
    + Number(Boolean(receiptQuery.productId))
    + Number(Boolean(receiptQuery.dateFrom || receiptQuery.dateTo));

  const applyReceiptFilters = (values: {
    warehouseId?: string;
    productId?: string;
    receiptDates?: [Dayjs, Dayjs] | null;
  }) => {
    const range = values.receiptDates ?? null;
    setReceiptDates(range);
    setReceiptQuery((current) => ({
      ...current,
      warehouseId: values.warehouseId,
      productId: values.productId,
      ...formatDateRange(range),
      page: 1,
    }));
    setReceiptFilterOpen(false);
  };

  const clearReceiptFilters = () => {
    receiptFilterForm.resetFields();
    setReceiptDates(null);
    setReceiptQuery((current) => ({
      ...current,
      warehouseId: undefined,
      productId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    }));
    setReceiptFilterOpen(false);
  };

  const applyStockFilters = (values: {
    warehouseId?: string;
    productId?: string;
    stockDates?: [Dayjs, Dayjs] | null;
  }) => {
    const range = values.stockDates ?? null;
    setStockDates(range);
    setStockQuery({
      warehouseId: values.warehouseId,
      productId: values.productId,
      ...formatDateRange(range),
    });
    setStockFilterOpen(false);
  };

  const clearStockFilters = () => {
    const defaultRange: [Dayjs, Dayjs] = [dayjs().startOf("month"), dayjs().endOf("month")];
    stockFilterForm.resetFields();
    setStockDates(defaultRange);
    setStockQuery(formatDateRange(defaultRange));
    setStockFilterOpen(false);
  };

  const receiptsTab = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div className="inventory-receipts-toolbar">
        <Input.Search
          size="small"
          allowClear
          placeholder="Số phiếu, đơn mua, nhà cung cấp"
          onSearch={(keyword) => setReceiptQuery((current) => ({ ...current, keyword: keyword || undefined, page: 1 }))}
        />
        <Space size={6}>
          <Popover
            trigger="click"
            placement="bottomRight"
            open={receiptFilterOpen}
            onOpenChange={(open) => {
              setReceiptFilterOpen(open);
              if (open) {
                receiptFilterForm.setFieldsValue({
                  warehouseId: receiptQuery.warehouseId,
                  productId: receiptQuery.productId,
                  receiptDates,
                });
              }
            }}
            content={(
              <Form
                className="inventory-receipts-filter-panel"
                form={receiptFilterForm}
                layout="vertical"
                size="small"
                onFinish={applyReceiptFilters}
              >
                <Form.Item name="warehouseId" label="Kho nhận">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn kho nhận"
                    options={warehouseOptions}
                  />
                </Form.Item>
                <Form.Item name="productId" label="Mặt hàng">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn mặt hàng"
                    options={productOptions}
                  />
                </Form.Item>
                <Form.Item name="receiptDates" label="Ngày nhập">
                  <RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button size="small" onClick={clearReceiptFilters}>Đặt lại</Button>
                  <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
                </Space>
              </Form>
            )}
          >
            <Badge count={activeReceiptFilterCount} size="small" offset={[-3, 3]}>
              <Button size="small" icon={<FilterOutlined />}>Bộ lọc</Button>
            </Badge>
          </Popover>
          <Tooltip title="Làm mới">
            <Button
              size="small"
              aria-label="Làm mới"
              icon={<ReloadOutlined spin={receipts.isFetching} />}
              onClick={() => receipts.refetch()}
            />
          </Tooltip>
        </Space>
      </div>
      <Table<InventoryReceipt>
        rowKey="id"
        size="small"
        loading={receipts.isLoading || receipts.isFetching}
        columns={receiptColumns}
        dataSource={receipts.data?.items ?? []}
        pagination={{
          current: receiptQuery.page,
          pageSize: receiptQuery.limit,
          total: receipts.data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} phiếu nhập`,
          onChange: (page, limit) => setReceiptQuery((current) => ({ ...current, page, limit })),
        }}
      />
    </Space>
  );

  const stockCardTab = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div className="inventory-stock-card-toolbar">
        <Space size={6}>
          <Popover
            trigger="click"
            placement="bottomRight"
            open={stockFilterOpen}
            onOpenChange={(open) => {
              setStockFilterOpen(open);
              if (open) {
                stockFilterForm.setFieldsValue({
                  warehouseId: stockQuery.warehouseId,
                  productId: stockQuery.productId,
                  stockDates,
                });
              }
            }}
            content={(
              <Form
                className="inventory-receipts-filter-panel"
                form={stockFilterForm}
                layout="vertical"
                size="small"
                onFinish={applyStockFilters}
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
                <Form.Item name="stockDates" label="Khoảng thời gian">
                  <RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button size="small" onClick={clearStockFilters}>Đặt lại</Button>
                  <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
                </Space>
              </Form>
            )}
          >
            <Badge count={Number(Boolean(stockQuery.warehouseId)) + Number(Boolean(stockQuery.productId))} size="small" offset={[-3, 3]}>
              <Button size="small" icon={<FilterOutlined />}>Bộ lọc</Button>
            </Badge>
          </Popover>
          <Tooltip title="Làm mới">
            <Button
              size="small"
              aria-label="Làm mới"
              icon={<ReloadOutlined spin={stockCard.isFetching} />}
              disabled={!stockQuery.warehouseId || !stockQuery.productId}
              onClick={() => stockCard.refetch()}
            />
          </Tooltip>
        </Space>
      </div>
      {!stockQuery.warehouseId || !stockQuery.productId ? (
        <Empty description="Chọn kho và mặt hàng để xem thẻ kho" />
      ) : (
        <>
          <div className="inventory-stock-card-summary">
            <div><span>Tồn đầu</span><strong>{formatQty(stockCard.data?.openingActualQty)}</strong></div>
            <div><span>Nhập trong kỳ</span><strong className="is-positive">{formatQty(stockTotals.receiptQty)}</strong></div>
            <div><span>Giảm/đảo trong kỳ</span><strong className="is-negative">{formatQty(stockTotals.reversalQty)}</strong></div>
            <div><span>Tồn cuối</span><strong>{formatQty(stockCard.data?.endingActualQty)}</strong></div>
          </div>
          {stockCard.data?.truncated ? <Alert type="warning" showIcon message="Thẻ kho có trên 1.000 dòng; vui lòng thu hẹp khoảng ngày." /> : null}
          <Table<StockCardEntry>
            rowKey="id"
            size="small"
            loading={stockCard.isLoading || stockCard.isFetching}
            columns={stockColumns}
            dataSource={stockCard.data?.items ?? []}
            pagination={{ pageSize: 30, hideOnSinglePage: true }}
          />
        </>
      )}
    </Space>
  );

  const receiptDetail = detail.data;
  return (
    <div className="inventory-receipts-page">
      <div>
        <Typography.Title level={3}>Nhập kho mua hàng</Typography.Title>
        <Typography.Text type="secondary">Theo dõi phiếu nhập từ đơn mua và các lần rút hàng lô.</Typography.Text>
      </div>
      <Tabs items={[
        { key: "receipts", label: "Phiếu nhập kho", children: receiptsTab },
        { key: "stock-card", label: "Thẻ kho", children: stockCardTab },
      ]} />

      <Modal
        open={Boolean(selectedReceiptId)}
        title={receiptDetail ? `Phiếu nhập ${receiptDetail.receiptNo}` : "Chi tiết phiếu nhập"}
        footer={receiptDetail?.purchaseOrder ? (
          <Button type="primary" onClick={() => navigate(
            receiptDetail.purchaseOrder?.orderType === "LOT"
              ? `/commercial-purchases/lots/${receiptDetail.purchaseOrder.id}`
              : `/purchase-orders/${receiptDetail.purchaseOrder?.id}`,
          )}>Mở đơn mua</Button>
        ) : null}
        onCancel={() => setSelectedReceiptId(undefined)}
        width={820}
        destroyOnHidden
        loading={detail.isLoading}
      >
        {receiptDetail ? (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <div className="inventory-receipt-detail-meta">
              <div><span>Ngày nhập</span><strong>{dayjs(receiptDetail.receiptDate).format("DD/MM/YYYY HH:mm")}</strong></div>
              <div><span>Nguồn</span><strong>{SOURCE_META[receiptDetail.sourceType]}</strong></div>
              <div><span>Chứng từ nguồn</span><strong>{receiptDetail.sourceNo ?? "-"}</strong></div>
              <div><span>Kho nhận</span><strong>{receiptDetail.warehouse.code} - {receiptDetail.warehouse.name}</strong></div>
              <div><span>Nhà cung cấp</span><strong>{receiptDetail.supplier.code ?? ""} - {receiptDetail.supplier.name}</strong></div>
              <div><span>Bút toán kho</span><strong>{receiptDetail.posting?.postingNo ?? "-"}</strong></div>
            </div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={receiptDetail.lines}
              columns={[
                { title: "Mặt hàng", render: (_, row: any) => `${row.product.code ?? ""} - ${row.product.name}` },
                { title: "Lô", render: (_, row: any) => row.lot?.lotNo ?? "-" },
                { title: "Số lượng", dataIndex: "actualQty", align: "right", render: formatQty },
                { title: "V15", dataIndex: "v15Qty", align: "right", render: (value) => value == null ? "-" : formatQty(value) },
              ]}
            />
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
