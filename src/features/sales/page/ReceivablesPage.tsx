import React, { useState } from "react";
import { Button, Card, Select, Space, Statistic, Table, Tabs, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { usePartyDebt, useReceivableAging, useReceivables } from "../hooks";
import type {
  PartyDebtRow,
  ReceivableAgingRow,
  ReceivableOpenItem,
  ReceivableStatus,
} from "../types";
import { ReceivableDrawer } from "../ui/ReceivableDrawer";
import { formatMoney, ReceivableStatusTag } from "../ui/labels";

const SCOPE_FILTERS = [
  { value: "OPEN", label: "Còn nợ" },
  { value: "OVERDUE", label: "Quá hạn" },
  { value: "ALL", label: "Tất cả" },
];

export default function ReceivablesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("items");
  const [scope, setScope] = useState("OPEN");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();

  const listQuery = useReceivables({
    customerPartyId,
    onlyOpen: scope === "OPEN" ? true : undefined,
    overdueOnly: scope === "OVERDUE" ? true : undefined,
    page,
    limit: 20,
  });
  const agingQuery = useReceivableAging(customerPartyId, tab === "aging");
  const partyDebtQuery = usePartyDebt(customerPartyId, tab === "party");

  const filterTags = [
    scope !== "OPEN" && {
      key: "scope",
      label: `Phạm vi: ${SCOPE_FILTERS.find((row) => row.value === scope)?.label ?? scope}`,
      onClear: () => {
        setScope("OPEN");
        setPage(1);
      },
    },
    customerPartyId && {
      key: "party",
      label: "Đang lọc theo đối tác",
      onClear: () => {
        setCustomerPartyId(undefined);
        setPage(1);
      },
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Đối tác
        </Typography.Text>
        <PartySelect
          partyRole="ALL"
          allowClear
          style={{ width: "100%" }}
          placeholder="Mọi đối tác"
          value={customerPartyId}
          onChange={(value) => {
            setCustomerPartyId(value ?? undefined);
            setPage(1);
          }}
        />
      </div>
      {/* Chỉ tab chi tiết mới lọc theo phạm vi; tuổi nợ và hai chiều luôn tính trên khoản còn mở. */}
      {tab === "items" && (
        <div style={{ marginBottom: 10 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Phạm vi
          </Typography.Text>
          <Select
            size="small"
            style={{ width: "100%" }}
            value={scope}
            options={SCOPE_FILTERS}
            onChange={(value) => {
              setScope(value);
              setPage(1);
            }}
          />
        </div>
      )}
      <div style={{ textAlign: "right" }}>
        <Button
          size="small"
          onClick={() => {
            setScope("OPEN");
            setCustomerPartyId(undefined);
            setPage(1);
          }}
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );

  const itemColumns: ColumnsType<ReceivableOpenItem> = [
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, item) => item.customer.name,
    },
    {
      title: "Chứng từ",
      key: "source",
      width: 160,
      render: (_, item) =>
        item.salesOrder ? (
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => navigate(`/sales/orders/${item.salesOrder!.id}`)}
          >
            {item.salesOrder.orderNo}
          </Button>
        ) : (
          (item.withdrawalRequest?.requestNo ?? "—")
        ),
    },
    {
      title: "Hạn TT",
      dataIndex: "dueDate",
      width: 110,
      render: (value: string | null, item) =>
        value ? (
          <Space direction="vertical" size={0}>
            <span>{dayjs(value).format("DD/MM/YYYY")}</span>
            {item.isOverdue && (
              <Typography.Text type="danger" style={{ fontSize: 11 }}>
                quá {item.overdueDays} ngày
              </Typography.Text>
            )}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Số tiền gốc",
      dataIndex: "originalAmount",
      width: 140,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      title: "Còn phải thu",
      dataIndex: "outstandingAmount",
      width: 150,
      align: "right",
      render: (value) => <strong>{formatMoney(value)}</strong>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 140,
      render: (value: ReceivableStatus) => <ReceivableStatusTag status={value} />,
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, item) => (
        <Button size="small" onClick={() => setDetailId(item.id)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  const agingColumns: ColumnsType<ReceivableAgingRow> = [
    { title: "Khách hàng", key: "customer", render: (_, row) => row.customer.name },
    {
      title: "Chưa đến hạn",
      dataIndex: "CURRENT",
      align: "right",
      render: (value) => formatMoney(value),
    },
    { title: "1–30 ngày", dataIndex: "D1_30", align: "right", render: (v) => formatMoney(v) },
    { title: "31–60 ngày", dataIndex: "D31_60", align: "right", render: (v) => formatMoney(v) },
    { title: "61–90 ngày", dataIndex: "D61_90", align: "right", render: (v) => formatMoney(v) },
    {
      title: "> 90 ngày",
      dataIndex: "D90_PLUS",
      align: "right",
      render: (value) => (
        <Typography.Text type={Number(value) > 0 ? "danger" : undefined}>
          {formatMoney(value)}
        </Typography.Text>
      ),
    },
    {
      title: "Không có hạn",
      dataIndex: "NO_DUE_DATE",
      align: "right",
      render: (v) => formatMoney(v),
    },
    {
      title: "Tổng",
      dataIndex: "total",
      align: "right",
      render: (value) => <strong>{formatMoney(value)}</strong>,
    },
  ];

  const partyColumns: ColumnsType<PartyDebtRow> = [
    { title: "Đối tác", key: "party", render: (_, row) => row.party.name },
    {
      title: "Họ nợ mình",
      dataIndex: "receivableOutstanding",
      align: "right",
      render: (v) => formatMoney(v),
    },
    {
      title: "trong đó quá hạn",
      dataIndex: "receivableOverdue",
      align: "right",
      render: (value) => (
        <Typography.Text type={Number(value) > 0 ? "danger" : undefined}>
          {formatMoney(value)}
        </Typography.Text>
      ),
    },
    {
      title: "Mình nợ họ",
      dataIndex: "payableOutstanding",
      align: "right",
      render: (v) => formatMoney(v),
    },
    {
      title: "trong đó quá hạn",
      dataIndex: "payableOverdue",
      align: "right",
      render: (value) => (
        <Typography.Text type={Number(value) > 0 ? "danger" : undefined}>
          {formatMoney(value)}
        </Typography.Text>
      ),
    },
    {
      title: "Chênh lệch",
      dataIndex: "netPosition",
      align: "right",
      render: (value) => {
        const parsed = Number(value);
        return (
          <Typography.Text strong type={parsed >= 0 ? undefined : "success"}>
            {formatMoney(value)}
          </Typography.Text>
        );
      },
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
          Công nợ phải thu
        </Typography.Title>
        <Space>
          <FilterButton
            count={Number(Boolean(customerPartyId)) + Number(scope !== "OPEN")}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            content={filterPanel}
          />
          <RefreshButton loading={listQuery.isFetching} onClick={() => listQuery.refetch()} />
        </Space>
      </div>

      <FilterTags items={filterTags} />

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "items",
            label: "Chi tiết công nợ",
            children: (
              <>
                <Space size={32} style={{ marginBottom: 12 }}>
                  <Statistic
                    title="Tổng phát sinh"
                    value={formatMoney(listQuery.data?.totals.originalAmount)}
                  />
                  <Statistic
                    title="Còn phải thu"
                    value={formatMoney(listQuery.data?.totals.outstandingAmount)}
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Space>
                <Table<ReceivableOpenItem>
                  rowKey="id"
                  size="small"
                  loading={listQuery.isLoading}
                  columns={itemColumns}
                  dataSource={listQuery.data?.items ?? []}
                  scroll={{ x: 1100 }}
                  pagination={{
                    current: page,
                    pageSize: 20,
                    total: listQuery.data?.total ?? 0,
                    showSizeChanger: false,
                    onChange: setPage,
                  }}
                />
              </>
            ),
          },
          {
            key: "aging",
            label: "Tuổi nợ",
            children: (
              <Card size="small">
                <Table<ReceivableAgingRow>
                  rowKey={(row) => row.customer.id}
                  size="small"
                  loading={agingQuery.isLoading}
                  columns={agingColumns}
                  dataSource={agingQuery.data ?? []}
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                />
              </Card>
            ),
          },
          {
            key: "party",
            label: "Công nợ hai chiều",
            children: (
              <Card size="small">
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                  Cùng một đối tác có thể vừa là khách vừa là nhà cung cấp — bảng này đặt hai chiều
                  cạnh nhau.
                </Typography.Paragraph>
                <Table<PartyDebtRow>
                  rowKey={(row) => row.party.id}
                  size="small"
                  loading={partyDebtQuery.isLoading}
                  columns={partyColumns}
                  dataSource={partyDebtQuery.data ?? []}
                  scroll={{ x: 950 }}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                />
              </Card>
            ),
          },
        ]}
      />

      <ReceivableDrawer
        id={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(undefined)}
      />
    </div>
  );
}
