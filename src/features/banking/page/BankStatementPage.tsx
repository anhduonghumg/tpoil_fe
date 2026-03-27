import React, { useState } from "react";
import { Space, Modal, Typography } from "antd";
import dayjs from "dayjs";
import {
  useBankTransactions,
  useBulkQuickMatchBankTransactions,
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

export default function BankStatementPage() {
  const [importOpen, setImportOpen] = useState(false);
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

  const rows = data?.data ?? [];
  const meta = data?.meta;

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
        Sao kê ngân hàng
      </Typography.Title>
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
      />

      <ImportStatementModal
        open={importOpen}
        onCancel={() => setImportOpen(false)}
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
