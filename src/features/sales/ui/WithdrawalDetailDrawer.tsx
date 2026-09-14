import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Radio,
  Skeleton,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import {
  useCancelWithdrawal,
  useSalesApprovals,
  useSalesWithdrawalDetail,
  useSelectWithdrawalSource,
  useSubmitWithdrawal,
  useWithdrawalSourceCandidates,
} from "../hooks";
import type {
  SalesApprovalRequest,
  SalesLotBalance,
  SalesWithdrawalLine,
  WithdrawalSourceCandidate,
} from "../types";
import {
  ApprovalStatusTag,
  ApprovalTypeTag,
  formatQty,
  WithdrawalStatusTag,
} from "./labels";
import { InvoicePanel } from "./InvoicePanel";
import { ReconciliationPanel } from "./ReconciliationPanel";
import "../sales.css";

/**
 * Lưu xong là backend tự gửi duyệt, nên nút gửi chỉ còn dùng cho hai đường vòng: phiếu
 * phải chọn lô nguồn thủ công, và phiếu bị từ chối gửi lại sau khi sửa.
 */
const SUBMITTABLE = new Set(["DRAFT", "REJECTED"]);
const CANCELLABLE = new Set([
  "DRAFT",
  "NEED_SOURCE",
  "PENDING_REVIEW",
  "APPROVED",
  "RESERVED",
  "WAREHOUSE_PROCESSING",
  "REJECTED",
]);

