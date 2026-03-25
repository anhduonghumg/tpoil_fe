import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  useBankTransactionSuggestions,
  useConfirmBankTransaction,
} from "../hooks";
import type {
  BankTransactionItem,
  ConfirmBankTransactionAllocationPayload,
  MatchSuggestionItem,
} from "../types";

type Props = {
  open: boolean;
  transaction?: BankTransactionItem | null;
  onClose: () => void;
};

function money(n?: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

export function StatementMatchDrawer({ open, transaction, onClose }: Props) {
  const transactionId = transaction?.id;
  const { data, isLoading } = useBankTransactionSuggestions(
    transactionId,
    open && !!transactionId,
  );
  const confirmMutation = useConfirmBankTransaction();
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, number> = {};
    for (const item of data.suggestions) {
      next[item.settlementId] = Number(item.suggestedAllocatedAmount || 0);
    }
    setAllocations(next);
  }, [data]);

  const allocatedTotal = useMemo(
    () =>
      Object.values(allocations).reduce((sum, x) => sum + Number(x || 0), 0),
    [allocations],
  );

  const remaining = Number(data?.transaction.amount || 0) - allocatedTotal;

  const handleConfirm = async () => {
    if (!transactionId) return;

    const rows: ConfirmBankTransactionAllocationPayload[] = (
      data?.suggestions || []
    )
      .map((x, index) => ({
        settlementId: x.settlementId,
        allocatedAmount: Number(allocations[x.settlementId] || 0),
        score: x.score,
        isAuto: true,
        sortOrder: index,
      }))
      .filter((x) => x.allocatedAmount > 0);

    if (!rows.length) {
      message.warning("Vui lòng nhập số tiền phân bổ");
      return;
    }

    if (remaining < -0.0001) {
      message.warning("Tổng phân bổ đang vượt số tiền giao dịch");
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        id: transactionId,
        body: { allocations: rows },
      });
      message.success("Xác nhận giao dịch thành công");
      onClose();
    } catch (e: any) {
      message.error(e?.message || "Xác nhận giao dịch thất bại");
    }
  };

  const columns: ColumnsType<MatchSuggestionItem> = [
    {
      title: "Hóa đơn / NCC",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {r.invoices?.map((x) => x.invoiceNo).join(", ") || "-"}
          </div>
          <div style={{ color: "#8c8c8c" }}>{r.supplier?.name || "-"}</div>
        </div>
      ),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingAmount",
      width: 140,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Score",
      dataIndex: "score",
      width: 90,
      render: (v) => (
        <Tag color={v >= 80 ? "green" : v >= 50 ? "blue" : "default"}>{v}</Tag>
      ),
    },
    {
      title: "Phân bổ",
      width: 160,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={r.remainingAmount}
          value={allocations[r.settlementId]}
          style={{ width: "100%" }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          parser={(v) => Number(String(v || "").replace(/\./g, ""))}
          onChange={(v) =>
            setAllocations((prev) => ({
              ...prev,
              [r.settlementId]: Number(v || 0),
            }))
          }
        />
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Xử lý giao dịch"
      width={980}
      extra={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            loading={confirmMutation.isPending}
          >
            Xác nhận
          </Button>
        </Space>
      }
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}
      >
        <div
          style={{
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Thông tin giao dịch
          </Typography.Title>

          <div style={{ marginBottom: 10 }}>
            <strong>Ngày:</strong>{" "}
            {transaction?.txnDate
              ? dayjs(transaction.txnDate).format("DD/MM/YYYY")
              : ""}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>Loại:</strong>{" "}
            {transaction?.direction === "OUT" ? "Chi" : "Thu"}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>Số tiền:</strong> {money(transaction?.amount)}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>Đối tác:</strong> {transaction?.counterpartyName || "-"}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>STK:</strong> {transaction?.counterpartyAcc || "-"}
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>Nội dung:</strong> {transaction?.description || "-"}
          </div>
        </div>

        <div>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Gợi ý phân bổ
          </Typography.Title>

          <Space size={24} style={{ marginBottom: 12 }}>
            <Typography.Text>
              <strong>Tổng giao dịch:</strong> {money(data?.transaction.amount)}
            </Typography.Text>
            <Typography.Text>
              <strong>Đã phân bổ:</strong> {money(allocatedTotal)}
            </Typography.Text>
            <Typography.Text type={remaining < 0 ? "danger" : undefined}>
              <strong>Còn lại:</strong> {money(remaining)}
            </Typography.Text>
          </Space>

          <Table
            rowKey="settlementId"
            size="small"
            loading={isLoading}
            dataSource={data?.suggestions || []}
            columns={columns}
            pagination={false}
            scroll={{ x: 700 }}
          />
        </div>
      </div>
    </Drawer>
  );
}
