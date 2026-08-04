import React, { useMemo, useState } from "react";
import { Button, Input, Segmented, Select, Space, Table, Tabs, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, ReloadOutlined, SearchOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { PermissionGate } from "../../../shared/authz/PermissionGate";
import { PERMS } from "../../../shared/authz/perms";
import { useInternalSalesOrders } from "../hooks";
import type { SalesOrder, SalesOrderKind, SalesOrderStatus } from "../types";
import { InternalSalesOrderModal } from "../ui/InternalSalesOrderModal";
import { QuickEntryModal } from "../ui/QuickEntryModal";
import {
  formatMoney,
  lineNetAmount,
  ORDER_STATUS_LABELS,
  OrderKindTag,
  OrderStatusTag,
  WORKING_STATUSES,
} from "../ui/labels";

const ALL_TAB = "ALL";
const WORKING_TAB = "WORKING";

const TAB_ITEMS = [
  { key: WORKING_TAB, label: "Đang chạy" },
  { key: "DRAFT", label: "Nháp" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "AWAITING_STOCK", label: "Chờ hàng" },
  { key: "RESERVED", label: "Đã giữ hàng" },
  { key: "AWAITING_INVOICE", label: "Chờ hóa đơn" },
  { key: "COMPLETED", label: "Hoàn tất" },
  { key: ALL_TAB, label: "Tất cả" },
];

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function orderTotal(order: SalesOrder) {
  return order.lines.reduce((sum, line) => sum + lineNetAmount(line), 0);
}

/** Danh sách đơn bán nội bộ — màn hình Sale dùng hằng ngày. */
export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? WORKING_TAB);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [kind, setKind] = useState<SalesOrderKind | "ALL">("ALL");
  const [status, setStatus] = useState<SalesOrderStatus>();
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const tabStatus = tab !== ALL_TAB && tab !== WORKING_TAB ? (tab as SalesOrderStatus) : undefined;
  const isWorkingTab = tab === WORKING_TAB;

  const query = useInternalSalesOrders({
    keyword: keyword.trim() || undefined,
    kind: kind === "ALL" ? undefined : kind,
    status: tabStatus ?? status,
    customerPartyId,
    page,
    // Tab "đang chạy" gộp nhiều trạng thái nên phải lọc phía client.
    limit: isWorkingTab ? 200 : 20,
  });

  const rawItems = query.data?.items ?? [];
  const items = useMemo(
    () =>
      isWorkingTab
        ? rawItems.filter((order) => WORKING_STATUSES.includes(order.status))
        : rawItems,
    [isWorkingTab, rawItems],
  );

  const changeTab = (next: string) => {
    setTab(next);
    setStatus(undefined);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const columns: ColumnsType<SalesOrder> = [
    {
      title: "Số đơn",
      dataIndex: "orderNo",
      width: 150,
      fixed: "left",
      render: (value: string, order) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/sales/orders/${order.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "orderDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Khách hàng",
      dataIndex: ["customer", "name"],
      render: (_, order) => (
        <div>
          <div>{order.customer.name}</div>
          {order.customer.code && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {order.customer.code}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "kind",
      width: 160,
      render: (value: SalesOrderKind) => <OrderKindTag kind={value} />,
    },
    {
      title: "Hàng",
      key: "lines",
      width: 240,
      render: (_, order) => (
        <Tooltip
          title={order.lines
            .map((line) => `${line.product.name} · ${line.orderedActualQty} ${line.product.uom}`)
            .join("\n")}
        >
          <Typography.Text ellipsis style={{ maxWidth: 230, display: "inline-block" }}>
            {order.lines.map((line) => line.product.code ?? line.product.name).join(", ")}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: "Giá trị",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, order) => formatMoney(orderTotal(order)),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: (value: SalesOrderStatus) => <OrderStatusTag status={value} />,
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
        <Typography.Title level={4} style={{ margin: 0 }}>
          Đơn bán
        </Typography.Title>
        <Space wrap>
          <PermissionGate need={PERMS.SALES_QUICKENTRY_USE}>
            <Button icon={<ThunderboltOutlined />} onClick={() => setQuickOpen(true)}>
              Nhập nhanh
            </Button>
          </PermissionGate>
          <PermissionGate need={PERMS.SALES_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tạo đơn bán
            </Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={() => query.refetch()} loading={query.isFetching}>
            Tải lại
          </Button>
        </Space>
      </div>

      <Tabs activeKey={tab} items={TAB_ITEMS} onChange={changeTab} />

      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          allowClear
          style={{ width: 260 }}
          prefix={<SearchOutlined />}
          placeholder="Tìm số đơn hoặc tên khách"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={() => {
            setKeyword(searchText);
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
        <Segmented
          value={kind}
          onChange={(value) => {
            setKind(value as SalesOrderKind | "ALL");
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "Mọi loại" },
            { value: "SINGLE", label: "Lấy 1 lần" },
            { value: "LOT", label: "Đơn lô" },
            { value: "DAY_TRADE", label: "Trong ngày" },
          ]}
        />
        {tab === ALL_TAB && (
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="Trạng thái"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatus(value as SalesOrderStatus | undefined);
              setPage(1);
            }}
          />
        )}
      </Space>

      <Table<SalesOrder>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1100 }}
        pagination={
          isWorkingTab
            ? false
            : {
                current: page,
                pageSize: 20,
                total: query.data?.total ?? 0,
                showSizeChanger: false,
                onChange: setPage,
              }
        }
      />

      <InternalSalesOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(id) => navigate(`/sales/orders/${id}`)}
      />
      <QuickEntryModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(result) => {
          if (result.orderNo) navigate(`/sales/orders/${result.id}`);
          else query.refetch();
        }}
      />
    </div>
  );
}
