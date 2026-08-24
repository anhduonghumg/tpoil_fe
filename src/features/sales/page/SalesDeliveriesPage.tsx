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
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, RedoOutlined, RollbackOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
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
  useResendDelivery,
  useReturnDeliveryToSales,
  useSalesDeliveries,
  useSalesDeliveryDetail,
  useVoidDelivery,
} from "../hooks";
import type { SalesDelivery, SalesDeliveryLine, SalesDeliveryStatus } from "../types";
import { DeliveryConfirmModal } from "../ui/DeliveryConfirmModal";
import { DeliveryStatusTag, formatQty } from "../ui/labels";

const STATUS_FILTERS = [
  { value: "READY", label: "Chờ kho xuất" },
  { value: "POSTED", label: "Đã xuất" },
  { value: "RETURNED", label: "Đã trả lại" },
  { value: "VOIDED", label: "Đã hủy" },
  { value: "ALL", label: "Tất cả" },
];

/** Hàng đợi việc của kho: mỗi lệnh xuất là phần việc của một kho cho một đơn. */
export default function SalesDeliveriesPage() {
  const navigate = useNavigate();
  const { can } = useCan();
  const [status, setStatus] = useState("READY");
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
  const [voidReason, setVoidReason] = useState("");
  const [createRevision, setCreateRevision] = useState(true);

  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const query = useSalesDeliveries({
    status: status === "ALL" ? undefined : (status as SalesDeliveryStatus),
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

  const warehouseName = (warehousesQuery.data ?? []).find((row) => row.id === warehouseId)?.label;

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
      width: 130,
      render: (value: string, delivery) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(delivery.id)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Ngày xuất",
      dataIndex: "plannedAt",
      width: 105,
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—"),
    },
    {
      title: "Số đơn hàng",
      key: "order",
      width: 145,
      render: (_, delivery) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/sales/orders/${delivery.salesOrder.id}`)}>
          {delivery.salesOrder.orderNo}
        </Button>
      ),
    },
    { title: "Khách hàng", key: "customer", width: 130, ellipsis: true, render: (_, d) => d.salesOrder.customer.code ?? "—" },
    { title: "Kho xuất", key: "warehouse", width: 120, ellipsis: true, render: (_, d) => d.warehouse.name },
    {
      title: "Hàng",
      key: "lines",
      width: 100,
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
      width: 110,
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
      width: 190,
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
      width: 130,
      render: (value: SalesDeliveryStatus) => <DeliveryStatusTag status={value} />,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 96,
      render: (_, delivery) => (
        <Space size={4}>
          {delivery.status === "READY" && can(PERMS.SALES_DELIVERY_CONFIRM) && (
            <Tooltip title="Xác nhận xuất"><Button type="primary" size="small" shape="circle" icon={<CheckOutlined />} onClick={() => setConfirmTarget(delivery)} /></Tooltip>
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
        <Space>
          <FilterButton
            count={Number(status !== "ALL") + Number(Boolean(warehouseId)) + Number(Boolean(dateFrom || dateTo))}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            content={filterPanel}
          />
          <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
        </Space>
      </div>

      <Tabs
        className="sales-status-tabs"
        activeKey={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        items={STATUS_FILTERS.map((item) => {
          const total =
            item.value === "READY" ? readyCountQuery.data?.total :
            item.value === "POSTED" ? postedCountQuery.data?.total :
            item.value === "RETURNED" ? returnedCountQuery.data?.total :
            item.value === "VOIDED" ? voidedCountQuery.data?.total :
            allCountQuery.data?.total;
          return { key: item.value, label: `${item.label} (${total ?? 0})` };
        })}
      />

      <FilterTags items={filterTags} />

      <Table<SalesDelivery>
        className="sales-grid sales-deliveries-grid"
        rowKey="id"
        size="small"
        tableLayout="fixed"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: 1260 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
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
