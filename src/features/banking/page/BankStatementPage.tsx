import React, { useState } from "react";
import { Space, Modal, Typography, Tabs } from "antd";
import dayjs from "dayjs";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  useBankTransactions,
  useBulkQuickMatchBankTransactions,
  useDeleteBankTransaction,
  useDeleteMultipleBankTransactions,
} from "../hooks";
import type {
  BankAccountOption,
  BankStatementFilters,
  BankTransactionItem,
  BankTransactionListQuery,
} from "../types";
import { StatementHeader } from "../ui/StatementHeader";
import { StatementFilterBar } from "../ui/StatementFilterBar";
import { StatementTable } from "../ui/StatementTable";
import { StatementMatchDrawer } from "../ui/StatementMatchDrawer";
import ImportStatementModal from "../ui/ImportStatementModal";
import { notify } from "../../../shared/lib/notification";
import { TermPaymentBatchesPanel } from "../ui/TermPaymentBatchesPanel";
import { CommercialPaymentRequestsPanel } from "../ui/CommercialPaymentRequestsPanel";
import { BankingDashboardPanel } from "../ui/BankingDashboardPanel";
import { ManualBankTransactionModal } from "../ui/ManualBankTransactionModal";

export default function BankStatementPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<BankTransactionItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [filters, setFilters] = useState<BankStatementFilters>({
    bankAccountId: undefined,
    confirmed: "",
    direction: "",
    matchStatus: "",
    keyword: "",
    range: null,
  });

  const [query, setQuery] = useState<BankTransactionListQuery>({
    page: 1,
    pageSize: 20,
    confirmed: "",
  });

  const { data, isLoading, refetch } = useBankTransactions(query);
  const bulkQuickMatchMutation = useBulkQuickMatchBankTransactions();

  const deleteOneMut = useDeleteBankTransaction();
  const deleteManyMut = useDeleteMultipleBankTransactions();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const legacyTab = searchParams.get("tab");
  const tabByPath: Record<string, string> = {
    "/banking": "dashboard",
    "/banking/payment-approvals": "payment-approvals",
    "/banking/payments": "payments",
    "/banking/statements": "statements",
    "/banking/term-batches": "term-batches",
  };
  const activeTab = tabByPath[location.pathname] ?? (
    legacyTab === "term-payments" ? "term-batches" :
    legacyTab === "commercial-payments" ? "payments" :
    "dashboard"
  );
  const pathByTab: Record<string, string> = {
    dashboard: "/banking",
    "payment-approvals": "/banking/payment-approvals",
    payments: "/banking/payments",
    statements: "/banking/statements",
    "term-batches": "/banking/term-batches",
  };

  const handleSearch = () => {
    setQuery({
      page: 1,
      pageSize: query.pageSize || 20,
      bankAccountId: filters.bankAccountId,
      keyword: filters.keyword?.trim() || undefined,
      matchStatus: filters.matchStatus || undefined,
      direction: filters.direction || undefined,
      confirmed: filters.confirmed || "",
      fromDate: filters.range?.[0]
        ? filters.range[0].format("YYYY-MM-DD")
        : undefined,
      toDate: filters.range?.[1]
        ? filters.range[1].format("YYYY-MM-DD")
        : undefined,
    });
    setSelectedRowKeys([]);
  };

  const handleOpenMatch = (row: BankTransactionItem) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleBulkQuickMatch = async () => {
    if (!selectedRowKeys.length) {
      notify.warning("Vui lòng chọn giao dịch cần khớp nhanh");
      return;
    }

    Modal.confirm({
      title: "Khớp nhanh giao dịch",
      content: `Xác nhận khớp nhanh ${selectedRowKeys.length} giao dịch đã chọn? Hệ thống sẽ chỉ xử lý các dòng đủ điều kiện an toàn.`,
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        const ids = selectedRowKeys.map(String);
        const result = await bulkQuickMatchMutation.mutateAsync(ids);

        if (result.successIds.length > 0) {
          setSelectedRowKeys((prev) =>
            prev.filter((x) => !result.successIds.includes(String(x))),
          );
        }

        refetch();
      },
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Ngân hàng
      </Typography.Title>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => navigate(pathByTab[key] ?? "/banking")}
        items={[
          {
            key: "dashboard",
            label: "Dashboard cảnh báo",
            children: <BankingDashboardPanel />,
          },
          {
            key: "payment-approvals",
            label: "Đề nghị duyệt chi",
            children: <CommercialPaymentRequestsPanel view="approval" />,
          },
          {
            key: "payments",
            label: "Thanh toán",
            children: <CommercialPaymentRequestsPanel view="payment" />,
          },
          {
            key: "statements",
            label: "Sao kê",
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <StatementFilterBar
                    filters={filters}
                    onChange={setFilters}
                    onSearch={handleSearch}
                  />

                  <StatementHeader
                    onOpenImport={() => setImportOpen(true)}
                    onOpenManual={() => setManualOpen(true)}
                    onBulkQuickMatch={handleBulkQuickMatch}
                    bulkDisabled={!selectedRowKeys.length}
                    bulkLoading={bulkQuickMatchMutation.isPending}
                    selectedCount={selectedRowKeys.length}
                  />
                </div>

                <StatementTable
                  data={rows}
                  loading={isLoading || bulkQuickMatchMutation.isPending}
                  page={meta?.page || query.page || 1}
                  pageSize={meta?.pageSize || query.pageSize || 20}
                  total={meta?.total || 0}
                  onChangePage={(page, pageSize) =>
                    setQuery((s) => ({ ...s, page, pageSize }))
                  }
                  onOpenMatch={handleOpenMatch}
                  selectedRowKeys={selectedRowKeys}
                  onChangeSelectedRowKeys={setSelectedRowKeys}
                  deleting={deleteOneMut.isPending || deleteManyMut.isPending}
                  onDeleteOne={(row) => deleteOneMut.mutate(row.id)}
                  onDeleteMany={(ids) =>
                    deleteManyMut.mutate(ids as string[], {
                      onSuccess: () => setSelectedRowKeys([]),
                    })
                  }
                />
              </Space>
            ),
          },
          {
            key: "term-batches",
            label: "Bảng kê TERM",
            children: <TermPaymentBatchesPanel />,
          },
        ]}
      />

      <ImportStatementModal
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      <ManualBankTransactionModal
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      <StatementMatchDrawer
        open={drawerOpen}
        transaction={selected}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
          refetch();
        }}
      />
    </Space>
  );
}
