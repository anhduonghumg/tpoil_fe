import React, { useMemo, useState } from "react";
import { Button, Dropdown, Input, Select, Table, Tabs, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, FileSearchOutlined, MoreOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { PermissionGate } from "../../../shared/authz/PermissionGate";
import { PERMS } from "../../../shared/authz/perms";
import { useSalesWithdrawals } from "../hooks";
import type { SalesWithdrawalRequest, SalesWithdrawalStatus } from "../types";
import { WithdrawalCreateModal } from "../ui/WithdrawalCreateModal";
import { WithdrawalDetailDrawer } from "../ui/WithdrawalDetailDrawer";
import { formatQty, WITHDRAWAL_STATUS_LABELS, WithdrawalStatusTag } from "../ui/labels";
import "../sales.css";

const ALL_TAB = "ALL";

/**
 * Tab theo các mốc Sale/kho cần theo dõi hằng ngày. Trạng thái ít gặp (nháp, đã duyệt,
 * từ chối, đã hủy) lọc ở bộ lọc của tab "Tất cả" — giống màn Đơn bán.
 */
const TAB_DEFS: Array<{ key: string; label: string; status?: SalesWithdrawalStatus; attention?: boolean }> = [
  { key: "NEED_SOURCE", label: "Chờ chọn lô", status: "NEED_SOURCE", attention: true },
  { key: "PENDING_REVIEW", label: "Chờ duyệt", status: "PENDING_REVIEW" },
  { key: "RESERVED", label: "Đã giữ hàng", status: "RESERVED" },
  { key: "WAREHOUSE_PROCESSING", label: "Kho đang xuất", status: "WAREHOUSE_PROCESSING" },
  { key: "ISSUED", label: "Đã xuất", status: "ISSUED" },
  { key: ALL_TAB, label: "Tất cả" },
];

const STATUS_OPTIONS = (Object.keys(WITHDRAWAL_STATUS_LABELS) as SalesWithdrawalStatus[]).map((value) => ({
  value,
  label: WITHDRAWAL_STATUS_LABELS[value],
}));

/** Gộp giá trị theo dòng thành một ô: bỏ trống, bỏ trùng, giữ thứ tự dòng. */
const uniq = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];

/** Cột nút "⋯" cuối dòng; tính vào bề ngang tối thiểu của bảng. */
const ACTION_COL_WIDTH = 44;

