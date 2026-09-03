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
  useConfirmInventoryReceipt,
  useInventoryReceipts,
  useVoidInventoryReceipt,
} from "../hooks";
import "../../../shared/components/queue-card.css";

export const RECEIPT_REQUESTS_QUERY = { page: 1, limit: 50, status: "DRAFT" };

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

export function ReceiptRequestsQueuePanel() {
  const navigate = useNavigate();
  const queueQuery = useInventoryReceipts(RECEIPT_REQUESTS_QUERY);
  const confirmMutation = useConfirmInventoryReceipt();
  const voidMutation = useVoidInventoryReceipt();

  const items = queueQuery.data?.items ?? [];

  if (!items.length) {
    return queueQuery.isFetching ? (
      <div className="queue-card-loading">Đang tải…</div>
    ) : (
      <div className="queue-card-empty">
        <CheckCircleOutlined />
        Không có đề nghị nhập hàng nào đang chờ.
      </div>
    );
  }

  return (
    <div className="queue-card-grid">
      {items.map((item) => (
        <article className="queue-card" key={item.id}>
          <div className="queue-card-top">
            <span className="queue-card-no">{item.receiptNo}</span>
            <span className="queue-card-qty">
              {formatQty(item.totalActualQty)}
              <small>lít</small>
            </span>
          </div>

          <div className="queue-card-meta">
            <span>
              <ShopOutlined />
              {item.supplier?.name ?? "Không rõ nhà cung cấp"}
            </span>
            <span>
              <HomeOutlined />
              {item.warehouse?.name ?? "Chưa có kho nhận"}
            </span>
          </div>

          <div className="queue-card-foot">
            <span className="queue-card-date">
              {dayjs(item.receiptDate).format("DD/MM/YYYY")}
              {item.purchaseOrder ? (
                <>
                  {" · "}
                  <Typography.Link
                    className="queue-card-link"
                    onClick={() => navigate(`/purchase-orders/${item.purchaseOrder!.id}`)}
                  >
                    {item.purchaseOrder.orderNo}
                  </Typography.Link>
                </>
              ) : null}
            </span>

            <span className="queue-card-actions">
              <Popconfirm
                title="Xác nhận nhập kho"
                description="Xác nhận đã nhận hàng thực tế? Tồn kho sẽ được cộng ngay."
                okText="Xác nhận"
                cancelText="Đóng"
                onConfirm={() => confirmMutation.mutate(item.id)}
              >
                <Tooltip title="Xác nhận nhập kho">
                  <Button
                    size="small"
                    type="primary"
                    aria-label={`Xác nhận nhập kho phiếu ${item.receiptNo}`}
                    icon={<CheckOutlined />}
                    loading={confirmMutation.isPending}
                  />
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title="Hủy đề nghị"
                description="Hủy đề nghị nhập hàng này?"
                okText="Hủy phiếu"
                okButtonProps={{ danger: true }}
                cancelText="Đóng"
                onConfirm={() => voidMutation.mutate(item.id)}
              >
                <Tooltip title="Hủy đề nghị">
                  <Button
                    size="small"
                    danger
                    aria-label={`Hủy đề nghị nhập ${item.receiptNo}`}
                    icon={<CloseOutlined />}
                    loading={voidMutation.isPending}
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
