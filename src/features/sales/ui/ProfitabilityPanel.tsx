import React from "react";
import { Alert, Card, Skeleton, Space, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import "../sales.css";
import type { ColumnsType } from "antd/es/table";
import { useSalesOrderProfit } from "../hooks";
import type { CostStatus, SalesOrderSourceRow } from "../types";
import { formatMoney, formatQty } from "./labels";
import { HoldReallocationsPanel } from "./HoldReallocationsPanel";

export function CostStatusTag({ status }: { status: CostStatus }) {
  if (status === "FINAL") return <Tag color="green">Giá vốn chính thức</Tag>;
  if (status === "PROVISIONAL") return <Tag color="orange">Giá vốn tạm tính</Tag>;
  return <Tag>Chưa có cơ sở giá vốn</Tag>;
}

/** TERM hay thương mại nằm ở bizType; orderType chỉ phân biệt lô với lẻ. */
function sourceLabel(row: SalesOrderSourceRow) {
  if (row.isEstimated) return "Phần khách chưa rút";
  if (!row.purchaseOrderNo) return "Không truy được đơn mua";
  const kind = row.purchaseBizType === "TERM" ? "TERM" : "Thương mại";
  return `${row.purchaseOrderNo} · ${kind}`;
}

/**
 * Đơn bán này lãi bao nhiêu, và tiền lãi đến từ những đơn mua nào. Một dòng bán rút
 * từ nhiều lô thì doanh thu được chia theo tỉ lệ lượng lấy ở từng lô.
 */
export function ProfitabilityPanel({ salesOrderId }: { salesOrderId: string }) {
  const query = useSalesOrderProfit(salesOrderId);

  // Phiếu phân bổ lại hàng giữ hiện cả khi đơn chưa xuất lít nào (chưa có dòng lãi/lỗ).
  const reallocations = <HoldReallocationsPanel salesOrderId={salesOrderId} />;

  if (query.isError) return reallocations;
  if (query.isLoading) {
    return (
      <Card size="small" title="Lãi/lỗ theo nguồn hàng" style={{ marginTop: 12 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  const report = query.data;
  if (!report || report.sources.length === 0) return reallocations;

  const columns: ColumnsType<SalesOrderSourceRow> = [
    {
      title: "Nguồn mua",
      key: "source",
      render: (_, row) => (
        <div>
          <Space size={6}>
            <span>{sourceLabel(row)}</span>
            {row.isEstimated && <Tag color="orange">giá vốn ước tính</Tag>}
            {row.holdSource?.type === "BACKFILL" && (
              <Tooltip title={`Lô bù theo ${row.holdSource.reallocationNos.join(", ")}: ${formatQty(row.holdSource.qty)}`}>
                <Tag color="cyan">Hàng bù</Tag>
              </Tooltip>
            )}
            {row.holdSource?.type === "REALLOCATED_IN" && (
              <Tooltip title={`Lấy từ hàng đang giữ của đơn khác theo ${row.holdSource.reallocationNos.join(", ")}: ${formatQty(row.holdSource.qty)}`}>
                <Tag color="geekblue">Lấy từ hàng giữ</Tag>
              </Tooltip>
            )}
          </Space>
          {!row.isEstimated && (
            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {row.supplier?.name ?? ""} · lô {row.lotNo}
            </Typography.Text>
          )}
        </div>
      ),
    },
    { title: "Mặt hàng", key: "product", render: (_, row) => row.product.name },
    {
      title: "Lệnh xuất",
      dataIndex: "deliveryNo",
      width: 140,
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
      title: (
        <Tooltip title="Chỉ có ở hàng bù: (giá vốn lô ban đầu đã bị lấy − giá vốn lô bù) × lượng bù. Âm là bù đắt hơn.">
          Chênh giá vốn
        </Tooltip>
      ),
      key: "costVariance",
      width: 130,
      align: "right",
      render: (_, row) =>
        row.holdSource?.costVariance == null ? (
          "—"
        ) : (
          <Typography.Text type={Number(row.holdSource.costVariance) < 0 ? "danger" : "success"}>
            {Number(row.holdSource.costVariance) > 0 ? "+" : ""}
            {formatMoney(row.holdSource.costVariance)}
          </Typography.Text>
        ),
    },
  ];

  return (
    <Card
      size="small"
      style={{ marginTop: 12 }}
      title={
        <Space>
          Lãi/lỗ theo nguồn hàng
          <CostStatusTag status={report.costStatus} />
        </Space>
      }
    >
      {report.hasEstimatedCost && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Đơn lô đã xuất hóa đơn cả lô: doanh thu tính đủ ngay, nhưng phần khách chưa rút thì giá vốn mới là ước tính theo tồn hiện có. Mỗi lần kho xuất, phần đó được thay bằng giá vốn thật."
        />
      )}

      {report.costStatus === "PROVISIONAL" && !report.hasEstimatedCost && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Giá vốn còn là giá tạm của đơn mua TERM. Chốt bảng chính thức xong hệ thống tính lại, con số lãi ở đây sẽ đổi."
        />
      )}

      <Space size={32} wrap style={{ marginBottom: 12 }}>
        <Statistic title="Doanh thu" value={formatMoney(report.totals.revenue)} />
        <Statistic title="Giá vốn" value={formatMoney(report.totals.cost)} />
        <Statistic
          title="Lãi"
          value={formatMoney(report.totals.profit)}
          valueStyle={{ color: Number(report.totals.profit) < 0 ? "#cf1322" : "#3f8600" }}
        />
        <Statistic
          title="Biên lợi nhuận"
          value={report.totals.marginPercent == null ? "—" : `${report.totals.marginPercent}%`}
        />
      </Space>

      <Table<SalesOrderSourceRow>
        rowKey={(row) => `${row.deliveryNo}-${row.lineNo}-${row.inventoryLotId}`}
        size="small"
        pagination={false}
        columns={columns}
        dataSource={report.sources}
        scroll={{ x: 1180 }}
      />
      {reallocations}
    </Card>
  );
}
