import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DatePicker,
  Input,
  Modal,
  Popover,
  Progress,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FilterOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import PrintBatchModal from "../ui/PrintBatchModal";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { SalesOrderCreateModal } from "../../sales/ui/SalesOrderCreateModal";
import { SalesOrdersPendingPanel } from "../../sales/ui/SalesOrdersPendingPanel";
import {
  useApproveManyPurchaseOrders,
  useCancelManyPurchaseOrders,
  usePurchaseOrderPrintBatch,
  usePurchaseOrderPrintBatchStatus,
  useRetailPurchaseList,
} from "../hooks";
import type { UUID } from "../types";
import type {
  RetailLifecycle,
  RetailPurchaseListItem,
} from "../retail-detail.types";
import { notify } from "../../../shared/lib/notification";
import { openPdfPreviewByPost } from "../../../shared/lib/helper";
import "../../commercial-lots/commercial-lots.css";

const SALES_ORDERS_TAB = "SALES_ORDERS";
const ALL_TAB = "ALL";
const WORKING_TAB = "WORKING";

const LIFECYCLE_LABELS: Record<RetailLifecycle, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  PENDING_INVOICE: "Chờ hóa đơn",
  PENDING_PAYMENT: "Chờ thanh toán",
  READY_TO_RECEIVE: "Sẵn sàng nhập",
  RECEIVING: "Đang nhập kho",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const LIFECYCLE_COLORS: Record<RetailLifecycle, string> = {
  PENDING_APPROVAL: "gold",
  PENDING_INVOICE: "cyan",
  PENDING_PAYMENT: "orange",
  READY_TO_RECEIVE: "blue",
  RECEIVING: "geekblue",
  COMPLETED: "green",
  CANCELLED: "default",
};

const LIFECYCLE_ORDER: RetailLifecycle[] = [
  "PENDING_APPROVAL",
  "PENDING_INVOICE",
  "PENDING_PAYMENT",
  "READY_TO_RECEIVE",
  "RECEIVING",
  "COMPLETED",
  "CANCELLED",
];

const WORKING_LIFECYCLES: RetailLifecycle[] = [
  "PENDING_INVOICE",
  "PENDING_PAYMENT",
  "READY_TO_RECEIVE",
  "RECEIVING",
];

const formatQty = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

