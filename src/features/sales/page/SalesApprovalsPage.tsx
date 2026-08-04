import React, { useState } from "react";
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useDecideSalesApproval, useSalesApprovals } from "../hooks";
import type { SalesApprovalRequest, SalesApprovalStatus, SalesApprovalType } from "../types";
import { ApprovalStatusTag, ApprovalTypeTag, OrderKindTag } from "../ui/labels";

const STATUS_TABS: Array<{ value: SalesApprovalStatus; label: string }> = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
  { value: "STALE", label: "Hết hiệu lực" },
];

/** Hàng đợi phê duyệt giá / công nợ / ngoại lệ. */
export default function SalesApprovalsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SalesApprovalStatus>("PENDING");
  const [type, setType] = useState<SalesApprovalType | "ALL">("ALL");
  const [onlyMine, setOnlyMine] = useState(true);
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{
    request: SalesApprovalRequest;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [note, setNote] = useState("");

  const query = useSalesApprovals({
    status,
    type: type === "ALL" ? undefined : type,
    mine: onlyMine || undefined,
    page,
    limit: 20,
  });
  const decideMutation = useDecideSalesApproval();

  const closeDecision = () => {
    setDecision(null);
    setNote("");
  };

  const columns: ColumnsType<SalesApprovalRequest> = [
    {
      title: "Chứng từ",
      key: "order",
      width: 220,
      render: (_, request) => {
        if (request.salesOrder) {
          return (
            <div>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate(`/sales/orders/${request.salesOrder!.id}`)}
              >
                {request.salesOrder.orderNo}
              </Button>
              <div>
                <OrderKindTag kind={request.salesOrder.kind} />
              </div>
            </div>
          );
        }
        if (request.withdrawalRequest) {
          return (
            <div>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate("/sales/withdrawals")}
              >
                {request.withdrawalRequest.requestNo}
              </Button>
              <div>
                <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                  Rút lô
                </Tag>
                {request.withdrawalRequest.salesOrder && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginInlineStart: 6 }}>
                    từ {request.withdrawalRequest.salesOrder.orderNo}
                  </Typography.Text>
                )}
              </div>
            </div>
          );
        }
        return "—";
      },
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, request) =>
        request.salesOrder?.customer.name ?? request.withdrawalRequest?.customer.name ?? "—",
    },
    {
      title: "Loại duyệt",
      dataIndex: "type",
      width: 110,
      render: (value: SalesApprovalType) => <ApprovalTypeTag type={value} />,
    },
    {
      title: "Lý do",
      key: "reason",
      render: (_, request) => (
        <ul style={{ margin: 0, paddingInlineStart: 16 }}>
          {(request.reasonDetail?.violations ?? []).map((violation) => (
            <li key={violation.code}>{violation.message}</li>
          ))}
        </ul>
      ),
    },
    { title: "Vòng", dataIndex: "approvalCycle", width: 64 },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (value: SalesApprovalStatus) => <ApprovalStatusTag status={value} />,
    },
    {
      title: "Gửi lúc",
      dataIndex: "createdAt",
      width: 145,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_, request) =>
        request.status === "PENDING" && request.canDecide ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => setDecision({ request, action: "APPROVE" })}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setDecision({ request, action: "REJECT" })}
            >
              Từ chối
            </Button>
          </Space>
        ) : null,
    },
  ];

  const isReject = decision?.action === "REJECT";

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Phê duyệt đơn bán
        </Typography.Title>
        <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>
          Tải lại
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented
          value={status}
          options={STATUS_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
          onChange={(value) => {
            setStatus(value as SalesApprovalStatus);
            setPage(1);
          }}
        />
        <Segmented
          value={type}
          options={[
            { value: "ALL", label: "Mọi loại" },
            { value: "PRICE", label: "Giá" },
            { value: "CREDIT", label: "Công nợ" },
            { value: "EXCEPTION", label: "Ngoại lệ" },
          ]}
          onChange={(value) => {
            setType(value as SalesApprovalType | "ALL");
            setPage(1);
          }}
        />
        <Checkbox
          checked={onlyMine}
          onChange={(e) => {
            setOnlyMine(e.target.checked);
            setPage(1);
          }}
        >
          Chỉ việc tôi được duyệt
        </Checkbox>
      </Space>

      <Table<SalesApprovalRequest>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: 1200 }}
        locale={{ emptyText: <Empty description="Không có yêu cầu nào" /> }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Modal
        open={Boolean(decision)}
        title={
          `${isReject ? "Từ chối" : "Duyệt"} ${
            decision?.request.salesOrder?.orderNo ??
            decision?.request.withdrawalRequest?.requestNo ??
            "yêu cầu"
          }`
        }
        okText={isReject ? "Từ chối" : "Duyệt"}
        cancelText="Đóng"
        okButtonProps={{ danger: isReject, disabled: isReject && !note.trim() }}
        confirmLoading={decideMutation.isPending}
        onCancel={closeDecision}
        onOk={async () => {
          if (!decision) return;
          await decideMutation.mutateAsync({
            id: decision.request.id,
            decision: decision.action,
            note: note.trim() || undefined,
          });
          closeDecision();
        }}
      >
        <ul style={{ marginTop: 0, paddingInlineStart: 18 }}>
          {(decision?.request.reasonDetail?.violations ?? []).map((violation) => (
            <li key={violation.code}>{violation.message}</li>
          ))}
        </ul>
        <Input.TextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isReject ? "Lý do từ chối (bắt buộc)" : "Ghi chú (không bắt buộc)"}
        />
      </Modal>
    </div>
  );
}
