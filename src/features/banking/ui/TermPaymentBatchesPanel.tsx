import React, { useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from "antd";
import { CheckOutlined, EyeOutlined, LinkOutlined, MoreOutlined, PlusOutlined, SendOutlined, UploadOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import "../../../shared/ui/data-grid.css";
import "../../../shared/ui/page-shell.css";
import { BankingSection } from "./BankingKpis";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { toAbsUrl } from "../../../shared/lib/url";
import { APP_BOOTSTRAP_QUERY_KEY } from "../../app/hooks";
import { BankingApi } from "../api";
import {
  bankingKeys,
  useBankTransactions,
  useConfirmTermPaymentBatchItemPaid,
  useCreateTermPaymentBatch,
  useMatchTermPaymentBatchItem,
  useSendTermPaymentBatch,
  useTermPaymentBatchDetail,
  useTermPaymentBatches,
  useTermPaymentPendingRequests,
} from "../hooks";
import type {
  BankTransactionItem,
  TermPaymentBatch,
  TermPaymentBatchFile,
  TermPaymentBatchFileType,
  TermPaymentBatchItem,
  TermPaymentPendingRequest,
} from "../types";
import "../banking.css";

function money(value?: number | null) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(Number(value || 0)));
}

function dateText(value?: string | null) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "--";
}

function batchStatus(status?: string) {
  const map: Record<string, { text: string; color?: string }> = {
    DRAFT: { text: "Nháp" },
    SENT_TO_BANK: { text: "Đã gửi ngân hàng", color: "blue" },
    PARTIALLY_PAID: { text: "Thanh toán một phần", color: "gold" },
    PAID: { text: "Đã thanh toán", color: "green" },
    CANCELLED: { text: "Đã hủy", color: "red" },
  };
  const item = map[status || ""] || { text: status || "--" };
  return <Tag color={item.color}>{item.text}</Tag>;
}

function itemStatus(status?: string) {
  const map: Record<string, { text: string; color?: string }> = {
    PENDING: { text: "Chờ gửi" },
    SENT: { text: "Đã gửi, chờ sao kê", color: "blue" },
    PARTIALLY_PAID: { text: "Thanh toán một phần", color: "gold" },
    PAID: { text: "Đã thanh toán", color: "green" },
    FAILED: { text: "Lỗi", color: "red" },
    CANCELLED: { text: "Đã hủy", color: "red" },
  };
  const item = map[status || ""] || { text: status || "--" };
  return <Tag color={item.color}>{item.text}</Tag>;
}

function amountDiff(itemAmount?: number | null, txnAmount?: number | null) {
  return Math.abs(Number(itemAmount || 0) - Number(txnAmount || 0));
}

function fileTypeText(type?: string) {
  if (type === "UNC") return "Ủy nhiệm chi";
  if (type === "EXPORTED_LIST") return "Bảng kê";
  if (type === "BANK_RETURN") return "File ngân hàng";
  return "Khác";
}

