import React from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { LeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { notify } from "../../../shared/lib/notification";
import { usePostSupplierInvoice, useSupplierInvoiceDetail } from "../hooks";
import type { SupplierInvoiceDetail } from "../types";

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function toNumber(x: any): number {
  const n = Number(String(x ?? "0").replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function statusTag(s: SupplierInvoiceDetail["status"]) {
  switch (s) {
    case "DRAFT":
      return <Tag>Nháp</Tag>;
    case "POSTED":
      return <Tag color="green">Đã post</Tag>;
    case "VOID":
      return <Tag color="red">Đã void</Tag>;
    default:
      return <Tag>{s}</Tag>;
  }
}

export default function PurchaseInvoiceDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;

  const detailQ = useSupplierInvoiceDetail(id);
  const postMut = usePostSupplierInvoice();

  const inv = detailQ.data;

  const onPost = () => {
    if (!id) return;

    Modal.confirm({
      title: "Xác nhận post hóa đơn",
      content:
        "Sau khi post, hệ thống sẽ chuyển tồn kho từ Pending sang Posted và tạo công nợ phải trả.",
      okText: "Post hóa đơn",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await postMut.mutateAsync({ id, payload: {} });
          await detailQ.refetch();
          notify.success("Đã post hóa đơn");
        } catch (error: any) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Không post được hóa đơn";

          if (String(message).includes("INVOICE_NOT_DRAFT")) {
            notify.error("Chỉ được post hóa đơn ở trạng thái nháp");
            return;
          }

          if (String(message).includes("INVENTORY_NEGATIVE_PENDING")) {
            notify.error("Không thể post vì PendingDocQty không đủ");
            return;
          }

          if (String(message).includes("INVOICE_LINE_GR_NOT_CONFIRMED")) {
            notify.error("Có dòng hàng tham chiếu phiếu nhận chưa xác nhận");
            return;
          }

          notify.error("Không post được hóa đơn");
        }
      },
    });
  };

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
      title: "Kho",
      dataIndex: "supplierLocationId",
      render: (_: any, r: any) =>
        r?.supplierLocation?.name ?? r.supplierLocationId,
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
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
      width: 160,
      align: "right",
      render: (_: any, r: any) => {
        const qty = toNumber(r.qty);
        const price = toNumber(r.unitPrice);
        return <Typography.Text strong>{money(qty * price)} đ</Typography.Text>;
      },
    },
  ];

  if (detailQ.isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="secondary">Đang tải hóa đơn...</Typography.Text>
      </div>
    );
  }

  if (!inv) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="Không tìm thấy hóa đơn" />
        <div style={{ marginTop: 12 }}>
          <Button
            icon={<LeftOutlined />}
            onClick={() => navigate("/purchase-orders")}
          >
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
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
              {inv.invoiceNo}
            </Typography.Title>
            {statusTag(inv.status)}
          </Space>
          <Typography.Text type="secondary">
            Chi tiết hóa đơn nhà cung cấp.
          </Typography.Text>
        </div>

        <Button
          size="small"
          icon={<LeftOutlined />}
          onClick={() =>
            inv.purchaseOrderId
              ? navigate(`/purchase-orders/${inv.purchaseOrderId}`)
              : navigate("/purchase-orders")
          }
        >
          Quay lại
        </Button>
      </div>

      <Row gutter={16} align="top">
        <Col xs={24} xl={14}>
          <Card
            title="Thông tin hóa đơn"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Số hóa đơn">
                {inv.invoiceNo}
              </Descriptions.Item>
              <Descriptions.Item label="Ký hiệu">
                {inv.invoiceSymbol || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Nhà cung cấp">
                {inv.supplier?.name ?? inv.supplierCustomerId}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày hóa đơn">
                {inv.invoiceDate
                  ? dayjs(inv.invoiceDate).format("DD/MM/YYYY")
                  : "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Đơn mua">
                {inv.purchaseOrder?.orderNo ?? inv.purchaseOrderId ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                {inv.totalAmount != null
                  ? `${money(toNumber(inv.totalAmount))} đ`
                  : "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Posted lúc">
                {inv.postedAt
                  ? dayjs(inv.postedAt).format("DD/MM/YYYY HH:mm")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="File PDF">
                {inv.sourceFileName ||
                  (inv.sourceFileUrl ? "Có file đính kèm" : "-")}
              </Descriptions.Item>

              <Descriptions.Item label="Ghi chú" span={2}>
                {inv.note ?? "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Dòng hàng hóa đơn" size="small">
            <Table
              rowKey="id"
              size="middle"
              dataSource={inv.lines}
              columns={cols}
              pagination={false}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Thao tác" size="small" style={{ marginBottom: 16 }}>
            <Typography.Paragraph type="secondary">
              {inv.status === "DRAFT"
                ? "Hóa đơn này đang ở trạng thái nháp. Có thể post để ghi nhận công nợ và chuyển tồn kho Pending sang Posted."
                : inv.status === "POSTED"
                ? "Hóa đơn đã được ghi nhận và đã tạo công nợ phải trả."
                : "Hóa đơn đã bị void."}
            </Typography.Paragraph>

            <Space direction="vertical" style={{ width: "100%" }}>
              {inv.status === "DRAFT" ? (
                <Button
                  type="primary"
                  block
                  loading={postMut.isPending}
                  onClick={onPost}
                >
                  Post hóa đơn
                </Button>
              ) : null}

              {inv.sourceFileUrl ? (
                <Button
                  block
                  onClick={() => window.open(inv.sourceFileUrl!, "_blank")}
                >
                  Mở PDF ở tab mới
                </Button>
              ) : null}

              {inv.payableSettlement?.id ? (
                <Card size="small">
                  <Typography.Text>
                    <b>Công nợ:</b> {inv.payableSettlement.status}
                  </Typography.Text>
                  <br />
                  <Typography.Text>
                    <b>Tổng phải trả:</b>{" "}
                    {inv.payableSettlement.amountTotal != null
                      ? `${money(
                          toNumber(inv.payableSettlement.amountTotal),
                        )} đ`
                      : "-"}
                  </Typography.Text>
                </Card>
              ) : null}
            </Space>
          </Card>

          <Card title="Tệp đính kèm" size="small">
            {inv.sourceFileName || inv.sourceFileUrl ? (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text>
                  <b>Tên file:</b> {inv.sourceFileName || "-"}
                </Typography.Text>

                {inv.sourceFileChecksum ? (
                  <Typography.Text
                    type="secondary"
                    style={{ wordBreak: "break-all" }}
                  >
                    <b>Checksum:</b> {inv.sourceFileChecksum}
                  </Typography.Text>
                ) : null}

                {inv.sourceFileUrl ? (
                  <Button
                    onClick={() => window.open(inv.sourceFileUrl!, "_blank")}
                  >
                    Mở file ở tab mới
                  </Button>
                ) : null}
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Hóa đơn này chưa có file PDF đính kèm.
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
