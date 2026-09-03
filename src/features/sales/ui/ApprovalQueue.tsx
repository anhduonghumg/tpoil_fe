import React, { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  RollbackOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import {
  useAdjustLineDiscount,
  useAdjustLineSupplier,
  useDecideManyApprovals,
  useDecideSalesApproval,
  useReturnSalesApprovalToPending,
  useSalesApprovals,
  useSalesOrderDetail,
} from "../hooks";
import type {
  ApprovalOrderLine,
  SalesApprovalRequest,
  SalesApprovalStatus,
  SalesApprovalType,
  SalesOrderKind,
} from "../types";
import { ApprovalTypeTag, formatMoney, formatQty, OrderKindTag } from "./labels";
import { InternalSalesOrderModal } from "./InternalSalesOrderModal";
import "../sales.css";

const STATUS_TABS: Array<{ value: SalesApprovalStatus; label: string }> = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
  { value: "STALE", label: "Hết hiệu lực" },
];

const TYPE_OPTIONS: Array<{ value: SalesApprovalType | "ALL"; label: string }> = [
  { value: "ALL", label: "Mọi loại duyệt" },
  { value: "STANDARD", label: "Đơn bán" },
  { value: "PRICE", label: "Giá" },
  { value: "CREDIT", label: "Công nợ" },
  { value: "EXCEPTION", label: "Ngoại lệ" },
];

const KIND_OPTIONS: Array<{ value: SalesOrderKind | "ALL"; label: string }> = [
  { value: "ALL", label: "Mọi loại đơn" },
  { value: "SINGLE", label: "Bán lẻ" },
  { value: "LOT", label: "Bán lô" },
  { value: "DAY_TRADE", label: "Mua đứt bán đoạn" },
];

const PAGE_SIZE = 30;
const AUTO_FIFO_SUPPLIER = "__AUTO_FIFO__";

/**
 * Một chứng từ có thể sinh nhiều yêu cầu duyệt cùng lúc — vướng công nợ thì kế toán
 * duyệt, vướng giá thì kinh doanh duyệt, mỗi loại một người. Nếu để nguyên như API
 * trả về thì cùng một đơn hiện lại vài lần, kèm cả dòng hàng và ô CK điều chỉnh lặp
 * theo, rất dễ sửa nhầm. Nên ở đây gom tất cả yêu cầu của một chứng từ thành một khối.
 */
type QueueGroup = {
  key: string;
  /** Mọi yêu cầu đang treo của chứng từ này. */
  requests: SalesApprovalRequest[];
  /** Yêu cầu mới nhất, dùng để lấy thông tin đơn/khách/ngày. */
  head: SalesApprovalRequest;
  lines: ApprovalOrderLine[];
  /** Những yêu cầu người dùng hiện tại thực sự bấm duyệt được. */
  decidable: SalesApprovalRequest[];
};

/** Một dòng bảng = một dòng hàng; cột thuộc về chứng từ gộp bằng rowSpan. */
type QueueRow = {
  key: string;
  group: QueueGroup;
  line: ApprovalOrderLine | null;
  /** > 0 ở dòng đầu của khối, = 0 ở các dòng sau (ô bị gộp lên trên). */
  span: number;
  isLast: boolean;
};

function groupRequests(items: SalesApprovalRequest[]): QueueGroup[] {
  const groups = new Map<string, QueueGroup>();
  for (const request of items) {
    // Yêu cầu không gắn chứng từ nào thì tự nó là một khối.
    const key = request.salesOrderId ?? request.withdrawalRequestId ?? request.id;
    const existing = groups.get(key);
    if (existing) {
      existing.requests.push(request);
      if (isDecidable(request)) existing.decidable.push(request);
      continue;
    }
    groups.set(key, {
      key,
      requests: [request],
      head: request,
      lines: request.salesOrder?.lines ?? [],
      decidable: isDecidable(request) ? [request] : [],
    });
  }
  return [...groups.values()];
}

function buildRows(groups: QueueGroup[]): QueueRow[] {
  const rows: QueueRow[] = [];
  for (const group of groups) {
    if (!group.lines.length) {
      // Phiếu rút lô (hoặc đơn chưa có dòng): vẫn phải duyệt được.
      rows.push({ key: group.key, group, line: null, span: 1, isLast: true });
      continue;
    }
    group.lines.forEach((line, index) => {
      rows.push({
        key: `${group.key}:${line.id}`,
        group,
        line,
        span: index === 0 ? group.lines.length : 0,
        isLast: index === group.lines.length - 1,
      });
    });
  }
  return rows;
}

