import React, { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { confirmDialog } from "../../../shared/lib/confirm";
import { useBankTransactions } from "../../banking/hooks";
import {
  useAllocateReceivable,
  useReceivableDetail,
  useReverseAllocation,
} from "../hooks";
import type { ReceivableAllocation, ReceivableLedgerEntry } from "../types";
import { formatMoney, ReceivableStatusTag } from "./labels";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  OPEN: "Ghi nợ",
  RECEIPT: "Thu tiền",
  CREDIT_NOTE: "Giảm trừ",
  FX_DIFFERENCE: "Chênh lệch tỷ giá",
  REVERSAL: "Đảo",
};

export function ReceivableDrawer({
  id,
  open,
  onClose,
}: {
  id?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { can } = useCan();
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [bankTransactionId, setBankTransactionId] = useState<string>();
  const [amount, setAmount] = useState<number>();

  const detailQuery = useReceivableDetail(open ? id : undefined);
  const item = detailQuery.data;
  const allocateMutation = useAllocateReceivable();
  const reverseMutation = useReverseAllocation();

  // Chỉ tiền VỀ mới đối trừ được công nợ phải thu (backend cũng chặn).
  const bankQuery = useBankTransactions({ direction: "IN", pageSize: 50 });
  const bankRows = Array.isArray(bankQuery.data)
    ? bankQuery.data
    : ((bankQuery.data as unknown as { data?: unknown[] })?.data ?? []);

  const outstanding = Number(item?.outstandingAmount ?? 0);

  const entryColumns: ColumnsType<ReceivableLedgerEntry> = [
    {
      title: "Loại",
      dataIndex: "type",
      width: 150,
      render: (value: string) => <Tag>{ENTRY_TYPE_LABELS[value] ?? value}</Tag>,
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 150,
      align: "right",
      render: (value: string) => {
        const parsed = Number(value);
        return (
          <Typography.Text type={parsed < 0 ? "success" : undefined}>
            {formatMoney(value)}
          </Typography.Text>
        );
      },
    },
    {
      title: "Hiệu lực",
      dataIndex: "effectiveAt",
      width: 160,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    { title: "Ghi chú", dataIndex: "note", render: (value) => value ?? "—" },
  ];

  const allocationColumns: ColumnsType<ReceivableAllocation> = [
    {
      title: "Giao dịch NH",
      key: "bank",
      render: (_, allocation) =>
        allocation.bankTransaction ? (
          <div>
            <div>{dayjs(allocation.bankTransaction.txnDate).format("DD/MM/YYYY")}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {allocation.bankTransaction.description ?? ""}
            </Typography.Text>
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "Số tiền",
      dataIndex: "amountInItemCurrency",
      width: 140,
      align: "right",
      render: (value: string) => <strong>{formatMoney(value)}</strong>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 110,
      render: (value: string) => (
        <Tag color={value === "ACTIVE" ? "green" : "default"}>
          {value === "ACTIVE" ? "Hiệu lực" : "Đã đảo"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, allocation) =>
        allocation.status === "ACTIVE" &&
        !allocation.reversalOfId &&
        can(PERMS.SALES_RECEIVABLE_ALLOCATE) ? (
          <Button
            danger
            size="small"
            loading={reverseMutation.isPending}
            onClick={() =>
              confirmDialog.confirm(
                "Đảo phân bổ",
                "Hệ thống ghi một bút toán ngược, số dư công nợ tăng lại tương ứng. Tiếp tục?",
                () => reverseMutation.mutate(allocation.id),
              )
            }
          >
            Đảo
          </Button>
        ) : null,
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={860}
      title={item ? `Công nợ ${item.salesOrder?.orderNo ?? item.withdrawalRequest?.requestNo ?? ""}` : "Công nợ"}
      extra={
        item &&
        item.status !== "SETTLED" &&
        item.status !== "VOIDED" &&
        can(PERMS.SALES_RECEIVABLE_ALLOCATE) && (
          <Button
            type="primary"
            onClick={() => {
              setAmount(outstanding);
              setAllocateOpen(true);
            }}
          >
            Đối trừ tiền về
          </Button>
        )
      }
    >
      {detailQuery.isLoading || !item ? (
        <Skeleton active />
      ) : (
        <>
          {item.isOverdue && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message={`Quá hạn ${item.overdueDays} ngày`}
            />
          )}

          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Khách hàng">{item.customer.name}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <ReceivableStatusTag status={item.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Chứng từ">
              {item.salesOrder?.orderNo ?? item.withdrawalRequest?.requestNo ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Hạn thanh toán">
              {item.dueDate ? dayjs(item.dueDate).format("DD/MM/YYYY") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền gốc">
              {formatMoney(item.originalAmount)} {item.currency}
            </Descriptions.Item>
            <Descriptions.Item label="Còn phải thu">
              <strong>
                {formatMoney(item.outstandingAmount)} {item.currency}
              </strong>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Text strong>Phân bổ tiền về</Typography.Text>
          <Table<ReceivableAllocation>
            rowKey="id"
            size="small"
            pagination={false}
            style={{ marginTop: 8, marginBottom: 16 }}
            columns={allocationColumns}
            dataSource={item.allocations ?? []}
            locale={{ emptyText: "Chưa có phân bổ nào" }}
          />

          <Typography.Text strong>Sổ công nợ</Typography.Text>
          <Table<ReceivableLedgerEntry>
            rowKey="id"
            size="small"
            pagination={false}
            style={{ marginTop: 8 }}
            columns={entryColumns}
            dataSource={item.entries ?? []}
          />
        </>
      )}

      <Modal
        open={allocateOpen}
        title="Đối trừ tiền về"
        okText="Đối trừ"
        cancelText="Đóng"
        okButtonProps={{
          disabled: !bankTransactionId || !amount || amount <= 0 || amount > outstanding,
        }}
        confirmLoading={allocateMutation.isPending}
        onCancel={() => setAllocateOpen(false)}
        onOk={async () => {
          if (!item || !bankTransactionId || !amount) return;
          await allocateMutation.mutateAsync({
            openItemId: item.id,
            bankTransactionId,
            amount,
          });
          setAllocateOpen(false);
          setBankTransactionId(undefined);
          setAmount(undefined);
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Giao dịch tiền về
            </Typography.Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              placeholder="Chọn giao dịch ngân hàng"
              loading={bankQuery.isFetching}
              value={bankTransactionId}
              onChange={setBankTransactionId}
              options={(bankRows as Array<Record<string, any>>).map((row) => ({
                value: row.id as string,
                label: `${dayjs(row.txnDate).format("DD/MM/YYYY")} · ${formatMoney(
                  row.amount,
                )} · ${row.description ?? ""}`,
              }))}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Số tiền đối trừ (còn phải thu {formatMoney(outstanding)})
            </Typography.Text>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              max={outstanding}
              controls={false}
              value={amount}
              onChange={(value) => setAmount(value ?? undefined)}
            />
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
}
