import { useState } from "react";
import {
  Button,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  EyeOutlined,
  MoreOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import "../../../shared/ui/data-grid.css";
import { ProductsApi } from "../../products/api";
import { SupplierLocationsApi } from "../../supplierLocations/api";
import {
  useConfirmInventoryReceipt,
  useInventoryReceipts,
  useVoidInventoryReceipt,
} from "../hooks";
import type { InventoryReceipt, InventoryReceiptListQuery } from "../types";
import { ReceiptDetailModal } from "../ui/ReceiptDetailModal";
import "../inventory-receipts.css";

const { RangePicker } = DatePicker;

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "gold" },
  CONFIRMED: { label: "Đã nhập kho", color: "green" },
  VOID: { label: "Đã đảo", color: "default" },
};


/*
 * Thanh trạng thái cùng kiểu màn Lệnh xuất kho: việc cần làm đứng trước, "Tất cả"
 * chốt hàng. Khác một điểm — bên xuất kho mặc định mở tab "Chờ kho xuất" vì đó là
 * hàng đợi việc, còn màn này là màn tra cứu phiếu nhập nên mặc định vẫn là "Tất cả",
 * đổi mặc định sẽ làm mất phiếu trước mắt người đang quen tra ở đây.
 */
const RECEIPT_STATUS_FILTERS = [
  { value: "DRAFT", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã nhập kho" },
  { value: "VOID", label: "Đã đảo" },
  { value: "ALL", label: "Tất cả" },
];

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
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>();
  const [receiptStatus, setReceiptStatus] = useState("ALL");
  const [receiptFilterOpen, setReceiptFilterOpen] = useState(false);
  const [receiptFilterForm] = Form.useForm<{
    warehouseId?: string;
    productId?: string;
    receiptDates?: [Dayjs, Dayjs] | null;
  }>();
  const [receiptDates, setReceiptDates] = useState<[Dayjs, Dayjs] | null>(null);
  const [receiptQuery, setReceiptQuery] = useState<InventoryReceiptListQuery>({
    page: 1,
    limit: 20,
  });

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
  // Đếm cho từng tab, và đếm theo đúng bộ lọc đang bật — nếu không, con số trên tab
  // sẽ không khớp với số dòng thấy trong bảng.
  const countScope = {
    page: 1,
    limit: 1,
    keyword: receiptQuery.keyword,
    warehouseId: receiptQuery.warehouseId,
    productId: receiptQuery.productId,
    dateFrom: receiptQuery.dateFrom,
    dateTo: receiptQuery.dateTo,
  };
  const draftCount = useInventoryReceipts({ ...countScope, status: "DRAFT" });
  const confirmedCount = useInventoryReceipts({ ...countScope, status: "CONFIRMED" });
  const voidCount = useInventoryReceipts({ ...countScope, status: "VOID" });
  const allCount = useInventoryReceipts(countScope);
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
      // Số phiếu rút lô dài gần 40 ký tự nên cột này phải rộng nhất bảng.
      width: 300,
      render: (value, row) => (
        <Button type="link" className="inventory-receipt-link" onClick={() => setSelectedReceiptId(row.id)}>
          <span className="data-grid-clip">{value}</span>
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
        <div className="data-grid-stack">
          <span className="data-grid-clip">{SOURCE_META[row.sourceType] ?? row.sourceType}</span>
          <span className="data-grid-clip data-grid-sub">{row.sourceNo ?? "—"}</span>
        </div>
      ),
    },
    {
      title: "Nhà cung cấp",
      width: 210,
      render: (_, row) => (
        <span className="data-grid-clip">{`${row.supplier.code ?? ""} - ${row.supplier.name}`}</span>
      ),
    },
    {
      title: "Kho nhận",
      width: 160,
      render: (_, row) => (
        <span className="data-grid-clip">{`${row.warehouse.code} - ${row.warehouse.name}`}</span>
      ),
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
      /*
       * Gộp vào một nút "..." rộng 46px, đúng chuẩn cột tác vụ của .data-grid. Ba nút
       * bày sẵn ngốn 190px trong khi hầu hết phiếu đã ở trạng thái "Đã nhập kho" nên
       * chỉ còn mỗi cái mắt — 150px bỏ không trên mọi dòng.
       *
       * Popconfirm không lồng được vào menu nên bước xác nhận chuyển sang Modal.confirm;
       * xác nhận nhập kho là cộng thẳng vào tồn nên không được để bấm nhầm một phát ăn ngay.
       */
      title: "",
      key: "actions",
      width: 46,
      align: "center",
      fixed: "right",
      render: (_, row) => {
        const items: MenuProps["items"] = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "Xem chi tiết",
            onClick: () => setSelectedReceiptId(row.id),
          },
        ];

        if (row.status === "DRAFT") {
          items.push(
            {
              key: "confirm",
              icon: <CheckOutlined />,
              label: "Xác nhận nhập kho",
              onClick: () =>
                Modal.confirm({
                  title: "Xác nhận nhập kho",
                  content: "Xác nhận đã nhận hàng thực tế? Tồn kho sẽ được cộng ngay.",
                  okText: "Xác nhận",
                  cancelText: "Đóng",
                  onOk: () => confirmReceipt.mutateAsync(row.id),
                }),
            },
            {
              key: "void",
              icon: <StopOutlined />,
              label: "Hủy đề nghị",
              danger: true,
              onClick: () =>
                Modal.confirm({
                  title: "Hủy đề nghị",
                  content: "Hủy đề nghị nhập hàng này?",
                  okText: "Hủy đề nghị",
                  cancelText: "Đóng",
                  okButtonProps: { danger: true },
                  onOk: () => voidReceipt.mutateAsync(row.id),
                }),
            },
          );
        }

        return (
          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              aria-label={`Thao tác phiếu nhập ${row.receiptNo}`}
            />
          </Dropdown>
        );
      },
    },
  ];


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


  const labelOf = (options: { value: string; label: string }[], id?: string) =>
    options.find((item) => item.value === id)?.label ?? id ?? "";

  const receiptFilterPanel = (
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
  );

  /** Điều kiện đang bật hiện thành thẻ gỡ được, cùng kiểu màn Lệnh xuất kho. */
  const receiptFilterTags: ActiveFilterTag[] = [
    receiptQuery.warehouseId
      ? {
          key: "warehouse",
          label: `Kho nhận: ${labelOf(warehouseOptions, receiptQuery.warehouseId)}`,
          onClear: () => {
            receiptFilterForm.setFieldValue("warehouseId", undefined);
            setReceiptQuery((current) => ({ ...current, warehouseId: undefined, page: 1 }));
          },
        }
      : null,
    receiptQuery.productId
      ? {
          key: "product",
          label: `Mặt hàng: ${labelOf(productOptions, receiptQuery.productId)}`,
          onClear: () => {
            receiptFilterForm.setFieldValue("productId", undefined);
            setReceiptQuery((current) => ({ ...current, productId: undefined, page: 1 }));
          },
        }
      : null,
    receiptDates
      ? {
          key: "dates",
          label: `Ngày nhập: ${receiptDates[0].format("DD/MM/YYYY")} – ${receiptDates[1].format("DD/MM/YYYY")}`,
          onClear: () => {
            receiptFilterForm.setFieldValue("receiptDates", null);
            setReceiptDates(null);
            setReceiptQuery((current) => ({
              ...current,
              dateFrom: undefined,
              dateTo: undefined,
              page: 1,
            }));
          },
        }
      : null,
  ].filter(Boolean) as ActiveFilterTag[];

  return (
    <div className="inventory-receipts-page">
      <div className="inventory-receipts-heading">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Nhập kho mua hàng
        </Typography.Title>
        <Typography.Text type="secondary">
          Theo dõi phiếu nhập từ đơn mua và các lần rút hàng lô.
        </Typography.Text>
      </div>

      {/* Thẻ kho đã tách thành màn riêng bên Báo cáo kho, nên tab nội dung không còn
          lý do tồn tại: thanh trạng thái lên thẳng cấp một, ô tìm và hai nút dồn phải
          trên cùng hàng — đúng bố cục màn Lệnh xuất kho. */}
      <Tabs
        className="inventory-status-tabs"
        activeKey={receiptStatus}
        onChange={(value) => {
          setReceiptStatus(value);
          setReceiptQuery((current) => ({
            ...current,
            status: value === "ALL" ? undefined : value,
            page: 1,
          }));
        }}
        tabBarExtraContent={{
          right: (
            <Space size={6}>
              <Input.Search
                size="small"
                allowClear
                className="inventory-receipts-search"
                placeholder="Số phiếu, đơn mua, nhà cung cấp"
                onSearch={(keyword) =>
                  setReceiptQuery((current) => ({
                    ...current,
                    keyword: keyword || undefined,
                    page: 1,
                  }))
                }
              />
              <FilterButton
                count={activeReceiptFilterCount}
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
                content={receiptFilterPanel}
              />
              <RefreshButton
                loading={receipts.isFetching}
                onClick={() => receipts.refetch()}
              />
            </Space>
          ),
        }}
        items={RECEIPT_STATUS_FILTERS.map((item) => {
          const total =
            item.value === "DRAFT" ? draftCount.data?.total :
            item.value === "CONFIRMED" ? confirmedCount.data?.total :
            item.value === "VOID" ? voidCount.data?.total :
            allCount.data?.total;
          return { key: item.value, label: `${item.label} (${total ?? 0})` };
        })}
      />

      <FilterTags items={receiptFilterTags} />

      <Table<InventoryReceipt>
        className="data-grid"
        rowKey="id"
        size="small"
        bordered
        tableLayout="fixed"
        // Cột tác vụ ghim phải cần bề ngang tối thiểu, nếu không AntD không ghim được.
        scroll={{ x: 1150 }}
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

      <ReceiptDetailModal
        receiptId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(undefined)}
      />
    </div>
  );
}