export function WithdrawalDetailDrawer({
  id,
  open,
  onClose,
}: {
  id?: string;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { can } = useCan();
  const [pickedSource, setPickedSource] = useState<string>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const detailQuery = useSalesWithdrawalDetail(open ? id : undefined);
  const request = detailQuery.data;
  const canReselectSource =
    request?.status === "NEED_SOURCE" || request?.status === "REJECTED" || !request?.salesOrderId;
  const candidatesQuery = useWithdrawalSourceCandidates({
    customerPartyId: canReselectSource ? request?.customerPartyId : undefined,
    lines: canReselectSource
      ? (request?.lines ?? []).map((line) => ({
          productId: line.productId,
          warehouseId: line.warehouseId,
          qty: Number(line.requestedQty),
        }))
      : [],
  });

  useEffect(() => {
    setPickedSource(undefined);
  }, [id]);

  useEffect(() => {
    if (canReselectSource && !pickedSource && candidatesQuery.data?.suggestedSalesOrderId) {
      setPickedSource(candidatesQuery.data.suggestedSalesOrderId);
    }
  }, [canReselectSource, candidatesQuery.data?.suggestedSalesOrderId, pickedSource]);

  const approvalsQuery = useSalesApprovals({ withdrawalRequestId: id, limit: 50 }, Boolean(open && id));
  const approvals = approvalsQuery.data?.items ?? [];

  const selectSourceMutation = useSelectWithdrawalSource(id);
  const submitMutation = useSubmitWithdrawal(id);
  const cancelMutation = useCancelWithdrawal(id);

  const lineColumns: ColumnsType<SalesWithdrawalLine> = [
    { title: "#", dataIndex: "lineNo", width: 44 },
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, line) => line.product.name,
    },
    {
      title: "Kho",
      key: "warehouse",
      width: 170,
      render: (_, line) => line.warehouse?.name ?? "—",
    },
    {
      title: "SL rút",
      dataIndex: "requestedQty",
      width: 110,
      align: "right",
      render: (value, line) => `${formatQty(value)} ${line.product.uom}`,
    },
  ];

  const balanceColumns: ColumnsType<SalesLotBalance> = [
    {
      title: "Tổng lô",
      dataIndex: "totalQty",
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đã rút",
      dataIndex: "issuedQty",
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đang giữ",
      dataIndex: "heldQty",
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      align: "right",
      render: (value) => <strong>{formatQty(value)}</strong>,
    },
  ];

  const candidateColumns: ColumnsType<WithdrawalSourceCandidate> = [
    {
      title: "",
      key: "pick",
      width: 40,
      render: (_, candidate) => <Radio value={candidate.salesOrderId} />,
    },
    { title: "Đơn lô", dataIndex: "orderNo", width: 150 },
    {
      title: "Ngày",
      dataIndex: "orderDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      width: 110,
      align: "right",
      render: (value) => <strong>{formatQty(value)}</strong>,
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={780}
      title={request ? `Phiếu rút ${request.requestNo}` : "Phiếu rút lô"}
      extra={
        request && (
          <Space>
            {SUBMITTABLE.has(request.status) && can(PERMS.SALES_SUBMIT) && (
              <Button
                type="primary"
                disabled={!request.salesOrderId}
                title={request.salesOrderId ? undefined : "Phải chọn lô nguồn trước"}
                loading={submitMutation.isPending}
                onClick={() => submitMutation.mutate(request.id)}
              >
                Gửi phiếu
              </Button>
            )}
            {CANCELLABLE.has(request.status) && can(PERMS.SALES_CANCEL) && (
              <Button danger onClick={() => setCancelOpen(true)}>
                Hủy phiếu
              </Button>
            )}
          </Space>
        )
      }
    >
      {detailQuery.isLoading || !request ? (
        <Skeleton active />
      ) : (
        <>
          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Trạng thái">
              <WithdrawalStatusTag status={request.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Ngày rút">
              {dayjs(request.requestDate).format("DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">{request.customer.name}</Descriptions.Item>
            <Descriptions.Item label="Đơn lô nguồn">
              {request.salesOrder ? (
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/sales/orders/${request.salesOrder!.id}`)}
                >
                  {request.salesOrder.orderNo}
                </Button>
              ) : (
                <Typography.Text type="danger">Chưa chọn</Typography.Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Biển số">{request.vehiclePlate || "—"}</Descriptions.Item>
            <Descriptions.Item label="Lái xe">{request.driverName || "—"}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>
              {request.note ?? "—"}
            </Descriptions.Item>
          </Descriptions>

          <Table<SalesWithdrawalLine>
            rowKey="id"
            size="small"
            pagination={false}
            columns={lineColumns}
            dataSource={request.lines}
            style={{ marginBottom: 12 }}
          />

          {request.sourceBalances && request.sourceBalances.length > 0 && (
            <>
              <Typography.Text strong>Số dư lô nguồn</Typography.Text>
              <Table<SalesLotBalance>
                rowKey="salesOrderLineId"
                size="small"
                pagination={false}
                columns={balanceColumns}
                dataSource={request.sourceBalances}
                style={{ marginTop: 8, marginBottom: 12 }}
              />
            </>
          )}

          {(request.status === "NEED_SOURCE" || request.status === "REJECTED") && (
            <>
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message={
                  request.status === "REJECTED"
                    ? "Phiếu bị từ chối. Đổi sang đơn lô khác rồi gửi duyệt lại."
                    : "Phiếu chưa tìm được lô nguồn nào phù hợp. Chọn đơn lô của khách để trừ vào."
                }
              />
              {candidatesQuery.isFetching ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : (candidatesQuery.data?.candidates ?? []).length === 0 ? (
                <Alert
                  type="error"
                  showIcon
                  message="Không tìm thấy đơn lô nào của khách còn đủ hàng. Cần tạo đơn lô mới hoặc điều chỉnh số lượng rút."
                />
              ) : (
                <>
                  <Radio.Group
                    value={pickedSource}
                    onChange={(e) => setPickedSource(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <Table<WithdrawalSourceCandidate>
                      rowKey="salesOrderId"
                      size="small"
                      pagination={false}
                      columns={candidateColumns}
                      dataSource={candidatesQuery.data?.candidates ?? []}
                      onRow={(candidate) => ({
                        onClick: () => setPickedSource(candidate.salesOrderId),
                        style: { cursor: "pointer" },
                      })}
                    />
                  </Radio.Group>
                  <div style={{ textAlign: "right", marginTop: 8 }}>
                    <Button
                      type="primary"
                      disabled={!pickedSource || !can(PERMS.SALES_UPDATE)}
                      loading={selectSourceMutation.isPending}
                      onClick={() =>
                        selectSourceMutation.mutate({
                          requestId: request.id,
                          salesOrderId: pickedSource!,
                        })
                      }
                    >
                      Chọn lô này
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          <ReconciliationPanel withdrawalRequestId={request.id} />

          <InvoicePanel withdrawalRequestId={request.id} />

          {approvals.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>Phê duyệt</Typography.Text>
              <Table<SalesApprovalRequest>
                rowKey="id"
                size="small"
                pagination={false}
                style={{ marginTop: 8 }}
                columns={[
                  {
                    title: "Loại",
                    dataIndex: "type",
                    width: 110,
                    render: (value) => <ApprovalTypeTag type={value} />,
                  },
                  {
                    title: "Trạng thái",
                    dataIndex: "status",
                    width: 130,
                    render: (value) => <ApprovalStatusTag status={value} />,
                  },
                  {
                    title: "Lý do",
                    key: "reason",
                    render: (_, row) => (
                      <ul style={{ margin: 0, paddingInlineStart: 16 }}>
                        {(row.reasonDetail?.violations ?? []).map((violation) => (
                          <li key={violation.code}>{violation.message}</li>
                        ))}
                      </ul>
                    ),
                  },
                  {
                    title: "Ghi chú",
                    dataIndex: "decisionNote",
                    width: 160,
                    render: (value) => value ?? "—",
                  },
                ]}
                dataSource={approvals}
              />
            </div>
          )}

          {request.deliveries.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>Lệnh xuất</Typography.Text>
              <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
                {request.deliveries.map((delivery) => (
                  <li key={delivery.id}>
                    {delivery.deliveryNo} — {delivery.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal
        open={cancelOpen}
        title={`Hủy phiếu rút ${request?.requestNo ?? ""}`}
        okText="Hủy phiếu"
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
        confirmLoading={cancelMutation.isPending}
        onCancel={() => setCancelOpen(false)}
        onOk={async () => {
          if (!request) return;
          await cancelMutation.mutateAsync({
            requestId: request.id,
            reason: cancelReason.trim() || undefined,
          });
          setCancelOpen(false);
          setCancelReason("");
          onClose();
        }}
      >
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Lý do hủy (nếu có)"
        />
      </Modal>
    </Drawer>
  );
}
