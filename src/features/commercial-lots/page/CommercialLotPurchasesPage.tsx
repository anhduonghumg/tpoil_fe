import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DatePicker,
  Input,
  Popover,
  Progress,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useCommercialLotList } from "../hooks";
import type {
  CommercialLotLifecycle,
  CommercialLotPurchase,
} from "../types";
import {
  formatQty,
  LifecycleTag,
  LIFECYCLE_LABELS,
} from "../ui/labels";
import "../commercial-lots.css";

const ALL_TAB = "ALL";
const WORKING_TAB = "WORKING";
const WORKING_LIFECYCLES: CommercialLotLifecycle[] = [
  "PENDING_INVOICE",
  "PENDING_PAYMENT",
  "READY_TO_WITHDRAW",
  "WITHDRAWING",
];
const LOT_LIFECYCLES = new Set([
  "PENDING_APPROVAL",
  "PENDING_INVOICE",
  "PENDING_PAYMENT",
  "READY_TO_WITHDRAW",
  "WITHDRAWING",
  "COMPLETED",
  "CANCELLED",
]);

function parseLifecycle(value: string | null): CommercialLotLifecycle | undefined {
  return value && LOT_LIFECYCLES.has(value)
    ? (value as CommercialLotLifecycle)
    : undefined;
}

