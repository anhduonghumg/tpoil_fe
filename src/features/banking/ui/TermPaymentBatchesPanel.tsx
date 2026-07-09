import React, { useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
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

export function TermPaymentBatchesPanel() {
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

  const pendingColumns: ColumnsType<TermPaymentPendingRequest> = [
    { title: "Số đề nghị", dataIndex: "requestNo", width: 150 },
    { title: "Ngày", dataIndex: "requestDate", width: 110, render: dateText },
    { title: "Hồ sơ TERM", dataIndex: "orderNo", width: 150 },
    { title: "Nhà cung cấp", dataIndex: "supplierName" },
    {
      title: "Số tiền",
      dataIndex: "amountVnd",
      align: "right",
      width: 150,
      render: (v) => `${money(v)} đ`,
    },
    { title: "Nội dung", dataIndex: "content", ellipsis: true },
  ];

  const batchColumns: ColumnsType<TermPaymentBatch> = [
    {
      title: "Số bảng kê",
      dataIndex: "batchNo",
      width: 160,
      render: (v, row) => (
        <Button type="link" onClick={() => setActiveBatchId(row.id)}>
          {v}
        </Button>
      ),
    },
    { title: "Ngày", dataIndex: "batchDate", width: 110, render: dateText },
    { title: "Số dòng", dataIndex: "itemCount", align: "right", width: 90 },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmountVnd",
      align: "right",
      width: 160,
      render: (v) => `${money(v)} đ`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 170,
      render: batchStatus,
    },
    {
      title: "",
      width: 420,
      render: (_, row) => {
        const uncCount = row.files?.filter((file) => file.fileType === "UNC").length ?? 0;
        const confirmableCount =
          row.items?.filter(
            (item) =>
              item.bankTransactionId &&
              item.status !== "PAID" &&
              item.status !== "CANCELLED",
          ).length ?? 0;
        return (
          <Space size={6}>
            <Button
              size="small"
              disabled={row.status !== "DRAFT"}
              loading={sendBatch.isPending}
              onClick={() =>
                sendBatch.mutate(row.id, {
                  onSuccess: () => batchesQuery.refetch(),
                })
              }
            >
              Xác nhận đã gửi NH
            </Button>
            <Upload
              showUploadList={false}
              customRequest={uploadBatchFile(row, "EXPORTED_LIST")}
            >
              <Button size="small">Bảng kê</Button>
            </Upload>
            <Upload
              showUploadList={false}
              customRequest={uploadBatchFile(row, "UNC")}
              multiple
              maxCount={3}
            >
              <Button
                size="small"
                type={uncCount > 0 ? "default" : "primary"}
                disabled={uncCount >= 3}
              >
                UNC ({uncCount}/3)
              </Button>
            </Upload>
            <Button
              size="small"
              type="primary"
              disabled={!confirmableCount}
              loading={confirmingBatchId === row.id}
              onClick={() => confirmMatchedItems(row.id, row.items || [])}
            >
              Xác nhận TT ({confirmableCount})
            </Button>
          </Space>
        );
      },
    },
  ];

  const itemColumns: ColumnsType<TermPaymentBatchItem> = [
    { title: "Nhà cung cấp", dataIndex: "supplierName", width: 220 },
    {
      title: "Số tiền",
      dataIndex: "amountVnd",
      align: "right",
      width: 150,
      render: (v) => `${money(v)} đ`,
    },
    {
      title: "Đã thanh toán",
      dataIndex: "paidAmountVnd",
      align: "right",
      width: 150,
      render: (v) => `${money(v)} đ`,
    },
    { title: "Nội dung", dataIndex: "transferContent", ellipsis: true },
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

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <b>Đề nghị thanh toán TERM chờ lập bảng kê</b>
        <Space>
          <DatePicker
            value={batchDate}
            onChange={(v) => setBatchDate(v || dayjs())}
            format="DD/MM/YYYY"
          />
          <Button
            type="primary"
            loading={createBatch.isPending}
            onClick={createSelectedBatch}
          >
            Tạo bảng kê ({selectedRequestIds.length})
          </Button>
        </Space>
      </div>

      <Table
        size="small"
        rowKey="id"
        bordered
        loading={pendingQuery.isLoading}
        columns={pendingColumns}
        dataSource={pendingRows}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedRequestIds,
          onChange: setSelectedRequestIds,
        }}
        scroll={{ x: 950 }}
      />

      <b>Bảng kê thanh toán TERM</b>
      <Table
        size="small"
        rowKey="id"
        bordered
        loading={batchesQuery.isLoading}
        columns={batchColumns}
        dataSource={batches}
        pagination={false}
        scroll={{ x: 1050 }}
      />

      <Modal
        open={!!activeBatchId}
        title={`Chi tiết bảng kê ${batchDetailQuery.data?.batchNo || ""}`}
        width={1100}
        footer={<Button onClick={() => setActiveBatchId(undefined)}>Đóng</Button>}
        onCancel={() => setActiveBatchId(undefined)}
      >
        <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 12 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Typography.Text strong>
              Dòng thanh toán: {batchItems.length}
            </Typography.Text>
            <Button
              size="small"
              type="primary"
              loading={confirmingBatchId === activeBatchId}
              disabled={
                !batchItems.some(
                  (item) =>
                    item.bankTransactionId &&
                    item.status !== "PAID" &&
                    item.status !== "CANCELLED",
                )
              }
              onClick={() => activeBatchId && confirmMatchedItems(activeBatchId, batchItems)}
            >
              Xác nhận thanh toán các dòng đã khớp
            </Button>
          </Space>
          <Typography.Text strong>File đã lưu</Typography.Text>
          <Table
            size="small"
            rowKey="id"
            bordered
            columns={fileColumns}
            dataSource={batchFiles}
            pagination={false}
            locale={{ emptyText: "Chưa lưu file bảng kê/UNC." }}
          />
        </Space>
        <Table
          size="small"
          rowKey="id"
          bordered
          loading={batchDetailQuery.isLoading}
          columns={itemColumns}
          dataSource={batchItems}
          pagination={false}
          scroll={{ x: 980 }}
        />
      </Modal>

      <Modal
        open={!!matchingItem}
        title="Khớp sao kê thanh toán TERM"
        width={1050}
        footer={<Button onClick={() => setMatchingItem(null)}>Đóng</Button>}
        onCancel={() => setMatchingItem(null)}
        destroyOnHidden
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Cần upload file UNC trước khi khớp thanh toán. Có thể khớp nhiều
            giao dịch nếu ngân hàng chuyển tiền nhiều lần.
          </Typography.Text>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Typography.Text strong>
              Cần thanh toán: {money(matchingItem?.amountVnd)} đ
            </Typography.Text>
            <Input.Search
              allowClear
              placeholder="Tìm nội dung sao kê, đối tượng, mã tham chiếu"
              style={{ width: 360 }}
              onSearch={setTransactionKeyword}
              onChange={(event) => {
                if (!event.target.value) setTransactionKeyword("");
              }}
            />
          </Space>
          <Table
            size="small"
            rowKey="id"
            bordered
            loading={bankTransactionsQuery.isLoading || matchItem.isPending}
            columns={transactionColumns}
            dataSource={transactionRows}
            pagination={false}
            scroll={{ x: 980 }}
          />
        </Space>
      </Modal>
    </Space>
  );
}
