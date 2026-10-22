import React, { useState } from "react";
import { Button, DatePicker, Empty, Popconfirm, Segmented, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  HOLD_REALLOCATION_STATUS_LABELS,
  useBackfillHoldReallocation,
  useHoldReallocations,
  useOversellSummary,
} from "../holdReallocation";
import type { HoldReallocation, OversellSummary } from "../holdReallocation";
import { formatMoney, formatQty } from "./labels";
import "../sales.css";
import "../../../shared/ui/data-grid.css";

function SignedMoney({ value, provisional }: { value: string; provisional?: boolean }) {
  const amount = Number(value);
  return (
    <Typography.Text type={amount < 0 ? "danger" : amount > 0 ? "success" : undefined} className="data-grid-num">
      {amount > 0 ? "+" : ""}
      {formatMoney(value)}
      {provisional ? " *" : ""}
    </Typography.Text>
  );
}

/**
 * Nhãn trên đầu đơn: đơn lô đang chờ bù bao nhiêu (hàng khách chưa rút đã được bán vượt cho
 * đơn khác), hoặc đơn này đang bán vượt bằng hàng của những đơn lô nào.
 */
export function OrderHoldTags({ salesOrderId }: { salesOrderId: string }) {
  const items = useHoldReallocations({ salesOrderId }).data?.items ?? [];
  const awaiting = items
    .filter((row) => row.donorOrder.id === salesOrderId)
    .reduce((sum, row) => sum + Number(row.outstandingQty), 0);
  const taken = items.filter((row) => row.recipientOrder.id === salesOrderId);
  if (!awaiting && !taken.length) return null;
  return (
    <>
      {awaiting > 0 ? (
        <Tooltip title="Hàng khách chưa rút của đơn lô này đã được bán vượt cho đơn khác. Phần này rút được khi hàng bù về, hoặc khi kho còn hàng dư.">
          <Tag color="orange">Chờ bù {formatQty(awaiting)}</Tag>
        </Tooltip>
      ) : null}
      {taken.length ? (
        <Tooltip
          title={taken.map((row) => `${row.reallocationNo}: ${formatQty(row.takenQty)} từ ${row.donorOrder.orderNo}`).join(" | ")}
        >
          <Tag color="geekblue">Bán vượt {formatQty(taken.reduce((sum, row) => sum + Number(row.takenQty), 0))}</Tag>
        </Tooltip>
      ) : null}
    </>
  );
}

/** Chi tiết từng lần bù: lô, lượng, giá lô, cước, hao hụt. */
function backfillDetail(row: HoldReallocation) {
  if (!row.backfills.length) return undefined;
  return (
    <div>
      {row.backfills.map((item, index) => {
        const lotCost = Number(item.unitCost) - Number(item.freightUnitCost) - Number(item.lossUnitCost);
        return (
          <div key={`${item.inventoryLotId}-${index}`}>
            Lô {item.lotNo}{item.fromTransfer ? " (chuyển kho)" : ""}: {formatQty(item.actualQty)} · giá lô {formatMoney(lotCost)}
            {item.fromTransfer ? ` + cước ${formatMoney(item.freightUnitCost)} + hao hụt ${formatMoney(item.lossUnitCost)}` : ""}
            {" = "}
            {formatMoney(item.unitCost)}
            {item.costIsProvisional ? " (tạm tính)" : ""}
          </div>
        );
      })}
    </div>
  );
}

