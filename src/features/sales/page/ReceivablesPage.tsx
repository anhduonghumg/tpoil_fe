import React, { useState } from "react";
import {
  Button,
  DatePicker,
  Dropdown,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { notify } from "../../../shared/lib/notification";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import {
  useAnnualCreditIndicators,
  useCreateCollectionPlan,
  useCreditManagement,
  usePartyDebt,
  useReceivables,
} from "../hooks";
import type {
  AnnualCreditIndicatorRow,
  CreditManagementRow,
  PartyDebtRow,
  ReceivableOpenItem,
  ReceivableStatus,
} from "../types";
import { ReceivableDrawer } from "../ui/ReceivableDrawer";
import { formatMoney, RECEIVABLE_STATUS_LABELS, ReceivableStatusTag } from "../ui/labels";
import { ReceivablesApi } from "../api";
import { exportReceivableSheet } from "../lib/exportReceivableSheet";
import "../sales.css";

const SCOPE_FILTERS = [
  { value: "OPEN", label: "Còn nợ" },
  { value: "OVERDUE", label: "Quá hạn" },
  { value: "ALL", label: "Tất cả" },
];

type ReceivableTab = "items" | "indicators" | "annual-indicators" | "party";
type IndicatorPeriod = "DAY" | "WEEK" | "MONTH" | "CUSTOM";

const PERIOD_OPTIONS: Array<{ value: IndicatorPeriod; label: string }> = [
  { value: "DAY", label: "Hôm nay" },
  { value: "WEEK", label: "Tuần này" },
  { value: "MONTH", label: "Tháng này" },
  { value: "CUSTOM", label: "Tùy chọn" },
];

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const EMPTY = <span className="sales-grid-empty">—</span>;

const num = (value: unknown) => <span className="sales-grid-num">{formatMoney(value as any)}</span>;
const strongNum = (value: unknown) => (
  <span className="sales-grid-num sales-grid-strong">{formatMoney(value as any)}</span>
);
const dangerIfPositive = (value: unknown) => (
  <span className={`sales-grid-num${Number(value) > 0 ? " sales-grid-danger" : ""}`}>
    {formatMoney(value as any)}
  </span>
);

/** Ô hai dòng theo chuẩn .sales-grid: mã đậm ở trên, tên mờ ở dưới, cao bằng nhau. */
const partyCell = (party?: { code?: string | null; name: string }) =>
  party ? (
    <span className="sales-grid-stack">
      <span className="sales-grid-clip sales-grid-strong">{party.code || party.name}</span>
      <span className="sales-grid-clip sales-grid-sub">{party.code ? party.name : "—"}</span>
    </span>
  ) : (
    EMPTY
  );

function periodRange(period: IndicatorPeriod) {
  const today = dayjs();
  if (period === "DAY") return [today, today];
  if (period === "WEEK") return [today.startOf("week"), today];
  return [today.startOf("month"), today];
}

export default function ReceivablesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReceivableTab>("items");
  const [scope, setScope] = useState("OPEN");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  // Kế toán phụ trách khách (Party.accountingOwnerEmpId). Giữ cả tên để hiện trên thẻ điều
  // kiện — ô chọn nhân viên chỉ trả về id.
  const [accountingOwnerEmpId, setAccountingOwnerEmpId] = useState<string>();
  const [accountingOwnerName, setAccountingOwnerName] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [indicatorPeriod, setIndicatorPeriod] = useState<IndicatorPeriod>("MONTH");
  const [indicatorFromDate, setIndicatorFromDate] = useState(() =>
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [indicatorToDate, setIndicatorToDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [indicatorYear, setIndicatorYear] = useState(() => dayjs().year());
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm] = Form.useForm<{
    customerPartyId: string;
    plannedDate: dayjs.Dayjs;
    plannedAmount: number;
  }>();

  const listFilter = {
    customerPartyId,
    accountingOwnerEmpId,
    onlyOpen: scope === "OPEN" ? true : undefined,
    overdueOnly: scope === "OVERDUE" ? true : undefined,
  };
  const listQuery = useReceivables({ ...listFilter, page, limit: 20 });
  const creditManagementQuery = useCreditManagement(
    { customerPartyId, accountingOwnerEmpId, fromDate: indicatorFromDate, toDate: indicatorToDate },
    tab === "indicators",
  );
  const annualIndicatorsQuery = useAnnualCreditIndicators(
    { customerPartyId, accountingOwnerEmpId, year: indicatorYear },
    tab === "annual-indicators",
  );
  const partyDebtQuery = usePartyDebt(
    { partyId: customerPartyId, accountingOwnerEmpId },
    tab === "party",
  );
  const createCollectionPlan = useCreateCollectionPlan();

  const selectIndicatorPeriod = (period: IndicatorPeriod) => {
    setIndicatorPeriod(period);
    if (period === "CUSTOM") return;
    const [from, to] = periodRange(period);
    setIndicatorFromDate(from.format("YYYY-MM-DD"));
    setIndicatorToDate(to.format("YYYY-MM-DD"));
  };

  /* PartySelect chỉ trả về id, nên tên đối tác trên thẻ điều kiện tra ngược từ dữ
     liệu đang có trên màn — trước đây thẻ chỉ ghi "Đang lọc theo đối tác", người
     xem không biết đang lọc ai. */
  const selectedPartyName = (() => {
    if (!customerPartyId) return undefined;
    const fromItems = listQuery.data?.items.find((row) => row.customerPartyId === customerPartyId)?.customer;
    const fromIndicators = [
      ...(creditManagementQuery.data?.items ?? []),
      ...(annualIndicatorsQuery.data?.items ?? []),
    ].find((row) => row.customer.id === customerPartyId)?.customer;
    const fromParty = (partyDebtQuery.data ?? []).find((row) => row.party.id === customerPartyId)?.party;
    const party = fromItems ?? fromIndicators ?? fromParty;
    return party ? party.code || party.name : "đã chọn";
  })();

  const resetFilters = () => {
    setScope("OPEN");
    setCustomerPartyId(undefined);
    setAccountingOwnerEmpId(undefined);
    setAccountingOwnerName(undefined);
    selectIndicatorPeriod("MONTH");
    setPage(1);
  };

  const filterTags = [
    accountingOwnerEmpId && {
      key: "accountingOwner",
      label: `Kế toán phụ trách: ${accountingOwnerName ?? "đã chọn"}`,
      onClear: () => {
        setAccountingOwnerEmpId(undefined);
        setAccountingOwnerName(undefined);
        setPage(1);
      },
    },
    customerPartyId && {
      key: "party",
      label: `Đối tác: ${selectedPartyName}`,
      onClear: () => {
        setCustomerPartyId(undefined);
        setPage(1);
      },
    },
    tab === "items" &&
      scope !== "OPEN" && {
        key: "scope",
        label: `Phạm vi: ${SCOPE_FILTERS.find((row) => row.value === scope)?.label ?? scope}`,
        onClear: () => {
          setScope("OPEN");
          setPage(1);
        },
      },
    tab === "indicators" &&
      indicatorPeriod !== "MONTH" && {
      key: "period",
      label: `Kỳ: ${dayjs(indicatorFromDate).format("DD/MM/YYYY")} – ${dayjs(indicatorToDate).format("DD/MM/YYYY")}`,
      onClear: () => selectIndicatorPeriod("MONTH"),
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const activeFilterCount =
    Number(Boolean(accountingOwnerEmpId)) +
    Number(Boolean(customerPartyId)) +
    Number(tab === "items" && scope !== "OPEN") +
    Number(tab === "indicators" && indicatorPeriod !== "MONTH");

  const filterPanel = (
    <div className="table-filter-panel">
      {/* Áp cho cả 4 tab: mỗi kế toán xem đúng danh sách khách mình phụ trách. */}
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Kế toán phụ trách
        </Typography.Text>
        <EmployeeSelect
          allowClear
          style={{ width: "100%" }}
          placeholder="Mọi kế toán"
          value={accountingOwnerEmpId}
          onSelect={(_, option: any) => setAccountingOwnerName(option?.label)}
          onChange={(value) => {
            setAccountingOwnerEmpId(value ?? undefined);
            if (!value) setAccountingOwnerName(undefined);
            setPage(1);
          }}
        />
      </div>
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
      {/* Chỉ tab chi tiết mới lọc theo phạm vi; chỉ số nợ và hai chiều luôn tính theo khách hàng. */}
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
      {tab === "indicators" && (
        <div style={{ marginBottom: 10 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Kỳ chỉ số công nợ
          </Typography.Text>
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            <Select
              size="small"
              value={indicatorPeriod}
              options={PERIOD_OPTIONS}
              onChange={selectIndicatorPeriod}
            />
            <DatePicker.RangePicker
              size="small"
              style={{ width: "100%" }}
              value={[dayjs(indicatorFromDate), dayjs(indicatorToDate)]}
              format="DD/MM/YYYY"
              onChange={(values) => {
                setIndicatorPeriod("CUSTOM");
                setIndicatorFromDate((values?.[0] ?? dayjs().startOf("month")).format("YYYY-MM-DD"));
                setIndicatorToDate((values?.[1] ?? dayjs()).format("YYYY-MM-DD"));
              }}
            />
          </Space>
        </div>
      )}
      <div style={{ textAlign: "right" }}>
        <Button size="small" onClick={resetFilters}>
          Đặt lại
        </Button>
      </div>
    </div>
  );

  const itemColumns: ColumnsType<ReceivableOpenItem> = [
    {
      title: "Khách hàng",
      key: "customer",
      width: 230,
      render: (_, item) => partyCell(item.customer),
    },
    {
      title: "Chứng từ",
      key: "source",
      width: 170,
      render: (_, item) =>
        item.salesOrder ? (
          <Button
            type="link"
            className="sales-grid-link sales-grid-clip"
            onClick={() => navigate(`/sales/orders/${item.salesOrder!.id}`)}
          >
            {item.salesOrder.orderNo}
          </Button>
        ) : item.withdrawalRequest?.requestNo ? (
          <span className="sales-grid-clip">{item.withdrawalRequest.requestNo}</span>
        ) : (
          EMPTY
        ),
    },
    {
      /* Số ngày quá hạn đứng ngay dưới ngày hạn, cùng ô: đọc một chỗ là biết khoản
         này có đang trễ không. */
      title: "Hạn thanh toán",
      dataIndex: "dueDate",
      width: 130,
      render: (value: string | null, item) =>
        value ? (
          <span className="sales-grid-stack">
            <span>{dayjs(value).format("DD/MM/YYYY")}</span>
            <span className={`sales-grid-sub${item.isOverdue ? " sales-grid-danger" : ""}`}>
              {item.isOverdue ? `quá ${item.overdueDays} ngày` : "trong hạn"}
            </span>
          </span>
        ) : (
          EMPTY
        ),
    },
    { title: "Số tiền gốc", dataIndex: "originalAmount", width: 140, align: "right", render: num },
    { title: "Còn phải thu", dataIndex: "outstandingAmount", width: 150, align: "right", render: strongNum },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (value: ReceivableStatus) => <ReceivableStatusTag status={value} />,
    },
    {
      title: "",
      key: "actions",
      width: 46,
      align: "center",
      fixed: "right",
      render: (_, item) => {
        const menu: MenuProps["items"] = [
          { key: "detail", icon: <EyeOutlined />, label: "Xem chi tiết", onClick: () => setDetailId(item.id) },
          ...(item.salesOrder
            ? [
                {
                  key: "order",
                  icon: <FileTextOutlined />,
                  label: "Mở đơn bán",
                  onClick: () => navigate(`/sales/orders/${item.salesOrder!.id}`),
                },
              ]
            : []),
        ];
        return (
          <Dropdown menu={{ items: menu }} trigger={["click"]} placement="bottomRight">
            <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác công nợ" />
          </Dropdown>
        );
      },
    },
  ];

  const indicatorColumns: ColumnsType<CreditManagementRow> = [
    { title: "Khách hàng", key: "customer", fixed: "left", width: 200, render: (_, row) => partyCell(row.customer) },
    { title: "Nợ đầu kỳ", dataIndex: "openingDebt", width: 130, align: "right", render: num },
    { title: "Phát sinh nợ", dataIndex: "debtIncrease", width: 130, align: "right", render: num },
    { title: "Đã thu", dataIndex: "collectedAmount", width: 130, align: "right", render: num },
    {
      /* Giảm giá, hàng trả lại, hủy số dư đầu kỳ… Trước đây backend có tính nhưng màn không
         hiện, nên Đầu kỳ + Phát sinh − Đã thu không ra Nợ cuối kỳ và kế toán tự cộng lại sẽ
         thấy lệch. Có cột này thì dòng luôn khớp. */
      title: "Giảm khác",
      dataIndex: "otherDecrease",
      width: 120,
      align: "right",
      render: (value) => (Number(value) === 0 ? <span className="sales-grid-empty">0</span> : num(value)),
    },
    { title: "Nợ cuối kỳ", dataIndex: "closingDebt", width: 140, align: "right", render: strongNum },
    {
      title: "Hạn mức",
      dataIndex: "creditLimit",
      width: 130,
      align: "right",
      render: (value) => (value == null ? <span className="sales-grid-empty">Chưa đặt</span> : num(value)),
    },
    {
      title: "Vượt hạn mức",
      key: "over",
      width: 150,
      align: "right",
      render: (_, row) =>
        row.overAmount == null ? (
          EMPTY
        ) : (
          <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
            {dangerIfPositive(row.overAmount)}
            {/* Hạn mức 0 là "không cho nợ" — không có tỷ lệ % (không chia được cho 0);
                trước đây chỗ này in ra chữ "null%". */}
            <span className="sales-grid-sub">
              {row.overRate == null ? "không cho nợ" : `${row.overRate}%`}
            </span>
          </span>
        ),
    },
    { title: "Kế hoạch thu", dataIndex: "plannedAmount", width: 130, align: "right", render: num },
    { title: "Thu theo KH", dataIndex: "plannedActualAmount", width: 130, align: "right", render: num },
    {
      title: "Hoàn thành",
      dataIndex: "planCompletionRate",
      width: 110,
      align: "right",
      render: (value) =>
        value == null ? <span className="sales-grid-empty">Chưa có KH</span> : <span className="sales-grid-num">{`${value}%`}</span>,
    },
  ];

  const annualIndicatorColumns: ColumnsType<AnnualCreditIndicatorRow> = [
    { title: "Khách hàng", key: "customer", fixed: "left", width: 220, render: (_, row) => partyCell(row.customer) },
    {
      title: "Công nợ thực tế trong năm",
      dataIndex: "peakClosingDebt",
      width: 200,
      align: "right",
      render: strongNum,
    },
    {
      /* Hạn mức có thể đổi giữa năm (nâng hạn mức, hoặc áp dụng đề xuất năm sau trước Tết),
         nên hiện kèm mức đầu năm khi hai mốc khác nhau — nếu không, người xem sẽ tưởng cả
         năm chỉ có một hạn mức. */
      title: "Hạn mức được cấp",
      dataIndex: "creditLimit",
      width: 170,
      align: "right",
      render: (value, row) => {
        if (value == null) return <span className="sales-grid-empty">Chưa đặt</span>;
        const changed =
          row.creditLimitAtStart != null && Number(row.creditLimitAtStart) !== Number(value);
        return changed ? (
          <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
            {num(value)}
            <span className="sales-grid-sub">{`đầu năm ${formatMoney(row.creditLimitAtStart)}`}</span>
          </span>
        ) : (
          num(value)
        );
      },
    },
    {
      /* Mức vượt cao nhất khi so TỪNG NGÀY với hạn mức có hiệu lực đúng ngày đó — không
         phải đỉnh nợ chia cho hạn mức cuối năm. Cột chỉ hiện đúng một con số tỷ lệ. */
      title: "Tỷ lệ vượt",
      dataIndex: "annualOverRate",
      width: 120,
      align: "right",
      render: (value) =>
        value == null ? (
          EMPTY
        ) : (
          <span className={`sales-grid-num${Number(value) > 0 ? " sales-grid-danger" : ""}`}>
            {`${value}%`}
          </span>
        ),
    },
    {
      title: "Dự kiến hạn mức năm sau",
      dataIndex: "nextYearProposedLimit",
      width: 210,
      align: "right",
      render: (value, row) =>
        value == null ? (
          <span className="sales-grid-empty">Chưa đề xuất</span>
        ) : (
          <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
            {strongNum(value)}
            <span className="sales-grid-sub">
              {row.nextYearProposalStatus ? PROPOSAL_STATUS_LABELS[row.nextYearProposalStatus] ?? row.nextYearProposalStatus : "—"}
            </span>
          </span>
        ),
    },
  ];

  const partyColumns: ColumnsType<PartyDebtRow> = [
    { title: "Đối tác", key: "party", fixed: "left", width: 240, render: (_, row) => partyCell(row.party) },
    {
      title: "Họ nợ mình",
      key: "receivable",
      width: 170,
      align: "right",
      render: (_, row) => (
        <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
          {num(row.receivableOutstanding)}
          <span className={`sales-grid-sub${Number(row.receivableOverdue) > 0 ? " sales-grid-danger" : ""}`}>
            {`quá hạn ${formatMoney(row.receivableOverdue)}`}
          </span>
        </span>
      ),
    },
    {
      title: "Mình nợ họ",
      key: "payable",
      width: 170,
      align: "right",
      render: (_, row) => (
        <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
          {num(row.payableOutstanding)}
          <span className={`sales-grid-sub${Number(row.payableOverdue) > 0 ? " sales-grid-danger" : ""}`}>
            {`quá hạn ${formatMoney(row.payableOverdue)}`}
          </span>
        </span>
      ),
    },
    {
      title: "Chênh lệch",
      dataIndex: "netPosition",
      width: 160,
      align: "right",
      render: (value) => (
        <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
          {strongNum(value)}
          <span className="sales-grid-sub">{Number(value) >= 0 ? "họ nợ mình" : "mình nợ họ"}</span>
        </span>
      ),
    },
  ];

  /* ---------------------------------------------------------------- xuất Excel
     Xuất đúng tab đang mở, theo đúng bộ lọc đang bật. Tab chi tiết phân trang ở server
     (20 dòng/trang) nên phải tải hết các trang — xuất mỗi trang đang xem là thiếu dữ liệu. */

  const filterInfo = () =>
    [
      accountingOwnerEmpId ? `Kế toán phụ trách: ${accountingOwnerName ?? "đã chọn"}` : null,
      customerPartyId ? `Đối tác: ${selectedPartyName}` : null,
    ].filter(Boolean) as string[];

  const partyCode = (party?: { code?: string | null; name: string }) => party?.code || party?.name || "";
  const partyName = (party?: { code?: string | null; name: string }) => (party?.code ? party.name : "");

  const exportItems = async () => {
    const all: ReceivableOpenItem[] = [];
    for (let nextPage = 1; ; nextPage += 1) {
      const result = await ReceivablesApi.list({ ...listFilter, page: nextPage, limit: 100 });
      all.push(...result.items);
      if (all.length >= result.total || !result.items.length) break;
    }
    await exportReceivableSheet<ReceivableOpenItem>({
      fileName: "cong-no-chi-tiet",
      title: "Chi tiết công nợ phải thu",
      info: [`Phạm vi: ${SCOPE_FILTERS.find((row) => row.value === scope)?.label ?? scope}`, ...filterInfo()],
      rows: all,
      columns: [
        { header: "Mã khách", width: 16, value: (row) => partyCode(row.customer) },
        { header: "Tên khách hàng", width: 40, value: (row) => partyName(row.customer) },
        {
          header: "Chứng từ",
          width: 20,
          value: (row) => row.salesOrder?.orderNo ?? row.withdrawalRequest?.requestNo ?? "",
        },
        { header: "Hạn thanh toán", width: 14, value: (row) => (row.dueDate ? dayjs(row.dueDate).format("DD/MM/YYYY") : "") },
        { header: "Số ngày quá hạn", width: 12, value: (row) => (row.isOverdue ? row.overdueDays : "") },
        { header: "Số tiền gốc", money: true, total: true, value: (row) => row.originalAmount },
        { header: "Còn phải thu", money: true, total: true, value: (row) => row.outstandingAmount },
        { header: "Trạng thái", width: 16, value: (row) => RECEIVABLE_STATUS_LABELS[row.status] ?? row.status },
      ],
    });
  };

  const exportIndicators = () =>
    exportReceivableSheet<CreditManagementRow>({
      fileName: "chi-so-cong-no",
      title: "Chỉ số công nợ",
      info: [
        `Kỳ: ${dayjs(indicatorFromDate).format("DD/MM/YYYY")} – ${dayjs(creditManagementQuery.data?.toDate ?? indicatorToDate).format("DD/MM/YYYY")}`,
        ...filterInfo(),
      ],
      rows: creditManagementQuery.data?.items ?? [],
      columns: [
        { header: "Mã khách", width: 16, value: (row) => partyCode(row.customer) },
        { header: "Tên khách hàng", width: 40, value: (row) => partyName(row.customer) },
        { header: "Nợ đầu kỳ", money: true, total: true, value: (row) => row.openingDebt },
        { header: "Phát sinh nợ", money: true, total: true, value: (row) => row.debtIncrease },
        { header: "Đã thu", money: true, total: true, value: (row) => row.collectedAmount },
        { header: "Giảm khác", money: true, total: true, value: (row) => row.otherDecrease },
        { header: "Nợ cuối kỳ", money: true, total: true, value: (row) => row.closingDebt },
        { header: "Hạn mức", money: true, value: (row) => row.creditLimit },
        { header: "Vượt hạn mức", money: true, total: true, value: (row) => row.overAmount },
        { header: "Tỷ lệ vượt (%)", percent: true, value: (row) => row.overRate },
        { header: "Kế hoạch thu", money: true, total: true, value: (row) => row.plannedAmount },
        { header: "Thu theo KH", money: true, total: true, value: (row) => row.plannedActualAmount },
        { header: "Hoàn thành (%)", percent: true, value: (row) => row.planCompletionRate },
      ],
    });

  const exportAnnual = () =>
    exportReceivableSheet<AnnualCreditIndicatorRow>({
      fileName: `danh-gia-han-muc-nam-${indicatorYear}`,
      title: `Đánh giá hạn mức năm ${indicatorYear}`,
      info: [
        annualIndicatorsQuery.data?.toDate && annualIndicatorsQuery.data.toDate < `${indicatorYear}-12-31`
          ? `Năm chưa kết thúc — số liệu tính đến ${dayjs(annualIndicatorsQuery.data.toDate).format("DD/MM/YYYY")}`
          : `Năm ${indicatorYear}`,
        ...filterInfo(),
      ],
      rows: annualIndicatorsQuery.data?.items ?? [],
      columns: [
        { header: "Mã khách", width: 16, value: (row) => partyCode(row.customer) },
        { header: "Tên khách hàng", width: 40, value: (row) => partyName(row.customer) },
        { header: "Công nợ thực tế trong năm", money: true, value: (row) => row.peakClosingDebt },
        { header: "Hạn mức đầu năm", money: true, value: (row) => row.creditLimitAtStart },
        { header: "Hạn mức được cấp", money: true, value: (row) => row.creditLimit },
        { header: "Tỷ lệ vượt (%)", percent: true, value: (row) => row.annualOverRate },
        { header: "Dự kiến hạn mức năm sau", money: true, value: (row) => row.nextYearProposedLimit },
        {
          header: "Trạng thái đề xuất",
          width: 16,
          value: (row) =>
            row.nextYearProposalStatus
              ? PROPOSAL_STATUS_LABELS[row.nextYearProposalStatus] ?? row.nextYearProposalStatus
              : "Chưa đề xuất",
        },
      ],
    });

  const exportPartyDebt = () =>
    exportReceivableSheet<PartyDebtRow>({
      fileName: "cong-no-hai-chieu",
      title: "Công nợ hai chiều",
      info: filterInfo(),
      rows: partyDebtQuery.data ?? [],
      columns: [
        { header: "Mã đối tác", width: 16, value: (row) => partyCode(row.party) },
        { header: "Tên đối tác", width: 40, value: (row) => partyName(row.party) },
        { header: "Họ nợ mình", money: true, total: true, value: (row) => row.receivableOutstanding },
        { header: "Trong đó quá hạn", money: true, total: true, value: (row) => row.receivableOverdue },
        { header: "Mình nợ họ", money: true, total: true, value: (row) => row.payableOutstanding },
        { header: "Trong đó quá hạn ", money: true, total: true, value: (row) => row.payableOverdue },
        { header: "Chênh lệch (dương = họ nợ mình)", width: 22, money: true, total: true, value: (row) => row.netPosition },
      ],
    });

  const exportCurrentTab = async () => {
    try {
      setExporting(true);
      if (tab === "items") await exportItems();
      if (tab === "indicators") await exportIndicators();
      if (tab === "annual-indicators") await exportAnnual();
      if (tab === "party") await exportPartyDebt();
      notify.success("Đã xuất Excel");
    } catch {
      notify.error("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const toolbar = (
    <Space size={6}>
      {/* Năm đánh giá là bộ chọn chính của tab này nên để ra ngoài, không giấu vào bộ lọc. */}
      {tab === "annual-indicators" ? (
        <DatePicker
          picker="year"
          size="small"
          allowClear={false}
          value={dayjs().year(indicatorYear)}
          format="[Năm] YYYY"
          onChange={(value) => setIndicatorYear((value ?? dayjs()).year())}
        />
      ) : null}
      <FilterButton
        count={activeFilterCount}
        open={filterOpen}
        onOpenChange={setFilterOpen}
        content={filterPanel}
      />
      <RefreshButton
        loading={
          listQuery.isFetching ||
          creditManagementQuery.isFetching ||
          annualIndicatorsQuery.isFetching ||
          partyDebtQuery.isFetching
        }
        onClick={() => {
          if (tab === "items") listQuery.refetch();
          if (tab === "indicators") creditManagementQuery.refetch();
          if (tab === "annual-indicators") annualIndicatorsQuery.refetch();
          if (tab === "party") partyDebtQuery.refetch();
        }}
      />
      <Button size="small" icon={<DownloadOutlined />} loading={exporting} onClick={exportCurrentTab}>
        Xuất Excel
      </Button>
      <Button
        size="small"
        icon={<CalendarOutlined />}
        onClick={() => {
          planForm.setFieldsValue({ plannedDate: dayjs() });
          setPlanModalOpen(true);
        }}
      >
        Thêm kế hoạch trả
      </Button>
      <Button
        size="small"
        type="primary"
        icon={<DollarOutlined />}
        onClick={() => navigate("/sales/receipts")}
      >
        Thu tiền & đối soát
      </Button>
    </Space>
  );

  const totals = listQuery.data?.totals;

  return (
    <div className="sales-page receivables-page">
      {/* <div className="sales-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Công nợ phải thu
        </Typography.Title>
      </div> */}

      {/* Nút tác vụ nằm cùng hàng với tab, dồn phải — cùng bố cục màn Hóa đơn bán hàng. */}
      <Tabs
        className="sales-status-tabs"
        activeKey={tab}
        onChange={(key) => {
          setTab(key as ReceivableTab);
          setFilterOpen(false);
        }}
        tabBarExtraContent={{ right: toolbar }}
        items={[
          { key: "items", label: "Chi tiết công nợ" },
          { key: "indicators", label: "Chỉ số công nợ" },
          { key: "annual-indicators", label: "Đánh giá hạn mức năm" },
          { key: "party", label: "Công nợ hai chiều" },
        ]}
      />

      <FilterTags items={filterTags} />

      {tab === "items" ? (
        <>
          {/* Hai con số tổng gọn trên một dải thay cho hai khối Statistic chữ to cao ~70px. */}
          <div className="receivables-summary">
            <div>
              <span>Tổng phát sinh</span>
              <strong>{formatMoney(totals?.originalAmount)}</strong>
            </div>
            <div className="is-outstanding">
              <span>Còn phải thu</span>
              <strong>{formatMoney(totals?.outstandingAmount)}</strong>
            </div>
          </div>
          <Table<ReceivableOpenItem>
            className="sales-grid"
            rowKey="id"
            size="small"
            bordered
            loading={listQuery.isLoading || listQuery.isFetching}
            columns={itemColumns}
            dataSource={listQuery.data?.items ?? []}
            scroll={{ x: 996 }}
            onRow={(item) => ({ onDoubleClick: () => setDetailId(item.id) })}
            pagination={{
              current: page,
              pageSize: 20,
              total: listQuery.data?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `${total} khoản công nợ`,
              onChange: setPage,
            }}
          />
        </>
      ) : null}

      {tab === "indicators" ? (
        <Table<CreditManagementRow>
          className="sales-grid"
          rowKey={(row) => row.customer.id}
          size="small"
          bordered
          loading={creditManagementQuery.isLoading || creditManagementQuery.isFetching}
          columns={indicatorColumns}
          dataSource={creditManagementQuery.data?.items ?? []}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `${total} khách hàng`,
          }}
        />
      ) : null}

      {tab === "annual-indicators" ? (
        <>
        {/* Năm đang chạy: backend chỉ tính tới hôm nay (không tính các ngày chưa tới), nên
            phải nói rõ đây là số dở dang, chưa phải số cả năm. */}
        {annualIndicatorsQuery.data?.toDate &&
        annualIndicatorsQuery.data.toDate < `${indicatorYear}-12-31` ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {`Năm ${indicatorYear} chưa kết thúc — số liệu tính đến ngày ${dayjs(annualIndicatorsQuery.data.toDate).format("DD/MM/YYYY")}.`}
          </Typography.Text>
        ) : null}
        <Table<AnnualCreditIndicatorRow>
          className="sales-grid"
          rowKey={(row) => row.customer.id}
          size="small"
          bordered
          loading={annualIndicatorsQuery.isLoading || annualIndicatorsQuery.isFetching}
          columns={annualIndicatorColumns}
          dataSource={annualIndicatorsQuery.data?.items ?? []}
          scroll={{ x: 930 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `${total} khách hàng`,
          }}
        />
        </>
      ) : null}

      {tab === "party" ? (
        <>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Cùng một đối tác có thể vừa là khách vừa là nhà cung cấp — bảng này đặt hai chiều cạnh nhau.
          </Typography.Text>
          <Table<PartyDebtRow>
            className="sales-grid"
            rowKey={(row) => row.party.id}
            size="small"
            bordered
            loading={partyDebtQuery.isLoading || partyDebtQuery.isFetching}
            columns={partyColumns}
            dataSource={partyDebtQuery.data ?? []}
            scroll={{ x: 740 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${total} đối tác`,
            }}
          />
        </>
      ) : null}

      <ReceivableDrawer id={detailId} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} />
      <Modal
        title="Thêm nhanh kế hoạch trả"
        open={planModalOpen}
        okText="Lưu kế hoạch"
        cancelText="Hủy"
        confirmLoading={createCollectionPlan.isPending}
        onCancel={() => setPlanModalOpen(false)}
        onOk={() => {
          planForm.validateFields().then((values) => {
            createCollectionPlan.mutate(
              {
                customerPartyId: values.customerPartyId,
                plannedDate: values.plannedDate.format("YYYY-MM-DD"),
                plannedAmount: values.plannedAmount,
              },
              {
                onSuccess: () => {
                  setPlanModalOpen(false);
                  planForm.resetFields();
                },
              },
            );
          });
        }}
      >
        <Form form={planForm} layout="vertical" size="small">
          <Form.Item name="customerPartyId" label="Khách hàng" rules={[{ required: true, message: "Chọn khách hàng" }]}>
            <PartySelect partyRole="CUSTOMER" displayMode="code" placeholder="Chọn mã khách" />
          </Form.Item>
          <Form.Item name="plannedDate" label="Ngày dự kiến trả" rules={[{ required: true, message: "Chọn ngày dự kiến trả" }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="plannedAmount" label="Số tiền dự kiến trả" rules={[{ required: true, message: "Nhập số tiền" }]}>
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              placeholder="0"
              formatter={(value) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(value) => (value ? value.replace(/\./g, "") : "") as any}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
