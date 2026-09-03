import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Tag, Tooltip, Typography } from "antd";
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  InboxOutlined,
  ReloadOutlined,
  RightOutlined,
  SwapOutlined,
  TruckOutlined,
  UploadOutlined,
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
};

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
  groups: Array<Bucket & { key: GroupKey; label: string }>;
};

type WarehouseDashboard = {
  period: { today: string; month: number };
  stock: { totals: Bucket; groups: GroupRow[]; byWarehouse: WarehouseRow[] };
  flow: {
    receivedMonth: number;
    issuedMonth: number;
    receiptsToday: number;
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

const EMPTY: WarehouseDashboard = {
  period: { today: "", month: 0 },
  stock: {
    totals: { onHand: 0, reserved: 0, pending: 0, blocked: 0, sellable: 0 },
    groups: [],
    byWarehouse: [],
  },
  flow: {
    receivedMonth: 0,
    issuedMonth: 0,
    receiptsToday: 0,
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
/* Trang                                                               */
/* ------------------------------------------------------------------ */

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const [showTable, setShowTable] = useState(false);

  const dashboardQuery = useWarehouseDashboard();
  const withdrawalsQuery = useCommercialLotWithdrawalsQueue(LOT_WITHDRAWALS_QUEUE_QUERY);
  const receiptsQuery = useInventoryReceipts(RECEIPT_REQUESTS_QUERY);

  const data = (dashboardQuery.data as WarehouseDashboard | undefined) ?? EMPTY;
  const { stock, flow, queues } = data;

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
          <Button
            size="small"
            icon={<DatabaseOutlined />}
            onClick={() => navigate("/operations/inventory-availability")}
          >
            Tồn kho chi tiết
          </Button>
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
        <article className="wd-kpi">
          <span className="wd-kpi-label">
            <DatabaseOutlined /> Tổng tồn thực tế
          </span>
          <span className="wd-kpi-value">
            {qty(stock.totals.onHand)}
            <span className="wd-unit">lít</span>
          </span>
          <span className="wd-kpi-foot">Hàng của công ty tại mọi kho</span>
        </article>

        <article className="wd-kpi">
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

        <article className="wd-kpi">
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

        <article className="wd-kpi">
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

      <div className="wd-grid cols-even">
        <section id="pending-receipts" className="wd-card">
          <div className="wd-card-head">
            <div>
              <Typography.Title level={4}>Đề nghị nhập hàng</Typography.Title>
              <Typography.Text className="wd-card-sub">
                Mua hàng đã gửi sang, chờ kho xác nhận thực nhập
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
                      <span className="wd-warehouse-value">{qty(warehouse.onHand)} lít</span>
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
