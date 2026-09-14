import React, { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Dropdown,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PartySelect } from "../../../shared/ui/PartySelect";
import { PageHeader } from "../../../shared/ui/PageHeader";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import "../../../shared/ui/data-grid.css";

import type {
  PaymentMode,
  TermNextAction,
  TermOrderStatus,
  TermPurchaseOrderListItem,
  TermPurchaseOrderListQuery,
} from "../types";
import { usePrintTermOrderDocuments, useTermPurchaseOrderList } from "../hooks";
import { openTermOrderDocumentsPrint } from "../lib/printTermOrderDocuments";

const { RangePicker } = DatePicker;

type FilterValues = {
  status?: TermOrderStatus;
  paymentMode?: PaymentMode;
  supplierCustomerId?: string | null;
  dateRange?: [Dayjs, Dayjs] | null;
};

type TermListTab = "ALL" | "PAID";

const EMPTY = <span className="data-grid-empty">—</span>;

const STATUS_OPTIONS: { value: TermOrderStatus; label: string }[] = [
  { value: "DRAFT", label: "Nháp" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "PREPAID", label: "Trả trước" },
  { value: "POSTPAID", label: "Trả sau" },
];

const TERM_STATUSES = new Set(STATUS_OPTIONS.map((item) => item.value as string));

function parseTermStatus(value: string | null): TermOrderStatus | undefined {
  return value && TERM_STATUSES.has(value) ? (value as TermOrderStatus) : undefined;
}

function money(value?: number | null) {
  if (value === null || value === undefined) return EMPTY;
  return (
    <span className="data-grid-num">
      {new Intl.NumberFormat("vi-VN").format(Math.round(Number(value)))}
    </span>
  );
}

function qty(value?: number | null) {
  if (value === null || value === undefined) return EMPTY;
  return (
    <span className="data-grid-num">
      {`${new Intl.NumberFormat("vi-VN").format(Number(value))} L`}
    </span>
  );
}

function dateText(value?: string | null) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

const STATUS_META: Record<string, { text: string; color?: string }> = {
  DRAFT: { text: "Nháp" },
  APPROVED: { text: "Đã duyệt", color: "blue" },
  IN_PROGRESS: { text: "Đang xử lý", color: "gold" },
  COMPLETED: { text: "Hoàn tất", color: "green" },
  CANCELLED: { text: "Đã hủy", color: "red" },
};

