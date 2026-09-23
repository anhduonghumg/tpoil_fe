import React, { useMemo, useState } from "react";
import { Badge, Button, DatePicker, Form, Input, Modal, Popconfirm, Segmented, Select, Space, Tabs } from "antd";
import { DeleteOutlined, ImportOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useBankAccountsOptions,
  useBankTransactions,
  useBulkQuickMatchBankTransactions,
  useDeleteBankTransaction,
  useDeleteMultipleBankTransactions,
  useGeneralPaymentReconciliationQueue,
} from "../hooks";
import type { BankTransactionItem, BankTransactionListQuery, BankTxnDirection, BankTxnMatchStatus } from "../types";
import { StatementTable } from "../ui/StatementTable";
import { StatementMatchDrawer } from "../ui/StatementMatchDrawer";
import ImportStatementModal from "../ui/ImportStatementModal";
import { ManualBankTransactionModal } from "../ui/ManualBankTransactionModal";
import { GeneralPaymentReconciliationPanel } from "../ui/GeneralPaymentReconciliationPanel";
import { OutgoingQueuePanel } from "../ui/OutgoingQueuePanel";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { notify } from "../../../shared/lib/notification";
import { accountText } from "../lib/format";
import "../banking.css";

const { RangePicker } = DatePicker;

type MoreFilters = {
  range?: [Dayjs, Dayjs] | null;
  confirmed?: "true" | "false" | "";
};

const MATCH_OPTIONS: { value: BankTxnMatchStatus; label: string }[] = [
  { value: "UNMATCHED", label: "Chưa khớp" },
  { value: "PARTIAL_MATCHED", label: "Khớp một phần" },
  { value: "AUTO_MATCHED", label: "Tự động khớp" },
  { value: "MANUAL_MATCHED", label: "Khớp thủ công" },
];

