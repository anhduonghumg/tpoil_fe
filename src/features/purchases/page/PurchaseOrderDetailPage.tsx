import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate, useParams } from "react-router-dom";
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

const nextReceiptNo = () => `GR-${dayjs().format("YYYYMMDD-HHmmss")}`;

type WorkflowStep = {
  key: string;
  label: string;
  done: boolean;
  current?: boolean;
};

function buildWorkflow(po?: PurchaseOrderDetail | null): WorkflowStep[] {
  if (!po) {
    return [
      { key: "create", label: "Tạo đơn", done: false },
      { key: "approve", label: "Duyệt", done: false },
      { key: "receive", label: "Nhận hàng", done: false },
      { key: "invoice", label: "Hóa đơn NCC", done: false },
      { key: "payment", label: "Thanh toán", done: false },
    ];
  }

  if (po.status === "DRAFT") {
    return [
      { key: "create", label: "Tạo đơn", done: true },
      { key: "approve", label: "Duyệt", done: false, current: true },
      { key: "receive", label: "Nhận hàng", done: false },
      { key: "invoice", label: "Hóa đơn NCC", done: false },
      { key: "payment", label: "Thanh toán", done: false },
    ];
  }

  if (po.status === "APPROVED") {
    return [
      { key: "create", label: "Tạo đơn", done: true },
      { key: "approve", label: "Duyệt", done: true },
      { key: "receive", label: "Nhận hàng", done: false, current: true },
      { key: "invoice", label: "Hóa đơn NCC", done: false },
      { key: "payment", label: "Thanh toán", done: false },
    ];
  }

  if (po.status === "IN_PROGRESS") {
    return [
      { key: "create", label: "Tạo đơn", done: true },
      { key: "approve", label: "Duyệt", done: true },
      { key: "receive", label: "Nhận hàng", done: true },
      { key: "invoice", label: "Hóa đơn NCC", done: false, current: true },
      { key: "payment", label: "Thanh toán", done: false },
    ];
  }

  if (po.status === "COMPLETED") {
    return [
      { key: "create", label: "Tạo đơn", done: true },
      { key: "approve", label: "Duyệt", done: true },
      { key: "receive", label: "Nhận hàng", done: true },
      { key: "invoice", label: "Hóa đơn NCC", done: true },
      { key: "payment", label: "Thanh toán", done: true },
    ];
  }

  return [
    { key: "create", label: "Tạo đơn", done: true },
    { key: "approve", label: "Duyệt", done: false },
    { key: "receive", label: "Nhận hàng", done: false },
    { key: "invoice", label: "Hóa đơn NCC", done: false },
    { key: "payment", label: "Thanh toán", done: false },
  ];
}

function WorkflowBar({ po }: { po?: PurchaseOrderDetail | null }) {
  const steps = buildWorkflow(po);

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap size={8}>
        {steps.map((step, index) => {
          let color: "default" | "processing" | "success" = "default";
          if (step.done) color = "success";
          else if (step.current) color = "processing";

          return (
            <React.Fragment key={step.key}>
              <Tag color={color}>{step.label}</Tag>
              {index < steps.length - 1 ? (
                <Typography.Text type="secondary">→</Typography.Text>
              ) : null}
            </React.Fragment>
          );
        })}
      </Space>
    </Card>
  );
}