function fileSizeText(value?: number | null) {
  const size = Number(value || 0);
  if (!size) return "--";
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function openFile(url?: string | null) {
  const absoluteUrl = toAbsUrl(url);
  if (!absoluteUrl) return;
  window.open(absoluteUrl, "_blank", "noopener,noreferrer");
}

const isItemOpen = (item: TermPaymentBatchItem) => item.status !== "PAID" && item.status !== "CANCELLED";

export type BatchStep = "SEND" | "UPLOAD_UNC" | "CONFIRM" | "MATCH" | "DONE";

/** Việc cần làm tiếp theo của một bảng kê, theo đúng thứ tự backend yêu cầu:
    gửi ngân hàng → có UNC → khớp sao kê từng dòng → xác nhận đã chi. */
export function batchNextStep(batch: TermPaymentBatch): { step: BatchStep; count: number } {
  if (batch.status === "PAID" || batch.status === "CANCELLED") return { step: "DONE", count: 0 };
  if (batch.status === "DRAFT") return { step: "SEND", count: 0 };
  if (!batch.files?.some((file) => file.fileType === "UNC")) return { step: "UPLOAD_UNC", count: 0 };
  const open = (batch.items ?? []).filter(isItemOpen);
  const matched = open.filter((item) => item.bankTransactionId).length;
  if (matched) return { step: "CONFIRM", count: matched };
  if (open.length) return { step: "MATCH", count: open.length };
  return { step: "DONE", count: 0 };
}

export function TermPaymentBatchesPanel({ toolbarLeft }: { toolbarLeft?: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedRequestIds, setSelectedRequestIds] = useState<React.Key[]>([]);
  const [batchDate, setBatchDate] = useState(dayjs());
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>();
  const [matchingItem, setMatchingItem] =
    useState<TermPaymentBatchItem | null>(null);
  const [transactionKeyword, setTransactionKeyword] = useState("");
  const [confirmingBatchId, setConfirmingBatchId] = useState<string | undefined>();

  const pendingQuery = useTermPaymentPendingRequests();
  const batchesQuery = useTermPaymentBatches({ page: 1, pageSize: 20 });
  const batchDetailQuery = useTermPaymentBatchDetail(activeBatchId);
  const bankTransactionsQuery = useBankTransactions({
    page: 1,
    pageSize: 50,
    direction: "OUT",
    matchStatus: "UNMATCHED",
    confirmed: "false",
    keyword: transactionKeyword.trim() || undefined,
  });
  const createBatch = useCreateTermPaymentBatch();
  const sendBatch = useSendTermPaymentBatch();
  const matchItem = useMatchTermPaymentBatchItem(activeBatchId);
  const confirmPaid = useConfirmTermPaymentBatchItemPaid(activeBatchId);

  const pendingRows = Array.isArray(pendingQuery.data)
    ? pendingQuery.data
    : [];
  const batches = Array.isArray(batchesQuery.data?.items)
    ? batchesQuery.data.items
    : [];
  const batchItems = Array.isArray(batchDetailQuery.data?.items)
    ? batchDetailQuery.data.items
    : [];
  const batchFiles = Array.isArray(batchDetailQuery.data?.files)
    ? batchDetailQuery.data.files
    : [];
  const transactionRows = Array.isArray((bankTransactionsQuery.data as any)?.data)
    ? (bankTransactionsQuery.data as any).data
    : Array.isArray(bankTransactionsQuery.data)
      ? (bankTransactionsQuery.data as any)
      : [];

  const createSelectedBatch = () => {
    const ids = selectedRequestIds.map(String);
    if (!ids.length) {
      message.warning("Chọn ít nhất một đề nghị thanh toán.");
      return;
    }
    createBatch.mutate(
      {
        paymentRequestIds: ids,
        batchDate: batchDate.format("YYYY-MM-DD"),
      },
      {
        onSuccess: () => {
          setSelectedRequestIds([]);
          pendingQuery.refetch();
          batchesQuery.refetch();
        },
      },
    );
  };

  const uploadBatchFile =
    (batch: TermPaymentBatch, fileType: TermPaymentBatchFileType) =>
    async (options: UploadRequestOption) => {
      const file = options.file as File;
      if (file.size > 8 * 1024 * 1024) {
        const error = new Error("File tối đa 8MB.");
        message.error(error.message);
        options.onError?.(error);
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("fileType", fileType);
      try {
        await BankingApi.uploadTermPaymentBatchFile(batch.id, form);
        message.success(
          fileType === "UNC"
            ? "Đã lưu file ủy nhiệm chi."
            : "Đã lưu file bảng kê.",
        );
        batchesQuery.refetch();
        if (activeBatchId === batch.id) batchDetailQuery.refetch();
        options.onSuccess?.({}, new XMLHttpRequest());
      } catch (error: any) {
        message.error(error?.message || "Upload file thất bại.");
        options.onError?.(error);
      }
    };

  const confirmMatchedItems = async (
    batchId: string,
    items: TermPaymentBatchItem[] = [],
  ) => {
    const confirmableItems = items.filter(
      (item) =>
        item.bankTransactionId &&
        item.status !== "PAID" &&
        item.status !== "CANCELLED",
    );

    if (!confirmableItems.length) {
      message.warning("Chưa có dòng nào đã khớp sao kê để xác nhận.");
      return;
    }

    setConfirmingBatchId(batchId);
    try {
      for (const item of confirmableItems) {
        await BankingApi.confirmTermPaymentBatchItemPaid(batchId, item.id);
      }
      message.success("Đã xác nhận thanh toán và thông báo sang mua hàng.");
      batchesQuery.refetch();
      if (activeBatchId === batchId) batchDetailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: bankingKeys.all });
      queryClient.invalidateQueries({ queryKey: APP_BOOTSTRAP_QUERY_KEY });
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Xác nhận thanh toán thất bại.",
      );
    } finally {
      setConfirmingBatchId(undefined);
    }
  };

  const handleMatchTransaction = (transaction: BankTransactionItem) => {
    if (!matchingItem) return;
    matchItem.mutate(
      {
        itemId: matchingItem.id,
        bankTransactionId: transaction.id,
      },
      {
        onSuccess: () => {
          message.success("Đã khớp sao kê, chờ xác nhận thanh toán.");
          setMatchingItem(null);
          batchDetailQuery.refetch();
          batchesQuery.refetch();
          bankTransactionsQuery.refetch();
        },
      },
    );
  };

  const selectedTotal = pendingRows
    .filter((row) => selectedRequestIds.includes(row.id))
    .reduce((sum, row) => sum + Number(row.amountVnd || 0), 0);

  const pendingColumns: ColumnsType<TermPaymentPendingRequest> = [
    {
      title: "Mã đơn",
      dataIndex: "orderNo",
      width: 150,
      fixed: "left",
      render: (v, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip data-grid-strong">{v}</span>
          <span className="data-grid-clip data-grid-sub">{row.requestNo} · {dateText(row.requestDate)}</span>
        </div>
      ),
    },
    { title: "Nhà cung cấp", dataIndex: "supplierName", width: 230, render: (v) => <span className="data-grid-clip data-grid-strong">{v || "—"}</span> },
    {
      title: "Số tiền",
      dataIndex: "amountVnd",
      align: "right",
      width: 140,
      render: (v) => <span className="data-grid-num data-grid-strong">{money(v)}</span>,
    },
    { title: "Hạn TT", dataIndex: "paymentDeadline", width: 95, render: dateText },
    {
      title: "Nội dung",
      dataIndex: "content",
      render: (v) => (
        <Tooltip title={v}>
          <span className="data-grid-clip">{v || "—"}</span>
        </Tooltip>
      ),
    },
  ];

  const batchColumns: ColumnsType<TermPaymentBatch> = [
    {
      /* Một bảng kê gom nhiều đơn: hiện mã đơn trước để ngân hàng tra theo đơn hàng. */
      title: "Mã đơn",
      render: (_, row) => {
        const orders = [...new Set((row.items ?? []).map((item) => item.purchaseOrder?.orderNo).filter(Boolean))] as string[];
        const shown = orders.slice(0, 2).join(", ");
        return (
          <Tooltip title={orders.length > 2 ? orders.join(", ") : undefined}>
            <span className="data-grid-clip data-grid-strong">
              {shown || "—"}
              {orders.length > 2 ? <span className="data-grid-sub-inline"> +{orders.length - 2}</span> : null}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Bảng kê / ngày",
      dataIndex: "batchNo",
      width: 140,
      render: (v, row) => (
        <div className="data-grid-stack">
          <a className="data-grid-clip data-grid-strong" onClick={() => setActiveBatchId(row.id)}>{v}</a>
          <span className="data-grid-clip data-grid-sub">{dateText(row.batchDate)}</span>
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmountVnd",
      align: "right",
      width: 150,
      render: (v, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-num data-grid-strong">{money(v)}</span>
          <span className="data-grid-sub">{row.itemCount} dòng</span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: batchStatus,
    },
    {
      /* Cho thấy ngay bảng kê còn thiếu giấy tờ gì, thay vì phải mở từng bảng. */
      title: "Chứng từ",
      width: 190,
      render: (_, row) => {
        const hasList = row.files?.some((file) => file.fileType === "EXPORTED_LIST");
        const uncCount = row.files?.filter((file) => file.fileType === "UNC").length ?? 0;
        return (
          <div className="data-grid-tags">
            <Tag color={hasList ? "green" : "default"}>{hasList ? "✓ Bảng kê" : "Thiếu bảng kê"}</Tag>
            <Tag color={uncCount ? "green" : "orange"}>UNC {uncCount}/3</Tag>
          </div>
        );
      },
    },
    {
      /* Mỗi bảng kê chỉ có một nút chính: đúng việc phải làm tiếp theo. Các thao tác
         còn lại (tải lại file, xem chi tiết) nằm trong menu "⋯". */
      title: "Bước tiếp theo",
      width: 250,
      render: (_, row) => {
        const next = batchNextStep(row);
        const uncCount = row.files?.filter((file) => file.fileType === "UNC").length ?? 0;
        const openMatch = () => {
          setActiveBatchId(row.id);
          const open = (row.items ?? []).filter(isItemOpen).filter((item) => !item.bankTransactionId);
          if (open.length === 1) setMatchingItem(open[0]);
        };
        const primary =
          next.step === "SEND" ? (
            <Button size="small" type="primary" icon={<SendOutlined />} loading={sendBatch.isPending} onClick={() => sendBatch.mutate(row.id, { onSuccess: () => batchesQuery.refetch() })}>
              Xác nhận đã gửi NH
            </Button>
          ) : next.step === "UPLOAD_UNC" ? (
            <Upload showUploadList={false} customRequest={uploadBatchFile(row, "UNC")} multiple maxCount={3}>
              <Button size="small" type="primary" icon={<UploadOutlined />}>Tải UNC</Button>
            </Upload>
          ) : next.step === "CONFIRM" ? (
            <Button size="small" type="primary" icon={<CheckOutlined />} loading={confirmingBatchId === row.id} onClick={() => confirmMatchedItems(row.id, row.items || [])}>
              Xác nhận đã chi ({next.count})
            </Button>
          ) : next.step === "MATCH" ? (
            <Button size="small" type="primary" icon={<LinkOutlined />} onClick={openMatch}>
              Khớp sao kê ({next.count} dòng)
            </Button>
          ) : (
            <Tag color="green" icon={<CheckOutlined />}>Hoàn tất</Tag>
          );
        const menuItems: MenuProps["items"] = [
          { key: "detail", icon: <EyeOutlined />, label: "Xem chi tiết", onClick: () => setActiveBatchId(row.id) },
          {
            key: "list",
            icon: <UploadOutlined />,
            label: (
              <Upload showUploadList={false} customRequest={uploadBatchFile(row, "EXPORTED_LIST")}>
                <span>Tải file bảng kê</span>
              </Upload>
            ),
          },
          ...(next.step !== "UPLOAD_UNC" && uncCount < 3
            ? [{
              key: "unc",
              icon: <UploadOutlined />,
              label: (
                <Upload showUploadList={false} customRequest={uploadBatchFile(row, "UNC")} multiple maxCount={3 - uncCount}>
                  <span>Tải thêm UNC ({uncCount}/3)</span>
                </Upload>
              ),
            }]
            : []),
        ];
        return (
          <Space size={2}>
            {primary}
            <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: menuItems }}>
              <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thêm thao tác" />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const itemColumns: ColumnsType<TermPaymentBatchItem> = [
    {
      title: "Mã đơn",
      width: 150,
      render: (_, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip data-grid-strong">{row.purchaseOrder?.orderNo || "—"}</span>
          <span className="data-grid-clip data-grid-sub">{row.paymentRequest?.requestNo || "—"}</span>
        </div>
      ),
    },
    {
      title: "Thụ hưởng / tài khoản",
      width: 240,
      render: (_, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip data-grid-strong">{row.beneficiaryName || row.supplierName}</span>
          {row.beneficiaryBankAccount ? (
            <span className="data-grid-clip data-grid-sub">{row.beneficiaryBankName ?? ""} · {row.beneficiaryBankAccount}</span>
          ) : (
            <span className="data-grid-clip data-grid-sub" style={{ color: "#c0392b" }}>Chưa có tài khoản thụ hưởng</span>
          )}
        </div>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amountVnd",
      align: "right",
      width: 140,
      render: (v, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-num data-grid-strong">{money(v)}</span>
          <span className="data-grid-sub">Đã TT {money(row.paidAmountVnd)}</span>
        </div>
      ),
    },
    {
      title: "Nội dung CK",
      dataIndex: "transferContent",
      render: (v) => (
        <Tooltip title={v}>
          <span className="data-grid-clip">{v || "—"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 170,
      render: itemStatus,
    },
    {
      title: "",
      width: 250,
      render: (_, row) => {
        const closed = row.status === "PAID" || row.status === "CANCELLED";
        const canConfirm = !closed && !!row.bankTransactionId;

        return (
          <Space size={6}>
            <Button
              size="small"
              disabled={closed}
              onClick={() => setMatchingItem(row)}
            >
              Khớp sao kê
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={!canConfirm}
              loading={confirmPaid.isPending}
              onClick={() =>
                confirmPaid.mutate(row.id, {
                  onSuccess: () => {
                    batchDetailQuery.refetch();
                    batchesQuery.refetch();
                  },
                })
              }
            >
              Xác nhận đã thanh toán
            </Button>
          </Space>
        );
      },
    },
  ];

  const transactionColumns: ColumnsType<BankTransactionItem> = [
    { title: "Ngày", dataIndex: "txnDate", width: 110, render: dateText },
    {
      title: "Số tiền",
      dataIndex: "amount",
      align: "right",
      width: 150,
      render: (v) => `${money(v)} đ`,
    },
    {
      title: "Chênh lệch",
      width: 130,
      align: "right",
      render: (_, row) =>
        `${money(amountDiff(matchingItem?.amountVnd, row.amount))} đ`,
    },
    { title: "Đối tượng", dataIndex: "counterpartyName", width: 180 },
    { title: "Nội dung sao kê", dataIndex: "description", ellipsis: true },
    {
      title: "",
      width: 90,
      render: (_, row) => (
        <Button
          size="small"
          type="primary"
          loading={matchItem.isPending}
          onClick={() => handleMatchTransaction(row)}
        >
          Chọn
        </Button>
      ),
    },
  ];

  const fileColumns: ColumnsType<TermPaymentBatchFile> = [
    {
      title: "Loại file",
      dataIndex: "fileType",
      width: 150,
      render: (value) => (
        <Tag color={value === "UNC" ? "green" : "blue"}>
          {fileTypeText(value)}
        </Tag>
      ),
    },
    {
      title: "Tên file",
      dataIndex: "fileName",
      ellipsis: true,
    },
    {
      title: "Dung lượng",
      dataIndex: "sizeBytes",
      width: 120,
      align: "right",
      render: fileSizeText,
    },
    {
      title: "Ngày lưu",
      dataIndex: "createdAt",
      width: 130,
      render: dateText,
    },
    {
      title: "",
      width: 100,
      render: (_, row) => (
        <Button size="small" onClick={() => openFile(row.fileUrl)}>
          Xem/Tải
        </Button>
      ),
    },
  ];


  const activeBatch = batchDetailQuery.data;
  const hasConfirmable = batchItems.some(
    (item) =>
      item.bankTransactionId &&
      item.status !== "PAID" &&
      item.status !== "CANCELLED",
  );

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {toolbarLeft ? (
        <div className="table-filter-toolbar" style={{ marginBottom: 0 }}>
          <div className="table-filter-toolbar-left">{toolbarLeft}</div>
        </div>
      ) : null}
      {!pendingQuery.isLoading && !pendingRows.length ? (
        <div className="banking-section banking-hint">
          Không có đề nghị mua TERM nào chờ lập bảng kê. Đề nghị thanh toán mới từ phân hệ Mua TERM sẽ hiện ở đây để gộp vào bảng kê gửi ngân hàng.
        </div>
      ) : (
      <BankingSection
        title="Đề nghị chờ lập bảng kê"
        hint={
          selectedRequestIds.length
            ? `Đã chọn ${selectedRequestIds.length} đề nghị · ${money(selectedTotal)} đ`
            : `${pendingRows.length} đề nghị — tick chọn rồi bấm Tạo bảng kê`
        }
        extra={
          <Space size={6}>
            <DatePicker
              size="small"
              value={batchDate}
              onChange={(v) => setBatchDate(v || dayjs())}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedRequestIds.length}
              loading={createBatch.isPending}
              onClick={createSelectedBatch}
            >
              Tạo bảng kê{selectedRequestIds.length ? ` (${selectedRequestIds.length})` : ""}
            </Button>
          </Space>
        }
      >
        <Table
          className="data-grid"
          size="small"
          rowKey="id"
          loading={pendingQuery.isLoading}
          columns={pendingColumns}
          dataSource={pendingRows}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedRequestIds,
            onChange: setSelectedRequestIds,
          }}
          scroll={{ x: 950, y: 320 }}
        />
      </BankingSection>
      )}

      <BankingSection
        title="Bảng kê đã lập"
        hint="Gửi ngân hàng → tải UNC → khớp sao kê từng dòng → xác nhận đã chi"
      >
        <Table
          className="data-grid"
          size="small"
          rowKey="id"
          loading={batchesQuery.isLoading}
          columns={batchColumns}
          dataSource={batches}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bảng kê" /> }}
        />
      </BankingSection>

      <Drawer
        open={!!activeBatchId}
        title={
          <Space size={8}>
            <span>Bảng kê {activeBatch?.batchNo || ""}</span>
            {activeBatch ? batchStatus(activeBatch.status) : null}
          </Space>
        }
        width={1040}
        onClose={() => setActiveBatchId(undefined)}
        extra={
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={confirmingBatchId === activeBatchId}
            disabled={!hasConfirmable}
            onClick={() => activeBatchId && confirmMatchedItems(activeBatchId, batchItems)}
          >
            Xác nhận các dòng đã khớp
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {activeBatch ? (
            <Descriptions size="small" column={4} bordered>
              <Descriptions.Item label="Ngày">{dateText(activeBatch.batchDate)}</Descriptions.Item>
              <Descriptions.Item label="Số dòng">{activeBatch.itemCount}</Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">{money(activeBatch.totalAmountVnd)} đ</Descriptions.Item>
              <Descriptions.Item label="Đã thanh toán">
                {batchItems.filter((item) => item.status === "PAID").length}/{batchItems.length} dòng
              </Descriptions.Item>
            </Descriptions>
          ) : null}
          <BankingSection title="Dòng thanh toán" hint="Khớp từng dòng với giao dịch tiền ra trên sao kê, sau đó xác nhận">
            <Table
              className="data-grid"
              size="small"
              rowKey="id"
              loading={batchDetailQuery.isLoading}
              columns={itemColumns}
              dataSource={batchItems}
              pagination={false}
              scroll={{ x: 1080 }}
            />
          </BankingSection>
          <BankingSection title="File đã lưu">
            <Table
              className="data-grid"
              size="small"
              rowKey="id"
              columns={fileColumns}
              dataSource={batchFiles}
              pagination={false}
              locale={{ emptyText: "Chưa lưu file bảng kê/UNC." }}
            />
          </BankingSection>
        </Space>
      </Drawer>

      <Modal
        className="banking-modal"
        open={!!matchingItem}
        title="Khớp sao kê thanh toán TERM"
        width={1050}
        footer={<Button onClick={() => setMatchingItem(null)}>Đóng</Button>}
        onCancel={() => setMatchingItem(null)}
        destroyOnHidden
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message={`Cần thanh toán: ${money(matchingItem?.amountVnd)} đ — ${matchingItem?.supplierName ?? ""}`}
            description="Cần upload file UNC trước khi khớp. Có thể khớp nhiều giao dịch nếu ngân hàng chuyển tiền nhiều lần."
          />
          <Input.Search
            allowClear
            size="small"
            placeholder="Tìm nội dung sao kê, đối tượng, mã tham chiếu"
            style={{ width: 360 }}
            onSearch={setTransactionKeyword}
            onChange={(event) => {
              if (!event.target.value) setTransactionKeyword("");
            }}
          />
          <Table
            className="data-grid"
            size="small"
            rowKey="id"
            loading={bankTransactionsQuery.isLoading || matchItem.isPending}
            columns={transactionColumns}
            dataSource={transactionRows}
            pagination={false}
            scroll={{ x: 980, y: 420 }}
          />
        </Space>
      </Modal>
    </Space>
  );
}
