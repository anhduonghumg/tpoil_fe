import React, { useState } from "react";
import { Badge, Button, Segmented, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { PermissionGate } from "../../../shared/authz/PermissionGate";
import { PERMS } from "../../../shared/authz/perms";
import { useSalesWithdrawals } from "../hooks";
import type { SalesWithdrawalRequest, SalesWithdrawalStatus } from "../types";
import { WithdrawalCreateModal } from "../ui/WithdrawalCreateModal";
import { WithdrawalDetailDrawer } from "../ui/WithdrawalDetailDrawer";
import { formatQty, WithdrawalStatusTag } from "../ui/labels";
import "../sales.css";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "NEED_SOURCE", label: "Chờ chọn lô" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "RESERVED", label: "Đã giữ hàng" },
  { value: "WAREHOUSE_PROCESSING", label: "Kho đang xuất" },
  { value: "ISSUED", label: "Đã xuất" },
];

/** Danh sách phiếu rút lô. Phiếu thiếu lô nguồn được đẩy lên đầu tầm mắt. */
export default function SalesWithdrawalsPage() {
  const [status, setStatus] = useState<string>("ALL");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();

  const query = useSalesWithdrawals({
    status: status === "ALL" ? undefined : (status as SalesWithdrawalStatus),
    customerPartyId,
    page,
    limit: 20,
  });
  const needSourceQuery = useSalesWithdrawals({ status: "NEED_SOURCE", limit: 1 });
  const needSourceCount = needSourceQuery.data?.total ?? 0;

  const columns: ColumnsType<SalesWithdrawalRequest> = [
    {
      title: "Số phiếu",
      dataIndex: "requestNo",
      width: 150,
      render: (value: string, request) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(request.id)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "requestDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, request) => request.customer.name,
    },
    {
      title: "Đơn lô nguồn",
      key: "source",
      width: 150,
      render: (_, request) =>
        request.salesOrder?.orderNo ?? <Typography.Text type="danger">Chưa chọn</Typography.Text>,
    },
    {
      title: "Hàng rút",
      key: "lines",
      width: 260,
      render: (_, request) => (
        <Tooltip
          title={request.lines
            .map(
              (line) =>
                `${line.product.name} · ${formatQty(line.requestedQty)} ${line.product.uom} · ${
                  line.warehouse?.name ?? "?"
                }`,
            )
            .join("\n")}
        >
          <Typography.Text ellipsis style={{ maxWidth: 250, display: "inline-block" }}>
            {request.lines
              .map((line) => `${line.product.code ?? line.product.name} ${formatQty(line.requestedQty)}`)
              .join(", ")}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: "Xe / Lái xe",
      key: "vehicle",
      width: 150,
      render: (_, request) => (
        <div>
          <div>{request.vehiclePlate || "—"}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {request.driverName || ""}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 160,
      render: (value: SalesWithdrawalStatus) => <WithdrawalStatusTag status={value} />,
    },
  ];

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
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Rút lô
          </Typography.Title>
          {needSourceCount > 0 && (
            <Badge
              count={`${needSourceCount} phiếu chờ chọn lô`}
              style={{ backgroundColor: "#ff4d4f" }}
            />
          )}
        </Space>
        <Space>
          <PermissionGate need={PERMS.SALES_WITHDRAW_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tạo phiếu rút
            </Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>
            Tải lại
          </Button>
        </Space>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented
          value={status}
          options={STATUS_FILTERS}
          onChange={(value) => {
            setStatus(value as string);
            setPage(1);
          }}
        />
        <PartySelect
          partyRole="CUSTOMER"
          allowClear
          style={{ width: 240 }}
          placeholder="Lọc theo khách hàng"
          value={customerPartyId}
          onChange={(value) => {
            setCustomerPartyId(value ?? undefined);
            setPage(1);
          }}
        />
      </Space>

      <Table<SalesWithdrawalRequest>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: 1150 }}
        rowClassName={(request) => (request.status === "NEED_SOURCE" ? "sales-row-attention" : "")}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <WithdrawalCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(request) => setDetailId(request.id)}
      />
      <WithdrawalDetailDrawer
        id={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(undefined)}
      />
    </div>
  );
}
