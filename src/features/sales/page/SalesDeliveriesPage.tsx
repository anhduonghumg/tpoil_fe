import React, { useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  EditOutlined,
  RedoOutlined,
  RollbackOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { useWarehouseSelect } from "../../purchases/hooks";
import {
  useQuickConfirmDeliveries,
  useReserveSalesOrder,
  useResendDelivery,
  useReturnDeliveryToSales,
  useSalesDeliveries,
  useSalesDeliveryDetail,
  useSalesOrders,
  useSalesReturns,
  useVoidDelivery,
} from "../hooks";
import type { SalesDelivery, SalesDeliveryLine, SalesDeliveryStatus } from "../types";
import { DeliveryConfirmModal } from "../ui/DeliveryConfirmModal";
import { DeliveryStatusTag, formatQty } from "../ui/labels";
import { useAwaitingBackfillByOrder } from "../holdReallocation";
import { SalesReturnsPanel } from "../ui/SalesReturnsPanel";

const RETURNS_TAB = "RETURNS";

const STATUS_FILTERS = [
  { value: "READY", label: "Chờ kho xuất" },
  { value: "POSTED", label: "Đã xuất" },
  { value: "RETURNED", label: "Đã trả lại" },
  { value: "VOIDED", label: "Đã hủy" },
  { value: "ALL", label: "Tất cả" },
  // Không phải trạng thái lệnh xuất: tab riêng cho phiếu nhập hàng bán bị trả lại.
  { value: RETURNS_TAB, label: "Nhập trả" },
];

/** Hàng đợi việc của kho: mỗi lệnh xuất là phần việc của một kho cho một đơn. */
export default function SalesDeliveriesPage() {
  const navigate = useNavigate();
  const awaitingBackfillByOrder = useAwaitingBackfillByOrder();
  const [searchParams] = useSearchParams();
  const { can } = useCan();
  // Thông báo "phiếu nhập trả chờ kho" dẫn thẳng vào tab Nhập trả.
  const [status, setStatus] = useState(searchParams.get("tab") === RETURNS_TAB ? RETURNS_TAB : "READY");
  const [warehouseId, setWarehouseId] = useState<string>();
  const [warehouseKeyword, setWarehouseKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [confirmTarget, setConfirmTarget] = useState<SalesDelivery>();
  const [returnTarget, setReturnTarget] = useState<SalesDelivery>();
  const [returnReason, setReturnReason] = useState("");
  const [voidTarget, setVoidTarget] = useState<SalesDelivery>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [voidReason, setVoidReason] = useState("");
  const [createRevision, setCreateRevision] = useState(true);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryKeyword, setRecoveryKeyword] = useState("");
  const [recoveryOrderId, setRecoveryOrderId] = useState<string>();

  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const isReturnsTab = status === RETURNS_TAB;
  const pendingReturnsQuery = useSalesReturns({ status: "PENDING", warehouseId, limit: 1 });
  const query = useSalesDeliveries({
    status: status === "ALL" || isReturnsTab ? undefined : (status as SalesDeliveryStatus),
    warehouseId,
    dateFrom,
    dateTo,
    page,
    limit: 20,
  });
  const allCountQuery = useSalesDeliveries({ warehouseId, dateFrom, dateTo, limit: 1 });
  const readyCountQuery = useSalesDeliveries({ status: "READY", warehouseId, dateFrom, dateTo, limit: 1 });
  const postedCountQuery = useSalesDeliveries({ status: "POSTED", warehouseId, dateFrom, dateTo, limit: 1 });
  const returnedCountQuery = useSalesDeliveries({ status: "RETURNED", warehouseId, dateFrom, dateTo, limit: 1 });
  const voidedCountQuery = useSalesDeliveries({ status: "VOIDED", warehouseId, dateFrom, dateTo, limit: 1 });
  const detailQuery = useSalesDeliveryDetail(detailId);
  const returnMutation = useReturnDeliveryToSales(returnTarget?.id);
  const resendMutation = useResendDelivery();
  const voidMutation = useVoidDelivery(voidTarget?.id);
  const quickConfirmMutation = useQuickConfirmDeliveries();
  const recoverOrderMutation = useReserveSalesOrder();
  const recoveryOrdersQuery = useSalesOrders({
    kind: "DAY_TRADE",
    status: "AWAITING_STOCK,PARTIALLY_RESERVED",
    keyword: recoveryKeyword || undefined,
    page: 1,
    limit: 50,
  });

  /** Chỉ lệnh đang chờ kho xuất mới tích chọn được — các trạng thái khác không còn gì để xác nhận. */
  const rows = query.data?.items ?? [];
  const readyIds = rows.filter((row) => row.status === "READY").map((row) => row.id);
  const canConfirm = can(PERMS.SALES_DELIVERY_CONFIRM);
  // Dòng đã chọn có thể vừa bị lọc khỏi trang (đổi tab, sang trang khác), nên luôn
  // rọi lại theo danh sách đang hiển thị trước khi gửi đi.
  const selectedReadyIds = selectedIds.filter((id) => readyIds.includes(id));

  const warehouseName = (warehousesQuery.data ?? []).find((row) => row.id === warehouseId)?.label;
  const recoveryOrders = recoveryOrdersQuery.data?.items ?? [];

  const filterTags = [
    warehouseId && {
      key: "warehouse",
      label: `Kho: ${warehouseName ?? "đã chọn"}`,
      onClear: () => {
        setWarehouseId(undefined);
        setPage(1);
      },
    },
    (dateFrom || dateTo) && {
      key: "date",
      label: `Ngày lệnh: ${dateFrom ? dayjs(dateFrom).format("DD/MM/YYYY") : "…"} – ${dateTo ? dayjs(dateTo).format("DD/MM/YYYY") : "…"}`,
      onClear: () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setPage(1);
      },
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Kho
        </Typography.Text>
        <Select
          allowClear
          showSearch
          size="small"
          filterOption={false}
          style={{ width: "100%" }}
          placeholder="Mọi kho"
          value={warehouseId}
          loading={warehousesQuery.isFetching}
          onSearch={setWarehouseKeyword}
          onChange={(value) => {
            setWarehouseId(value);
            setPage(1);
          }}
          options={(warehousesQuery.data ?? []).map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.label,
          }))}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Ngày lệnh xuất
        </Typography.Text>
        <DatePicker.RangePicker
          size="small"
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          value={[dateFrom ? dayjs(dateFrom) : null, dateTo ? dayjs(dateTo) : null]}
          onChange={(dates) => {
            setDateFrom(dates?.[0]?.format("YYYY-MM-DD"));
            setDateTo(dates?.[1]?.format("YYYY-MM-DD"));
            setPage(1);
          }}
        />
      </div>
      <div style={{ textAlign: "right" }}>
        <Button
          size="small"
          onClick={() => {
            setWarehouseId(undefined);
            setDateFrom(undefined);
            setDateTo(undefined);
            setPage(1);
          }}
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );

  const columns: ColumnsType<SalesDelivery> = [
    {
      title: "Số lệnh",
      dataIndex: "deliveryNo",
      width: 108,
      render: (value: string, delivery) => (
        <Space size={4} direction="vertical" style={{ rowGap: 0 }}>
          <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(delivery.id)}>
            {value}
          </Button>
          {delivery.salesOrderAdjustmentId && (
            <Tooltip title="Lệnh xuất bổ sung cho phần khách tăng sau khi đã xuất (theo phiếu điều chỉnh)">
              <Tag color="purple" style={{ marginInlineEnd: 0, fontSize: 11 }}>
                Bổ sung
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "Ngày xuất",
      dataIndex: "plannedAt",
      width: 88,
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—"),
    },
    {
      title: "Số đơn hàng",
      key: "order",
      width: 138,
      render: (_, delivery) => (
        <Space size={4}>
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/sales/orders/${delivery.salesOrder.id}`)}>
            {delivery.salesOrder.orderNo}
          </Button>
          {/* Đơn đang chờ bù: hàng giữ đã phân bổ lại cho đơn khác, lệnh chưa xuất được. */}
          {delivery.status !== "POSTED" && (awaitingBackfillByOrder.get(delivery.salesOrder.id) ?? 0) > 0 ? (
            <Tooltip title={`Chờ bù ${formatQty(awaitingBackfillByOrder.get(delivery.salesOrder.id))}: hàng giữ của đơn đã phân bổ lại cho đơn khác. Lệnh xuất được khi hàng bù về.`}>
              <Tag color="orange" style={{ marginInlineEnd: 0 }}>Chờ bù</Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    { title: "Khách hàng", key: "customer", width: 96, ellipsis: true, render: (_, d) => d.salesOrder.customer.code ?? "—" },
    { title: "Kho xuất", key: "warehouse", width: 104, ellipsis: true, render: (_, d) => d.warehouse.name },
    {
      title: "Hàng",
      key: "lines",
      width: 78,
      render: (_, delivery) => (
        <div>
          {delivery.lines.map((line) => (
            <div key={line.id} style={{ fontSize: 12 }}>
              {line.orderLine.product.code ?? line.orderLine.product.name}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 88,
      align: "right",
      render: (_, delivery) => (
        <div>
          {delivery.lines.map((line) => (
            <div key={line.id} style={{ fontSize: 12 }}>
              <strong>{formatQty(line.actualQty ?? line.plannedActualQty)}</strong>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Xe / lái xe",
      key: "vehicleDriver",
      width: 140,
      render: (_, delivery) => (
        <div className="sales-grid-stack">
          <div className="sales-grid-clip">{delivery.vehiclePlate ?? "—"}</div>
          <Typography.Text className="sales-grid-sub" type="secondary" ellipsis>
            {delivery.driverName ?? "—"}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 108,
      render: (value: SalesDeliveryStatus) => <DeliveryStatusTag status={value} />,
    },
    {
      title: "Thao tác",
      key: "actions",
      // Dòng chờ xuất có tới ba nút: xác nhận nhanh, nhập chi tiết, trả lại kinh doanh.
      width: 100,
      render: (_, delivery) => (
        <Space size={4}>
          {delivery.status === "READY" && can(PERMS.SALES_DELIVERY_CONFIRM) && (
            <>
              {/* Đơn đã duyệt và giữ lô từ trước, thực xuất thường đúng bằng kế hoạch —
                  nên nút chính ghi sổ luôn, không mở form. */}
              <Tooltip title="Xác nhận xuất theo kế hoạch">
                <Button
                  type="primary"
                  size="small"
                  shape="circle"
                  icon={<CheckOutlined />}
                  loading={
                    quickConfirmMutation.isPending &&
                    quickConfirmMutation.variables?.length === 1 &&
                    quickConfirmMutation.variables[0] === delivery.id
                  }
                  onClick={() => quickConfirmMutation.mutate([delivery.id])}
                />
              </Tooltip>
              {/* Còn form vẫn phải với tới được: hao hụt, xuất thêm, hoặc kho cần khai
                  V15 / nhiệt độ / số chứng từ kho thì vào đây. */}
              <Tooltip title="Nhập chi tiết xuất (thực xuất, V15, lô)">
                <Button
                  size="small"
                  shape="circle"
                  icon={<EditOutlined />}
                  onClick={() => setConfirmTarget(delivery)}
                />
              </Tooltip>
            </>
          )}
          {delivery.status === "READY" && can(PERMS.SALES_DELIVERY_RETURN) && (
            <Tooltip title="Trả lại kinh doanh"><Button size="small" shape="circle" icon={<RollbackOutlined />} onClick={() => setReturnTarget(delivery)} /></Tooltip>
          )}
          {delivery.status === "RETURNED" && can(PERMS.SALES_UPDATE) && (
            <Tooltip title="Gửi lại kho"><Button size="small" shape="circle" icon={<RedoOutlined />} loading={resendMutation.isPending} onClick={() => resendMutation.mutate(delivery.id)} /></Tooltip>
          )}
          {delivery.status === "POSTED" && can(PERMS.SALES_DELIVERY_VOID) && (
            <Tooltip title="Hủy phiếu xuất"><Button danger size="small" shape="circle" icon={<StopOutlined />} onClick={() => setVoidTarget(delivery)} /></Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const detail = detailQuery.data;
  const detailLineColumns: ColumnsType<SalesDeliveryLine> = [
    { title: "#", dataIndex: "lineNo", width: 44 },
    { title: "Mặt hàng", key: "product", render: (_, line) => line.orderLine.product.name },
    {
      title: "Kế hoạch",
      dataIndex: "plannedActualQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Thực xuất",
      dataIndex: "actualQty",
      width: 110,
      align: "right",
      render: (value) => (value == null ? "—" : <strong>{formatQty(value)}</strong>),
    },
    {
      title: "V15",
      dataIndex: "v15Qty",
      width: 100,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Nhiệt độ",
      dataIndex: "temperatureC",
      width: 90,
      align: "right",
      render: (value) => (value == null ? "—" : value),
    },
    {
      title: "VCF",
      dataIndex: "vcf",
      width: 100,
      align: "right",
      render: (value) => (value == null ? "—" : value),
    },
  ];

  return (
    <div className="sales-page sales-deliveries-page">
      <div className="sales-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Lệnh xuất kho
        </Typography.Title>
      </div>

      {/* Nút tác vụ nằm cùng hàng với tab, dồn phải — đỡ một dòng chiều cao và mắt
          không phải nhảy lên xuống giữa tab và nút. */}
      <Tabs
        className="sales-status-tabs"
        activeKey={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
          setSelectedIds([]);
        }}
        tabBarExtraContent={{
          right: (
            <Space>
              {/* Luôn hiện khi tab còn lệnh chờ xuất, chỉ mờ đi lúc chưa tích dòng nào —
                  để người dùng biết có thể tích chọn hàng loạt, và nút không nhảy chỗ. */}
              {canConfirm && !isReturnsTab && readyIds.length > 0 && (
                <Button
                  type="primary"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  disabled={selectedReadyIds.length === 0}
                  loading={quickConfirmMutation.isPending}
                  onClick={() =>
                    void quickConfirmMutation
                      .mutateAsync(selectedReadyIds)
                      .then(() => setSelectedIds([]))
                      .catch(() => undefined)
                  }
                >
                  {selectedReadyIds.length
                    ? `Xác nhận nhanh (${selectedReadyIds.length})`
                    : "Xác nhận nhanh"}
                </Button>
              )}
              {can(PERMS.SALES_UPDATE) && (
                <Button
                  size="small"
                  onClick={() => {
                    setRecoveryKeyword("");
                    setRecoveryOrderId(undefined);
                    setRecoveryOpen(true);
                  }}
                >
                  Bổ sung từ đơn bán
                </Button>
              )}
              <FilterButton
                count={Number(status !== "ALL") + Number(Boolean(warehouseId)) + Number(Boolean(dateFrom || dateTo))}
                open={filterOpen}
                onOpenChange={setFilterOpen}
                content={filterPanel}
              />
              <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
            </Space>
          ),
        }}
        items={STATUS_FILTERS.map((item) => {
          const total =
            item.value === "READY" ? readyCountQuery.data?.total :
            item.value === "POSTED" ? postedCountQuery.data?.total :
            item.value === "RETURNED" ? returnedCountQuery.data?.total :
            item.value === "VOIDED" ? voidedCountQuery.data?.total :
            item.value === RETURNS_TAB ? pendingReturnsQuery.data?.total :
            allCountQuery.data?.total;
          if (item.value === RETURNS_TAB && total) {
            return {
              key: item.value,
              label: <span className="sales-tab-attention">{`${item.label} (${total} chờ nhận)`}</span>,
            };
          }
          return { key: item.value, label: `${item.label} (${total ?? 0})` };
        })}
      />

      <FilterTags items={filterTags} />

      {isReturnsTab && <SalesReturnsPanel warehouseId={warehouseId} />}

      <Modal
        title="Bổ sung lệnh xuất từ đơn bán"
        open={recoveryOpen}
        okText="Tạo lệnh xuất"
        cancelText="Đóng"
        confirmLoading={recoverOrderMutation.isPending}
        okButtonProps={{ disabled: !recoveryOrderId }}
        onCancel={() => setRecoveryOpen(false)}
        onOk={() => {
          if (!recoveryOrderId) return;
          void recoverOrderMutation
            .mutateAsync(recoveryOrderId)
            .then(() => {
              setRecoveryOpen(false);
              setRecoveryOrderId(undefined);
              void query.refetch();
              void readyCountQuery.refetch();
            })
            .catch(() => undefined);
        }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          Chỉ dùng để khôi phục đơn đối ứng đã có hàng nhập kho nhưng chưa sinh lệnh xuất.
          Hệ thống tự kiểm tra đơn mua liên kết, giữ đúng lô đã nhập và không tạo trùng lệnh xuất.
        </Typography.Paragraph>
        <Select
          showSearch
          filterOption={false}
          allowClear
          loading={recoveryOrdersQuery.isFetching}
          value={recoveryOrderId}
          placeholder="Tìm số đơn hoặc khách hàng"
          style={{ width: "100%" }}
          onSearch={setRecoveryKeyword}
          onChange={setRecoveryOrderId}
          options={recoveryOrders.map((order) => ({
            value: order.id,
            label: `${order.orderNo} — ${order.customer.code ?? order.customer.name}`,
          }))}
          notFoundContent={recoveryOrdersQuery.isFetching ? "Đang tìm…" : "Không có đơn chờ hàng"}
        />
      </Modal>

      <Table<SalesDelivery>
        style={isReturnsTab ? { display: "none" } : undefined}
        className="sales-grid sales-deliveries-grid"
        rowKey="id"
        size="small"
        bordered
        tableLayout="fixed"
        loading={query.isLoading}
        columns={columns}
        dataSource={rows}
        rowSelection={
          canConfirm
            ? {
                columnWidth: 36,
                selectedRowKeys: selectedReadyIds,
                onChange: (keys) => setSelectedIds(keys as string[]),
                // Chỉ dòng chờ kho xuất mới xác nhận được; khóa các dòng còn lại để
                // ô "chọn tất cả" không quét nhầm sang lệnh đã xuất/đã hủy.
                getCheckboxProps: (record) => ({ disabled: record.status !== "READY" }),
              }
            : undefined
        }
        scroll={{ x: 1084 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => {
            setPage(next);
            setSelectedIds([]);
          },
        }}
      />

      <Drawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(undefined)}
        width={760}
        title={detail ? `Lệnh xuất ${detail.deliveryNo}` : "Lệnh xuất"}
      >
        {detailQuery.isLoading || !detail ? (
          <Skeleton active />
        ) : (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Trạng thái">
                <DeliveryStatusTag status={detail.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Kho">{detail.warehouse.name}</Descriptions.Item>
              <Descriptions.Item label="Đơn bán">{detail.salesOrder.orderNo}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {detail.salesOrder.customer.name}
              </Descriptions.Item>
              <Descriptions.Item label="Xe">{detail.vehiclePlate ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Lái xe">{detail.driverName ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Số phiếu kho">
                {detail.issueDocNo ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Thời điểm xuất">
                {detail.deliveredAt ? dayjs(detail.deliveredAt).format("DD/MM/YYYY HH:mm") : "—"}
              </Descriptions.Item>
              {detail.returnedReason && (
                <Descriptions.Item label="Lý do trả lại" span={2}>
                  <Typography.Text type="danger">{detail.returnedReason}</Typography.Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Table<SalesDeliveryLine>
              rowKey="id"
              size="small"
              pagination={false}
              columns={detailLineColumns}
              dataSource={detail.lines}
              scroll={{ x: 700 }}
            />
          </>
        )}
      </Drawer>

      <DeliveryConfirmModal
        open={Boolean(confirmTarget)}
        delivery={confirmTarget}
        onClose={() => setConfirmTarget(undefined)}
      />

      <Modal
        open={Boolean(returnTarget)}
        title={`Trả lại kinh doanh — ${returnTarget?.deliveryNo ?? ""}`}
        okText="Trả lại"
        cancelText="Đóng"
        okButtonProps={{ disabled: !returnReason.trim() }}
        confirmLoading={returnMutation.isPending}
        onCancel={() => setReturnTarget(undefined)}
        onOk={async () => {
          if (!returnTarget) return;
          await returnMutation.mutateAsync({
            deliveryId: returnTarget.id,
            reason: returnReason.trim(),
          });
          setReturnTarget(undefined);
          setReturnReason("");
        }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Kho không sửa dữ liệu bán hàng. Sai BKS, lái xe, kho, mặt hàng hay số lượng thì ghi rõ để
          kinh doanh sửa rồi gửi lại.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="Lý do trả lại (bắt buộc)"
        />
      </Modal>

      <Modal
        open={Boolean(voidTarget)}
        title={`Hủy phiếu xuất đã ghi sổ — ${voidTarget?.deliveryNo ?? ""}`}
        okText="Hủy phiếu"
        cancelText="Đóng"
        okButtonProps={{ danger: true, disabled: !voidReason.trim() }}
        confirmLoading={voidMutation.isPending}
        onCancel={() => setVoidTarget(undefined)}
        onOk={async () => {
          if (!voidTarget) return;
          await voidMutation.mutateAsync({
            deliveryId: voidTarget.id,
            reason: voidReason.trim(),
            createRevision,
          });
          setVoidTarget(undefined);
          setVoidReason("");
        }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Hệ thống ghi bút toán đảo, trả lại tồn và giá vốn. Nếu hóa đơn đã phát hành thì phải xử lý
          hóa đơn trước.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="Lý do hủy (bắt buộc)"
        />
        <Checkbox
          checked={createRevision}
          style={{ marginTop: 12 }}
          onChange={(e) => setCreateRevision(e.target.checked)}
        >
          Tạo lệnh xuất mới để kho làm lại
        </Checkbox>
      </Modal>
    </div>
  );
}