/** Chỉ yêu cầu còn treo và người dùng có quyền mới bấm duyệt được. */
function isDecidable(request: SalesApprovalRequest) {
  return request.status === "PENDING" && Boolean(request.canDecide);
}

const isActionable = (group: QueueGroup) => group.decidable.length > 0;

function violationsOf(request: SalesApprovalRequest) {
  return request.reasonDetail?.violations ?? [];
}

/**
 * Ô CK điều chỉnh sửa được tại chỗ. Giữ giá trị cục bộ trong lúc gõ, chỉ gọi API khi
 * rời ô hoặc Enter và giá trị thực sự đổi — backend tính lại thành tiền của cả đơn.
 */
const DiscountAdjustCell: React.FC<{
  line: ApprovalOrderLine;
  editable: boolean;
  onCommit: (lineId: string, value: number) => Promise<unknown>;
}> = ({ line, editable, onCommit }) => {
  const stored = Number(line.discountAdjustmentAmount ?? 0);
  const [draft, setDraft] = useState<number | null>(stored);
  const [saving, setSaving] = useState(false);

  // Dữ liệu mới về sau khi refetch thì bỏ bản nháp đi.
  React.useEffect(() => {
    setDraft(stored);
  }, [stored]);

  if (!editable) {
    return <span>{formatMoney(line.discountAdjustmentAmount)}</span>;
  }

  const commit = async () => {
    const next = draft ?? 0;
    if (next === stored) return;
    setSaving(true);
    try {
      await onCommit(line.id, next);
    } catch {
      setDraft(stored);
    } finally {
      setSaving(false);
    }
  };

  return (
    <InputNumber
      size="small"
      variant="outlined"
      className={`approval-discount-input${draft !== stored ? " approval-discount-dirty" : ""}`}
      value={draft}
      disabled={saving}
      controls={false}
      formatter={(value) =>
        value === undefined || value === null
          ? ""
          : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      }
      parser={(value) => Number((value ?? "").replace(/\./g, "")) || 0}
      onChange={(value) => setDraft(value as number | null)}
      onBlur={commit}
      onPressEnter={commit}
    />
  );
};

/**
 * Hàng đợi phê duyệt dùng chung: màn "Phê duyệt đơn bán" mở đầy đủ, còn tab "Chờ duyệt"
 * trong màn đơn bán nhúng lại đúng bảng này nên người duyệt thấy một giao diện duy nhất.
 */