function statusTag(status: TermOrderStatus) {
  const meta = STATUS_META[status] ?? { text: status };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

const PAYMENT_STATUS_META: Record<string, { text: string; color?: string }> = {
  DRAFT: { text: "Chưa gửi", color: "default" },
  SUBMITTED: { text: "Đề nghị TT", color: "cyan" },
  IN_BATCH: { text: "Đã lập bảng kê", color: "blue" },
  SENT_TO_BANK: { text: "Đã gửi NH", color: "blue" },
  PARTIALLY_PAID: { text: "TT một phần", color: "gold" },
  PAID: { text: "Đã thanh toán", color: "green" },
};

function paymentStatusTag(status?: string | null) {
  const meta = status ? PAYMENT_STATUS_META[status] : undefined;
  return meta ? <Tag color={meta.color}>{meta.text}</Tag> : <Tag>Chưa đề nghị</Tag>;
}

const NEXT_ACTION_META: Record<TermNextAction, { text: string; color?: string }> = {
  APPROVE_ORDER: { text: "Sinh đơn", color: "orange" },
  CREATE_ORDER_DOCUMENT: { text: "Đơn đặt hàng", color: "orange" },
  CREATE_PAYMENT_REQUEST: { text: "Đề nghị TT", color: "cyan" },
  CREATE_BANK_INSTRUCTION: { text: "Ủy nhiệm chi", color: "blue" },
  MATCH_BANK_TRANSACTION: { text: "Đối chiếu NH", color: "blue" },
  CREATE_RECEIPT: { text: "Giao nhận", color: "blue" },
  CALCULATE_ESTIMATE: { text: "Lập giá tạm", color: "gold" },
  CALCULATE_TEMP_PRICE: { text: "Lập giá tạm", color: "gold" },
  CALCULATE_BILL_NORMALIZE: { text: "Bảng xuất HĐ", color: "purple" },
  CALCULATE_INVOICE_PRICE: { text: "Bảng xuất HĐ", color: "purple" },
  CALCULATE_FINAL: { text: "Bảng chính thức", color: "green" },
  CALCULATE_OFFICIAL_FX: { text: "Bảng chính thức", color: "green" },
  CREATE_SETTLEMENT_ADJUSTMENT: { text: "Điều chỉnh", color: "volcano" },
  CREATE_BOSS_SHEET: { text: "Bảng sếp", color: "magenta" },
  COMPLETE_ORDER: { text: "Hoàn tất", color: "green" },
  VIEW_ONLY: { text: "Xem", color: "default" },
};

function nextActionTag(action: TermNextAction) {
  const meta = NEXT_ACTION_META[action] ?? { text: action };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

/** Ô hai dòng theo chuẩn .data-grid: nội dung chính + dòng phụ mờ, cao bằng nhau. */
const stack = (main: React.ReactNode, sub: React.ReactNode) => (
  <div className="data-grid-stack">
    <span className="data-grid-clip">{main || "—"}</span>
    <span className="data-grid-clip data-grid-sub">{sub || "—"}</span>
  </div>
);

export default function TermPurchaseOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = parseTermStatus(searchParams.get("status"));

  const [keyword, setKeyword] = useState<string>();
  const [filter, setFilter] = useState<FilterValues>({ status: initialStatus });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterForm] = Form.useForm<FilterValues>();
  const [activeTab, setActiveTab] = useState<TermListTab>(
    searchParams.get("tab") === "paid" ? "PAID" : "ALL",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const query = useMemo<TermPurchaseOrderListQuery>(
    () => ({
      keyword: keyword || undefined,
      status: filter.status,
      paymentStatus: activeTab === "PAID" ? "PAID" : undefined,
      paymentMode: filter.paymentMode,
      supplierCustomerId: filter.supplierCustomerId || undefined,
      fromDate: filter.dateRange?.[0]?.format("YYYY-MM-DD"),
      toDate: filter.dateRange?.[1]?.format("YYYY-MM-DD"),
      page,
      pageSize,
    }),
    [activeTab, filter, keyword, page, pageSize],
  );

  const listQuery = useTermPurchaseOrderList(query);
  const printDocuments = usePrintTermOrderDocuments();

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const printOrders = async (ids: string[]) => {
    if (!ids.length) {
      message.warning("Chọn ít nhất một đơn để in.");
      return;
    }

    const result = await printDocuments.mutateAsync({ ids, autoGenerate: true });

    if (result.skipped?.length) {
      message.warning(`Có ${result.skipped.length} đơn chưa đủ dữ liệu để in.`);
    }

    if (!result.items?.length) {
      message.warning("Không có đơn đặt hàng nào đủ dữ liệu để in.");
      return;
    }

    openTermOrderDocumentsPrint(result.items);
  };

  const columns: ColumnsType<TermPurchaseOrderListItem> = [
    {
      /* Mã đơn và ngày đơn luôn được đọc cùng nhau, xếp chồng thì tiết kiệm được
         một cột mà không mất thông tin nào. */
      title: "Mã đơn / ngày đơn",
      width: 150,
      fixed: "left",
      render: (_, row) => (
        <div className="data-grid-stack">
          <Button
            type="link"
            className="page-cell-link"
            onClick={() => navigate(`/purchase-terms/${row.id}`)}
          >
            <span className="data-grid-clip data-grid-strong">{row.orderNo}</span>
          </Button>
          <span className="data-grid-clip data-grid-sub">{dateText(row.orderDate)}</span>
        </div>
      ),
    },
    {
      title: "NCC / sản phẩm",
      width: 230,
      render: (_, row) => stack(row.supplierName, row.productSummary),
    },
    {
      title: "Tổng lượng",
      dataIndex: "totalQty",
      width: 110,
      align: "right",
      render: qty,
    },
    {
      title: "Tạm tính",
      dataIndex: "totalAmount",
      width: 125,
      align: "right",
      render: money,
    },
    {
      /* Tình trạng thanh toán và hình thức trả trước/trả sau đi liền nhau khi đối
         chiếu công nợ, nên gộp chung một cột. */
      title: "Thanh toán",
      width: 145,
      render: (_, row) => (
        <div className="data-grid-stack">
          <span>{paymentStatusTag(row.paymentStatus)}</span>
          <span className="data-grid-clip data-grid-sub">
            {row.paymentMode === "PREPAID" ? "Trả trước" : "Trả sau"}
          </span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 115,
      render: statusTag,
    },
    {
      title: "Bước tiếp theo",
      dataIndex: "nextAction",
      width: 140,
      render: nextActionTag,
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      width: 100,
      render: (value) => dateText(value),
    },
    {
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
            onClick: () => navigate(`/purchase-terms/${row.id}`),
          },
          {
            key: "print",
            icon: <PrinterOutlined />,
            label: "In đơn đặt hàng",
            onClick: () => printOrders([row.id]),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              aria-label={`Thao tác đơn ${row.orderNo}`}
            />
          </Dropdown>
        );
      },
    },
  ];

  const activeFilterCount =
    Number(Boolean(filter.status)) +
    Number(Boolean(filter.paymentMode)) +
    Number(Boolean(filter.supplierCustomerId)) +
    Number(Boolean(filter.dateRange));

  const clearFilterField = (patch: Partial<FilterValues>) => {
    filterForm.setFieldsValue(patch as any);
    setFilter((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  /* Tên NCC tra ngược từ dữ liệu đang hiện trên bảng: PartySelect chỉ trả về id. */
  const supplierLabel =
    rows.find((row) => row.supplierCustomerId === filter.supplierCustomerId)?.supplierName ??
    "đã chọn";

  const filterTags: ActiveFilterTag[] = [
    filter.status
      ? {
          key: "status",
          label: `Trạng thái: ${STATUS_OPTIONS.find((o) => o.value === filter.status)?.label}`,
          onClear: () => clearFilterField({ status: undefined }),
        }
      : null,
    filter.supplierCustomerId
      ? {
          key: "supplier",
          label: `Nhà cung cấp: ${supplierLabel}`,
          onClear: () => clearFilterField({ supplierCustomerId: null }),
        }
      : null,
    filter.paymentMode
      ? {
          key: "paymentMode",
          label: `Thanh toán: ${
            PAYMENT_MODE_OPTIONS.find((o) => o.value === filter.paymentMode)?.label
          }`,
          onClear: () => clearFilterField({ paymentMode: undefined }),
        }
      : null,
    filter.dateRange
      ? {
          key: "dateRange",
          label: `Ngày đơn: ${filter.dateRange[0].format("DD/MM/YYYY")} – ${filter.dateRange[1].format("DD/MM/YYYY")}`,
          onClear: () => clearFilterField({ dateRange: null }),
        }
      : null,
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <Form
      className="page-shell-filter-panel"
      form={filterForm}
      layout="vertical"
      size="small"
      onFinish={(values) => {
        setFilter(values);
        setPage(1);
        setFilterOpen(false);
      }}
    >
      <Form.Item name="supplierCustomerId" label="Nhà cung cấp">
        <PartySelect partyRole="SUPPLIER" placeholder="Tất cả NCC" style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item name="status" label="Trạng thái">
        <Select allowClear placeholder="Tất cả" options={STATUS_OPTIONS} />
      </Form.Item>
      <Form.Item name="paymentMode" label="Hình thức thanh toán">
        <Select allowClear placeholder="Tất cả" options={PAYMENT_MODE_OPTIONS} />
      </Form.Item>
      <Form.Item name="dateRange" label="Khoảng ngày đơn">
        <RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button
          size="small"
          onClick={() => {
            filterForm.resetFields();
            setFilter({});
            setPage(1);
            setFilterOpen(false);
          }}
        >
          Đặt lại
        </Button>
        <Button size="small" type="primary" htmlType="submit">
          Áp dụng
        </Button>
      </Space>
    </Form>
  );

  return (
    <div className="page-shell">
      <PageHeader
        title="Đơn mua TERM"
        subtitle="Không phân lô/lẻ, mỗi đơn có thể có nhiều dòng hàng và một bộ bảng giá chung."
        badges={
          <>
            <Tag color="blue">TERM</Tag>
            <Tag color="green">1 bộ BILL chung</Tag>
            <Tag color="gold">Nhiều dòng hàng</Tag>
          </>
        }
        actions={
          <Space size={6}>
            <Button
              size="small"
              icon={<PrinterOutlined />}
              disabled={!selectedRowKeys.length}
              loading={printDocuments.isPending}
              onClick={() => printOrders(selectedRowKeys.map(String))}
            >
              {selectedRowKeys.length
                ? `In đơn đặt hàng (${selectedRowKeys.length})`
                : "In đơn đặt hàng"}
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/purchase-terms/create")}
            >
              Thêm đơn TERM
            </Button>
          </Space>
        }
      />

      <Tabs
        className="page-shell-tabs"
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as TermListTab);
          setSearchParams(key === "PAID" ? { tab: "paid" } : {});
          setPage(1);
          setSelectedRowKeys([]);
        }}
        items={[
          { key: "ALL", label: "Tất cả đơn TERM" },
          { key: "PAID", label: "Đơn đã thanh toán" },
        ]}
        tabBarExtraContent={{
          right: (
            <Space size={6}>
              <Input.Search
                size="small"
                allowClear
                className="page-shell-search"
                placeholder="Mã đơn, NCC hoặc sản phẩm"
                onSearch={(value) => {
                  setKeyword(value.trim() || undefined);
                  setPage(1);
                }}
              />
              <FilterButton
                count={activeFilterCount}
                open={filterOpen}
                onOpenChange={(open) => {
                  setFilterOpen(open);
                  if (open) filterForm.setFieldsValue(filter);
                }}
                content={filterPanel}
              />
              <RefreshButton
                loading={listQuery.isFetching}
                onClick={() => listQuery.refetch()}
              />
            </Space>
          ),
        }}
      />

      <FilterTags items={filterTags} />

      <Table<TermPurchaseOrderListItem>
        className="data-grid"
        rowKey="id"
        size="small"
        bordered
        tableLayout="fixed"
        scroll={{ x: 1197 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
          columnWidth: 36,
        }}
        columns={columns}
        dataSource={rows}
        loading={listQuery.isLoading || listQuery.isFetching}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `${value} đơn TERM`,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
      />
    </div>
  );
}
