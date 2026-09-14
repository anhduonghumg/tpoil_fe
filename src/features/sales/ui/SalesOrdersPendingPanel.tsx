import { useMemo } from "react";
import { Button, Empty, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useSalesOrders } from "../hooks";
import type { SalesOrder } from "../types";

const formatQty = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

/** Customer orders raised by sales, with a shortcut for purchasing to buy against them. */
export function SalesOrdersPendingPanel() {
  const navigate = useNavigate();
  const query = useSalesOrders({
    kind: "DAY_TRADE",
    status: "AWAITING_STOCK,PARTIALLY_RESERVED,RESERVED,WAREHOUSE_PROCESSING,PARTIALLY_DELIVERED,DELIVERED,AWAITING_RECONCILIATION,AWAITING_INVOICE",
    limit: 50,
  });
  const items = query.data?.items ?? [];

  const columns: ColumnsType<SalesOrder> = useMemo(
    () => [
      { title: "Số đơn", dataIndex: "orderNo", width: 190 },
      {
        title: "Khách hàng",
        key: "customer",
        render: (_, row) => row.customer?.name ?? "-",
      },
      {
        title: "Ngày đặt",
        dataIndex: "orderDate",
        width: 105,
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Hàng hóa",
        key: "products",
        render: (_, row) =>
          row.lines?.map((line) => line.product?.code).filter(Boolean).join(", ") || "-",
      },
      {
        title: "Còn phải mua",
        key: "qty",
        width: 110,
        align: "right",
        render: (_, row) =>
          formatQty(
            (row.lines ?? []).reduce(
              (sum, line) => sum + Number(line.purchaseProgress?.remainingQty ?? line.orderedActualQty ?? 0),
              0,
            ),
          ),
      },
      {
        title: "Kho nhận",
        key: "warehouse",
        width: 150,
        render: (_, row) => {
          const names = [
            ...new Set(
              (row.lines ?? [])
                .map((line) => line.receivingWarehouse?.name)
                .filter(Boolean) as string[],
            ),
          ];
          return names.length ? names.join(", ") : "-";
        },
      },
      {
        title: "Đơn mua",
        key: "purchase",
        width: 170,
        render: (_, row) =>
          row.purchaseOrders?.filter((po) => po.status !== "CANCELLED").length ? (
            <Space size={4} wrap>
              {row.purchaseOrders.filter((po) => po.status !== "CANCELLED").map((po) => (
                <Tag
                  key={po.id}
                  color="green"
                  style={{ cursor: "pointer", marginInlineEnd: 0 }}
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
                >
                  {po.orderNo}
                </Tag>
              ))}
            </Space>
          ) : (
            <Tag color="gold">Chờ mua</Tag>
          ),
      },
      {
        title: "",
        key: "action",
        width: 130,
        render: (_, row) =>
          (row.lines ?? []).every(
            (line) => Number(line.purchaseProgress?.remainingQty ?? line.orderedActualQty ?? 0) <= 0,
          ) ? <Tag color="success">Đã đặt đủ</Tag> : (
            <Button
              size="small"
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() =>
                navigate(`/commercial-purchases/retail/create?salesOrderId=${row.id}`)
              }
            >
              {row.purchaseOrders?.some((po) => po.status !== "CANCELLED") ? "Mua tiếp" : "Tạo đơn mua"}
            </Button>
          ),
      },
    ],
    [navigate],
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Typography.Text type="secondary">
          Đơn khách đặt qua kinh doanh. Bấm "Tạo đơn mua" để đặt hàng nhà cung cấp.
        </Typography.Text>
        <Tooltip title="Làm mới">
          <Button
            size="small"
            icon={<ReloadOutlined spin={query.isFetching} />}
            onClick={() => query.refetch()}
          />
        </Tooltip>
      </div>

      <Table<SalesOrder>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: 1100 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có đơn đặt hàng nào từ kinh doanh"
            />
          ),
        }}
      />
    </>
  );
}
