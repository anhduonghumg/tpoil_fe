import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Empty,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  Spin,
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
import { notify } from "../../../shared/lib/notification";

type Props = {
  open: boolean;
  transaction?: BankTransactionItem | null;
  onClose: () => void;
};

function money(n?: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

const getSuggestionKey = (r: MatchSuggestionItem) =>
  r.settlementId ?? r.paymentPlanId ?? `${r.purchaseOrderId}-${r.score}`;

export function StatementMatchDrawer({ open, transaction, onClose }: Props) {
  const transactionId = transaction?.id;

  const { data, isLoading } = useBankTransactionSuggestions(
    transactionId,
    open && !!transactionId,
  );

  const confirmMutation = useConfirmBankTransaction();
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const payload = data?.data;
  const transactionDetail = payload?.transaction;

  const suggestions = useMemo<MatchSuggestionItem[]>(
    () => payload?.suggestions ?? [],
    [payload?.suggestions],
  );

  useEffect(() => {
    if (!open || !transactionId) {
      setAllocations({});
      return;
    }

    if (!transactionDetail) return;

    let remain = Number(
      transactionDetail.remainingAmount ?? transactionDetail.amount ?? 0,
    );

    const next: Record<string, number> = {};

    for (const item of suggestions) {
      const key = getSuggestionKey(item);
      const value = Math.min(remain, Number(item?.remainingAmount || 0));

      next[key] = value > 0 ? value : 0;

      remain -= value;
      if (remain <= 0) remain = 0;
    }

    setAllocations(next);
  }, [open, transactionId, transactionDetail, suggestions]);

  const allocatedTotal = useMemo(
    () =>
      Object.values(allocations).reduce((sum, x) => sum + Number(x || 0), 0),
    [allocations],
  );

  const totalAmount = Number(
    transactionDetail?.amount ?? transaction?.amount ?? 0,
  );

  const remaining = totalAmount - allocatedTotal;

  const handleConfirm = async () => {
    if (!transactionId) return;

    const rows: ConfirmBankTransactionAllocationPayload[] = suggestions
      .filter((x) => !!x.settlementId)
      .map((x, index) => ({
        settlementId: x.settlementId!,
        allocatedAmount: Number(allocations[getSuggestionKey(x)] || 0),
        score: x.score,
        isAuto: true,
        sortOrder: index,
      }))
      .filter((x) => x.allocatedAmount > 0);

    if (!rows.length) {
      notify.warning("Vui lòng nhập số tiền phân bổ");
      return;
    }

    if (remaining < -0.0001) {
      notify.warning("Tổng phân bổ đang vượt số tiền giao dịch");
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        id: transactionId,
        body: { allocations: rows },
      });

      notify.success("Xác nhận giao dịch thành công");
      setAllocations({});
      onClose();
    } catch (e: any) {
      notify.error(e?.message || "Xác nhận giao dịch thất bại");
    }
  };

  const columns: ColumnsType<MatchSuggestionItem> = [
    {
      title: "Công nợ / Hóa đơn",
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
      width: 130,
      align: "right",
      render: (v) => money(Number(v || 0)),
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
      render: (_, r) => {
        const key = getSuggestionKey(r);
        return (
          <InputNumber
            min={0}
            max={Number(r.remainingAmount || 0)}
            value={allocations[key]}
            style={{ width: "100%" }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
            parser={(v) => {
              const n = Number(String(v || "").replace(/\./g, ""));
              return Number.isFinite(n) ? n : 0;
            }}
            onChange={(v) =>
              setAllocations((prev) => ({
                ...prev,
                [key]: Number(v || 0),
              }))
            }
          />
        );
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={() => {
        setAllocations({});
        onClose();
      }}
      width={980}
      destroyOnClose
      title="Xử lý giao dịch"
      extra={
        <Space>
          <Button
            onClick={() => {
              setAllocations({});
              onClose();
            }}
          >
            Đóng
          </Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            loading={confirmMutation.isPending}
            disabled={!transactionId || !transactionDetail}
          >
            Xác nhận
          </Button>
        </Space>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 16,
        }}
      >
        {/* LEFT */}
        <div
          style={{
            border: "1px solid #f0f0f0",
            borderRadius: 12,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <Typography.Text type="secondary">Giao dịch</Typography.Text>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginTop: 4,
              color: transaction?.direction === "OUT" ? "#cf1322" : "#389e0d",
            }}
          >
            {money(transaction?.amount)} ₫
          </div>

          <Space direction="vertical" size={10} style={{ marginTop: 16 }}>
            <div>
              <strong>Ngày:</strong>{" "}
              {transaction?.txnDate
                ? dayjs(transaction.txnDate).format("DD/MM/YYYY")
                : "-"}
            </div>
            <div>
              <strong>Loại:</strong>{" "}
              {transaction?.direction === "OUT" ? "Chi" : "Thu"}
            </div>
            <div>
              <strong>Đối tác:</strong> {transaction?.counterpartyName || "-"}
            </div>
            <div>
              <strong>STK:</strong> {transaction?.counterpartyAcc || "-"}
            </div>
            <div>
              <strong>Nội dung:</strong> {transaction?.description || "-"}
            </div>
          </Space>
        </div>

        {/* RIGHT */}
        <div>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Phân bổ
          </Typography.Title>

          {isLoading ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <Spin />
            </div>
          ) : !transactionDetail ? (
            <Empty description="Không tải được dữ liệu giao dịch" />
          ) : (
            <>
              <Space wrap size={24} style={{ marginBottom: 12 }}>
                <Typography.Text>
                  <strong>Tổng:</strong> {money(totalAmount)}
                </Typography.Text>
                <Typography.Text>
                  <strong>Đã phân bổ:</strong> {money(allocatedTotal)}
                </Typography.Text>
                <Typography.Text type={remaining < 0 ? "danger" : undefined}>
                  <strong>Còn lại:</strong> {money(remaining)}
                </Typography.Text>
              </Space>

              <Table
                rowKey={getSuggestionKey}
                size="small"
                loading={isLoading}
                dataSource={suggestions}
                columns={columns}
                pagination={false}
                locale={{
                  emptyText: <Empty description="Không có gợi ý phù hợp" />,
                }}
              />
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
