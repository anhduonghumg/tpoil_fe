import { Button, Popconfirm, Tooltip, Typography } from "antd";
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  HomeOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  useCancelLotWithdrawalQueueItem,
  useCommercialLotWithdrawalsQueue,
  useConfirmLotWithdrawalQueueItem,
} from "../hooks";
import type { CommercialLotWithdrawalQueueItem } from "../types";
import "../../../shared/components/queue-card.css";

export const LOT_WITHDRAWALS_QUEUE_QUERY = { status: "DRAFT" as const, limit: 50 };

const qtyFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function withdrawalQty(item: CommercialLotWithdrawalQueueItem) {
  return item.lines.reduce((sum, line) => sum + Number(line.actualQty ?? 0), 0);
}

/** Một phiếu có thể rút về nhiều kho; gộp tên lại cho gọn một dòng. */
function warehouseLabel(item: CommercialLotWithdrawalQueueItem) {
  const warehouses = Array.from(
    new Map(
      item.lines.map((line) => {
        const warehouse = line.destinationWarehouse ?? item.destinationWarehouse;
        return [warehouse.id, warehouse];
      }),
    ).values(),
  );
  return warehouses.map((warehouse) => warehouse.name).join(", ") || "Chưa có kho nhận";
}

export function LotWithdrawalsQueuePanel() {
  const navigate = useNavigate();
  const queueQuery = useCommercialLotWithdrawalsQueue(LOT_WITHDRAWALS_QUEUE_QUERY);
  const confirmMutation = useConfirmLotWithdrawalQueueItem();
  const cancelMutation = useCancelLotWithdrawalQueueItem();

  const items = queueQuery.data?.items ?? [];

  if (!items.length) {
    return queueQuery.isFetching ? (
      <div className="queue-card-loading">Đang tải…</div>
    ) : (
      <div className="queue-card-empty">
        <CheckCircleOutlined />
        Không có phiếu rút lô nào đang chờ duyệt.
      </div>
    );
  }

  return (
    <div className="queue-card-grid">
      {items.map((item) => (
        <article className="queue-card" key={item.id}>
          <div className="queue-card-top">
            <span className="queue-card-no">{item.withdrawalNo}</span>
            <span className="queue-card-qty">
              {qtyFormat.format(withdrawalQty(item))}
              <small>lít</small>
            </span>
          </div>

          <div className="queue-card-meta">
            <span>
              <ShopOutlined />
              {item.purchaseOrder.supplier.name}
            </span>
            <span>
              <HomeOutlined />
              {warehouseLabel(item)}
            </span>
          </div>

          <div className="queue-card-foot">
            <span className="queue-card-date">
              {dayjs(item.withdrawalDate).format("DD/MM/YYYY")}
              {" · "}
              <Typography.Link
                className="queue-card-link"
                onClick={() =>
                  navigate(`/commercial-purchases/lots/${item.purchaseOrder.id}`)
                }
              >
                {item.purchaseOrder.orderNo}
              </Typography.Link>
            </span>

            <span className="queue-card-actions">
              <Popconfirm
                title="Xác nhận rút lô"
                description="Xác nhận đã xuất hàng thực tế cho phiếu này?"
                okText="Xác nhận"
                cancelText="Đóng"
                onConfirm={() =>
                  confirmMutation.mutate({
                    orderId: item.purchaseOrder.id,
                    withdrawalId: item.id,
                  })
                }
              >
                <Tooltip title="Xác nhận rút lô">
                  <Button
                    size="small"
                    type="primary"
                    aria-label={`Xác nhận phiếu rút ${item.withdrawalNo}`}
                    icon={<CheckOutlined />}
                    loading={confirmMutation.isPending}
                  />
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title="Hủy phiếu rút"
                description="Hủy phiếu rút lô này?"
                okText="Hủy phiếu"
                okButtonProps={{ danger: true }}
                cancelText="Đóng"
                onConfirm={() =>
                  cancelMutation.mutate({
                    orderId: item.purchaseOrder.id,
                    withdrawalId: item.id,
                  })
                }
              >
                <Tooltip title="Hủy phiếu rút">
                  <Button
                    size="small"
                    danger
                    aria-label={`Hủy phiếu rút ${item.withdrawalNo}`}
                    icon={<CloseOutlined />}
                    loading={cancelMutation.isPending}
                  />
                </Tooltip>
              </Popconfirm>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