export default function BankingStatementsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Mặc định mở hàng đợi tiền ra: việc cần làm ngay sau khi import sao kê.
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "general" || tabParam === "all" ? tabParam : "outgoing";

  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<BankTransactionItem | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [keyword, setKeyword] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [direction, setDirection] = useState<BankTxnDirection | "">("");
  const [matchStatus, setMatchStatus] = useState<BankTxnMatchStatus>();
  const [more, setMore] = useState<MoreFilters>({ confirmed: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterForm] = Form.useForm<MoreFilters>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const accountsQuery = useBankAccountsOptions();
  const reconciliationQueue = useGeneralPaymentReconciliationQueue();

  /* Bộ lọc áp dụng ngay khi đổi: trước đây phải bấm "Tìm kiếm" thì mới lọc, dễ tưởng
     bảng đang lọc mà thực ra chưa. */
  const query = useMemo<BankTransactionListQuery>(() => ({
    page,
    pageSize,
    bankAccountId,
    keyword: keyword.trim() || undefined,
    direction: direction || undefined,
    matchStatus,
    confirmed: more.confirmed ?? "",
    fromDate: more.range?.[0]?.format("YYYY-MM-DD"),
    toDate: more.range?.[1]?.format("YYYY-MM-DD"),
  }), [page, pageSize, bankAccountId, keyword, direction, matchStatus, more]);

  const { data, isLoading, isFetching, refetch } = useBankTransactions(query);
  const bulkQuickMatchMutation = useBulkQuickMatchBankTransactions();
  const deleteOneMut = useDeleteBankTransaction();
  const deleteManyMut = useDeleteMultipleBankTransactions();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const accounts = (accountsQuery.data ?? []) as any[];

  const resetPage = () => {
    setPage(1);
    setSelectedRowKeys([]);
  };

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "outgoing") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const handleOpenMatch = (row: BankTransactionItem) => {
    if (row.direction === "IN") {
      navigate(`/banking/receipts?transactionId=${row.id}`);
      return;
    }
    setSelected(row);
  };

  const handleDeleteOne = (row: BankTransactionItem) => {
    Modal.confirm({
      title: "Xóa giao dịch này?",
      content: "Chỉ có thể xóa giao dịch chưa khớp và chưa xác nhận.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () => deleteOneMut.mutateAsync(row.id),
    });
  };

  const handleBulkQuickMatch = () => {
    Modal.confirm({
      title: "Khớp nhanh giao dịch",
      content: `Xác nhận khớp nhanh ${selectedRowKeys.length} giao dịch đã chọn? Hệ thống chỉ xử lý các dòng đủ điều kiện an toàn.`,
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        const result = await bulkQuickMatchMutation.mutateAsync(selectedRowKeys.map(String));
        if (result.successIds.length > 0) {
          setSelectedRowKeys((prev) => prev.filter((x) => !result.successIds.includes(String(x))));
        } else {
          notify.warning("Không có giao dịch nào đủ điều kiện khớp nhanh");
        }
        refetch();
      },
    });
  };

  const moreCount = Number(Boolean(more.range)) + Number(Boolean(more.confirmed));
  const clearMore = (patch: Partial<MoreFilters>) => {
    filterForm.setFieldsValue(patch as any);
    setMore((current) => ({ ...current, ...patch }));
    resetPage();
  };
  const filterTags = [
    more.range
      ? { key: "range", label: `Ngày: ${more.range[0].format("DD/MM/YYYY")} – ${more.range[1].format("DD/MM/YYYY")}`, onClear: () => clearMore({ range: null }) }
      : null,
    more.confirmed
      ? { key: "confirmed", label: more.confirmed === "true" ? "Đã xác nhận" : "Chưa xác nhận", onClear: () => clearMore({ confirmed: "" }) }
      : null,
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <Form
      className="page-shell-filter-panel"
      form={filterForm}
      layout="vertical"
      size="small"
      initialValues={{ confirmed: "" }}
      onFinish={(values) => {
        setMore(values);
        resetPage();
        setFilterOpen(false);
      }}
    >
      <Form.Item name="range" label="Khoảng ngày giao dịch">
        <RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item name="confirmed" label="Xác nhận">
        <Select options={[{ value: "", label: "Tất cả" }, { value: "true", label: "Đã xác nhận" }, { value: "false", label: "Chưa xác nhận" }]} />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button size="small" onClick={() => { filterForm.resetFields(); setMore({ confirmed: "" }); resetPage(); setFilterOpen(false); }}>
          Xóa lọc
        </Button>
        <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
      </Space>
    </Form>
  );

  const queueCount = reconciliationQueue.data?.length ?? 0;

  return (
    <div className="page-shell">
      <PageHeader
        title="Sao kê & đối soát"
        subtitle="Import sao kê, khớp tiền ra với hồ sơ chi; tiền vào được chuyển sang màn Thu tiền để phân bổ công nợ."
        actions={
          <>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setManualOpen(true)}>Thêm giao dịch</Button>
            <Button size="small" type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import sao kê</Button>
          </>
        }
      />

      <Tabs
        className="page-shell-tabs"
        size="small"
        activeKey={activeTab}
        onChange={setTab}
        items={[
          { key: "outgoing", label: "Tiền ra cần đối soát" },
          {
            key: "general",
            label: (
              <span>
                Đối soát chi khác
                {queueCount ? <Badge count={queueCount} size="small" style={{ marginLeft: 6, background: "#3b6fd4" }} /> : null}
              </span>
            ),
          },
          { key: "all", label: "Tất cả giao dịch" },
        ]}
      />

      {activeTab === "outgoing" ? (
        <OutgoingQueuePanel onOpenDetail={handleOpenMatch} />
      ) : activeTab === "general" ? (
        <GeneralPaymentReconciliationPanel />
      ) : (
        <>
          <div className="table-filter-toolbar" style={{ marginBottom: 0 }}>
            <div className="table-filter-toolbar-left">
              <Input.Search
                size="small"
                allowClear
                className="page-shell-search"
                placeholder="Nội dung, đối tác, mã giao dịch"
                onSearch={(value) => { setKeyword(value); resetPage(); }}
                onChange={(event) => { if (!event.target.value && keyword) { setKeyword(""); resetPage(); } }}
              />
              <Select
                size="small"
                allowClear
                placeholder="Tất cả tài khoản"
                value={bankAccountId}
                onChange={(value) => { setBankAccountId(value); resetPage(); }}
                style={{ width: 210 }}
                options={accounts.map((item) => ({ value: item.id, label: `${accountText(item)}${item.accountName ? ` — ${item.accountName}` : ""}` }))}
              />
              <Segmented<BankTxnDirection | "">
                size="small"
                value={direction}
                onChange={(value) => { setDirection(value); resetPage(); }}
                options={[{ value: "", label: "Tất cả" }, { value: "IN", label: "Tiền vào" }, { value: "OUT", label: "Tiền ra" }]}
              />
              <Select
                size="small"
                allowClear
                placeholder="Trạng thái khớp"
                value={matchStatus}
                onChange={(value) => { setMatchStatus(value); resetPage(); }}
                style={{ width: 150 }}
                options={MATCH_OPTIONS}
              />
            </div>
            <div className="table-filter-toolbar-right">
              <FilterButton count={moreCount} open={filterOpen} onOpenChange={setFilterOpen} content={filterPanel} />
              <RefreshButton loading={isFetching} onClick={() => refetch()} />
            </div>
          </div>
          <FilterTags items={filterTags} />

          {selectedRowKeys.length ? (
            <div className="banking-bulkbar">
              <span className="banking-bulkbar-count">Đã chọn {selectedRowKeys.length} giao dịch</span>
              <Button size="small" type="primary" icon={<ThunderboltOutlined />} loading={bulkQuickMatchMutation.isPending} onClick={handleBulkQuickMatch}>
                Khớp nhanh
              </Button>
              <Popconfirm
                title={`Xóa ${selectedRowKeys.length} giao dịch đã chọn?`}
                description="Chỉ các giao dịch chưa khớp và chưa xác nhận mới được xóa."
                okText="Xóa"
                okButtonProps={{ danger: true }}
                cancelText="Hủy"
                onConfirm={() => deleteManyMut.mutate(selectedRowKeys as string[], { onSuccess: () => setSelectedRowKeys([]) })}
              >
                <Button size="small" danger icon={<DeleteOutlined />} loading={deleteManyMut.isPending}>Xóa</Button>
              </Popconfirm>
              <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>Bỏ chọn</Button>
            </div>
          ) : null}

          <StatementTable
            data={rows}
            loading={isLoading || bulkQuickMatchMutation.isPending || deleteOneMut.isPending}
            page={meta?.page || page}
            pageSize={meta?.pageSize || pageSize}
            total={meta?.total || 0}
            onChangePage={(nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); }}
            onOpenMatch={handleOpenMatch}
            selectedRowKeys={selectedRowKeys}
            onChangeSelectedRowKeys={setSelectedRowKeys}
            onDeleteOne={handleDeleteOne}
          />
        </>
      )}

      <ImportStatementModal open={importOpen} onCancel={() => setImportOpen(false)} onSuccess={() => refetch()} />
      <ManualBankTransactionModal open={manualOpen} onCancel={() => setManualOpen(false)} onSuccess={() => refetch()} />
      <StatementMatchDrawer
        open={Boolean(selected)}
        transaction={selected}
        onClose={() => {
          setSelected(null);
          refetch();
        }}
      />
    </div>
  );
}
