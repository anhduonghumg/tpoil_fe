import { useMemo } from "react";
import { Button, Empty, Popconfirm, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  useCancelLotWithdrawalQueueItem,
  useCommercialLotWithdrawalsQueue,
  useConfirmLotWithdrawalQueueItem,
} from "../hooks";
import type { CommercialLotWithdrawalQueueItem } from "../types";
import { formatQty } from "./labels";

export const LOT_WITHDRAWALS_QUEUE_QUERY = { status: "DRAFT" as const, limit: 50 };

function withdrawalQty(item: CommercialLotWithdrawalQueueItem) {
  return item.lines.reduce((sum, line) => sum + Number(line.actualQty ?? 0), 0);
}

export function LotWithdrawalsQueuePanel() {
  const navigate = useNavigate();
  const queueQuery = useCommercialLotWithdrawalsQueue(LOT_WITHDRAWALS_QUEUE_QUERY);
  const confirmMutation = useConfirmLotWithdrawalQueueItem();
  const cancelMutation = useCancelLotWithdrawalQueueItem();

  const items = queueQuery.data?.items ?? [];

  const columns: ColumnsType<CommercialLotWithdrawalQueueItem> = useMemo(
    () => [
      {
        title: "Mã đơn",
        dataIndex: ["purchaseOrder", "orderNo"],
        render: (_, item) => (
          <Typography.Link
            onClick={() => navigate(`/commercial-purchases/lots/${item.purchaseOrder.id}`)}
          >
            {item.purchaseOrder.orderNo}
          </Typography.Link>
        ),
      },
      {
        title: "Nhà cung cấp",
        dataIndex: ["purchaseOrder", "supplier", "name"],
        render: (_, item) => item.purchaseOrder.supplier.name,
      },
      {
        title: "Phiếu rút",
        dataIndex: "withdrawalNo",
      },
      {
        title: "Kho nhận",
        dataIndex: ["destinationWarehouse", "name"],
        render: (_, item) => item.destinationWarehouse.name,
      },
      {
        title: "Ngày rút",
        dataIndex: "withdrawalDate",
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Số lượng",
        key: "qty",
        align: "right",
        render: (_, item) => formatQty(withdrawalQty(item)),
      },
      {
        title: "",
        key: "actions",
        width: 200,
        render: (_, item) => (
          <Space size={4}>
            <Popconfirm
              title="Xác nhận rút lô"
              description="Xác nhận đã xuất hàng thực tế cho phiếu này?"
              onConfirm={() =>
                confirmMutation.mutate({
                  orderId: item.purchaseOrder.id,
                  withdrawalId: item.id,
                })
              }
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={confirmMutation.isPending}
              >
                Xác nhận
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Hủy phiếu rút"
              description="Hủy phiếu rút lô này?"
              onConfirm={() =>
                cancelMutation.mutate({
                  orderId: item.purchaseOrder.id,
                  withdrawalId: item.id,
                })
              }
            >
              <Button size="small" danger icon={<CloseOutlined />} loading={cancelMutation.isPending}>
                Hủy
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [confirmMutation, cancelMutation, navigate],
  );

  return (
    <Table<CommercialLotWithdrawalQueueItem>
      rowKey="id"
      size="small"
      loading={queueQuery.isFetching}
      columns={columns}
      dataSource={items}
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có phiếu rút lô nào đang chờ duyệt"
          />
        ),
      }}
    />
  );
}