export function ApprovalQueue({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SalesApprovalStatus>("PENDING");
  const [type, setType] = useState<SalesApprovalType | "ALL">("ALL");
  const [kind, setKind] = useState<SalesOrderKind | "ALL">("ALL");
  const [onlyMine, setOnlyMine] = useState(true);
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  /** Quyết định đang chờ xác nhận, tính theo khối chứng từ chứ không theo từng yêu cầu. */
  const [decision, setDecision] = useState<{
    groups: QueueGroup[];
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [note, setNote] = useState("");
  /** Đơn đang mở để sửa ngay trên hàng đợi; phải tải bản đầy đủ vì payload duyệt rút gọn. */
  const [editOrderId, setEditOrderId] = useState<string>();

  const query = useSalesApprovals({
    status,
    type: type === "ALL" ? undefined : type,
    kind: kind === "ALL" ? undefined : kind,
    mine: onlyMine || undefined,
    customerPartyId,
    keyword: keyword || undefined,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
    page,
    limit: PAGE_SIZE,
  });
  const decideMutation = useDecideSalesApproval();
  const decideManyMutation = useDecideManyApprovals();
  const returnToPendingMutation = useReturnSalesApprovalToPending();
  const adjustMutation = useAdjustLineDiscount();
  const adjustSupplierMutation = useAdjustLineSupplier();
  const editOrderQuery = useSalesOrderDetail(editOrderId);

  const items = query.data?.items ?? [];
  const groups = useMemo(() => groupRequests(items), [items]);
  const rows = useMemo(() => buildRows(groups), [groups]);
  const actionable = useMemo(() => groups.filter(isActionable), [groups]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedSet.has(group.key)),
    [groups, selectedSet],
  );

  /** Mutation dùng chung cho cả bảng, nhưng spinner phải bám đúng yêu cầu/đơn đang xử lý. */
  const isGroupApproving = (group: QueueGroup) => {
    const requestIds = new Set(group.decidable.map((request) => request.id));
    if (
      decideMutation.isPending &&
      decideMutation.variables?.decision === "APPROVE" &&
      requestIds.has(decideMutation.variables.id)
    ) {
      return true;
    }
    return Boolean(
      decideManyMutation.isPending &&
        decideManyMutation.variables?.decision === "APPROVE" &&
        decideManyMutation.variables.ids.some((id) => requestIds.has(id)),
    );
  };

  /** Đổi điều kiện lọc thì trang và lựa chọn cũ không còn đúng nữa. */
  const resetView = () => {
    setPage(1);
    setSelected([]);
  };

  const toggleOne = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((row) => row !== id)));

  const allSelected = actionable.length > 0 && selected.length === actionable.length;

  const closeDecision = () => {
    setDecision(null);
    setNote("");
  };

  const filterTags: ActiveFilterTag[] = [
    type !== "ALL" && {
      key: "type",
      label: `Loại duyệt: ${TYPE_OPTIONS.find((row) => row.value === type)?.label}`,
      onClear: () => {
        setType("ALL");
        resetView();
      },
    },
    kind !== "ALL" && {
      key: "kind",
      label: `Loại đơn: ${KIND_OPTIONS.find((row) => row.value === kind)?.label}`,
      onClear: () => {
        setKind("ALL");
        resetView();
      },
    },
    customerPartyId && {
      key: "customer",
      label: "Đang lọc theo khách hàng",
      onClear: () => {
        setCustomerPartyId(undefined);
        resetView();
      },
    },
    range && {
      key: "range",
      label: `Ngày ${range[0].format("DD/MM")} – ${range[1].format("DD/MM/YYYY")}`,
      onClear: () => {
        setRange(null);
        resetView();
      },
    },
    !onlyMine && {
      key: "mine",
      label: "Xem cả việc của người khác",
      onClear: () => {
        setOnlyMine(true);
        resetView();
      },
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Loại duyệt
        </Typography.Text>
        <Select
          style={{ width: "100%" }}
          size="small"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(value) => {
            setType(value);
            resetView();
          }}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Loại đơn
        </Typography.Text>
        <Select
          style={{ width: "100%" }}
          size="small"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(value) => {
            setKind(value);
            resetView();
          }}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Khách hàng
        </Typography.Text>
        <PartySelect
          partyRole="SELLABLE"
          allowClear
          size="small"
          style={{ width: "100%" }}
          value={customerPartyId ?? null}
          onChange={(value) => {
            setCustomerPartyId(value ?? undefined);
            resetView();
          }}
          placeholder="Tất cả khách hàng"
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Ngày chứng từ
        </Typography.Text>
        <DatePicker.RangePicker
          style={{ width: "100%" }}
          size="small"
          format="DD/MM/YYYY"
          value={range}
          onChange={(value) => {
            setRange(value && value[0] && value[1] ? [value[0], value[1]] : null);
            resetView();
          }}
        />
      </div>
      <Checkbox
        checked={onlyMine}
        onChange={(e) => {
          setOnlyMine(e.target.checked);
          resetView();
        }}
      >
        Chỉ việc tôi được duyệt
      </Checkbox>
    </div>
  );

  /** Ô thuộc về đơn: gộp theo số dòng hàng, dòng sau bị ẩn đi. */
  const orderCell = (row: QueueRow) => ({ rowSpan: row.span });

  const columns: ColumnsType<QueueRow> = [
    {
      title: (
        <Checkbox
          checked={allSelected}
          indeterminate={selected.length > 0 && !allSelected}
          disabled={!actionable.length}
          onChange={(e) => setSelected(e.target.checked ? actionable.map((row) => row.key) : [])}
        />
      ),
      key: "select",
      width: 32,
      fixed: "left",
      onCell: orderCell,
      render: (_, row) =>
        isActionable(row.group) ? (
          <Checkbox
            checked={selectedSet.has(row.group.key)}
            onChange={(e) => toggleOne(row.group.key, e.target.checked)}
          />
        ) : null,
    },
    {
      title: "Số đơn",
      key: "orderNo",
      width: 150,
      fixed: "left",
      onCell: orderCell,
      render: (_, { group }) => {
        const order = group.head.salesOrder;
        const withdrawal = group.head.withdrawalRequest;
        // Gộp lý do của mọi yêu cầu trong khối, bỏ trùng theo mã.
        const violations = [
          ...new Map(
            group.requests.flatMap(violationsOf).map((violation) => [violation.code, violation]),
          ).values(),
        ];
        const no = order?.orderNo ?? withdrawal?.requestNo ?? "—";
        return (
          <div className="sales-grid-stack">
            <div className="sales-grid-clip">
              <Tooltip title={no}>
                <Button
                  type="link"
                  className="sales-grid-link"
                  onClick={() =>
                    order ? navigate(`/sales/orders/${order.id}`) : navigate("/sales/withdrawals")
                  }
                >
                  {no}
                </Button>
              </Tooltip>
            </div>
            <div className="sales-grid-clip sales-grid-sub">
              {/* Mỗi loại duyệt là một người khác nhau ký; hiện đủ để biết đơn còn vướng gì. */}
              {group.requests.map((request) => (
                <ApprovalTypeTag key={request.id} type={request.type} />
              ))}
              {group.head.approvalCycle > 0 && <span> vòng {group.head.approvalCycle}</span>}
              {violations.length > 0 && (
                <Tooltip
                  title={
                    <ul style={{ margin: 0, paddingInlineStart: 16 }}>
                      {violations.map((violation) => (
                        <li key={violation.code}>{violation.message}</li>
                      ))}
                    </ul>
                  }
                >
                  <WarningOutlined style={{ color: "#faad14", marginInlineStart: 4 }} />
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Ngày",
      key: "date",
      width: 58,
      onCell: orderCell,
      render: (_, { group }) => {
        const value =
          group.head.salesOrder?.orderDate ?? group.head.withdrawalRequest?.requestDate;
        return value ? dayjs(value).format("DD/MM/YY") : "—";
      },
    },
    {
      // Chỉ mã khách; tên đầy đủ để ở tooltip cho khỏi chiếm chỗ.
      title: "Khách",
      key: "customer",
      width: 100,
      onCell: orderCell,
      render: (_, { group }) => {
        const customer =
          group.head.salesOrder?.customer ?? group.head.withdrawalRequest?.customer;
        if (!customer) return <span className="sales-grid-empty">—</span>;
        return (
          <Tooltip title={customer.name}>
            <span className="sales-grid-clip sales-grid-strong">
              {customer.code ?? customer.name}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: <Tooltip title="Loại đơn">Loại</Tooltip>,
      key: "kind",
      width: 74,
      onCell: orderCell,
      render: (_, { group }) =>
        group.head.salesOrder ? (
          <OrderKindTag kind={group.head.salesOrder.kind} short />
        ) : (
          <Tag color="purple" style={{ marginInlineEnd: 0 }}>
            Rút lô
          </Tag>
        ),
    },
    {
      title: "Mặt hàng",
      key: "product",
      width: 90,
      render: (_, { line }) => {
        if (!line) return <span className="sales-grid-empty">—</span>;
        const receivingName = line.issueWarehouse?.name ?? line.receivingWarehouseArea?.name;
        const title = receivingName
          ? line.product.name + " · kho " + receivingName
          : line.product.name;
        return (
          <Tooltip title={title}>
            <span className="sales-grid-clip">{line.product.code ?? line.product.name}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 76,
      align: "right",
      render: (_, { line }) =>
        line ? <span className="sales-grid-num">{formatQty(line.orderedActualQty)}</span> : "—",
    },
    {
      title: "Kho nhận",
      key: "issueWarehouse",
      width: 110,
      ellipsis: true,
      render: (_, { line }) => {
        const name = line?.issueWarehouse?.name ?? line?.receivingWarehouseArea?.name;
        return name ? <Tooltip title={name}><span className="sales-grid-clip">{name}</span></Tooltip> : "—";
      },
    },
    {
      title: "Mã NCC",
      key: "supplierCode",
      // Đủ chỗ cho mã NCC dài nhất đang dùng (PETROBMHOABINH) kèm mũi tên của ô chọn.
      width: 142,
      render: (_, { line, group }) => {
        if (!line) return "—";
        const codes = [
          ...new Set(
            (line.supplierAllocations ?? [])
              .map((allocation) => allocation.supplier?.code)
              .filter((code): code is string => Boolean(code)),
          ),
        ];
        if (codes.length) {
          const value = codes.join(", ");
          return <Tooltip title={value}><span className="sales-grid-clip">{value}</span></Tooltip>;
        }
        const preview = line.supplierPreview;
        const fifoCodes = [
          ...new Set((preview?.fifoAllocations ?? []).map((allocation) => allocation.supplierCode)),
        ];
        const fifoSupplierKeys = [
          ...new Set(
            (preview?.fifoAllocations ?? []).map(
              (allocation) => `${allocation.supplierPartyId}|${allocation.releaseCode}`,
            ),
          ),
        ];
        const fifoLabel = fifoCodes.length ? fifoCodes.join(" + ") : "Không có tồn";
        // Khi FIFO chỉ chọn một NCC, dùng luôn option NCC đó để không hiển thị hai dòng
        // giống nhau (AUTO và cố định). DB vẫn giữ null nên lúc duyệt vẫn chạy FIFO.
        const singleFifoSupplierKey = fifoSupplierKeys.length === 1 ? fifoSupplierKeys[0] : null;
        const selectValue =
          (line.preferredSupplierPartyId
            ? `${line.preferredSupplierPartyId}|${line.supplySource}`
            : null) ?? singleFifoSupplierKey ?? AUTO_FIFO_SUPPLIER;
        const preferredLabel = line.preferredSupplier?.code
          ? `${line.preferredSupplier.code} (${line.supplySource})`
          : `${fifoLabel} (${line.supplySource})`;
        if (!isActionable(group)) {
          return (
            <Tooltip title={line.preferredSupplier?.name ?? `FIFO: ${fifoLabel}`}>
              <span className="sales-grid-clip">{preferredLabel}</span>
            </Tooltip>
          );
        }

        return (
          <Tooltip
            title={
              line.preferredSupplier
                ? `${line.preferredSupplier.code} (${line.supplySource}) — ${line.preferredSupplier.name}`
                : `Tự động FIFO (${line.supplySource}): ${fifoLabel}`
            }
          >
            <Select
              size="small"
              value={selectValue}
              style={{ width: "100%" }}
              popupMatchSelectWidth={230}
              loading={
                adjustSupplierMutation.isPending &&
                adjustSupplierMutation.variables?.lineId === line.id
              }
              options={[
                ...(singleFifoSupplierKey
                  ? []
                  : [
                      {
                        value: AUTO_FIFO_SUPPLIER,
                        label: `FIFO (${line.supplySource}): ${fifoLabel}`,
                        title: `Tự động FIFO${fifoCodes.length > 1 ? " (tách nhiều mã)" : ""}`,
                      },
                    ]),
                ...(preview?.supplierOptions ?? []).map((option) => ({
                  value: `${option.supplierPartyId}|${option.supplySource}`,
                  label: `${option.supplierCode} (${option.supplySource})`,
                  title: `${option.supplierName} — mã ${option.supplySource} — còn ${formatQty(option.availableQty)}`,
                  disabled: Number(option.availableQty) < Number(line.orderedActualQty),
                })),
              ]}
              onChange={(value) => {
                const [supplierPartyId, supplySource] =
                  value === AUTO_FIFO_SUPPLIER ? [null, undefined] : value.split("|");
                void adjustSupplierMutation
                  .mutateAsync({
                    lineId: line.id,
                    supplierPartyId,
                    supplySource: supplySource as "TP" | "NCC" | undefined,
                  })
                  .catch(() => undefined);
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Đơn giá",
      key: "unitPrice",
      width: 78,
      align: "right",
      render: (_, { line }) =>
        line ? <span className="sales-grid-num">{formatMoney(line.unitPrice)}</span> : "—",
    },
    {
      title: <Tooltip title="Chiết khấu gốc">CK gốc</Tooltip>,
      key: "discountBase",
      width: 78,
      align: "right",
      render: (_, { line }) =>
        line ? (
          <span className="sales-grid-num">{formatMoney(line.discountBaseAmount)}</span>
        ) : (
          "—"
        ),
    },
    {
      title: <Tooltip title="Chiết khấu điều chỉnh — sửa trực tiếp">CK ĐC</Tooltip>,
      key: "discountAdjustment",
      width: 64,
      align: "right",
      render: (_, { group, line }) =>
        line ? (
          <DiscountAdjustCell
            line={line}
            editable={isActionable(group)}
            onCommit={(lineId, value) =>
              adjustMutation.mutateAsync({ lineId, discountAdjustmentAmount: value })
            }
          />
        ) : (
          "—"
        ),
    },
    {
      title: "Thành tiền",
      key: "netAmount",
      width: 104,
      align: "right",
      render: (_, { group, line }) => {
        if (!line) return "—";
        const order = group.head.salesOrder;
        const multiLine = (order?.lines.length ?? 0) > 1;
        const isLastLine = line.lineNo === order!.lines[order!.lines.length - 1].lineNo;
        return (
          <div className="sales-grid-stack">
            <div className="sales-grid-num">{formatMoney(line.lineNetAmount)}</div>
            {multiLine && isLastLine && (
              <div className="sales-grid-num sales-grid-sub">
                đơn: {formatMoney(order!.orderNetAmount)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 84,
      fixed: "right",
      onCell: orderCell,
      render: (_, { group }) => {
        const order = group.head.salesOrder;
        const canDecide = isActionable(group);
        return (
          <Space size={2}>
            {canDecide && (
              <>
                <Tooltip title="Duyệt">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    loading={isGroupApproving(group)}
                    onClick={() => void approveGroups([group]).catch(() => undefined)}
                  />
                </Tooltip>
                <Tooltip title="Từ chối">
                  <Button
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => setDecision({ groups: [group], action: "REJECT" })}
                  />
                </Tooltip>
              </>
            )}
            {group.head.status === "APPROVED" && order && group.head.canDecide && (
              <Tooltip title="Trả về chờ duyệt">
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  loading={
                    returnToPendingMutation.isPending &&
                    returnToPendingMutation.variables === group.head.id
                  }
                  onClick={() => returnToPendingMutation.mutate(group.head.id)}
                />
              </Tooltip>
            )}
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  { key: "detail", icon: <EyeOutlined />, label: "Xem chi tiết", disabled: !order },
                  {
                    key: "edit",
                    icon: <EditOutlined />,
                    label: "Sửa thông tin đơn",
                    disabled: !order || !canDecide,
                  },
                ],
                onClick: ({ key }) => {
                  if (!order) return;
                  if (key === "detail") navigate(`/sales/orders/${order.id}`);
                  if (key === "edit") setEditOrderId(order.id);
                },
              }}
            >
              <Button size="small" type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const isReject = decision?.action === "REJECT";
  const isBulk = (decision?.groups.length ?? 0) > 1;
  /** Một khối có thể mang nhiều yêu cầu; quyết định áp cho tất cả những cái duyệt được. */
  const decisionRequests = (decision?.groups ?? []).flatMap((group) => group.decidable);
  const selectedTotal = selectedGroups.reduce(
    (sum, group) => sum + Number(group.head.salesOrder?.orderNetAmount ?? 0),
    0,
  );

  const submitDecision = async () => {
    if (!decision || !decisionRequests.length) return;
    const trimmed = note.trim();
    if (decisionRequests.length === 1) {
      await decideMutation.mutateAsync({
        id: decisionRequests[0].id,
        decision: decision.action,
        note: trimmed || undefined,
      });
    } else {
      await decideManyMutation.mutateAsync({
        ids: decisionRequests.map((request) => request.id),
        decision: decision.action,
        note: trimmed || undefined,
      });
    }
    setSelected([]);
    closeDecision();
  };

  const approveGroups = async (groupsToApprove: QueueGroup[]) => {
    const requests = groupsToApprove.flatMap((group) => group.decidable);
    if (!requests.length) return;
    if (requests.length === 1) {
      await decideMutation.mutateAsync({ id: requests[0].id, decision: "APPROVE" });
    } else {
      await decideManyMutation.mutateAsync({
        ids: requests.map((request) => request.id),
        decision: "APPROVE",
      });
    }
    setSelected([]);
  };

  return (
    <div className={embedded ? undefined : "approval-queue-page"}>
      <div className="table-filter-toolbar">
        <div className="table-filter-toolbar-left">
          {/* Nhúng trong tab "Chờ duyệt" thì tiêu đề và dải trạng thái đã nằm ở màn ngoài. */}
          {!embedded && (
            <>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Phê duyệt đơn bán
              </Typography.Title>
              <Segmented
                size="small"
                value={status}
                options={STATUS_TABS}
                onChange={(value) => {
                  setStatus(value as SalesApprovalStatus);
                  resetView();
                }}
              />
            </>
          )}
        </div>
        <div className="table-filter-toolbar-right">
          <Input.Search
            size="small"
            allowClear
            style={{ width: 230 }}
            placeholder="Số đơn, mã hoặc tên khách"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onSearch={(value) => {
              setKeyword(value.trim());
              resetView();
            }}
          />
          <FilterButton
            count={filterTags.length}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            content={filterPanel}
          />
          <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
        </div>
      </div>

      <FilterTags items={filterTags} />

      {selected.length > 0 && (
        <div className="approval-queue-bulkbar">
          <Typography.Text strong>Đã chọn {selected.length} đơn</Typography.Text>
          <Typography.Text type="secondary">
            Tổng thành tiền {formatMoney(selectedTotal)}
          </Typography.Text>
          <Space size={6} style={{ marginInlineStart: "auto" }}>
            <Button size="small" onClick={() => setSelected([])}>
              Bỏ chọn
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setDecision({ groups: selectedGroups, action: "REJECT" })}
            >
              Từ chối {selected.length}
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={selectedGroups.some(isGroupApproving)}
              onClick={() => void approveGroups(selectedGroups).catch(() => undefined)}
            >
              Duyệt {selected.length}
            </Button>
          </Space>
        </div>
      )}

      <Table<QueueRow>
        className="sales-grid approval-queue"
        rowKey="key"
        size="small"
        bordered
        loading={query.isLoading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1240 }}
        rowClassName={(row) =>
          [
            row.isLast ? "approval-row-group-end" : "",
            selectedSet.has(row.group.key) ? "approval-row-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")
        }
        locale={{ emptyText: <Empty description="Không có yêu cầu nào" /> }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          size: "small",
          showTotal: (total) => `${total} yêu cầu`,
          onChange: (next) => {
            setPage(next);
            setSelected([]);
          },
        }}
      />

      <Modal
        open={Boolean(decision)}
        title={
          isBulk
            ? `${isReject ? "Từ chối" : "Duyệt"} ${decision?.groups.length} chứng từ`
            : `${isReject ? "Từ chối" : "Duyệt"} ${
                decision?.groups[0]?.head.salesOrder?.orderNo ??
                decision?.groups[0]?.head.withdrawalRequest?.requestNo ??
                "yêu cầu"
              }`
        }
        okText={isReject ? "Từ chối" : "Duyệt"}
        cancelText="Đóng"
        okButtonProps={{ danger: isReject, disabled: isReject && !note.trim() }}
        confirmLoading={decideMutation.isPending || decideManyMutation.isPending}
        onCancel={closeDecision}
        onOk={submitDecision}
      >
        {isBulk ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            {(decision?.groups ?? [])
              .map(
                (group) =>
                  group.head.salesOrder?.orderNo ?? group.head.withdrawalRequest?.requestNo,
              )
              .filter(Boolean)
              .join(", ")}
          </Typography.Paragraph>
        ) : (
          <ul style={{ marginTop: 0, paddingInlineStart: 18 }}>
            {[
              ...new Map(
                (decision?.groups[0]?.requests ?? [])
                  .flatMap(violationsOf)
                  .map((violation) => [violation.code, violation] as const),
              ).values(),
            ].map((violation) => (
              <li key={violation.code}>{violation.message}</li>
            ))}
          </ul>
        )}
        {/* Một đơn có thể vướng nhiều loại duyệt; nói rõ lần bấm này ký được những loại nào. */}
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Áp cho {decisionRequests.length} yêu cầu:{" "}
          {decisionRequests.map((request) => request.typeLabel ?? request.type).join(", ")}
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isReject ? "Lý do từ chối (bắt buộc)" : "Ghi chú (không bắt buộc)"}
        />
      </Modal>

      {/* Sửa đơn ngay trên hàng đợi. Payload duyệt chỉ có phần rút gọn nên phải tải
          bản đầy đủ; sửa xong backend tự gửi lại duyệt, hàng đợi refetch theo. */}
      <InternalSalesOrderModal
        key={editOrderId}
        open={Boolean(editOrderId) && Boolean(editOrderQuery.data)}
        order={editOrderQuery.data}
        onClose={() => setEditOrderId(undefined)}
        onSaved={() => {
          setEditOrderId(undefined);
          query.refetch();
        }}
      />
    </div>
  );
}
