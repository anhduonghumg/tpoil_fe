import { useState } from "react";
import {
  Badge,
  Button,
  DatePicker,
  Input,
  Modal,
  Popover,
  Space,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import PurchaseOrderTable from "../ui/PurchaseOrderTable";
import PrintBatchModal from "../ui/PrintBatchModal";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { SalesOrderCreateModal } from "../../sales/ui/SalesOrderCreateModal";
import "../../commercial-lots/commercial-lots.css";
import {
  useApproveManyPurchaseOrders,
  useCancelManyPurchaseOrders,
  usePurchaseOrderList,
  usePurchaseOrderPrintBatch,
  usePurchaseOrderPrintBatchStatus,
  usePurchaseOrderTabCounts,
} from "../hooks";
import type {
  PurchaseOrderBusinessTab,
  PurchaseOrderListQuery,
  PurchaseOrderStatus,
  PurchaseOrderType,
  UUID,
} from "../types";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FilterOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { notify } from "../../../shared/lib/notification";
import { openPdfPreviewByPost } from "../../../shared/lib/helper";

const PURCHASE_STATUSES = new Set(["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

function parsePurchaseStatus(value: string | null): PurchaseOrderStatus | undefined {
  return value && PURCHASE_STATUSES.has(value)
    ? (value as PurchaseOrderStatus)
    : undefined;
}

export default function PurchaseOrdersPage({
  fixedOrderType,
}: {
  fixedOrderType?: PurchaseOrderType;
} = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = parsePurchaseStatus(searchParams.get("status"));

  const [query, setQuery] = useState<PurchaseOrderListQuery>({
    keyword: "",
    orderType: fixedOrderType,
    status: initialStatus,
    businessState: undefined,
    page: 1,
    limit: 20,
  });

  const [businessTab, setBusinessTab] =
    useState<PurchaseOrderBusinessTab>("ALL");

  const effectiveQuery = {
    ...query,
    orderType: fixedOrderType ?? query.orderType,
  };
  const listQ = usePurchaseOrderList(effectiveQuery);

  const [salesOrderOpen, setSalesOrderOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftSupplierId, setDraftSupplierId] = useState<string>();
  const [draftDates, setDraftDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const approveManyMut = useApproveManyPurchaseOrders();
  const cancelManyMut = useCancelManyPurchaseOrders();

  const printBatchMut = usePurchaseOrderPrintBatch();
  const printBatchStatusMut = usePurchaseOrderPrintBatchStatus();

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [printMetrics, setPrintMetrics] = useState<any>(null);

  const tabCountsQ = usePurchaseOrderTabCounts(effectiveQuery);
  const counts = tabCountsQ.data ?? {};

  const openDetail = (id: string) => {
    navigate(`/purchase-orders/${id}`);
  };

  const pollPrintStatus = async (runId: UUID) => {
    const data = await printBatchStatusMut.mutateAsync(runId);

    setPrintStatus(data.status);
    setPrintMetrics(data.metrics ?? null);

    if (data.status === "SUCCESS") {
      window.open(
        `/api/purchase-orders/print-batch/${runId}/download`,
        "_blank",
      );
      setTimeout(() => {
        setPrintModalOpen(false);
      }, 300);
      return;
    }

    if (data.status === "FAILED") {
      notify.error(data.error || "Tạo bản in thất bại");
      setPrintModalOpen(false);
      return;
    }

    setTimeout(() => {
      void pollPrintStatus(runId);
    }, 1000);
  };

  const handlePrintBatch = async () => {
    const ids = selectedRowKeys as UUID[];

    if (!ids.length) {
      notify.warning("Vui lòng chọn ít nhất 1 đơn");
      return;
    }

    try {
      const result = await printBatchMut.mutateAsync(ids);
      setPrintModalOpen(true);
      setPrintStatus(result.status);
      setPrintMetrics(null);
      void pollPrintStatus(result.runId);
    } catch (error) {
      notify.error("Không thể tạo job in");
    }
  };

  const handlePrintPaymentRequests = async () => {
    const ids = selectedRowKeys as UUID[];

    if (!ids.length) {
      notify.warning("Vui lòng chọn ít nhất 1 đơn");
      return;
    }

    try {
      await openPdfPreviewByPost(
        "/api/purchase-orders/print-payment-request-batch-sync",
        { ids },
      );
    } catch {
      notify.error("Không thể mở phiếu đề nghị thanh toán");
    }
  };

  const activeFilterCount =
    Number(Boolean(query.supplierCustomerId)) + Number(Boolean(query.dateFrom));

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

      <div className="commercial-lot-toolbar">
        <Input
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Số đơn hoặc nhà cung cấp"
          value={query.keyword}
          onChange={(event) =>
            setQuery((s) => ({ ...s, keyword: event.target.value, page: 1 }))
          }
        />
        <Space size={6}>
          <Popover
            trigger="click"
            placement="bottomRight"
            open={filterOpen}
            onOpenChange={(open) => {
              setFilterOpen(open);
              if (open) {
                setDraftSupplierId(query.supplierCustomerId);
                setDraftDates(
                  query.dateFrom && query.dateTo
                    ? [dayjs(query.dateFrom), dayjs(query.dateTo)]
                    : null,
                );
              }
            }}
            content={
              <div className="commercial-lot-filter-panel">
                <Typography.Text strong>Nhà cung cấp</Typography.Text>
                <PartySelect
                  partyRole="SUPPLIER"
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
                      setQuery((s) => ({
                        ...s,
                        supplierCustomerId: undefined,
                        dateFrom: undefined,
                        dateTo: undefined,
                        page: 1,
                      }));
                      setFilterOpen(false);
                    }}
                  >
                    Đặt lại
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      setQuery((s) => ({
                        ...s,
                        supplierCustomerId: draftSupplierId as UUID | undefined,
                        dateFrom: draftDates?.[0].format("YYYY-MM-DD"),
                        dateTo: draftDates?.[1].format("YYYY-MM-DD"),
                        page: 1,
                      }));
                      setFilterOpen(false);
                    }}
                  >
                    Áp dụng
                  </Button>
                </Space>
              </div>
            }
          >
            <Badge count={activeFilterCount} size="small" offset={[-3, 3]}>
              <Button size="small" icon={<FilterOutlined />}>
                Bộ lọc
              </Button>
            </Badge>
          </Popover>
          <Tooltip title="Làm mới">
            <Button
              size="small"
              icon={<ReloadOutlined spin={listQ.isFetching} />}
              onClick={() => listQ.refetch()}
            />
          </Tooltip>
        </Space>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Tabs
          className="commercial-lot-tabs"
          activeKey={businessTab}
          onChange={(key) => {
            const tab = key as PurchaseOrderBusinessTab;
            setBusinessTab(tab);

            setQuery((s) => ({
              ...s,
              status: undefined,
              businessState: tab === "ALL" ? undefined : tab,
              page: 1,
            }));
          }}
          items={[
            {
              key: "ALL",
              label: `Tất cả (${counts.ALL ?? 0})`,
            },
            {
              key: "PENDING_APPROVAL",
              label: `Chờ duyệt (${counts.PENDING_APPROVAL ?? 0})`,
            },
            {
              key: "PENDING_RECEIPT",
              label: `Chờ nhận hàng (${counts.PENDING_RECEIPT ?? 0})`,
            },
            {
              key: "PENDING_INVOICE",
              label: `Chờ hóa đơn (${counts.PENDING_INVOICE ?? 0})`,
            },
            {
              key: "PENDING_PAYMENT",
              label: `Chờ thanh toán (${counts.PENDING_PAYMENT ?? 0})`,
            },
            {
              key: "PAID",
              label: `Đã thanh toán (${counts.PAID ?? 0})`,
            },
            {
              key: "CANCELLED",
              label: `Đã huỷ (${counts.CANCELLED ?? 0})`,
            },
          ]}
        />
        {selectedRowKeys.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Typography.Text>
                Đã chọn {selectedRowKeys.length} đơn
              </Typography.Text>

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
                onClick={() => {
                  Modal.confirm({
                    title: "Duyệt các đơn đã chọn",
                    content: `Bạn có chắc muốn duyệt ${selectedRowKeys.length} đơn đã chọn không?`,
                    onOk: async () => {
                      const res = await approveManyMut.mutateAsync(
                        selectedRowKeys as string[],
                      );
                      if (res.successIds.length > 0) {
                        setSelectedRowKeys([]);
                      }
                    },
                  });
                }}
              >
                Duyệt hàng loạt
              </Button>

              <Button
                size="small"
                danger
                loading={cancelManyMut.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: "Hủy các đơn đã chọn",
                    content: `Bạn có chắc muốn hủy ${selectedRowKeys.length} đơn đã chọn không?`,
                    onOk: async () => {
                      const res = await cancelManyMut.mutateAsync(
                        selectedRowKeys as string[],
                      );
                      if (res.successIds.length > 0) {
                        setSelectedRowKeys([]);
                      }
                    },
                  });
                }}
              >
                Hủy hàng loạt
              </Button>

              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Bỏ chọn
              </Button>
            </Space>
          </div>
        ) : null}
      </div>

      <PurchaseOrderTable
        data={listQ.data}
        loading={listQ.isLoading}
        page={query.page ?? 1}
        limit={query.limit ?? 20}
        onPageChange={(p, l) => setQuery((s) => ({ ...s, page: p, limit: l }))}
        onRowClick={openDetail}
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
      />

      <SalesOrderCreateModal
        open={salesOrderOpen}
        onClose={() => setSalesOrderOpen(false)}
      />

      <PrintBatchModal
        open={printModalOpen}
        metrics={printMetrics}
        status={printStatus}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  );
}
