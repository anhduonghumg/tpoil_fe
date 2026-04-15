import { useMemo, useState } from "react";
import { Button, Modal, Space, Tabs, Typography, message } from "antd";
import PurchaseOrderFilters from "../ui/PurchaseOrderFilters";
import PurchaseOrderTable from "../ui/PurchaseOrderTable";
import PurchaseOrderUpsertOverlay from "../ui/PurchaseOrderUpsertOverlay";
import PrintBatchModal from "../ui/PrintBatchModal";
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
  UUID,
} from "../types";
import { useProductSelect } from "../../products/hooks";
import { useNavigate } from "react-router-dom";
import { PlusOutlined, PrinterOutlined } from "@ant-design/icons";
import { notify } from "../../../shared/lib/notification";
import { openPdfPreviewByPost } from "../../../shared/lib/helper";

type ProductOption = { id: UUID; name: string; code?: string | null };

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState<PurchaseOrderListQuery>({
    keyword: "",
    businessState: undefined,
    page: 1,
    limit: 20,
  });

  const [businessTab, setBusinessTab] =
    useState<PurchaseOrderBusinessTab>("ALL");

  const listQ = usePurchaseOrderList(query);

  const [createOpen, setCreateOpen] = useState(false);

  const [productKeyword, setProductKeyword] = useState("");
  const productQ = useProductSelect(productKeyword);
  const products: ProductOption[] = productQ.data ?? [];

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const approveManyMut = useApproveManyPurchaseOrders();
  const cancelManyMut = useCancelManyPurchaseOrders();

  const printBatchMut = usePurchaseOrderPrintBatch();
  const printBatchStatusMut = usePurchaseOrderPrintBatchStatus();

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [printMetrics, setPrintMetrics] = useState<any>(null);

  const tabCountsQ = usePurchaseOrderTabCounts(query);
  const counts = tabCountsQ.data ?? {};

  const onSearchProducts = async (keyword: string) => {
    setProductKeyword(keyword);
    await productQ.refetch();
  };

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

  const header = useMemo(
    () => (
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Đơn mua hàng
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi tiến độ từng đơn từ tạo đơn, duyệt, nhận hàng, hóa đơn NCC
            đến thanh toán.
          </Typography.Text>
        </div>

        <Button
          type="primary"
          onClick={() => setCreateOpen(true)}
          size="small"
          icon={<PlusOutlined />}
        >
          Thêm đơn
        </Button>
      </Space>
    ),
    [],
  );

  return (
    <div style={{ padding: 0 }}>
      {header}

      <div style={{ marginTop: 14, marginBottom: 12 }}>
        <PurchaseOrderFilters value={query} onChange={setQuery} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Tabs
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

      <PurchaseOrderUpsertOverlay
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(poId) => {
          navigate(`/purchase-orders/${poId}`);
        }}
        products={products}
        onSearchProducts={onSearchProducts}
        defaultOrderNo=""
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
