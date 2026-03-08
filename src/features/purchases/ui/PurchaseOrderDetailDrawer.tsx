// features/purchases/ui/PurchaseOrderDetailDrawer.tsx
import React, { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useCreateGoodsReceipt,
  usePurchaseOrderDetail,
} from "../hooks";
import type { PurchaseOrderDetail } from "../types";
import { notify } from "../../../shared/lib/notification";

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
function toNumber(x: any): number {
  const n = Number(String(x ?? "0").replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function statusTag(s: PurchaseOrderDetail["status"]) {
  switch (s) {
    case "DRAFT":
      return <Tag>Nháp</Tag>;
    case "APPROVED":
      return <Tag color="blue">Đã duyệt</Tag>;
    case "IN_PROGRESS":
      return <Tag color="gold">Đang thực hiện</Tag>;
    case "COMPLETED":
      return <Tag color="green">Hoàn tất</Tag>;
    case "CANCELLED":
      return <Tag color="red">Đã huỷ</Tag>;
    default:
      return <Tag>{s}</Tag>;
  }
}

export type PurchaseOrderDetailDrawerProps = {
  open: boolean;
  poId: string | null;
  onClose: () => void;
};

const nextReceiptNo = () => `GR-${dayjs().format("YYYYMMDD-HHmmss")}`;

export default function PurchaseOrderDetailDrawer({
  open,
  poId,
  onClose,
}: PurchaseOrderDetailDrawerProps) {
  const detail = usePurchaseOrderDetail(poId ?? undefined);
  const approveMut = useApprovePurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();
  const createGRMut = useCreateGoodsReceipt();

  const po = detail.data;

  const [grOpen, setGrOpen] = useState(false);
  const [grForm] = Form.useForm();

  const totals = useMemo(() => {
    if (!po) return { gross: 0, net: 0 };
    let gross = 0;
    let net = 0;

    po.lines.forEach((l: any) => {
      const qty = toNumber(l.orderedQty);
      const price = toNumber(l.unitPrice);
      gross += qty * price;
      net += qty * price;
    });
    return { gross, net };
  }, [po]);

  const cols: ColumnsType<any> = [
    {
      title: "Sản phẩm",
      dataIndex: "productId",
      render: (_: any, r: any) =>
        r?.product?.name ? (
          <span>
            {r.product?.code ? (
              <Typography.Text type="secondary">
                {r.product.code}{" "}
              </Typography.Text>
            ) : null}
            {r.product.name}
          </span>
        ) : (
          r.productId
        ),
    },
    {
      title: "Kho nhận",
      dataIndex: "supplierLocationId",
      render: (_: any, r: any) =>
        r?.supplierLocation?.name
          ? r.supplierLocation.name
          : r.supplierLocationId,
    },
    {
      title: "SL",
      dataIndex: "orderedQty",
      width: 120,
      align: "right",
      render: (v) => money(toNumber(v)),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 160,
      align: "right",
      render: (v) => (v == null ? "-" : `${money(toNumber(v))} đ`),
    },
    {
      title: "Thành tiền",
      width: 180,
      align: "right",
      render: (_: any, r: any) => {
        const qty = toNumber(r.orderedQty);
        const price = toNumber(r.unitPrice);
        return <Typography.Text strong>{money(qty * price)} đ</Typography.Text>;
      },
    },
    {
      title: "Đã rút",
      dataIndex: "withdrawnQty",
      width: 130,
      align: "right",
      render: (v) => money(toNumber(v)),
    },
  ];

  const canApprove = po?.status === "DRAFT";
  const canCancel = po?.status !== "CANCELLED" && po?.status !== "COMPLETED";
  const canReceive = po?.status === "APPROVED" || po?.status === "IN_PROGRESS";

  const onApprove = async () => {
    if (!poId) return;
    try {
      await approveMut.mutateAsync(poId);
      notify.success("Đã duyệt đơn");
    } catch {
      notify.error("Không duyệt được đơn");
    }
  };

  const onCancelPO = async () => {
    if (!poId) return;
    try {
      await cancelMut.mutateAsync(poId);
      notify.success("Đã huỷ đơn");
    } catch {
      notify.error("Không huỷ được đơn");
    }
  };

  const openReceive = () => {
    if (!po) return;

    grForm.setFieldsValue({
      purchaseOrderLineId: po.lines?.[0]?.id,
      receiptNo: nextReceiptNo(),
      receiptDate: dayjs(),
      qty: undefined,
    });
    setGrOpen(true);
  };

  const submitReceive = async () => {
    if (!po) return;
    const v = await grForm.validateFields();

    try {
      await createGRMut.mutateAsync({
        purchaseOrderId: po.id,
        purchaseOrderLineId: v.purchaseOrderLineId,
        receiptNo: String(v.receiptNo || "").trim(),
        receiptDate: v.receiptDate.toISOString(),
        qty: Number(v.qty || 0),
      });
      notify.success("Đã nhận hàng");
      setGrOpen(false);
    } catch {
      console.log("receive error");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={900}
      title={
        <Space>
          <span>Chi tiết đơn</span>
          {po ? statusTag(po.status) : null}
        </Space>
      }
      extra={
        <Space>
          <Button onClick={onClose}>Đóng</Button>

          <Button
            disabled={!canReceive}
            loading={createGRMut.isPending}
            onClick={openReceive}
          >
            Nhận hàng
          </Button>

          <Button
            type="primary"
            disabled={!canApprove}
            loading={approveMut.isPending}
            onClick={onApprove}
          >
            Duyệt
          </Button>

          <Button
            danger
            disabled={!canCancel}
            loading={cancelMut.isPending}
            onClick={onCancelPO}
          >
            Huỷ
          </Button>
        </Space>
      }
      destroyOnClose
    >
      {po && (
        <>
          <Descriptions
            bordered
            size="small"
            column={2}
            style={{ marginBottom: 12 }}
          >
            <Descriptions.Item label="Số đơn">{po.orderNo}</Descriptions.Item>
            <Descriptions.Item label="Nhà cung cấp">
              {po.supplier?.name ?? po.supplierCustomerId}
            </Descriptions.Item>

            <Descriptions.Item label="Loại đơn">
              {po.orderType}
            </Descriptions.Item>
            <Descriptions.Item label="Thanh toán">
              {po.paymentMode}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày chứng từ">
              {po.orderDate}
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú">
              {po.note ?? "-"}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Hàng hoá
          </Typography.Title>

          <Table
            size="middle"
            rowKey="id"
            dataSource={po.lines}
            columns={cols}
            pagination={false}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <div style={{ width: 360 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Typography.Text type="secondary">
                  Tổng tiền hàng
                </Typography.Text>
                <Typography.Text>{money(totals.gross)} đ</Typography.Text>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text strong>Tạm tính</Typography.Text>
                <Typography.Text strong>{money(totals.net)} đ</Typography.Text>
              </div>
            </div>
          </div>

          {po.paymentMode === "POSTPAID" && po.paymentPlans?.length ? (
            <>
              <Typography.Title level={5} style={{ marginTop: 18 }}>
                Kế hoạch thanh toán
              </Typography.Title>
              <Table
                size="middle"
                rowKey={(r) => `${r?.dueDate}-${r?.amount}`}
                dataSource={po.paymentPlans}
                pagination={false}
                columns={[
                  { title: "Ngày đến hạn", dataIndex: "dueDate", width: 160 },
                  {
                    title: "Số tiền",
                    dataIndex: "amount",
                    width: 180,
                    align: "right",
                    render: (v) => `${money(Number(v) || 0)} đ`,
                  },
                  { title: "Ghi chú", dataIndex: "note" },
                ]}
              />
            </>
          ) : null}
        </>
      )}

      <Modal
        open={grOpen}
        title="Nhận hàng (auto xác nhận)"
        onCancel={() => setGrOpen(false)}
        onOk={submitReceive}
        okButtonProps={{ loading: createGRMut.isPending }}
        destroyOnClose
      >
        <Form layout="vertical" form={grForm}>
          <Form.Item name="purchaseOrderLineId" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn dòng hàng"
              options={(po?.lines ?? []).map((l) => ({
                value: l.id,
                label: `${l.product?.code ?? ""} ${
                  l.product?.name ?? l.productId
                } - SL ${l.orderedQty}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="receiptNo"
            label="Số phiếu nhận"
            rules={[{ required: true, message: "Nhập số phiếu nhận" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="receiptDate"
            label="Ngày nhận"
            rules={[{ required: true, message: "Chọn ngày nhận" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="qty"
            label="Số lượng"
            rules={[
              { required: true, message: "Nhập số lượng" },
              {
                type: "number",
                min: 0.0000001,
                message: "Số lượng phải > 0",
              },
            ]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
