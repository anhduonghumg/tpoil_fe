import { useMemo } from "react";
import { Button, Empty, Popconfirm, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  useConfirmInventoryReceipt,
  useInventoryReceipts,
  useVoidInventoryReceipt,
} from "../hooks";
import type { InventoryReceipt } from "../types";

export const RECEIPT_REQUESTS_QUERY = { page: 1, limit: 50, status: "DRAFT" };

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

export function ReceiptRequestsQueuePanel() {
  const navigate = useNavigate();
  const queueQuery = useInventoryReceipts(RECEIPT_REQUESTS_QUERY);
  const confirmMutation = useConfirmInventoryReceipt();
  const voidMutation = useVoidInventoryReceipt();

  const items = queueQuery.data?.items ?? [];

  const columns: ColumnsType<InventoryReceipt> = useMemo(
    () => [
      {
        title: "Phiếu nhập",
        dataIndex: "receiptNo",
      },
      {
        title: "Đơn mua",
        key: "orderNo",
        render: (_, item) =>
          item.purchaseOrder ? (
            <Typography.Link
              onClick={() => navigate(`/purchase-orders/${item.purchaseOrder!.id}`)}
            >
              {item.purchaseOrder.orderNo}
            </Typography.Link>
          ) : (
            "-"
          ),
      },
      {
        title: "Nhà cung cấp",
        key: "supplier",
        render: (_, item) => item.supplier?.name ?? "-",
      },
      {
        title: "Kho nhận",
        key: "warehouse",
        render: (_, item) => item.warehouse?.name ?? "-",
      },
      {
        title: "Ngày nhập",
        dataIndex: "receiptDate",
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Số lượng",
        key: "qty",
        align: "right",
        render: (_, item) => formatQty(item.totalActualQty),
      },
      {
        title: "",
        key: "actions",
        width: 200,
        render: (_, item) => (
          <Space size={4}>
            <Popconfirm
              title="Xác nhận nhập kho"
              description="Xác nhận đã nhận hàng thực tế? Tồn kho sẽ được cộng ngay."
              onConfirm={() => confirmMutation.mutate(item.id)}
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
              title="Hủy đề nghị"
              description="Hủy đề nghị nhập hàng này?"
              onConfirm={() => voidMutation.mutate(item.id)}
            >
              <Button size="small" danger icon={<CloseOutlined />} loading={voidMutation.isPending}>
                Hủy
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [confirmMutation, voidMutation, navigate],
  );

  return (
    <Table<InventoryReceipt>
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
            description="Không có đề nghị nhập hàng nào đang chờ"
          />
        ),
      }}
    />
  );
}