/** Danh sách phiếu rút lô. Phiếu thiếu lô nguồn được đẩy lên tab đầu và tô nổi. */
export default function SalesWithdrawalsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>(ALL_TAB);
  const [status, setStatus] = useState<SalesWithdrawalStatus>();
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();

  const tabStatus = TAB_DEFS.find((item) => item.key === tab)?.status;
  const query = useSalesWithdrawals({
    status: tabStatus ?? status,
    customerPartyId,
    keyword: keyword.trim() || undefined,
    page,
    limit: 20,
  });
  const byStatus = query.data?.byStatus;

  /** Số đếm giữ nguyên khi đổi tab (backend đếm trên cùng bộ lọc, bỏ lọc trạng thái). */
  const [lastCounts, setLastCounts] = useState<typeof byStatus>();
  if (byStatus && byStatus !== lastCounts) setLastCounts(byStatus);
  const counts = byStatus ?? lastCounts ?? {};

  const tabItems = useMemo(
    () =>
      TAB_DEFS.map((item) => {
        const count = item.status
          ? (counts[item.status] ?? 0)
          : Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
        return {
          key: item.key,
          label:
            item.attention && count > 0 ? (
              <span className="sales-tab-attention">
                {item.label} ({count})
              </span>
            ) : (
              `${item.label} (${count})`
            ),
        };
      }),
    [counts],
  );

  const changeTab = (next: string) => {
    setTab(next);
    setStatus(undefined);
    setPage(1);
  };

  const activeFilterCount = Number(Boolean(customerPartyId)) + Number(Boolean(status));
  const filterTags = [
    status && {
      key: "status",
      label: `Trạng thái: ${WITHDRAWAL_STATUS_LABELS[status]}`,
      onClear: () => {
        setStatus(undefined);
        setPage(1);
      },
    },
    customerPartyId && {
      key: "customer",
      label: "Đang lọc theo khách hàng",
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
          Khách hàng
        </Typography.Text>
        <PartySelect
          partyRole="CUSTOMER"
          allowClear
          style={{ width: "100%" }}
          placeholder="Mọi khách hàng"
          value={customerPartyId}
          onChange={(value) => {
            setCustomerPartyId(value ?? undefined);
            setPage(1);
          }}
        />
      </div>
      {/* Tab đã là bộ lọc trạng thái rồi; chỉ tab "Tất cả" mới cần chọn tay. */}
      {tab === ALL_TAB && (
        <div style={{ marginBottom: 10 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Trạng thái
          </Typography.Text>
          <Select
            allowClear
            size="small"
            style={{ width: "100%" }}
            placeholder="Mọi trạng thái"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatus(value as SalesWithdrawalStatus | undefined);
              setPage(1);
            }}
          />
        </div>
      )}
      <div style={{ textAlign: "right" }}>
        <Button
          size="small"
          onClick={() => {
            setStatus(undefined);
            setCustomerPartyId(undefined);
            setPage(1);
          }}
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );

  const toolbar = (
    <div className="sales-orders-tabs-extra">
      <Input
        allowClear
        size="small"
        style={{ width: 240 }}
        prefix={<SearchOutlined />}
        placeholder="Tìm số phiếu, đơn lô, khách, biển số"
        value={searchText}
        onChange={(event) => {
          setSearchText(event.target.value);
          // Bấm nút xóa của ô tìm kiếm thì bỏ lọc ngay, không đợi Enter.
          if (!event.target.value) {
            setKeyword("");
            setPage(1);
          }
        }}
        onPressEnter={() => {
          setKeyword(searchText);
          setPage(1);
        }}
      />
      <FilterButton count={activeFilterCount} open={filterOpen} onOpenChange={setFilterOpen} content={filterPanel} />
      <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
    </div>
  );

  const columns: ColumnsType<SalesWithdrawalRequest> = [
    {
      title: "Số phiếu",
      dataIndex: "requestNo",
      width: 124,
      fixed: "left",
      render: (value: string, request) => (
        <Button type="link" className="sales-grid-link sales-grid-clip" onClick={() => setDetailId(request.id)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "requestDate",
      width: 68,
      render: (value: string) => dayjs(value).format("DD/MM/YY"),
    },
    {
      // Sale nhớ khách theo mã; tên đầy đủ để ở tooltip cho đỡ chiếm chỗ.
      title: "Khách",
      key: "customer",
      width: 110,
      render: (_, request) => (
        <Tooltip title={request.customer.name}>
          <span className="sales-grid-clip sales-grid-strong">
            {request.customer.code ?? request.customer.name}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Đơn lô nguồn",
      key: "source",
      width: 150,
      render: (_, request) =>
        request.salesOrder ? (
          <Tooltip title={`Mở đơn lô ${request.salesOrder.orderNo}`}>
            <Button
              type="link"
              className="sales-grid-link sales-grid-clip"
              onClick={() => navigate(`/sales/orders/${request.salesOrder!.id}`)}
            >
              {request.salesOrder.orderNo}
            </Button>
          </Tooltip>
        ) : (
          <span className="sales-grid-danger">Chưa chọn lô</span>
        ),
    },
    {
      title: "Hàng",
      key: "lines",
      width: 120,
      render: (_, request) => (
        <Tooltip
          title={request.lines
            .map((line) => `${line.product.name} · ${formatQty(line.requestedQty)} ${line.product.uom}`)
            .join("\n")}
        >
          <span className="sales-grid-clip">
            {uniq(request.lines.map((line) => line.product.code ?? line.product.name)).join(", ")}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Lượng",
      key: "qty",
      width: 92,
      align: "right",
      render: (_, request) => {
        const total = request.lines.reduce((sum, line) => sum + Number(line.requestedQty ?? 0), 0);
        return (
          <Tooltip
            title={request.lines
              .map((line) => `${line.product.code ?? line.product.name}: ${formatQty(line.requestedQty)}`)
              .join("\n")}
          >
            <span className="sales-grid-num">{formatQty(total)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Kho rút",
      key: "warehouse",
      width: 120,
      render: (_, request) => {
        const names = uniq(request.lines.map((line) => line.warehouse?.name));
        if (!names.length) return <span className="sales-grid-empty">—</span>;
        return (
          <Tooltip title={names.join(", ")}>
            <span className="sales-grid-clip">{names.join(", ")}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Lái xe",
      key: "vehicle",
      width: 140,
      render: (_, request) => {
        if (!request.driverName && !request.vehiclePlate) return <span className="sales-grid-empty">—</span>;
        // Hai dòng: tên lái xe trên, biển số dưới — cùng cách trình bày với màn Đơn bán.
        return (
          <Tooltip title={[request.driverName, request.vehiclePlate].filter(Boolean).join(" · ")}>
            <div className="sales-grid-stack">
              <div className="sales-grid-clip">{request.driverName || "—"}</div>
              {request.vehiclePlate && <div className="sales-grid-clip sales-grid-sub">{request.vehiclePlate}</div>}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 128,
      render: (value: SalesWithdrawalStatus) => <WithdrawalStatusTag status={value} />,
    },
    {
      title: "",
      key: "actions",
      width: ACTION_COL_WIDTH,
      fixed: "right",
      render: (_, request) => {
        const items: MenuProps["items"] = [
          { key: "detail", icon: <EyeOutlined />, label: "Xem chi tiết" },
          ...(request.salesOrder
            ? [{ key: "source", icon: <FileSearchOutlined />, label: "Mở đơn lô nguồn" }]
            : []),
        ];
        return (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items,
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === "detail") setDetailId(request.id);
                if (key === "source" && request.salesOrder) navigate(`/sales/orders/${request.salesOrder.id}`);
              },
            }}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  /** Bề ngang tối thiểu tính thẳng từ các cột, không gõ tay một con số dễ lệch. */
  const gridWidth = columns.reduce((sum, column) => sum + (Number(column.width) || 0), 0);

  return (
    <div className="sales-orders-page" style={{ padding: 10 }}>
      <div
        className="sales-orders-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Đơn bán <span className="sales-orders-page-separator">/</span> Rút lô
        </Typography.Title>
        <PermissionGate need={PERMS.SALES_WITHDRAW_CREATE}>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo phiếu rút
          </Button>
        </PermissionGate>
      </div>

      <div className="sales-orders-tabs">
        <Tabs activeKey={tab} items={tabItems} onChange={changeTab} tabBarExtraContent={{ right: toolbar }} />
      </div>

      <FilterTags items={filterTags} />

      <Table<SalesWithdrawalRequest>
        className="sales-grid"
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: gridWidth }}
        rowClassName={(request) => (request.status === "NEED_SOURCE" ? "sales-row-attention" : "")}
        onRow={(request) => ({
          onDoubleClick: () => setDetailId(request.id),
        })}
        locale={{
          emptyText: keyword || activeFilterCount ? "Không có phiếu rút nào khớp bộ lọc" : "Chưa có phiếu rút nào",
        }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `${total} phiếu`,
          onChange: setPage,
        }}
      />

      <WithdrawalCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(request) => setDetailId(request.id)}
      />
      <WithdrawalDetailDrawer id={detailId} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} />
    </div>
  );
}