function OversellSummaryTable() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const query = useOversellSummary(month);
  const items = query.data?.items ?? [];
  const columns: ColumnsType<OversellSummary["items"][number]> = [
    { title: "Kho", key: "warehouse", render: (_, row) => row.warehouse?.name ?? "—" },
    { title: "Mặt hàng", key: "product", render: (_, row) => row.product.name },
    { title: "Số phiếu", dataIndex: "count", width: 80, align: "right" },
    { title: "Bán vượt", dataIndex: "takenQty", width: 110, align: "right", render: (value) => formatQty(value) },
    { title: "Đã bù", dataIndex: "backfilledQty", width: 110, align: "right", render: (value) => formatQty(value) },
    {
      title: "Chờ bù",
      dataIndex: "outstandingQty",
      width: 100,
      align: "right",
      render: (value) => (Number(value) > 0 ? <Typography.Text type="danger">{formatQty(value)}</Typography.Text> : "—"),
    },
    {
      title: <Tooltip title="(Giá bán đơn bán vượt − giá vốn bù) × lượng đã bù">Lãi thực</Tooltip>,
      key: "realProfit",
      width: 130,
      align: "right",
      render: (_, row) => <SignedMoney value={row.realProfit} provisional={row.isProvisional} />,
    },
    {
      title: <Tooltip title="(Giá vốn lúc bán − giá vốn bù) × lượng đã bù. Dương là bù rẻ hơn.">Chênh giá vốn</Tooltip>,
      key: "costVariance",
      width: 130,
      align: "right",
      render: (_, row) => <SignedMoney value={row.costVariance} provisional={row.isProvisional} />,
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Tổng hợp theo kho, mặt hàng
        </Typography.Title>
        <DatePicker
          picker="month"
          allowClear={false}
          format="MM/YYYY"
          value={dayjs(`${month}-01`)}
          onChange={(value) => value && setMonth(value.format("YYYY-MM"))}
        />
      </Space>
      <Table
        rowKey={(row) => `${row.warehouse?.id ?? "-"}:${row.product.id}`}
        size="small"
        className="data-grid"
        pagination={false}
        loading={query.isLoading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lần bán vượt nào trong tháng" /> }}
      />
    </div>
  );
}

/**
 * Phiếu bán vượt. Không truyền `salesOrderId`: tab "Bán vượt" (đang chờ bù hoặc tất cả, kèm
 * tổng hợp tháng). Có `salesOrderId`: các phiếu mà đơn đó bán vượt hoặc bị lấy hàng.
 */
export function HoldReallocationsPanel({ salesOrderId }: { salesOrderId?: string }) {
  const navigate = useNavigate();
  const [scope, setScope] = useState<"OPEN" | "ALL">("OPEN");
  const query = useHoldReallocations(salesOrderId ? { salesOrderId } : scope === "ALL" ? { status: "ALL" } : {});
  const backfill = useBackfillHoldReallocation();
  const items = query.data?.items ?? [];

  // Trong chi tiết đơn, không có phiếu nào thì không chiếm chỗ.
  if (salesOrderId && !query.isLoading && !items.length) return null;

  const columns: ColumnsType<HoldReallocation> = [
    {
      title: "Số phiếu",
      key: "no",
      width: 112,
      render: (_, row) => (
        <Tooltip title={row.note ?? undefined}>
          <div className="data-grid-stack">
            <span className="data-grid-strong">{row.reallocationNo}</span>
            <span className="data-grid-sub">{row.executedAt ? dayjs(row.executedAt).format("DD/MM/YYYY") : "—"}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Đơn bán vượt",
      key: "recipient",
      render: (_, row) => (
        <div className="data-grid-stack">
          <a onClick={() => navigate(`/sales/orders/${row.recipientOrder.id}`)}>{row.recipientOrder.orderNo}</a>
          <span className="data-grid-sub data-grid-clip">{row.recipientOrder.customer.name}</span>
        </div>
      ),
    },
    {
      title: "Lấy từ đơn lô",
      key: "donor",
      render: (_, row) => (
        <div className="data-grid-stack">
          <Space size={4}>
            <a onClick={() => navigate(`/sales/orders/${row.donorOrder.id}`)}>{row.donorOrder.orderNo}</a>
            {row.donorInvoiced ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>Đã xuất HĐ</Tag> : null}
          </Space>
          <span className="data-grid-sub data-grid-clip">{row.donorOrder.customer.name}</span>
        </div>
      ),
    },
    {
      title: "Hàng / kho",
      key: "product",
      render: (_, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip">{row.product.name}</span>
          <span className="data-grid-sub">{row.warehouse?.name ?? "—"}</span>
        </div>
      ),
    },
    {
      title: "Bán vượt",
      key: "taken",
      width: 104,
      align: "right",
      render: (_, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-num">{formatQty(row.takenQty)}</span>
          <span className="data-grid-sub">giá {formatMoney(row.recipientNetUnitPrice)}</span>
        </div>
      ),
    },
    {
      title: <Tooltip title="Giá vốn các lô đã bán vượt, tại thời điểm bán">Giá vốn lúc bán</Tooltip>,
      key: "takenCost",
      width: 104,
      align: "right",
      render: (_, row) => <span className="data-grid-num">{formatMoney(row.takenUnitCost)}</span>,
    },
    {
      title: "Đã bù",
      key: "backfilled",
      width: 104,
      align: "right",
      render: (_, row) => (
        <Tooltip title={backfillDetail(row)}>
          <div className="data-grid-stack">
            <span className="data-grid-num">{formatQty(row.backfilledQty)}</span>
            <span className="data-grid-sub">
              {Number(row.waivedQty) > 0 ? `không cần bù ${formatQty(row.waivedQty)}` : " "}
            </span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Chờ bù",
      key: "outstanding",
      width: 90,
      align: "right",
      render: (_, row) =>
        Number(row.outstandingQty) > 0 ? (
          <Typography.Text type="danger" strong className="data-grid-num">
            {formatQty(row.outstandingQty)}
          </Typography.Text>
        ) : (
          <span className="data-grid-empty">—</span>
        ),
    },
    {
      title: <Tooltip title="(Giá bán đơn bán vượt − giá vốn bù) × lượng đã bù">Lãi thực</Tooltip>,
      key: "profit",
      width: 124,
      align: "right",
      render: (_, row) =>
        Number(row.backfilledQty) > 0 ? (
          <SignedMoney value={row.result.realProfit} provisional={row.result.isProvisional} />
        ) : (
          <span className="data-grid-empty">—</span>
        ),
    },
    {
      title: <Tooltip title="(Giá vốn lúc bán − giá vốn bù) × lượng đã bù. Dương là bù rẻ hơn, bán trước là có lợi.">Chênh giá vốn</Tooltip>,
      key: "variance",
      width: 124,
      align: "right",
      render: (_, row) =>
        Number(row.backfilledQty) > 0 ? (
          <SignedMoney value={row.result.costVariance} provisional={row.result.isProvisional} />
        ) : (
          <span className="data-grid-empty">—</span>
        ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 112,
      render: (_, row) => {
        const status = HOLD_REALLOCATION_STATUS_LABELS[row.status];
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: "",
      key: "actions",
      width: 84,
      render: (_, row) =>
        Number(row.outstandingQty) > 0 ? (
          <Popconfirm
            title="Bù ngay bằng tồn tự do?"
            description="Hệ thống giữ lại hàng cho đơn lô bị lấy theo lô cũ trước, tại kho của đơn."
            okText="Bù ngay"
            cancelText="Đóng"
            onConfirm={() => backfill.mutateAsync(row.id).catch(() => undefined)}
          >
            <Button size="small" loading={backfill.isPending && backfill.variables === row.id}>
              Bù ngay
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  const table = (
    <Table<HoldReallocation>
      rowKey="id"
      size="small"
      className="data-grid"
      pagination={false}
      loading={query.isLoading}
      columns={columns}
      dataSource={items}
      scroll={{ x: 1320 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={scope === "OPEN" ? "Không có phiếu bán vượt nào đang chờ bù" : "Chưa có phiếu bán vượt"}
          />
        ),
      }}
    />
  );

  if (salesOrderId) {
    return (
      <div style={{ marginTop: 12 }}>
        <Typography.Title level={5} style={{ margin: "0 0 8px" }}>
          Bán vượt
        </Typography.Title>
        {table}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Segmented
          value={scope}
          onChange={(value) => setScope(value as "OPEN" | "ALL")}
          options={[
            { value: "OPEN", label: "Đang chờ bù" },
            { value: "ALL", label: "Tất cả phiếu" },
          ]}
          style={{ alignSelf: "flex-start" }}
        />
        {table}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Hàng bù về (ghi sổ hóa đơn mua hoặc nhận hàng chuyển kho) được khớp tự động, phiếu bán vượt cũ nhất trước.
          Lãi chỉ tính trên phần đã bù. * Giá vốn tạm tính, còn đổi khi chốt giá mua.
        </Typography.Text>
      </div>
      <OversellSummaryTable />
    </div>
  );
}