export default function CommercialLotPurchasesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLifecycle = parseLifecycle(searchParams.get("lifecycle"));
  const initialLifecycleGroup =
    searchParams.get("lifecycleGroup") === "working" ? WORKING_TAB : undefined;
  const [keyword, setKeyword] = useState("");
  const [supplierId, setSupplierId] = useState<string>();
  const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftSupplierId, setDraftSupplierId] = useState<string>();
  const [draftDates, setDraftDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [lifecycle, setLifecycle] = useState<
    CommercialLotLifecycle | undefined
  >(initialLifecycle);
  const [lifecycleGroup, setLifecycleGroup] = useState<string | undefined>(
    initialLifecycleGroup,
  );
  const [page, setPage] = useState(1);

  const query = useCommercialLotList({
    keyword: keyword.trim() || undefined,
    supplierCustomerId: supplierId,
    lifecycle: lifecycleGroup === WORKING_TAB ? undefined : lifecycle,
    dateFrom: dates?.[0].format("YYYY-MM-DD"),
    dateTo: dates?.[1].format("YYYY-MM-DD"),
    page,
    limit: lifecycleGroup === WORKING_TAB ? 200 : 20,
  });
  const items = query.data?.items ?? [];
  const visibleItems =
    lifecycleGroup === WORKING_TAB
      ? items.filter((item) => WORKING_LIFECYCLES.includes(item.lifecycle))
      : items;

  const columns = useMemo<ColumnsType<CommercialLotPurchase>>(
    () => [
      {
        title: "Số đơn",
        dataIndex: "orderNo",
        width: 150,
        fixed: "left",
        render: (value, row) => (
          <Button
            type="link"
            className="commercial-lot-order-link"
            onClick={() => navigate(`/commercial-purchases/lots/${row.id}`)}
          >
            {value}
          </Button>
        ),
      },
      {
        title: "Ngày đặt",
        dataIndex: "orderDate",
        width: 105,
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Nhà cung cấp",
        dataIndex: "supplier",
        width: 120,
        ellipsis: true,
        render: (supplier) => supplier?.code ?? "-",
      },
      {
        title: "Số lượng",
        dataIndex: ["quantities", "orderedQty"],
        width: 120,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Đã hóa đơn",
        dataIndex: ["quantities", "invoicedQty"],
        width: 130,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Đã rút",
        dataIndex: ["quantities", "withdrawnQty"],
        width: 125,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Còn phải rút",
        dataIndex: ["quantities", "remainingToWithdraw"],
        width: 130,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Tiến độ rút",
        key: "progress",
        width: 150,
        render: (_, row) => {
          const invoiced = row.quantities.invoicedQty;
          const percent = invoiced
            ? Math.min(
                Math.round((row.quantities.withdrawnQty / invoiced) * 100),
                100,
              )
            : 0;
          return (
            <div className="commercial-lot-progress">
              <div className="commercial-lot-progress-label">
                <span>{percent}%</span>
                <span>{formatQty(row.quantities.withdrawnQty)}</span>
              </div>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          );
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "lifecycle",
        width: 140,
        fixed: "right",
        render: (value: CommercialLotLifecycle) => (
          <LifecycleTag value={value} />
        ),
      },
    ],
    [navigate],
  );

  const tabItems = [
    { key: ALL_TAB, label: "Tất cả" },
    { key: WORKING_TAB, label: "Working" },
    ...(
      [
        "PENDING_APPROVAL",
        "PENDING_INVOICE",
        "PENDING_PAYMENT",
        "READY_TO_WITHDRAW",
        "WITHDRAWING",
        "COMPLETED",
        "CANCELLED",
      ] as CommercialLotLifecycle[]
    ).map((key) => ({ key, label: LIFECYCLE_LABELS[key] })),
  ];

  return (
    <div className="commercial-lot-page">
      <div className="commercial-lot-header">
        <div>
          <Typography.Title level={3} className="commercial-lot-title">
            Mua thương mại lô
          </Typography.Title>
          <Typography.Text className="commercial-lot-subtitle">
            Theo dõi từ đơn mua, hóa đơn, công nợ đến từng lần rút lô
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/commercial-purchases/lots/create")}
        >
          Tạo đơn mua lô
        </Button>
      </div>

      <div className="commercial-lot-toolbar">
        <Input
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Số đơn hoặc nhà cung cấp"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(1);
          }}
        />
        <Space size={6}>
          <Popover trigger="click" placement="bottomRight" open={filterOpen} onOpenChange={(open) => { setFilterOpen(open); if (open) { setDraftSupplierId(supplierId); setDraftDates(dates); } }} content={<div className="commercial-lot-filter-panel"><Typography.Text strong>Nhà cung cấp</Typography.Text><PartySelect partyRole="SUPPLIER" placeholder="Chọn nhà cung cấp" value={draftSupplierId} onChange={(value) => setDraftSupplierId(value ?? undefined)} /><Typography.Text strong>Ngày đặt</Typography.Text><DatePicker.RangePicker value={draftDates} format="DD/MM/YYYY" onChange={(value) => setDraftDates(value as [dayjs.Dayjs, dayjs.Dayjs] | null)} style={{ width: "100%" }} /><Space style={{ width: "100%", justifyContent: "flex-end" }}><Button size="small" onClick={() => { setSupplierId(undefined); setDates(null); setFilterOpen(false); setPage(1); }}>Đặt lại</Button><Button size="small" type="primary" onClick={() => { setSupplierId(draftSupplierId); setDates(draftDates); setFilterOpen(false); setPage(1); }}>Áp dụng</Button></Space></div>}>
            <Badge count={Number(Boolean(supplierId)) + Number(Boolean(dates))} size="small" offset={[-3, 3]}><Button size="small" icon={<FilterOutlined />}>Bộ lọc</Button></Badge>
          </Popover>
          <Tooltip title="Làm mới"><Button size="small" icon={<ReloadOutlined spin={query.isFetching} />} onClick={() => query.refetch()} /></Tooltip>
        </Space>
      </div>

      <Tabs
        className="commercial-lot-tabs"
        activeKey={lifecycleGroup ?? lifecycle ?? ALL_TAB}
        items={tabItems}
        onChange={(key) => {
          const nextLifecycle =
            key === ALL_TAB || key === WORKING_TAB
              ? undefined
              : (key as CommercialLotLifecycle);
          const nextGroup = key === WORKING_TAB ? WORKING_TAB : undefined;
          setLifecycle(nextLifecycle);
          setLifecycleGroup(nextGroup);
          if (nextGroup) setSearchParams({ lifecycleGroup: "working" });
          else if (nextLifecycle) setSearchParams({ lifecycle: nextLifecycle });
          else setSearchParams({});
          setPage(1);
        }}
      />

      <Table<CommercialLotPurchase>
        className="commercial-lot-table"
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={visibleItems}
        scroll={{ x: 1150 }}
        pagination={{
          current: page,
          pageSize: 20,
          total:
            lifecycleGroup === WORKING_TAB
              ? visibleItems.length
              : query.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `${total} đơn mua lô`,
          onChange: setPage,
        }}
        onRow={(row) => ({
          onDoubleClick: () =>
            navigate(`/commercial-purchases/lots/${row.id}`),
        })}
      />
    </div>
  );
}
