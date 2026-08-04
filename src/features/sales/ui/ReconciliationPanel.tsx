import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SaveOutlined } from "@ant-design/icons";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import {
  useResolveReconciliationLine,
  useSalesReconciliation,
  useUpdateReconciliationLine,
} from "../hooks";
import type { SalesReconciliationLine } from "../types";
import { formatQty, ReconciliationStatusTag } from "./labels";

/**
 * So 5 con số của một dòng: đặt / kế hoạch / kho xác nhận / chứng từ kho / thực xuất.
 * Chênh lệch không bao giờ được nuốt im — phải giải trình, lệch lớn cần quyền ngoại lệ.
 */
export function ReconciliationPanel({
  salesOrderId,
  withdrawalRequestId,
}: {
  salesOrderId?: string;
  withdrawalRequestId?: string;
}) {
  const { can } = useCan();
  const query = useSalesReconciliation({ salesOrderId, withdrawalRequestId });
  const updateMutation = useUpdateReconciliationLine();
  const resolveMutation = useResolveReconciliationLine();

  const [drafts, setDrafts] = useState<Record<string, { docQty?: number; note?: string }>>({});
  const [resolveTarget, setResolveTarget] = useState<SalesReconciliationLine>();
  const [resolveNote, setResolveNote] = useState("");

  // Chưa xuất lần nào thì chưa có bản đối soát — ẩn hẳn thay vì báo lỗi.
  if (query.isError) return null;
  if (query.isLoading) {
    return (
      <Card size="small" title="Đối soát" style={{ marginTop: 12 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }
  const reconciliation = query.data;
  if (!reconciliation) return null;

  const canEdit = can(PERMS.SALES_RECONCILE) || can(PERMS.SALES_DELIVERY_CONFIRM);
  const draftOf = (line: SalesReconciliationLine) => drafts[line.id] ?? {};

  const patchDraft = (lineId: string, patch: { docQty?: number; note?: string }) =>
    setDrafts((current) => ({ ...current, [lineId]: { ...current[lineId], ...patch } }));

  const saveLine = async (line: SalesReconciliationLine) => {
    const draft = draftOf(line);
    await updateMutation.mutateAsync({
      lineId: line.id,
      docQty: draft.docQty,
      varianceNote: draft.note,
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[line.id];
      return next;
    });
  };

  const columns: ColumnsType<SalesReconciliationLine> = [
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, line) => (
        <div>
          <div>{line.orderLine.product.name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {line.delivery.deliveryNo} · {line.delivery.warehouse.name}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Đặt",
      dataIndex: "orderedQty",
      width: 95,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Kế hoạch",
      dataIndex: "plannedQty",
      width: 95,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Kho xác nhận",
      dataIndex: "warehouseConfirmedQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: (
        <Tooltip title="Số lượng in trên phiếu xuất kho">
          <span>Chứng từ kho</span>
        </Tooltip>
      ),
      dataIndex: "docQty",
      width: 130,
      align: "right",
      render: (value, line) =>
        canEdit && line.status !== "RESOLVED" && !line.supersededById ? (
          <InputNumber
            size="small"
            min={0}
            precision={3}
            controls={false}
            style={{ width: "100%" }}
            value={draftOf(line).docQty ?? (value == null ? undefined : Number(value))}
            onChange={(next) => patchDraft(line.id, { docQty: next ?? undefined })}
          />
        ) : (
          formatQty(value)
        ),
    },
    {
      title: "Thực xuất",
      dataIndex: "actualQty",
      width: 100,
      align: "right",
      render: (value) => <strong>{formatQty(value)}</strong>,
    },
    {
      title: "Lệch",
      dataIndex: "varianceQty",
      width: 100,
      align: "right",
      render: (value) => {
        const variance = Number(value);
        if (!variance) return <Typography.Text type="success">0</Typography.Text>;
        return <Typography.Text type="danger">{formatQty(value)}</Typography.Text>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (value, line) => (
        <Space direction="vertical" size={2}>
          <ReconciliationStatusTag status={value} />
          {line.supersededById && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              đã bị thay thế
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Giải trình",
      key: "note",
      width: 220,
      render: (_, line) =>
        canEdit && line.status !== "RESOLVED" && !line.supersededById ? (
          <Input
            size="small"
            placeholder="Lý do chênh lệch"
            value={draftOf(line).note ?? line.varianceNote ?? ""}
            onChange={(e) => patchDraft(line.id, { note: e.target.value })}
          />
        ) : (
          (line.varianceNote ?? "—")
        ),
    },
    {
      title: "",
      key: "actions",
      width: 170,
      render: (_, line) => {
        if (line.supersededById || line.status === "RESOLVED") return null;
        return (
          <Space>
            {canEdit && drafts[line.id] && (
              <Button
                size="small"
                icon={<SaveOutlined />}
                loading={updateMutation.isPending}
                onClick={() => saveLine(line)}
              >
                Lưu
              </Button>
            )}
            {line.status === "VARIANCE" && can(PERMS.SALES_RECONCILE) && (
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  setResolveTarget(line);
                  setResolveNote(draftOf(line).note ?? line.varianceNote ?? "");
                }}
              >
                Xử lý lệch
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const hasVariance = reconciliation.lines.some(
    (line) => line.status === "VARIANCE" && !line.supersededById,
  );

  return (
    <Card
      size="small"
      style={{ marginTop: 12 }}
      title={
        <Space>
          Đối soát
          <ReconciliationStatusTag status={reconciliation.status} />
        </Space>
      }
    >
      {hasVariance && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Còn dòng chênh lệch chưa xử lý. Sai số lượng thật thì phải hủy phiếu xuất và làm lại — đối soát không sửa tồn kho hay giá vốn."
        />
      )}

      <Table<SalesReconciliationLine>
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={reconciliation.lines}
        scroll={{ x: 1250 }}
        rowClassName={(line) => (line.supersededById ? "sales-row-superseded" : "")}
      />

      <Modal
        open={Boolean(resolveTarget)}
        title="Xử lý chênh lệch"
        okText="Chấp nhận chênh lệch"
        cancelText="Đóng"
        okButtonProps={{ disabled: !resolveNote.trim() }}
        confirmLoading={resolveMutation.isPending}
        onCancel={() => setResolveTarget(undefined)}
        onOk={async () => {
          if (!resolveTarget) return;
          await resolveMutation.mutateAsync({
            lineId: resolveTarget.id,
            varianceNote: resolveNote.trim(),
            docQty: draftOf(resolveTarget).docQty,
          });
          setResolveTarget(undefined);
          setResolveNote("");
        }}
      >
        {resolveTarget && (
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            {resolveTarget.orderLine.product.name}: đặt {formatQty(resolveTarget.orderedQty)}, thực
            xuất {formatQty(resolveTarget.actualQty)}, lệch{" "}
            <strong>{formatQty(resolveTarget.varianceQty)}</strong>. Lệch vượt ngưỡng cần người có
            quyền duyệt ngoại lệ.
          </Typography.Paragraph>
        )}
        <Input.TextArea
          rows={3}
          value={resolveNote}
          onChange={(e) => setResolveNote(e.target.value)}
          placeholder="Nội dung giải trình (bắt buộc)"
        />
      </Modal>
    </Card>
  );
}
