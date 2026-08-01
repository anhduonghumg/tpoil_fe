import { useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { LinkOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useCreateSalesOrderFromPurchase, useUnlinkSalesOrder } from "../hooks";

const formatQty = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

type LinkedSalesOrder = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: string;
  customer: { id: string; code?: string | null; name: string };
  lines: Array<{
    id: string;
    productId: string;
    orderedActualQty: string;
    product: { id: string; code?: string | null; name: string };
  }>;
};

/**
 * Retail purchases answer a customer order. Purchasing can raise that order here
 * so the flow works before sales gets its own screen.
 */
export function SalesOrderLinkCard({
  purchaseOrderId,
  salesOrder,
  purchaseLines,
}: {
  purchaseOrderId: string;
  salesOrder?: LinkedSalesOrder | null;
  purchaseLines: Array<{ productId: string; orderedQty: string | number; product?: any }>;
}) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ customerPartyId: string; note?: string }>();
  const createMutation = useCreateSalesOrderFromPurchase(purchaseOrderId);
  const unlinkMutation = useUnlinkSalesOrder(purchaseOrderId);

  const submit = async () => {
    const values = await form.validateFields();
    await createMutation.mutateAsync({
      customerPartyId: values.customerPartyId,
      note: values.note?.trim() || undefined,
    });
    setOpen(false);
    form.resetFields();
  };

  if (!salesOrder) {
    return (
      <>
        <Card
          size="small"
          title="Đơn đặt hàng kinh doanh"
          extra={
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
            >
              Tạo đơn đặt hàng
            </Button>
          }
        >
          <Typography.Text type="secondary">
            Đơn mua này chưa gắn với đơn đặt hàng của khách. Tạo đơn đặt hàng để đối chiếu số
            lượng khách đặt với số lượng đã mua.
          </Typography.Text>
        </Card>

        <Modal
          open={open}
          title="Tạo đơn đặt hàng kinh doanh"
          okText="Tạo đơn"
          onCancel={() => setOpen(false)}
          onOk={submit}
          confirmLoading={createMutation.isPending}
          destroyOnClose
        >
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            Sản phẩm và số lượng được lấy theo đơn mua. Giá bán do kinh doanh bổ sung sau.
          </Typography.Paragraph>
          <Form form={form} layout="vertical" size="small">
            <Form.Item
              name="customerPartyId"
              label="Khách hàng"
              rules={[{ required: true, message: "Chọn khách hàng" }]}
            >
              <PartySelect partyRole="CUSTOMER" placeholder="Chọn khách hàng đặt hàng" />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input placeholder="Thông tin cần lưu ý" />
            </Form.Item>
          </Form>
          <Table
            size="small"
            rowKey={(row: any) => row.productId}
            pagination={false}
            dataSource={purchaseLines}
            columns={[
              {
                title: "Mặt hàng",
                render: (_, row: any) => row.product?.name ?? row.productId,
              },
              {
                title: "Số lượng",
                dataIndex: "orderedQty",
                align: "right",
                render: formatQty,
              },
            ]}
          />
        </Modal>
      </>
    );
  }

  const comparison = salesOrder.lines.map((line) => {
    const purchased = purchaseLines
      .filter((item) => item.productId === line.productId)
      .reduce((sum, item) => sum + Number(item.orderedQty ?? 0), 0);
    const ordered = Number(line.orderedActualQty ?? 0);
    return {
      key: line.id,
      product: line.product?.name ?? line.productId,
      ordered,
      purchased,
      variance: purchased - ordered,
    };
  });

  return (
    <Card
      size="small"
      title={
        <Space>
          <LinkOutlined />
          <span>Đơn đặt hàng kinh doanh</span>
          <Tag color="blue">{salesOrder.orderNo}</Tag>
        </Space>
      }
      extra={
        <Popconfirm
          title="Bỏ liên kết"
          description="Bỏ liên kết đơn đặt hàng khỏi đơn mua này?"
          onConfirm={() => unlinkMutation.mutate()}
        >
          <Button size="small" danger loading={unlinkMutation.isPending}>
            Bỏ liên kết
          </Button>
        </Popconfirm>
      }
    >
      <Descriptions size="small" column={3} style={{ marginBottom: 12 }}>
        <Descriptions.Item label="Khách hàng">{salesOrder.customer?.name}</Descriptions.Item>
        <Descriptions.Item label="Ngày đặt">
          {dayjs(salesOrder.orderDate).format("DD/MM/YYYY")}
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">{salesOrder.status}</Descriptions.Item>
      </Descriptions>

      <Table
        size="small"
        rowKey="key"
        pagination={false}
        dataSource={comparison}
        columns={[
          { title: "Mặt hàng", dataIndex: "product" },
          { title: "Khách đặt", dataIndex: "ordered", align: "right", render: formatQty },
          { title: "Đã mua", dataIndex: "purchased", align: "right", render: formatQty },
          {
            title: "Chênh lệch",
            dataIndex: "variance",
            align: "right",
            render: (value: number) => (
              <Typography.Text type={value === 0 ? "success" : "warning"}>
                {value > 0 ? "+" : ""}
                {formatQty(value)}
              </Typography.Text>
            ),
          },
        ]}
      />
    </Card>
  );
}
