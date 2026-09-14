import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Select, Tag, Tooltip, Typography } from "antd";
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DollarOutlined,
  DownloadOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SwapOutlined,
  TruckOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useCommercialLotWithdrawalsQueue } from "../commercial-lots/hooks";
import {
  LOT_WITHDRAWALS_QUEUE_QUERY,
  LotWithdrawalsQueuePanel,
} from "../commercial-lots/ui/LotWithdrawalsQueuePanel";
import { useInventoryReceipts } from "../inventory-receipts/hooks";
import {
  RECEIPT_REQUESTS_QUERY,
  ReceiptRequestsQueuePanel,
} from "../inventory-receipts/ui/ReceiptRequestsQueuePanel";
import { useWarehouseDashboard } from "./hooks";
import "./warehouse-dashboard.css";

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu                                                        */
/* ------------------------------------------------------------------ */

type GroupKey = "GASOLINE" | "DIESEL" | "OTHER";

type Bucket = {
  onHand: number;
  reserved: number;
  pending: number;
  blocked: number;
  sellable: number;
  /** Phần đã cam kết vượt quá tồn. Trước đây bị làm tròn về 0 và biến mất. */
  shortfall: number;
};

type WarehouseOption = { id: string; code: string; name: string };

type StockAlertRow = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  productId: string;
  productName: string;
  onHand: number;
  qty: number;
};

type StockAlertGroup = { count: number; qty: number; items: StockAlertRow[] };

type InventoryValue = {
  currency: string;
  total: number;
  provisional: number;
  mixedCurrency: boolean;
  /** Lượng đứng sau con số tiền, và lượng chưa lớp giá vốn nào nhận. */
  costedQty: number;
  uncostedQty: number;
};

type TrendMonth = { month: string; received: number; issued: number };

type TopProduct = { productId: string; code: string; name: string; qty: number };

type ProductRow = Bucket & {
  productId: string;
  code: string;
  name: string;
  uom: string;
};

type GroupRow = Bucket & {
  key: GroupKey;
  label: string;
  products: ProductRow[];
};

type WarehouseRow = {
  warehouseId: string;
  code: string;
  name: string;
  onHand: number;
  value: number;
  groups: Array<Bucket & { key: GroupKey; label: string }>;
};

type WarehouseDashboard = {
  period: { today: string; month: number };
  scope: { warehouseId: string | null; warehouses: WarehouseOption[] };
  stock: { totals: Bucket; groups: GroupRow[]; byWarehouse: WarehouseRow[] };
  value: InventoryValue;
  trend: { months: TrendMonth[]; topIssued: TopProduct[] };
  alerts: {
    negativeOnHand: StockAlertGroup;
    overCommitted: StockAlertGroup;
    zeroOnHand: StockAlertGroup;
  };
  flow: {
    receivedMonth: number;
    issuedMonth: number;
    receiptsToday: number;
    deliveriesToday: number;
    expectedQty: number;
    expectedSoon: number;
  };
  queues: {
    receiptRequests: number;
    lotWithdrawalsPending: number;
    salesDeliveriesReady: number;
    salesDeliveriesReturned: number;
    transfersInTransit: number;
    reconciliationVariance: number;
  };
};

/* ------------------------------------------------------------------ */
/* Định dạng & màu nhóm                                                */
/* ------------------------------------------------------------------ */

const intFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const qty = (value: number | undefined) => intFormat.format(Number(value ?? 0));

const percent = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";

