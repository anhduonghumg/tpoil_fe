import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Dropdown,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  SwapOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { PermissionGate } from "../../../shared/authz/PermissionGate";
import { PERMS } from "../../../shared/authz/perms";
import {
  useCancelSalesOrder,
  useDeleteSalesOrder,
  useInternalSalesOrders,
  usePrintSalesOrders,
  useSalesOrderStatusCounts,
} from "../hooks";
import type { SalesOrder, SalesOrderKind, SalesOrderStatus } from "../types";
import { InternalSalesOrderModal } from "../ui/InternalSalesOrderModal";
import { SalesOrderCreateModal } from "../ui/SalesOrderCreateModal";
import { QuickEntryModal } from "../ui/QuickEntryModal";
import { QuickEntryPanel } from "../ui/QuickEntryPanel";
import {
  formatMoney,
  formatQty,
  lineNetAmount,
  ORDER_STATUS_LABELS,
  OrderKindTag,
} from "../ui/labels";
import "../sales.css";

const ALL_TAB = "ALL";
/** Nhập nhanh có ô nhập riêng nên nó thay cả bảng đơn, không dùng bộ lọc chung. */
const RETAIL_ENTRY_TAB = "QUICK_ENTRY_RETAIL";
const LOT_ENTRY_TAB = "QUICK_ENTRY_LOT";
const ENTRY_TABS = [RETAIL_ENTRY_TAB, LOT_ENTRY_TAB];

/**
 * Mọi trạng thái sau khi đơn được duyệt. Sale chỉ cần biết "đã qua duyệt hay chưa";
 * chi tiết đơn đang nằm ở khâu nào là việc của kho, kế toán.
 */
const APPROVED_STATUSES: SalesOrderStatus[] = [
  "CONFIRMED",
  "AWAITING_STOCK",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "WAREHOUSE_PROCESSING",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "AWAITING_RECONCILIATION",
  "AWAITING_INVOICE",
  "COMPLETED",
];

/**
 * Màn này phục vụ Sale: nhập đơn, rồi theo dõi đơn của mình qua ba mốc — chờ duyệt,
 * đã duyệt, bị từ chối. Việc duyệt nằm ở màn "Phê duyệt đơn bán".
 */
const TAB_DEFS: Array<{ key: string; label: string; statuses?: SalesOrderStatus[] }> = [
  { key: RETAIL_ENTRY_TAB, label: "Đơn lẻ" },
  { key: LOT_ENTRY_TAB, label: "Đơn lô" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt", statuses: ["PENDING_REVIEW"] },
  { key: "APPROVED", label: "Đơn đã duyệt", statuses: APPROVED_STATUSES },
  { key: "REJECTED", label: "Đơn từ chối", statuses: ["REJECTED"] },
  { key: ALL_TAB, label: "Tất cả" },
];

/** Trạng thái mà một tab lọc theo; tab nhập nhanh và "Tất cả" thì không lọc. */
const STATUSES_FOR_TAB = new Map(
  TAB_DEFS.filter((item) => item.statuses).map((item) => [item.key, item.statuses!]),
);

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function orderTotal(order: SalesOrder) {
  return order.lines.reduce((sum, line) => sum + lineNetAmount(line), 0);
}

/** Gộp giá trị theo dòng thành một ô: bỏ trống, bỏ trùng, giữ thứ tự dòng. */
const uniq = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];

/**
 * Đơn còn sửa được: nháp, đang chờ duyệt, hoặc bị từ chối. Sửa đơn đang chờ duyệt sẽ
 * mở lại vòng duyệt mới — backend tự gửi lại nên Sale không phải nhớ bấm gửi.
 */
const EDITABLE_STATUSES: SalesOrderStatus[] = ["DRAFT", "PENDING_REVIEW", "REJECTED"];

/**
 * Bỏ một đơn đi có hai cách, và không được nhầm:
 *
 * - Đơn nháp chưa từng gửi duyệt thì xóa hẳn, không còn dấu vết nào cần giữ.
 * - Đơn đã qua kiểm duyệt (chờ duyệt / bị từ chối) thì **hủy**, không xóa: yêu cầu duyệt
 *   được đánh dấu hủy, hàng đang giữ được trả lại, và đơn vẫn còn để đối chiếu về sau.
 *   Backend cũng chặn xóa cứng những đơn này.
 */