export default function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const poId = params.id;

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
      title: "SL đặt",
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
      title: "Đã nhận",
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
      notify.error("Không nhận được hàng");
    }
  };

  const renderPrimaryAction = () => {
    if (!po) return null;

    if (po.status === "DRAFT") {
      return (
        <Button
          type="primary"
          block
          loading={approveMut.isPending}
          onClick={onApprove}
        >
          Duyệt đơn
        </Button>
      );
    }

    if (po.status === "APPROVED") {
      return (
        <Button
          type="primary"
          block
          loading={createGRMut.isPending}
          onClick={openReceive}
        >
          Nhận hàng
        </Button>
      );
    }

    if (po.status === "IN_PROGRESS") {
      return (
        <Button
          block
          onClick={() => notify.info("Bước tiếp theo: nhập hóa đơn NCC")}
        >
          Nhập hóa đơn NCC
        </Button>
      );
    }

    return (
      <Button block onClick={() => navigate("/purchase-orders")}>
        Quay lại danh sách
      </Button>
    );
  };

  const renderActionHint = () => {
    if (!po) return "-";

    if (po.status === "DRAFT") {
      return "Đơn đang ở trạng thái nháp. Cần duyệt để chuyển sang bước nhận hàng.";
    }

    if (po.status === "APPROVED") {
      return "Đơn đã duyệt. Bước tiếp theo là ghi nhận số lượng thực nhận.";
    }

    if (po.status === "IN_PROGRESS") {
      return "Đơn đã nhận hàng. Bước tiếp theo là nhập hóa đơn nhà cung cấp.";
    }

    if (po.status === "COMPLETED") {
      return "Đơn đã hoàn tất toàn bộ quy trình.";
    }

    if (po.status === "CANCELLED") {
      return "Đơn đã bị huỷ và không thể xử lý tiếp.";
    }

    return "-";
  };

  if (detail.isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="secondary">
          Đang tải chi tiết đơn...
        </Typography.Text>
      </div>
    );
  }

  if (!po) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="Không tìm thấy đơn mua hàng" />
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => navigate("/purchases/orders")}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <Space size={8} wrap>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {po.orderNo}
            </Typography.Title>
            {statusTag(po.status)}
          </Space>
          <Typography.Text type="secondary">
            Theo dõi và xử lý đơn mua hàng theo từng bước nghiệp vụ.
          </Typography.Text>
        </div>

        <Button onClick={() => navigate("/purchase-orders")}>Quay lại</Button>
      </div>

      <WorkflowBar po={po} />

      <Row gutter={16} align="top">
        <Col xs={24} xl={16}>
          <Card
            size="small"
            title="Thông tin đơn hàng"
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size="small" column={2}>
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
          </Card>

          <Card size="small" title="Hàng hoá" style={{ marginBottom: 16 }}>
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

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography.Text strong>Tạm tính</Typography.Text>
                  <Typography.Text strong>
                    {money(totals.net)} đ
                  </Typography.Text>
                </div>
              </div>
            </div>
          </Card>

          {po.paymentMode === "POSTPAID" && po.paymentPlans?.length ? (
            <Card size="small" title="Kế hoạch thanh toán">
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
            </Card>
          ) : null}
        </Col>

        <Col xs={24} xl={8}>
          <Card size="small" title="Bước tiếp theo cần làm">
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {renderActionHint()}
            </Typography.Paragraph>

            {renderPrimaryAction()}

            <Divider style={{ margin: "16px 0" }} />

            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                block
                disabled={!canReceive}
                loading={createGRMut.isPending}
                onClick={openReceive}
              >
                Nhận hàng
              </Button>

              <Button
                block
                disabled={!canApprove}
                loading={approveMut.isPending}
                onClick={onApprove}
              >
                Duyệt
              </Button>

              <Button
                danger
                block
                disabled={!canCancel}
                loading={cancelMut.isPending}
                onClick={onCancelPO}
              >
                Huỷ đơn
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        open={grOpen}
        title="Nhận hàng"
        onCancel={() => setGrOpen(false)}
        onOk={submitReceive}
        okText="Xác nhận nhận hàng"
        okButtonProps={{ loading: createGRMut.isPending }}
        destroyOnClose
      >
        <Form layout="vertical" form={grForm}>
          <Form.Item name="purchaseOrderLineId" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn dòng hàng"
              options={(po?.lines ?? []).map((l: any) => ({
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
            label="Số lượng thực nhận"
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
    </div>
  );
}