/** Rút gọn tiền cho ô chỉ số: giá vốn kho là con số hàng tỷ, ghi đủ chữ số thì không đọc nổi. */
const money = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1e9)
    return `${(value / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (abs >= 1e6)
    return `${(value / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  return intFormat.format(Math.round(value));
};

/** "2026-09" -> "T9". Năm nằm ở dòng chú thích dưới biểu đồ, không lặp trên từng cột. */
const monthLabel = (value: string) => `T${Number(value.slice(5, 7))}`;

/** Màu định danh của nhóm: xăng luôn xanh, dầu luôn cam — không đổi theo thứ hạng. */
const GROUP_COLOR: Record<GroupKey, { solid: string; soft: string }> = {
  GASOLINE: { solid: "var(--gasoline)", soft: "var(--gasoline-soft)" },
  DIESEL: { solid: "var(--diesel)", soft: "var(--diesel-soft)" },
  OTHER: { solid: "var(--other)", soft: "var(--other-soft)" },
};

const todayLabel = () =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

const EMPTY_ALERT_GROUP: StockAlertGroup = { count: 0, qty: 0, items: [] };

const EMPTY: WarehouseDashboard = {
  period: { today: "", month: 0 },
  scope: { warehouseId: null, warehouses: [] },
  stock: {
    totals: {
      onHand: 0,
      reserved: 0,
      pending: 0,
      blocked: 0,
      sellable: 0,
      shortfall: 0,
    },
    groups: [],
    byWarehouse: [],
  },
  value: {
    currency: "VND",
    total: 0,
    provisional: 0,
    mixedCurrency: false,
    costedQty: 0,
    uncostedQty: 0,
  },
  trend: { months: [], topIssued: [] },
  alerts: {
    negativeOnHand: EMPTY_ALERT_GROUP,
    overCommitted: EMPTY_ALERT_GROUP,
    zeroOnHand: EMPTY_ALERT_GROUP,
  },
  flow: {
    receivedMonth: 0,
    issuedMonth: 0,
    receiptsToday: 0,
    deliveriesToday: 0,
    expectedQty: 0,
    expectedSoon: 0,
  },
  queues: {
    receiptRequests: 0,
    lotWithdrawalsPending: 0,
    salesDeliveriesReady: 0,
    salesDeliveriesReturned: 0,
    transfersInTransit: 0,
    reconciliationVariance: 0,
  },
};

/* ------------------------------------------------------------------ */
/* Thẻ một nhóm hàng                                                   */
/* ------------------------------------------------------------------ */

function GroupPanel({ group, total }: { group: GroupRow; total: number }) {
  const color = GROUP_COLOR[group.key];
  const held = Math.max(group.onHand - group.sellable, 0);
  const base = Math.max(group.onHand, 1);

  return (
    <div className="wd-group">
      <div className="wd-group-head">
        <span className="wd-swatch" style={{ background: color.solid }} />
        <strong>{group.label}</strong>
        <span className="wd-group-pct">{percent(group.onHand, total)} tổng tồn</span>
      </div>

      <div className="wd-group-total">
        {qty(group.onHand)}
        <span className="wd-unit">lít</span>
      </div>
      <div className="wd-group-caption">{group.products.length} mặt hàng</div>

      <div className="wd-meter">
        <i
          style={{ width: `${(group.sellable / base) * 100}%`, background: color.solid }}
        />
        {held > 0 ? (
          <i style={{ width: `${(held / base) * 100}%`, background: color.soft }} />
        ) : null}
      </div>
      <div className="wd-meter-legend">
        <span>
          <span className="wd-swatch" style={{ background: color.solid }} />
          Bán được <b>{qty(group.sellable)}</b>
        </span>
        <span>
          <span className="wd-swatch" style={{ background: color.soft }} />
          Đang giữ / khóa <b>{qty(held)}</b>
        </span>
      </div>

      <div className="wd-product-list">
        {group.products.map((product) => {
          const productHeld = Math.max(product.onHand - product.sellable, 0);
          const productBase = Math.max(product.onHand, 1);
          return (
            <div className="wd-product-row" key={product.productId}>
              <div className="wd-product-head">
                <span className="wd-product-name">{product.name}</span>
                <span className="wd-product-value">
                  {qty(product.sellable)}
                  <small>/ {qty(product.onHand)}</small>
                </span>
              </div>
              <div className="wd-product-bar">
                <i
                  style={{
                    width: `${(product.sellable / productBase) * 100}%`,
                    background: color.solid,
                  }}
                />
                {productHeld > 0 ? (
                  <i
                    style={{
                      width: `${(productHeld / productBase) * 100}%`,
                      background: color.soft,
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Biểu đồ xu hướng nhập – xuất                                        */
/* ------------------------------------------------------------------ */

/*
 * Nhập vẽ lên trên, xuất vẽ xuống dưới cùng một đường gốc, và hai chiều dùng chung
 * một thang đo nên cột so được trực tiếp với nhau.
 *
 * Vì sao tách bằng vị trí chứ không bằng hai màu: xanh / cam / lục trên màn này đã là
 * màu ĐỊNH DANH của xăng / dầu / khác. Thử mọi cặp màu mới đều hỏng — dưới mắt mù màu
 * đỏ-lục, tím và hồng đều đổ về phía xanh của xăng (ΔE 2.8–5.6, ngưỡng cần là 8), mà
 * trục xanh–vàng thì cam đã chiếm. Không còn khe màu nào an toàn, nên chiều nhập/xuất
 * do vị trí và mũi tên gánh, còn hai bậc xám xanh chỉ là lớp phân biệt phụ.
 */
const FLOW_IN = "#3f5b78";
const FLOW_OUT = "#7d93ac";

/** Cột bo tròn ở đầu xa đường gốc, chân cột vẫn vuông để dính vào trục. */
function barPath(x: number, width: number, zeroY: number, height: number, up: boolean) {
  const r = Math.min(4, height / 2, width / 2);
  const end = up ? zeroY - height : zeroY + height;
  const inner = up ? end + r : end - r;
  const sweep = up ? 1 : 0;
  return [
    `M ${x} ${zeroY}`,
    `L ${x} ${inner}`,
    `A ${r} ${r} 0 0 ${sweep} ${x + r} ${end}`,
    `L ${x + width - r} ${end}`,
    `A ${r} ${r} 0 0 ${sweep} ${x + width} ${inner}`,
    `L ${x + width} ${zeroY}`,
    "Z",
  ].join(" ");
}

function FlowTrendChart({ months }: { months: TrendMonth[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (!months.length) {
    return (
      <div className="wd-empty-note">
        <DatabaseOutlined />
        Chưa có phiếu nhập hay xuất nào trong kỳ.
      </div>
    );
  }

  const WIDTH = 720;
  const HEIGHT = 210;
  const PAD_X = 10;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 24;

  const plotWidth = WIDTH - PAD_X * 2;
  const half = (HEIGHT - PAD_TOP - PAD_BOTTOM) / 2;
  const zeroY = PAD_TOP + half;
  const slot = plotWidth / months.length;
  const barWidth = Math.min(slot * 0.46, 26);

  // Thang chung cho cả hai chiều: cột nhập và cột xuất phải đo được với nhau.
  const peak = Math.max(...months.flatMap((item) => [item.received, item.issued]), 1);
  const scale = (value: number) => (Math.max(value, 0) / peak) * half;

  const active = hover != null ? months[hover] : null;

  return (
    <div className="wd-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Nhập và xuất theo tháng">
        <line
          className="wd-chart-axis"
          x1={PAD_X}
          y1={zeroY}
          x2={WIDTH - PAD_X}
          y2={zeroY}
        />
        {months.map((item, index) => {
          const slotX = PAD_X + slot * index;
          const barX = slotX + (slot - barWidth) / 2;
          const inHeight = scale(item.received);
          const outHeight = scale(item.issued);
          return (
            <g key={item.month}>
              {hover === index ? (
                <rect
                  className="wd-chart-hoverband"
                  x={slotX}
                  y={PAD_TOP}
                  width={slot}
                  height={half * 2}
                />
              ) : null}
              {inHeight > 0 ? (
                <path d={barPath(barX, barWidth, zeroY, inHeight, true)} fill={FLOW_IN} />
              ) : null}
              {outHeight > 0 ? (
                <path
                  d={barPath(barX, barWidth, zeroY, outHeight, false)}
                  fill={FLOW_OUT}
                />
              ) : null}
              <text className="wd-chart-tick" x={slotX + slot / 2} y={HEIGHT - 8}>
                {monthLabel(item.month)}
              </text>
              {/* Vùng bắt chuột rộng cả cột, không bắt người dùng trỏ trúng thanh mảnh. */}
              <rect
                className="wd-chart-hit"
                x={slotX}
                y={PAD_TOP}
                width={slot}
                height={half * 2}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover((current) => (current === index ? null : current))}
              />
            </g>
          );
        })}
      </svg>

      {active ? (
        <div
          className="wd-chart-tip"
          style={{ left: `${(((hover ?? 0) + 0.5) / months.length) * 100}%` }}
        >
          <strong>
            {monthLabel(active.month)}/{active.month.slice(0, 4)}
          </strong>
          <span>
            <i style={{ background: FLOW_IN }} />
            Nhập <b>{qty(active.received)}</b>
          </span>
          <span>
            <i style={{ background: FLOW_OUT }} />
            Xuất <b>{qty(active.issued)}</b>
          </span>
        </div>
      ) : null}

      <div className="wd-chart-legend">
        <span>
          <i style={{ background: FLOW_IN }} />
          <DownloadOutlined /> Nhập (cột trên)
        </span>
        <span>
          <i style={{ background: FLOW_OUT }} />
          <UploadOutlined /> Xuất (cột dưới)
        </span>
        <small>
          {monthLabel(months[0].month)}/{months[0].month.slice(0, 4)} –{" "}
          {monthLabel(months[months.length - 1].month)}/
          {months[months.length - 1].month.slice(0, 4)} · đỉnh {qty(peak)} lít
        </small>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trang                                                               */
/* ------------------------------------------------------------------ */

/** Giá trị của mục "mọi kho" trong ô chọn; không phải id kho nào cả. */
const ALL_WAREHOUSES = "__all__";

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const [showTable, setShowTable] = useState(false);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);

  const dashboardQuery = useWarehouseDashboard(warehouseId);
  const withdrawalsQuery = useCommercialLotWithdrawalsQueue(LOT_WITHDRAWALS_QUEUE_QUERY);
  const receiptsQuery = useInventoryReceipts(RECEIPT_REQUESTS_QUERY);

  // Trộn với EMPTY chứ không chỉ thay khi rỗng: lúc backend chưa kịp lên bản mới,
  // response vẫn thiếu `scope` và `alerts`, đọc thẳng vào đó là màn trắng.
  const data: WarehouseDashboard = {
    ...EMPTY,
    ...((dashboardQuery.data as Partial<WarehouseDashboard> | undefined) ?? {}),
  };
  const { scope, stock, value, trend, alerts, flow, queues } = data;

  const selectedWarehouse = scope.warehouses.find((item) => item.id === warehouseId);
  const scopeLabel = selectedWarehouse ? selectedWarehouse.name : "mọi kho";

  // Có lít nào thật sự đứng sau con số tiền chưa — khác hẳn với "tiền bằng 0".
  const hasCostData = value.costedQty > 0;

  const pendingWithdrawals = withdrawalsQuery.data?.total ?? queues.lotWithdrawalsPending;
  const pendingReceipts = receiptsQuery.data?.total ?? queues.receiptRequests;

  const isFetching =
    dashboardQuery.isFetching || withdrawalsQuery.isFetching || receiptsQuery.isFetching;

  const totalOnHand = Math.max(stock.totals.onHand, 1);

  // Hai hàng đợi duyệt đã nằm ngay đầu trang với số phiếu của riêng chúng, nên
  // không lặp lại ở đây; chỗ này chỉ còn việc không có widget riêng trên màn này.
  const tasks = [
    {
      key: "deliveries",
      label: "Phiếu xuất bán chờ kho",
      value: queues.salesDeliveriesReady,
      tone: "normal" as const,
      icon: <TruckOutlined />,
      href: "/sales/deliveries",
    },
    {
      key: "returned",
      label: "Phiếu xuất đã trả lại sale",
      value: queues.salesDeliveriesReturned,
      tone: "critical" as const,
      icon: <AlertOutlined />,
      href: "/sales/deliveries",
    },
    {
      key: "transfers",
      label: "Chuyển kho đang trên đường",
      value: queues.transfersInTransit,
      tone: "normal" as const,
      icon: <SwapOutlined />,
      href: "/operations/warehouse-transfers",
    },
    {
      key: "variance",
      label: "Chênh lệch đối chiếu chưa xử lý",
      value: queues.reconciliationVariance,
      tone: "critical" as const,
      icon: <AlertOutlined />,
      href: "/operations/inventory-accounting",
    },
  ].filter((task) => task.value > 0);

  // Ba việc chính của kho, để ngay trên đầu thay vì bắt quay lại menu.
  const quickActions = [
    {
      key: "receipt",
      label: "Nhập kho",
      icon: <DownloadOutlined />,
      href: "/operations/inventory-receipts",
    },
    {
      key: "issue",
      label: "Xuất kho",
      icon: <UploadOutlined />,
      href: "/sales/deliveries",
    },
    {
      key: "transfer",
      label: "Chuyển kho",
      icon: <SwapOutlined />,
      href: "/operations/warehouse-transfers",
    },
  ];

  /*
   * Dải chip: mỗi loại bất thường một ô, luôn hiện kể cả khi bằng 0 — số 0 đứng đúng
   * chỗ quen thuộc chính là lời trấn an, còn ẩn đi thì người trực ca không biết là
   * kho sạch hay là màn hình quên đếm.
   *
   * Không gộp mấy loại này vào một con số "cảnh báo": tồn âm là sổ sách đã sai, tồn 0
   * là cần đi mua, cam kết vượt tồn là sổ đúng nhưng hứa quá tay — ba việc, ba người
   * xử lý khác nhau. Mỗi chip đều có icon và nhãn chữ, màu chỉ là lớp nhấn thứ hai.
   */
  const alertChips = [
    {
      key: "zero",
      tone: "serious" as const,
      icon: <MinusCircleOutlined />,
      label: "Hàng tồn bằng 0",
      hint: "Cần lập lệnh nhập",
      count: alerts.zeroOnHand.count,
      items: alerts.zeroOnHand.items,
      showQty: false,
      href: "/operations/inventory-availability",
    },
    {
      key: "negative",
      tone: "danger" as const,
      icon: <AlertOutlined />,
      label: "Cảnh báo tồn âm",
      hint: "Lỗi xuất quá tồn",
      count: alerts.negativeOnHand.count,
      items: alerts.negativeOnHand.items,
      showQty: true,
      href: "/operations/inventory-accounting",
    },
    {
      key: "over-committed",
      tone: "warning" as const,
      icon: <WarningOutlined />,
      label: "Cam kết vượt tồn",
      hint: "Đã hứa quá số còn",
      count: alerts.overCommitted.count,
      items: alerts.overCommitted.items,
      showQty: true,
      href: "/operations/reservations",
    },
    {
      key: "pending",
      tone: "pending" as const,
      icon: <InboxOutlined />,
      label: "Phiếu chưa duyệt",
      hint: "Đề nghị nhập / rút lô",
      count: pendingReceipts + pendingWithdrawals,
      items: [],
      showQty: false,
      // Hai hàng đợi nằm ngay dưới trên chính màn này, cuộn xuống hợp lý hơn là điều đi.
      scrollTo: "pending-receipts",
    },
    {
      key: "today",
      tone: "good" as const,
      icon: <CalendarOutlined />,
      label: "Giao dịch hôm nay",
      hint: "Phiếu nhập + xuất trong ngày",
      count: flow.receiptsToday + flow.deliveriesToday,
      items: [],
      showQty: false,
    },
  ];

  return (
    <main className={`warehouse-dashboard ${dashboardQuery.isLoading ? "is-loading" : ""}`}>
      <header className="wd-header">
        <div>
          <div className="wd-eyebrow">
            <span>Trung tâm kho</span>
            <span>
              <CalendarOutlined /> {todayLabel()}
            </span>
          </div>
          <div className="wd-title-row">
            <Typography.Title level={2}>Dashboard kho</Typography.Title>
            <Tag color="blue">{qty(stock.totals.onHand)} lít tồn</Tag>
          </div>
          <Typography.Text>
            Tồn xăng và dầu, luồng nhập xuất và các phiếu đang chờ kho xử lý.
          </Typography.Text>
        </div>
        <div className="wd-actions">
          <Select
            size="small"
            className="wd-scope-select"
            aria-label="Chọn kho"
            value={warehouseId ?? ALL_WAREHOUSES}
            popupMatchSelectWidth={false}
            onChange={(value) =>
              setWarehouseId(value === ALL_WAREHOUSES ? undefined : value)
            }
            options={[
              { value: ALL_WAREHOUSES, label: "Toàn bộ kho" },
              ...scope.warehouses.map((item) => ({
                value: item.id,
                label: `${item.code} — ${item.name}`,
              })),
            ]}
          />
          {quickActions.map((action) => (
            <Button
              key={action.key}
              size="small"
              icon={action.icon}
              onClick={() => navigate(action.href)}
            >
              {action.label}
            </Button>
          ))}
          <Tooltip title="Làm mới dữ liệu">
            <Button
              size="small"
              aria-label="Làm mới dữ liệu"
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={() => {
                dashboardQuery.refetch();
                withdrawalsQuery.refetch();
                receiptsQuery.refetch();
              }}
            />
          </Tooltip>
        </div>
      </header>

      <section className="wd-kpi-strip" aria-label="Chỉ số kho">
        <article className="wd-kpi tone-onhand">
          <span className="wd-kpi-label">
            <DatabaseOutlined /> Tổng tồn thực tế
          </span>
          <span className="wd-kpi-value">
            {qty(stock.totals.onHand)}
            <span className="wd-unit">lít</span>
          </span>
          <span className="wd-kpi-foot">Hàng của công ty tại {scopeLabel}</span>
        </article>

        <article className="wd-kpi tone-sellable">
          <span className="wd-kpi-label">
            <CheckCircleOutlined /> Sẵn sàng bán
          </span>
          <span className="wd-kpi-value">
            {qty(stock.totals.sellable)}
            <span className="wd-unit">lít</span>
          </span>
          <span className="wd-kpi-foot">
            Đã trừ {qty(stock.totals.reserved + stock.totals.pending + stock.totals.blocked)} lít
            giữ / chờ / khóa
          </span>
        </article>

        <article className="wd-kpi tone-value">
          <span className="wd-kpi-label">
            <DollarOutlined /> Giá vốn tồn
          </span>
          {/*
            Không có lít nào được gán giá thì hiện gạch ngang chứ không hiện "0 đ":
            "0 đ" đọc ra là kho không đáng tiền, còn sự thật là chưa ai định giá nó.
          */}
          <span className={`wd-kpi-value${hasCostData ? "" : " is-empty"}`}>
            {hasCostData ? money(value.total) : "—"}
            {hasCostData ? (
              <span className="wd-unit">
                {value.currency === "VND" ? "đ" : value.currency}
              </span>
            ) : null}
          </span>
          <span className="wd-kpi-foot">
            {!hasCostData
              ? `Chưa gán giá vốn cho ${qty(value.uncostedQty)} lít tồn`
              : value.uncostedQty > 0
                ? `Còn ${qty(value.uncostedQty)} lít chưa có giá vốn`
                : value.provisional > 0
                  ? `Trong đó ${money(value.provisional)} theo giá tạm`
                  : "Theo lớp giá vốn đang mở"}
            {value.mixedCurrency ? " · còn lô ghi bằng ngoại tệ" : ""}
          </span>
        </article>

        <article className="wd-kpi tone-in">
          <span className="wd-kpi-label">
            <DownloadOutlined /> Nhập tháng {data.period.month || ""}
          </span>
          <span className="wd-kpi-value">
            {qty(flow.receivedMonth)}
            <span className="wd-unit">lít</span>
          </span>
          <span className="wd-kpi-foot">
            {flow.receiptsToday > 0
              ? `${qty(flow.receiptsToday)} phiếu nhập hôm nay`
              : "Chưa có phiếu nhập hôm nay"}
          </span>
        </article>

        <article className="wd-kpi tone-out">
          <span className="wd-kpi-label">
            <UploadOutlined /> Xuất tháng {data.period.month || ""}
          </span>
          <span className="wd-kpi-value">
            {qty(flow.issuedMonth)}
            <span className="wd-unit">lít</span>
          </span>
          <span className="wd-kpi-foot">
            Hàng sắp về {qty(flow.expectedQty)} lít
            {flow.expectedSoon > 0 ? ` · ${qty(flow.expectedSoon)} lô trong 7 ngày` : ""}
          </span>
        </article>
      </section>

      <section className="wd-chip-strip" aria-label="Cảnh báo và phiếu trong ngày">
        {alertChips.map((chip) => {
          // Icon giữ màu ở mọi trạng thái để nhận ra chip nào là chip nào; riêng con số
          // bằng 0 thì chuyển xám, nên mắt vẫn dừng đúng ô đang có việc.
          const raised = chip.count > 0;
          const rest = chip.count - chip.items.length;
          const action = chip.href
            ? () => navigate(chip.href!)
            : chip.scrollTo
              ? () =>
                  document
                    .getElementById(chip.scrollTo!)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
              : null;

          const body = (
            <>
              <span className="wd-chip-icon">{chip.icon}</span>
              <span className="wd-chip-text">
                <b>{chip.label}</b>
                <small>{chip.hint}</small>
              </span>
              <strong className="wd-chip-count">{qty(chip.count)}</strong>
            </>
          );

          const className = `wd-chip tone-${chip.tone}${raised ? "" : " is-zero"}`;
          const chipNode =
            action && raised ? (
              <button type="button" className={className} onClick={action}>
                {body}
              </button>
            ) : (
              <div className={className}>{body}</div>
            );

          if (!raised || !chip.items.length) {
            return <div key={chip.key}>{chipNode}</div>;
          }

          return (
            <Tooltip
              key={chip.key}
              placement="bottom"
              title={
                <ul className="wd-chip-tip">
                  {chip.items.map((item) => (
                    <li key={`${item.warehouseId}-${item.productId}`}>
                      <code>{item.warehouseCode}</code>
                      <span>{item.productName}</span>
                      {chip.showQty ? <b>{qty(item.qty)}</b> : null}
                    </li>
                  ))}
                  {rest > 0 ? <li>còn {rest} dòng nữa</li> : null}
                </ul>
              }
            >
              <div>{chipNode}</div>
            </Tooltip>
          );
        })}
      </section>

      <div className="wd-grid cols-even">
        <section id="pending-receipts" className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Đề nghị nhập hàng</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Mua hàng đã gửi sang, chờ kho xác nhận thực nhập
                {/* Hàng đợi này chưa lọc được theo kho, nói thẳng ra để khỏi đọc nhầm. */}
                {selectedWarehouse ? " · tính toàn bộ kho" : ""}
              </Typography.Text>
            </div>
            <Tag color={pendingReceipts ? "gold" : "default"}>
              <InboxOutlined /> {qty(pendingReceipts)}
            </Tag>
          </div>
          <div className="wd-card-body">
            <ReceiptRequestsQueuePanel />
          </div>
        </section>

        <section id="pending-withdrawals" className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Phiếu rút lô</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Khách rút hàng khỏi lô thương phẩm, chờ kho xác nhận
                {selectedWarehouse ? " · tính toàn bộ kho" : ""}
              </Typography.Text>
            </div>
            <Tag color={pendingWithdrawals ? "gold" : "default"}>
              <InboxOutlined /> {qty(pendingWithdrawals)}
            </Tag>
          </div>
          <div className="wd-card-body">
            <LotWithdrawalsQueuePanel />
          </div>
        </section>
      </div>

      {/* Tồn tách xăng / dầu — phần chính của màn này. */}
      <section className="wd-card">
        <div className="wd-card-head">
          <div>
            <Typography.Title level={4}>Tồn theo nhóm hàng</Typography.Title>
            <Typography.Text className="wd-card-sub">
              Xăng và dầu tách riêng, mỗi nhóm chia phần bán được và phần đang bị giữ
            </Typography.Text>
          </div>
          <Button
            type="link"
            size="small"
            className="wd-table-toggle"
            style={{ marginTop: 0 }}
            onClick={() => setShowTable((open) => !open)}
          >
            {showTable ? "Xem biểu đồ" : "Xem dạng bảng"}
          </Button>
        </div>
        <div className="wd-card-body">
          {stock.groups.length ? (
            showTable ? (
              <div className="wd-table-scroll">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>Mặt hàng</th>
                      <th>Tồn thực tế</th>
                      <th>Bán được</th>
                      <th>Đang giữ</th>
                      <th>Chờ chứng từ</th>
                      <th>Bị khóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.groups.flatMap((group) => [
                      <tr key={group.key}>
                        <td>
                          <strong>{group.label}</strong>
                        </td>
                        <td>
                          <strong>{qty(group.onHand)}</strong>
                        </td>
                        <td>
                          <strong>{qty(group.sellable)}</strong>
                        </td>
                        <td>
                          <strong>{qty(group.reserved)}</strong>
                        </td>
                        <td>
                          <strong>{qty(group.pending)}</strong>
                        </td>
                        <td>
                          <strong>{qty(group.blocked)}</strong>
                        </td>
                      </tr>,
                      ...group.products.map((product) => (
                        <tr key={product.productId}>
                          <td>&nbsp;&nbsp;{product.name}</td>
                          <td>{qty(product.onHand)}</td>
                          <td>{qty(product.sellable)}</td>
                          <td>{qty(product.reserved)}</td>
                          <td>{qty(product.pending)}</td>
                          <td>{qty(product.blocked)}</td>
                        </tr>
                      )),
                    ])}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <div className="wd-share-bar" role="presentation">
                  {stock.groups.map((group) => (
                    <i
                      key={group.key}
                      style={{
                        width: `${(group.onHand / totalOnHand) * 100}%`,
                        background: GROUP_COLOR[group.key].solid,
                      }}
                    />
                  ))}
                </div>
                <div className="wd-share-legend">
                  {stock.groups.map((group) => (
                    <div key={group.key}>
                      <span
                        className="wd-swatch"
                        style={{ background: GROUP_COLOR[group.key].solid }}
                      />
                      <span>{group.label}</span>
                      <strong>{qty(group.onHand)}</strong>
                      <small>lít · {percent(group.onHand, stock.totals.onHand)}</small>
                    </div>
                  ))}
                </div>

                <div className="wd-group-grid">
                  {stock.groups.map((group) => (
                    <GroupPanel key={group.key} group={group} total={stock.totals.onHand} />
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="wd-empty-note">
              <DatabaseOutlined />
              Chưa có tồn kho nào của công ty.
            </div>
          )}
        </div>
      </section>

      <div className="wd-grid cols-2">
        <section className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Xu hướng nhập – xuất</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Phiếu nhập đã xác nhận và hàng xuất bán đã ghi sổ, theo từng tháng
              </Typography.Text>
            </div>
          </div>
          <div className="wd-card-body">
            <FlowTrendChart months={trend.months} />
          </div>
        </section>

        <section className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Xuất nhiều nhất</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Sản lượng đã ghi sổ trong cùng kỳ của biểu đồ bên cạnh
              </Typography.Text>
            </div>
          </div>
          <div className="wd-card-body">
            {trend.topIssued.length ? (
              <ol className="wd-top-list">
                {trend.topIssued.map((item) => (
                  <li key={item.productId}>
                    <div className="wd-top-head">
                      <span>{item.name}</span>
                      <b>{qty(item.qty)}</b>
                    </div>
                    <div className="wd-top-bar">
                      <i
                        style={{
                          width: `${(item.qty / Math.max(trend.topIssued[0].qty, 1)) * 100}%`,
                          background: FLOW_OUT,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="wd-empty-note">
                <DatabaseOutlined />
                Chưa có hàng xuất nào được ghi sổ trong kỳ.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="wd-grid cols-2">
        <section className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Tồn theo kho</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Mỗi kho đang giữ bao nhiêu xăng, bao nhiêu dầu
              </Typography.Text>
            </div>
            <Button
              size="small"
              type="text"
              icon={<RightOutlined />}
              aria-label="Mở tồn kho chi tiết"
              onClick={() => navigate("/operations/inventory-availability")}
            />
          </div>
          <div className="wd-card-body">
            {stock.byWarehouse.length ? (
              stock.byWarehouse.map((warehouse) => {
                const base = Math.max(warehouse.onHand, 1);
                return (
                  <div className="wd-warehouse-row" key={warehouse.warehouseId}>
                    <div className="wd-warehouse-head">
                      <span className="wd-warehouse-name">
                        <code>{warehouse.code}</code>
                        {warehouse.name}
                      </span>
                      <span className="wd-warehouse-value">
                        {qty(warehouse.onHand)} lít
                        {warehouse.value > 0 ? (
                          <small>{money(warehouse.value)} đ</small>
                        ) : null}
                      </span>
                    </div>
                    <div className="wd-warehouse-bar">
                      {warehouse.groups.map((group) => (
                        <i
                          key={group.key}
                          style={{
                            width: `${(group.onHand / base) * 100}%`,
                            background: GROUP_COLOR[group.key].solid,
                          }}
                        />
                      ))}
                    </div>
                    <div className="wd-warehouse-note">
                      {warehouse.groups
                        .map((group) => `${group.label} ${qty(group.onHand)}`)
                        .join(" · ")}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="wd-empty-note">
                <DatabaseOutlined />
                Chưa có kho nào phát sinh tồn.
              </div>
            )}
          </div>
        </section>

        <section className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Cần xử lý</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Chứng từ đang chờ kho quyết định
              </Typography.Text>
            </div>
            {tasks.length ? (
              <Tag color="gold">{tasks.length} nhóm việc</Tag>
            ) : (
              <Tag color="green">Thông suốt</Tag>
            )}
          </div>
          <div className="wd-card-body">
            {tasks.length ? (
              <div className="wd-action-list">
                {tasks.map((task) => (
                  <button
                    type="button"
                    key={task.key}
                    className={`tone-${task.tone}`}
                    onClick={() => navigate(task.href)}
                  >
                    <span className="wd-action-icon">{task.icon}</span>
                    <span>{task.label}</span>
                    <strong>{qty(task.value)}</strong>
                    <RightOutlined />
                  </button>
                ))}
              </div>
            ) : (
              <div className="wd-empty-note">
                <CheckCircleOutlined />
                Không có chứng từ nào đang chờ kho.
              </div>
            )}
          </div>
        </section>
      </div>

    </main>
  );
}