function parseLifecycle(value: string | null): RetailLifecycle | undefined {
  return value && (LIFECYCLE_ORDER as string[]).includes(value)
    ? (value as RetailLifecycle)
    : undefined;
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState("");
  const [supplierId, setSupplierId] = useState<string>();
  const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftSupplierId, setDraftSupplierId] = useState<string>();
  const [draftDates, setDraftDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [lifecycle, setLifecycle] = useState<RetailLifecycle | undefined>(
    parseLifecycle(searchParams.get("lifecycle")),
  );
  const [lifecycleGroup, setLifecycleGroup] = useState<string | undefined>(
    searchParams.get("lifecycleGroup") === "working" ? WORKING_TAB : undefined,
  );
  const [activeTab, setActiveTab] = useState<string>(
    parseLifecycle(searchParams.get("lifecycle")) ?? ALL_TAB,
  );
  const [page, setPage] = useState(1);

  const [salesOrderOpen, setSalesOrderOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [printMetrics, setPrintMetrics] = useState<any>(null);

  const approveManyMut = useApproveManyPurchaseOrders();
  const cancelManyMut = useCancelManyPurchaseOrders();
  const printBatchMut = usePurchaseOrderPrintBatch();
  const printBatchStatusMut = usePurchaseOrderPrintBatchStatus();

  const listQuery = useRetailPurchaseList({
    keyword: keyword.trim() || undefined,
    supplierCustomerId: supplierId,
    lifecycle: lifecycleGroup === WORKING_TAB ? undefined : lifecycle,
    dateFrom: dates?.[0].format("YYYY-MM-DD"),
    dateTo: dates?.[1].format("YYYY-MM-DD"),
    page,
    limit: lifecycleGroup === WORKING_TAB ? 200 : 20,
  });

  const items = listQuery.data?.items ?? [];
  const visibleItems =
    lifecycleGroup === WORKING_TAB
      ? items.filter((item) => WORKING_LIFECYCLES.includes(item.lifecycle))
      : items;

  const columns = useMemo<ColumnsType<RetailPurchaseListItem>>(
    () => [
      {
        title: "Số đơn",
        dataIndex: "orderNo",
        width: 190,
        fixed: "left",
        render: (value, row) => (
          <Button
            type="link"
            className="commercial-lot-order-link"
            onClick={() => navigate(`/purchase-orders/${row.id}`)}
          >
            {value}
          </Button>
        ),
      },
      {
        title: "Ngày đặt",
        dataIndex: "orderDate",
        width: 105,
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Nhà cung cấp",
        dataIndex: "supplier",
        width: 130,
        ellipsis: true,
        render: (supplier) => supplier?.code ?? "-",
      },
      {
        title: "Đơn khách đặt",
        key: "salesOrder",
        width: 150,
        render: (_, row) =>
          row.salesOrder ? (
            <Tag color="blue">{row.salesOrder.orderNo}</Tag>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          ),
      },
      {
        title: "Số lượng",
        dataIndex: ["quantities", "orderedQty"],
        width: 115,
        align: "right",
        render: formatQty,
      },
      {
        title: "Đã hóa đơn",
        dataIndex: ["quantities", "invoicedQty"],
        width: 120,
        align: "right",
        render: formatQty,
      },
      {
        title: "Đã nhập kho",
        dataIndex: ["quantities", "receivedQty"],
        width: 120,
        align: "right",
        render: formatQty,
      },
      {
        title: "Còn phải nhập",
        dataIndex: ["quantities", "remainingToReceive"],
        width: 125,
        align: "right",
        render: formatQty,
      },
      {
        title: "Giá trị",
        dataIndex: "orderValue",
        width: 130,
        align: "right",
        render: (value) => `${formatMoney(value)} đ`,
      },
      {
        title: "Tiến độ nhập",
        key: "progress",
        width: 150,
        render: (_, row) => {
          const ordered = row.quantities.orderedQty;
          const percent = ordered
            ? Math.min(Math.round((row.quantities.receivedQty / ordered) * 100), 100)
            : 0;
          return (
            <div className="commercial-lot-progress">
              <div className="commercial-lot-progress-label">
                <span>{percent}%</span>
                <span>{formatQty(row.quantities.receivedQty)}</span>
              </div>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          );
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "lifecycle",
        width: 145,
        fixed: "right",
        render: (value: RetailLifecycle) => (
          <Tag color={LIFECYCLE_COLORS[value]}>{LIFECYCLE_LABELS[value]}</Tag>
        ),
      },
    ],
    [navigate],
  );

  const pollPrintStatus = async (runId: UUID) => {
    const data = await printBatchStatusMut.mutateAsync(runId);
    setPrintStatus(data.status);
    setPrintMetrics(data.metrics ?? null);

    if (data.status === "SUCCESS") {
      window.open(`/api/purchase-orders/print-batch/${runId}/download`, "_blank");
      setTimeout(() => setPrintModalOpen(false), 300);
      return;
    }
    if (data.status === "FAILED") {
      notify.error(data.error || "Tạo bản in thất bại");
      setPrintModalOpen(false);
      return;
    }
    setTimeout(() => void pollPrintStatus(runId), 1000);
  };

  const handlePrintBatch = async () => {
    const ids = selectedRowKeys as UUID[];
    if (!ids.length) return notify.warning("Vui lòng chọn ít nhất 1 đơn");
    try {
      const result = await printBatchMut.mutateAsync(ids);
      setPrintModalOpen(true);
      setPrintStatus(result.status);
      setPrintMetrics(null);
      void pollPrintStatus(result.runId);
    } catch {
      notify.error("Không thể tạo job in");
    }
  };

  const handlePrintPaymentRequests = async () => {
    const ids = selectedRowKeys as UUID[];
    if (!ids.length) return notify.warning("Vui lòng chọn ít nhất 1 đơn");
    try {
      await openPdfPreviewByPost("/api/purchase-orders/print-payment-request-batch-sync", {
        ids,
      });
    } catch {
      notify.error("Không thể mở phiếu đề nghị thanh toán");
    }
  };

  const tabItems = [
    { key: SALES_ORDERS_TAB, label: "Đơn khách đặt" },
    { key: ALL_TAB, label: "Tất cả" },
    { key: WORKING_TAB, label: "Working" },
    ...LIFECYCLE_ORDER.map((key) => ({ key, label: LIFECYCLE_LABELS[key] })),
  ];

  return (
    <div className="commercial-lot-page">
      <div className="commercial-lot-header">
        <div>
          <Typography.Title level={3} className="commercial-lot-title">
            Mua thương mại lẻ
          </Typography.Title>
          <Typography.Text className="commercial-lot-subtitle">
            Theo dõi từ đơn đặt của khách, đơn mua, hóa đơn, thanh toán đến nhập kho
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setSalesOrderOpen(true)}>
            Tạo đơn đặt hàng (KD)
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/commercial-purchases/retail/create")}
          >
            Tạo đơn mua lẻ
          </Button>
        </Space>
      </div>

      {activeTab !== SALES_ORDERS_TAB ? (
        <div className="commercial-lot-toolbar">
          <Input
            size="small"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Số đơn hoặc nhà cung cấp"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
          <Space size={6}>
            <Popover
              trigger="click"
              placement="bottomRight"
              open={filterOpen}
              onOpenChange={(open) => {
                setFilterOpen(open);
                if (open) {
                  setDraftSupplierId(supplierId);
                  setDraftDates(dates);
                }
              }}
              content={
                <div className="commercial-lot-filter-panel">
                  <Typography.Text strong>Nhà cung cấp</Typography.Text>
                  <PartySelect
                    partyRole="SUPPLIER"
                    displayMode="code"
                    placeholder="Chọn nhà cung cấp"
                    value={draftSupplierId}
                    onChange={(value) => setDraftSupplierId(value ?? undefined)}
                  />
                  <Typography.Text strong>Ngày đặt</Typography.Text>
                  <DatePicker.RangePicker
                    value={draftDates}
                    format="DD/MM/YYYY"
                    onChange={(value) =>
                      setDraftDates(value as [dayjs.Dayjs, dayjs.Dayjs] | null)
                    }
                    style={{ width: "100%" }}
                  />
                  <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setSupplierId(undefined);
                        setDates(null);
                        setFilterOpen(false);
                        setPage(1);
                      }}
                    >
                      Đặt lại
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        setSupplierId(draftSupplierId);
                        setDates(draftDates);
                        setFilterOpen(false);
                        setPage(1);
                      }}
                    >
                      Áp dụng
                    </Button>
                  </Space>
                </div>
              }
            >
              <Badge
                count={Number(Boolean(supplierId)) + Number(Boolean(dates))}
                size="small"
                offset={[-3, 3]}
              >
                <Button size="small" icon={<FilterOutlined />}>
                  Bộ lọc
                </Button>
              </Badge>
            </Popover>
            <Tooltip title="Làm mới">
              <Button
                size="small"
                icon={<ReloadOutlined spin={listQuery.isFetching} />}
                onClick={() => listQuery.refetch()}
              />
            </Tooltip>
          </Space>
        </div>
      ) : null}

      <Tabs
        className="commercial-lot-tabs"
        activeKey={activeTab}
        items={tabItems}
        onChange={(key) => {
          setActiveTab(key);
          setSelectedRowKeys([]);
          if (key === SALES_ORDERS_TAB) {
            setSearchParams({ tab: "sales-orders" });
            return;
          }
          const nextLifecycle =
            key === ALL_TAB || key === WORKING_TAB ? undefined : (key as RetailLifecycle);
          const nextGroup = key === WORKING_TAB ? WORKING_TAB : undefined;
          setLifecycle(nextLifecycle);
          setLifecycleGroup(nextGroup);
          if (nextGroup) setSearchParams({ lifecycleGroup: "working" });
          else if (nextLifecycle) setSearchParams({ lifecycle: nextLifecycle });
          else setSearchParams({});
          setPage(1);
        }}
      />

      {activeTab === SALES_ORDERS_TAB ? (
        <SalesOrdersPendingPanel />
      ) : (
        <>
          {selectedRowKeys.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <Space wrap>
                <Typography.Text>Đã chọn {selectedRowKeys.length} đơn</Typography.Text>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  loading={printBatchMut.isPending}
                  onClick={handlePrintBatch}
                >
                  In
                </Button>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={handlePrintPaymentRequests}
                >
                  In phiếu đề nghị thanh toán
                </Button>
                <Button
                  size="small"
                  type="primary"
                  loading={approveManyMut.isPending}
                  onClick={() =>
                    Modal.confirm({
                      title: "Duyệt các đơn đã chọn",
                      content: `Bạn có chắc muốn duyệt ${selectedRowKeys.length} đơn đã chọn không?`,
                      onOk: async () => {
                        const res = await approveManyMut.mutateAsync(
                          selectedRowKeys as string[],
                        );
                        if (res.successIds.length > 0) setSelectedRowKeys([]);
                      },
                    })
                  }
                >
                  Duyệt hàng loạt
                </Button>
                <Button
                  size="small"
                  danger
                  loading={cancelManyMut.isPending}
                  onClick={() =>
                    Modal.confirm({
                      title: "Hủy các đơn đã chọn",
                      content: `Bạn có chắc muốn hủy ${selectedRowKeys.length} đơn đã chọn không?`,
                      onOk: async () => {
                        const res = await cancelManyMut.mutateAsync(
                          selectedRowKeys as string[],
                        );
                        if (res.successIds.length > 0) setSelectedRowKeys([]);
                      },
                    })
                  }
                >
                  Hủy hàng loạt
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  Bỏ chọn
                </Button>
              </Space>
            </div>
          ) : null}

          <Table<RetailPurchaseListItem>
            className="commercial-lot-table"
            rowKey="id"
            size="small"
            loading={listQuery.isLoading}
            columns={columns}
            dataSource={visibleItems}
            scroll={{ x: 1450 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              current: page,
              pageSize: 20,
              total:
                lifecycleGroup === WORKING_TAB
                  ? visibleItems.length
                  : listQuery.data?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `${total} đơn mua lẻ`,
              onChange: setPage,
            }}
            onRow={(row) => ({
              onDoubleClick: () => navigate(`/purchase-orders/${row.id}`),
            })}
          />
        </>
      )}

      <SalesOrderCreateModal open={salesOrderOpen} onClose={() => setSalesOrderOpen(false)} />

      <PrintBatchModal
        open={printModalOpen}
        metrics={printMetrics}
        status={printStatus}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  );
}