function removalOf(order: SalesOrder) {
  const hardDelete = order.status === "DRAFT";
  return hardDelete
    ? {
        hardDelete,
        tooltip: "Xóa đơn nháp",
        title: "Xóa đơn nháp?",
        body: "Đơn chưa từng gửi duyệt nên sẽ bị xóa hẳn, không khôi phục được.",
        okText: "Xóa đơn",
        needReason: false,
      }
    : {
        hardDelete,
        tooltip: "Bỏ đơn — đơn đã qua kiểm duyệt nên sẽ được hủy chứ không xóa hẳn",
        title: "Hủy đơn?",
        body: "Đơn đã qua kiểm duyệt nên được hủy chứ không xóa hẳn: yêu cầu duyệt bị hủy theo, hàng đang giữ được trả lại, đơn vẫn còn để đối chiếu.",
        okText: "Hủy đơn",
        needReason: true,
      };
}

/** Bề ngang ô chọn dòng của antd, phải cộng vào khi tự tính bề ngang bảng. */
const SELECTION_COL_WIDTH = 40;

/** Danh sách đơn bán nội bộ — màn hình Sale dùng hằng ngày. */
export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? RETAIL_ENTRY_TAB);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [kind, setKind] = useState<SalesOrderKind | "ALL">("ALL");
  const [status, setStatus] = useState<SalesOrderStatus>();
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** Đơn đang mở để sửa; modal tạo mới và modal sửa dùng chung component. */
  const [editOrder, setEditOrder] = useState<SalesOrder>();
  /** Đơn đang chờ xác nhận bỏ đi (xóa nháp hoặc hủy đơn đã qua duyệt). */
  const [removeTarget, setRemoveTarget] = useState<SalesOrder>();
  const [removeReason, setRemoveReason] = useState("");
  const [dayTradeOpen, setDayTradeOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printPeriodOpen, setPrintPeriodOpen] = useState(false);
  const [printCustomerId, setPrintCustomerId] = useState<string>();
  const [printRange, setPrintRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const printMutation = usePrintSalesOrders();
  const deleteMutation = useDeleteSalesOrder();
  const cancelMutation = useCancelSalesOrder();
  const removingId =
    deleteMutation.isPending || cancelMutation.isPending ? removeTarget?.id : undefined;

  const closeRemove = () => {
    setRemoveTarget(undefined);
    setRemoveReason("");
  };

  /** Chạy đúng lệnh cho trạng thái của đơn; xem `removalOf` để biết vì sao tách hai. */
  const confirmRemove = async () => {
    if (!removeTarget) return;
    if (removalOf(removeTarget).hardDelete) {
      await deleteMutation.mutateAsync(removeTarget.id);
    } else {
      await cancelMutation.mutateAsync({
        orderId: removeTarget.id,
        reason: removeReason.trim() || undefined,
      });
    }
    closeRemove();
    countsQuery.refetch();
  };

  // "Đơn lẻ"/"Đơn lô" are quick-entry views, not database statuses.
  const tabStatuses = STATUSES_FOR_TAB.get(tab);

  const countsQuery = useSalesOrderStatusCounts({
    keyword: keyword.trim() || undefined,
    kind: kind === "ALL" ? undefined : kind,
    customerPartyId,
  });

  /** Tab đếm theo trạng thái nó gom, riêng "Tất cả" lấy tổng. */
  const tabItems = useMemo(() => {
    const byStatus = countsQuery.data?.byStatus ?? {};
    const total = countsQuery.data?.total ?? 0;
    return TAB_DEFS.map((item) => {
      if (ENTRY_TABS.includes(item.key)) return { key: item.key, label: item.label };
      const count = item.statuses
        ? item.statuses.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0)
        : total;
      return { key: item.key, label: `${item.label} (${count})` };
    });
  }, [countsQuery.data]);

  const query = useInternalSalesOrders({
    keyword: keyword.trim() || undefined,
    kind: kind === "ALL" ? undefined : kind,
    // Tab gộp nhiều trạng thái thì gửi cả danh sách; backend lọc, không lọc phía client
    // nữa để phân trang còn đúng.
    status: tabStatuses?.join(",") ?? status,
    customerPartyId,
    page,
    limit: 20,
  });

  const items = query.data?.items ?? [];

  const changeTab = (next: string) => {
    setTab(next);
    setStatus(undefined);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const kindLabel = (value: SalesOrderKind) =>
    ({ SINGLE: "Lấy 1 lần", LOT: "Đơn lô", DAY_TRADE: "Mua bán trong ngày" })[value];

  const activeFilterCount =
    Number(kind !== "ALL") + Number(Boolean(customerPartyId)) + Number(Boolean(status));

  const filterTags = [
    kind !== "ALL" && {
      key: "kind",
      label: `Loại: ${kindLabel(kind as SalesOrderKind)}`,
      onClear: () => {
        setKind("ALL");
        setPage(1);
      },
    },
    status && {
      key: "status",
      label: `Trạng thái: ${ORDER_STATUS_LABELS[status]}`,
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
          Loại đơn
        </Typography.Text>
        <Select
          size="small"
          style={{ width: "100%" }}
          value={kind}
          onChange={(value) => {
            setKind(value);
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "Mọi loại" },
            { value: "SINGLE", label: "Lấy 1 lần" },
            { value: "LOT", label: "Đơn lô" },
            { value: "DAY_TRADE", label: "Mua bán trong ngày" },
          ]}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Khách hàng
        </Typography.Text>
        <PartySelect
          partyRole="SELLABLE"
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
              setStatus(value as SalesOrderStatus | undefined);
              setPage(1);
            }}
          />
        </div>
      )}
      <div style={{ textAlign: "right" }}>
        <Button
          size="small"
          onClick={() => {
            setKind("ALL");
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

  /** Cột nào cũng phải đáng chỗ nó chiếm — màn 15" không có chỗ cho cột thừa. */
  const showReason = tab === "REJECTED";

  const columns: ColumnsType<SalesOrder> = [
    {
      title: "Số đơn",
      dataIndex: "orderNo",
      width: 152,
      fixed: "left",
      // Số đơn gắn kèm mã khách nên có thể rất dài; cắt gọn để không tràn sang cột bên.
      render: (value: string, order) => (
        <Tooltip title={value}>
          <Button
            type="link"
            className="sales-grid-link sales-grid-clip"
            onClick={() => navigate(`/sales/orders/${order.id}`)}
          >
            {value}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "orderDate",
      width: 62,
      render: (value: string) => dayjs(value).format("DD/MM/YY"),
    },
    {
      // Sale nhớ khách theo mã; tên đầy đủ để ở tooltip cho đỡ chiếm chỗ.
      title: "Khách",
      dataIndex: ["customer", "code"],
      width: 96,
      render: (_, order) => (
        <Tooltip title={order.customer.name}>
          <span className="sales-grid-clip sales-grid-strong">
            {order.customer.code ?? order.customer.name}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Loại",
      dataIndex: "kind",
      width: 74,
      render: (value: SalesOrderKind) => <OrderKindTag kind={value} short />,
    },
    {
      title: "Hàng",
      key: "lines",
      width: 76,
      render: (_, order) => (
        <Tooltip
          title={order.lines
            .map((line) => `${line.product.name} · ${line.orderedActualQty}`)
            .join("\n")}
        >
          <span className="sales-grid-clip">
            {order.lines.map((line) => line.product.code ?? line.product.name).join(", ")}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Lượng",
      key: "qty",
      width: 92,
      align: "right",
      render: (_, order) => {
        const total = order.lines.reduce((sum, line) => sum + Number(line.orderedActualQty ?? 0), 0);
        return (
          <Tooltip
            title={order.lines
              .map((line) => `${line.product.code ?? line.product.name}: ${formatQty(line.orderedActualQty)}`)
              .join("\n")}
          >
            <span className="sales-grid-num">{formatQty(total)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Kho rút",
      key: "issueWarehouse",
      width: 120,
      render: (_, order) => {
        const names = uniq(
          order.lines.map((line) => line.issueWarehouse?.name ?? line.receivingWarehouse?.name),
        );
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
      key: "driver",
      width: 140,
      render: (_, order) => {
        const drivers = uniq(order.lines.map((line) => line.driverName));
        const plates = uniq(order.lines.map((line) => line.vehiclePlate));
        if (!drivers.length && !plates.length) return <span className="sales-grid-empty">—</span>;
        // Hai dòng: tên lái xe trên, biển số dưới.
        return (
          <Tooltip title={[drivers.join(", "), plates.join(", ")].filter(Boolean).join(" · ")}>
            <div className="sales-grid-stack">
              <div className="sales-grid-clip">{drivers.join(", ") || "—"}</div>
              {plates.length > 0 && (
                <div className="sales-grid-clip sales-grid-sub">{plates.join(", ")}</div>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Giá trị",
      key: "amount",
      width: 100,
      align: "right",
      render: (_, order) => <span className="sales-grid-num">{formatMoney(orderTotal(order))}</span>,
    },
    // Tab "Đơn từ chối" chỉ có ích khi Sale đọc được vì sao bị trả, để sửa rồi gửi lại.
    ...(showReason
      ? [
          {
            title: "Lý do từ chối",
            dataIndex: "rejectedReason",
            width: 120,
            render: (value?: string | null) =>
              value ? (
                <Tooltip title={value}>
                  <span className="sales-grid-clip sales-grid-danger">{value}</span>
                </Tooltip>
              ) : (
                <span className="sales-grid-empty">—</span>
              ),
          } as ColumnsType<SalesOrder>[number],
        ]
      : []),
    {
      title: "",
      key: "actions",
      width: 44,
      fixed: "right",
      render: (_, order) => {
        const removal = removalOf(order);
        const editable = EDITABLE_STATUSES.includes(order.status);
        const items: MenuProps["items"] = [
          { key: "detail", icon: <EyeOutlined />, label: "Xem chi tiết" },
          ...(editable
            ? [
                { type: "divider" as const },
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label:
                    order.status === "PENDING_REVIEW" ? "Sửa đơn (duyệt lại)" : "Sửa đơn",
                },
                { key: "remove", icon: <DeleteOutlined />, label: removal.okText, danger: true },
              ]
            : []),
        ];
        return (
          <PermissionGate need={PERMS.SALES_VIEW}>
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items,
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === "detail") navigate(`/sales/orders/${order.id}`);
                  if (key === "edit") setEditOrder(order);
                  if (key === "remove") setRemoveTarget(order);
                },
              }}
            >
              <Button
                size="small"
                type="text"
                icon={<MoreOutlined />}
                loading={removingId === order.id}
              />
            </Dropdown>
          </PermissionGate>
        );
      },
    },
  ];

  /**
   * Bề ngang tối thiểu tính thẳng từ các cột đang hiện, thay vì một con số gõ tay dễ
   * lệch khi thêm/bớt cột. Tab nào ít cột thì bảng hẹp lại, không cuộn ngang thừa.
   */
  const gridWidth =
    columns.reduce((sum, column) => sum + (Number(column.width) || 0), 0) + SELECTION_COL_WIDTH;

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
          Đơn bán <span className="sales-orders-page-separator">/</span>{" "}
          {tab === LOT_ENTRY_TAB ? "Đơn lô" : "Đơn lẻ"}
        </Typography.Title>
        <Space wrap>
          <PermissionGate need={PERMS.SALES_QUICKENTRY_USE}>
            <Button size="small" icon={<ThunderboltOutlined />} onClick={() => setQuickOpen(true)}>
              Nhập nhanh
            </Button>
          </PermissionGate>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintPeriodOpen(true)}>
            In theo kỳ
          </Button>
          <PermissionGate need={PERMS.SALES_CREATE}>
            {/* Đơn khách đặt mà mình chưa có hàng: lưu xong hệ thống báo mua hàng đi mua. */}
            <Tooltip title="Đơn bán có đơn mua đối ứng — kinh doanh ghi nhận, mua hàng đi mua về giao">
              <Button size="small" icon={<SwapOutlined />} onClick={() => setDayTradeOpen(true)}>
                Tạo đơn bán đối ứng
              </Button>
            </Tooltip>
          </PermissionGate>
          <PermissionGate need={PERMS.SALES_CREATE}>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tạo đơn bán
            </Button>
          </PermissionGate>
        </Space>
      </div>

      <div className="sales-orders-tabs">
        <Tabs activeKey={tab} items={tabItems} onChange={changeTab} />
      </div>

      {ENTRY_TABS.includes(tab) ? (
        <QuickEntryPanel
          key={tab}
          mode={tab === LOT_ENTRY_TAB ? "LOT" : "RETAIL"}
          onSaved={() => query.refetch()}
        />
      ) : null}

      <div style={{ display: ENTRY_TABS.includes(tab) ? "none" : undefined }}>
      <FilterToolbar
        left={
          <Input
            allowClear
            size="small"
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            placeholder="Tìm số đơn hoặc tên khách"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => {
              setKeyword(searchText);
              setPage(1);
            }}
          />
        }
        right={
          <>
            <FilterButton
              count={activeFilterCount}
              open={filterOpen}
              onOpenChange={setFilterOpen}
              content={filterPanel}
            />
            <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
          </>
        }
      />

      <FilterTags items={filterTags} />

      {selectedIds.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
          message={
            <Space>
              <span>Đã chọn {selectedIds.length} đơn</span>
              <Button
                size="small"
                type="primary"
                icon={<PrinterOutlined />}
                loading={printMutation.isPending}
                onClick={() => printMutation.mutate({ ids: selectedIds })}
              >
                In {selectedIds.length} đơn
              </Button>
              <Button size="small" type="text" onClick={() => setSelectedIds([])}>
                Bỏ chọn
              </Button>
            </Space>
          }
        />
      )}

      <Table<SalesOrder>
        className="sales-grid"
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
          preserveSelectedRowKeys: true,
        }}
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={items}
        scroll={{ x: gridWidth }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
      </div>

      <Modal
        open={printPeriodOpen}
        title="In đơn đặt hàng theo kỳ"
        okText="In"
        cancelText="Đóng"
        okButtonProps={{ disabled: !printRange }}
        confirmLoading={printMutation.isPending}
        onCancel={() => setPrintPeriodOpen(false)}
        onOk={async () => {
          await printMutation.mutateAsync({
            customerPartyId: printCustomerId,
            dateFrom: printRange?.[0]?.format("YYYY-MM-DD"),
            dateTo: printRange?.[1]?.format("YYYY-MM-DD"),
            kind: kind === "ALL" ? undefined : (kind as SalesOrderKind),
          });
          setPrintPeriodOpen(false);
        }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Gộp tất cả đơn trong kỳ thành một file PDF, sắp theo ngày rồi số đơn. Tối đa 300 đơn
          một lần.
        </Typography.Paragraph>
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Khách hàng (để trống = mọi khách)
            </Typography.Text>
            <PartySelect
              partyRole="SELLABLE"
              allowClear
              style={{ width: "100%" }}
              placeholder="Chọn khách hàng"
              value={printCustomerId}
              onChange={(value) => setPrintCustomerId(value ?? undefined)}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Khoảng ngày đơn
            </Typography.Text>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={printRange ?? undefined}
              onChange={(value) => setPrintRange((value as [dayjs.Dayjs, dayjs.Dayjs]) ?? null)}
              presets={[
                { label: "Tháng này", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                {
                  label: "Tháng trước",
                  value: [
                    dayjs().subtract(1, "month").startOf("month"),
                    dayjs().subtract(1, "month").endOf("month"),
                  ],
                },
              ]}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        open={Boolean(removeTarget)}
        title={removeTarget ? removalOf(removeTarget).title : ""}
        okText={removeTarget ? removalOf(removeTarget).okText : ""}
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
        confirmLoading={deleteMutation.isPending || cancelMutation.isPending}
        onCancel={closeRemove}
        onOk={confirmRemove}
      >
        <Typography.Paragraph>
          <Typography.Text strong>{removeTarget?.orderNo}</Typography.Text> —{" "}
          {removeTarget?.customer.name}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          {removeTarget ? removalOf(removeTarget).body : ""}
        </Typography.Paragraph>
        {removeTarget && removalOf(removeTarget).needReason && (
          <Input.TextArea
            rows={2}
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            placeholder="Lý do hủy (không bắt buộc)"
          />
        )}
      </Modal>

      <InternalSalesOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(id) => navigate(`/sales/orders/${id}`)}
      />
      <InternalSalesOrderModal
        // key ép form nạp lại khi đổi đơn, nếu không nó giữ giá trị của đơn mở trước đó.
        key={editOrder?.id}
        open={Boolean(editOrder)}
        order={editOrder}
        onClose={() => setEditOrder(undefined)}
        onSaved={() => {
          setEditOrder(undefined);
          query.refetch();
          countsQuery.refetch();
        }}
      />
      <SalesOrderCreateModal
        open={dayTradeOpen}
        onClose={() => setDayTradeOpen(false)}
        onCreated={(id) => navigate(`/sales/orders/${id}`)}
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
