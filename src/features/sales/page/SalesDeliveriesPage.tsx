import React, { useState } from "react";
import {
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, ReloadOutlined, RollbackOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
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
import { DeliveryStatusTag, formatQty, OrderKindTag } from "../ui/labels";

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
  const [page, setPage] = useState(1);
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
    page,
    limit: 20,
  });
  const detailQuery = useSalesDeliveryDetail(detailId);
  const returnMutation = useReturnDeliveryToSales(returnTarget?.id);
  const resendMutation = useResendDelivery();
  const voidMutation = useVoidDelivery(voidTarget?.id);

  const columns: ColumnsType<SalesDelivery> = [
    {
      title: "Số lệnh",
      dataIndex: "deliveryNo",
      width: 150,
      render: (value: string, delivery) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(delivery.id)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Đơn / Khách",
      key: "order",
      render: (_, delivery) => (
        <div>
          <Space size={6}>
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => navigate(`/sales/orders/${delivery.salesOrder.id}`)}
            >
              {delivery.salesOrder.orderNo}
            </Button>
            <OrderKindTag kind={delivery.salesOrder.kind} />
            {delivery.withdrawalRequestId && <Tag color="purple">Rút lô</Tag>}
          </Space>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {delivery.salesOrder.customer.name}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    { title: "Kho", key: "warehouse", width: 170, render: (_, d) => d.warehouse.name },
    {
      title: "Hàng",
      key: "lines",
      width: 240,
      render: (_, delivery) => (
        <div>
          {delivery.lines.map((line) => (
            <div key={line.id} style={{ fontSize: 12 }}>
              {line.orderLine.product.name}:{" "}
              <strong>
                {formatQty(line.actualQty ?? line.plannedActualQty)} {line.orderLine.product.uom}
              </strong>
              {line.actualQty == null && (
                <Typography.Text type="secondary"> (kế hoạch)</Typography.Text>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Xe / Lái xe",
      key: "vehicle",
      width: 140,
      render: (_, delivery) => (
        <div>
          <div>{delivery.vehiclePlate ?? "—"}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {delivery.driverName ?? ""}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 160,
      render: (value: SalesDeliveryStatus) => <DeliveryStatusTag status={value} />,
    },
    {
      title: "",
      key: "actions",
      width: 230,
      fixed: "right",
      render: (_, delivery) => (
        <Space>
          {delivery.status === "READY" && can(PERMS.SALES_DELIVERY_CONFIRM) && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => setConfirmTarget(delivery)}
            >
              Xác nhận xuất
            </Button>
          )}
          {delivery.status === "READY" && can(PERMS.SALES_DELIVERY_RETURN) && (
            <Button
              size="small"
              icon={<RollbackOutlined />}
              onClick={() => setReturnTarget(delivery)}
            >
              Trả lại
            </Button>
          )}
          {delivery.status === "RETURNED" && can(PERMS.SALES_UPDATE) && (
            <Button
              size="small"
              loading={resendMutation.isPending}
              onClick={() => resendMutation.mutate(delivery.id)}
            >
              Gửi lại kho
            </Button>
          )}
          {delivery.status === "POSTED" && can(PERMS.SALES_DELIVERY_VOID) && (
            <Button
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => setVoidTarget(delivery)}
            >
              Hủy phiếu
            </Button>
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
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Lệnh xuất kho
        </Typography.Title>
        <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>
          Tải lại
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented
          value={status}
          options={STATUS_FILTERS}
          onChange={(value) => {
            setStatus(value as string);
            setPage(1);
          }}
        />
        <Select
          allowClear
          showSearch
          filterOption={false}
          style={{ width: 240 }}
          placeholder="Lọc theo kho"
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
      </Space>

      <Table<SalesDelivery>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: 1300 }}
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
