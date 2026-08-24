import React, { useState } from "react";
import { Alert, Card, Empty, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePurchaseOrderList } from "../../purchases/hooks";
import { usePurchaseSourceProfit } from "../hooks";
import type { PurchaseSourceReport, PurchaseSourceSaleRow } from "../types";
import { CostStatusTag } from "../ui/ProfitabilityPanel";
import { formatMoney, formatQty, OrderKindTag } from "../ui/labels";

/**
 * Một lô hàng mua vào (LOT hoặc TERM) đã đi đâu: bán cho ai, còn lại bao nhiêu,
 * lãi bao nhiêu. Đọc ngược theo đúng chuỗi lô đã trừ tồn nên số liệu không thể
 * lệch với kho hay giá vốn.
 */
export default function PurchaseSourceProfitPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | undefined>(
    searchParams.get("purchaseOrderId") ?? undefined,
  );
  const [keyword, setKeyword] = useState("");

  const ordersQuery = usePurchaseOrderList({ keyword: keyword.trim() || undefined, limit: 30 });
  const orderRows = ordersQuery.data?.items ?? [];
  const reportQuery = usePurchaseSourceProfit(purchaseOrderId);
  const report = reportQuery.data;

  const pickOrder = (value?: string) => {
    setPurchaseOrderId(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set("purchaseOrderId", value);
    else params.delete("purchaseOrderId");
    setSearchParams(params, { replace: true });
  };

  const lotColumns: ColumnsType<PurchaseSourceReport["lots"][number]> = [
    { title: "Lô", dataIndex: "lotNo", width: 160 },
    { title: "Mặt hàng", key: "product", render: (_, row) => row.product.name },
    { title: "Phiếu nhập", dataIndex: "receiptNo", width: 150 },
    {
      title: "Ngày nhập",
      dataIndex: "receiptDate",
      width: 110,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Nhập",
      dataIndex: "receivedQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      width: 110,
      align: "right",
      render: (value) => <strong>{formatQty(value)}</strong>,
    },
    {
      title: "Giá vốn",
      dataIndex: "isProvisional",
      width: 120,
      render: (value: boolean) =>
        value ? <Tag color="orange">Tạm tính</Tag> : <Tag color="green">Chính thức</Tag>,
    },
  ];

  const saleColumns: ColumnsType<PurchaseSourceSaleRow> = [
    {
      title: "Bán cho",
      key: "customer",
      render: (_, row) => (
        <div>
          <div>{row.customer?.name ?? "—"}</div>
          <Space size={4}>
            {row.orderNo && (
              <Typography.Link
                style={{ fontSize: 12 }}
                onClick={() => row.salesOrderId && navigate(`/sales/orders/${row.salesOrderId}`)}
              >
                {row.orderNo}
              </Typography.Link>
            )}
            {row.orderKind && <OrderKindTag kind={row.orderKind} />}
            {row.withdrawalRequestNo && <Tag color="purple">{row.withdrawalRequestNo}</Tag>}
          </Space>
        </div>
      ),
    },
    {
      title: "Ngày xuất",
      dataIndex: "deliveredAt",
      width: 110,
      render: (value: string | null) => (value ? dayjs(value).format("DD/MM/YYYY") : "—"),
    },
    {
      title: "Hóa đơn",
      dataIndex: "invoiceNo",
      width: 140,
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "SL",
      dataIndex: "qty",
      width: 100,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      width: 130,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      title: "Giá vốn",
      dataIndex: "cost",
      width: 130,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      title: "Lãi",
      dataIndex: "profit",
      width: 130,
      align: "right",
      render: (value) => (
        <Typography.Text strong type={Number(value) < 0 ? "danger" : "success"}>
          {formatMoney(value)}
        </Typography.Text>
      ),
    },
    {
      title: "Biên",
      dataIndex: "marginPercent",
      width: 90,
      align: "right",
      render: (value: string | null) => (value == null ? "—" : `${value}%`),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={4} style={{ margin: "0 0 12px" }}>
        Lãi/lỗ theo nguồn hàng mua
      </Typography.Title>

      <Select
        showSearch
        allowClear
        filterOption={false}
        style={{ width: 420, marginBottom: 12 }}
        placeholder="Chọn đơn mua (lô hoặc TERM)"
        value={purchaseOrderId}
        loading={ordersQuery.isFetching}
        onSearch={setKeyword}
        onChange={pickOrder}
        options={orderRows.map((order) => ({
          value: order.id,
          label: `${order.orderNo} · ${order.supplier?.name ?? ""} · ${dayjs(order.orderDate).format(
            "DD/MM/YYYY",
          )}`,
        }))}
      />

      {!purchaseOrderId ? (
        <Empty description="Chọn một đơn mua để xem hàng đó đã bán đi đâu và lãi bao nhiêu" />
      ) : reportQuery.isError ? (
        <Alert type="error" showIcon message="Không đọc được báo cáo cho đơn mua này" />
      ) : !report ? (
        <Card size="small" loading />
      ) : (
        <>
          <Card size="small" style={{ marginBottom: 12 }}>
            <Space
              size={32}
              wrap
              style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}
            >
              <Space direction="vertical" size={0}>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {report.purchaseOrder.orderNo}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {report.purchaseOrder.supplier.name} ·{" "}
                  {dayjs(report.purchaseOrder.orderDate).format("DD/MM/YYYY")}
                </Typography.Text>
                <Space size={4} style={{ marginTop: 4 }}>
                  <Tag color={report.purchaseOrder.bizType === "TERM" ? "geekblue" : "blue"}>
                    {report.purchaseOrder.bizType === "TERM" ? "Mua TERM" : "Mua thương mại"}
                  </Tag>
                  <CostStatusTag status={report.costStatus} />
                </Space>
              </Space>
              <Space size={28} wrap>
                <Statistic title="Nhập về" value={formatQty(report.quantities.receivedQty)} />
                <Statistic title="Đã bán" value={formatQty(report.quantities.soldQty)} />
                <Statistic title="Còn lại" value={formatQty(report.quantities.remainingQty)} />
                <Statistic title="Doanh thu" value={formatMoney(report.totals.revenue)} />
                <Statistic title="Giá vốn" value={formatMoney(report.totals.cost)} />
                <Statistic
                  title="Lãi"
                  value={formatMoney(report.totals.profit)}
                  valueStyle={{
                    color: Number(report.totals.profit) < 0 ? "#cf1322" : "#3f8600",
                  }}
                />
                <Statistic
                  title="Biên"
                  value={
                    report.totals.marginPercent == null ? "—" : `${report.totals.marginPercent}%`
                  }
                />
              </Space>
            </Space>
          </Card>

          {report.costStatus === "PROVISIONAL" && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Đơn mua TERM chưa chốt giá chính thức — lãi ở đây là ước tính, hệ thống sẽ tính lại khi có bảng chính thức."
            />
          )}

          <Card size="small" title="Lô hàng đã nhập" style={{ marginBottom: 12 }}>
            <Table
              rowKey="inventoryLotId"
              size="small"
              pagination={false}
              columns={lotColumns}
              dataSource={report.lots}
              scroll={{ x: 950 }}
            />
          </Card>

          <Card size="small" title="Hàng này đã bán đi đâu">
            <Table<PurchaseSourceSaleRow>
              rowKey={(row, index) => `${row.inventoryLotId}-${row.deliveryNo}-${index}`}
              size="small"
              columns={saleColumns}
              dataSource={report.sales}
              scroll={{ x: 1150 }}
              locale={{ emptyText: "Chưa bán ra lô nào từ đơn mua này" }}
              pagination={{ pageSize: 20, showSizeChanger: false }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
