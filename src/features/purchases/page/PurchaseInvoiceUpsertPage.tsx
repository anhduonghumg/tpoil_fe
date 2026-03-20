import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Space,
  Table,
  Typography,
  Upload,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { LeftOutlined, UploadOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { notify } from "../../../shared/lib/notification";
import {
  useCreateSupplierInvoice,
  useImportSupplierInvoicePdf,
  usePurchaseOrderDetail,
  useSupplierInvoiceImportPdfResult,
} from "../hooks";

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function toNumber(x: any): number {
  const n = Number(String(x ?? "0").replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

type InvoiceLineDraft = {
  key: string;
  supplierLocationId: string;
  productId: string;
  qty: number;
  unitPrice?: number;
  goodsReceiptId?: string;
  productLabel: string;
  locationLabel: string;
};

export default function PurchaseInvoiceUpsertPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const poId = search.get("poId");

  const [form] = Form.useForm();

  const poQ = usePurchaseOrderDetail(poId ?? undefined);
  const po = poQ.data;

  const createMut = useCreateSupplierInvoice();
  const importPdfMut = useImportSupplierInvoicePdf();

  const [importRunId, setImportRunId] = useState<string | undefined>(undefined);
  const importResultQ = useSupplierInvoiceImportPdfResult(importRunId);

  const [pdfMeta, setPdfMeta] = useState<{
    fileId?: string;
    fileUrl?: string;
    fileName?: string;
    checksum?: string;
  }>({});

  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineDraft[]>([]);

  const loadingPdf =
    importPdfMut.isPending ||
    importResultQ.data?.status === "QUEUED" ||
    importResultQ.data?.status === "PROCESSING";

  useEffect(() => {
    if (!po?.lines?.length) return;

    const defaults: InvoiceLineDraft[] = po.lines
      .map((l: any, idx: number) => {
        const qty = toNumber(l.withdrawnQty || l.orderedQty);
        if (qty <= 0) return null;

        return {
          key: l.id ?? String(idx),
          supplierLocationId: l.supplierLocationId,
          productId: l.productId,
          qty,
          unitPrice: toNumber(l.unitPrice || 0),
          goodsReceiptId: undefined,
          productLabel: l?.product?.name
            ? `${l.product?.code ? `${l.product.code} - ` : ""}${
                l.product.name
              }`
            : l.productId,
          locationLabel: l?.supplierLocation?.name ?? l.supplierLocationId,
        };
      })
      .filter(Boolean) as InvoiceLineDraft[];

    setInvoiceLines(defaults);
  }, [po]);

  const applyImportResult = (res: any) => {
    form.setFieldsValue({
      invoiceNo: res?.extracted?.invoiceNo ?? undefined,
      invoiceSymbol: res?.extracted?.invoiceSymbol ?? undefined,
      invoiceDate: res?.extracted?.invoiceDate
        ? dayjs(res.extracted.invoiceDate)
        : undefined,
    });

    setPdfMeta({
      fileId: res?.sourceFileId ?? undefined,
      fileUrl: res?.sourceFileUrl ?? undefined,
      fileName: res?.sourceFileName ?? undefined,
      checksum: res?.sourceFileChecksum ?? undefined,
    });

    if (res?.warnings?.length) {
      notify.info(res.warnings[0]);
    } else {
      notify.success("Đã import PDF và điền thông tin hóa đơn");
    }
  };

  useEffect(() => {
    const res = importResultQ.data;
    if (!res) return;

    if (res.status === "SUCCESS") {
      applyImportResult(res);
      setImportRunId(undefined);
      return;
    }

    if (res.status === "FAILED") {
      notify.error(res.error || "Xử lý PDF thất bại");
      setImportRunId(undefined);
    }
  }, [importResultQ.data]);

  const handleUpload = async (file: File) => {
    try {
      if (!po?.supplierCustomerId) {
        notify.error("Không lấy được nhà cung cấp từ đơn mua");
        return false;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("supplierCustomerId", po.supplierCustomerId);
      if (po.id) fd.append("purchaseOrderId", po.id);

      const res = await importPdfMut.mutateAsync(fd);

      if (res.mode === "sync" && res.status === "SUCCESS") {
        applyImportResult(res);
        return false;
      }

      if (res.mode === "async" && res.runId) {
        setImportRunId(res.runId);
        notify.info("File đang được xử lý nền");
        return false;
      }

      notify.error("Import PDF thất bại");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Import PDF thất bại";
      notify.error(String(message));
    }

    return false;
  };

  const columns: ColumnsType<InvoiceLineDraft> = useMemo(
    () => [
      { title: "Sản phẩm", dataIndex: "productLabel" },
      { title: "Kho", dataIndex: "locationLabel" },
      {
        title: "SL hóa đơn",
        dataIndex: "qty",
        width: 140,
        align: "right",
        render: (v) => money(v),
      },
      {
        title: "Đơn giá",
        dataIndex: "unitPrice",
        width: 160,
        align: "right",
        render: (v) => `${money(toNumber(v))} đ`,
      },
      {
        title: "Thành tiền",
        width: 180,
        align: "right",
        render: (_, row) => (
          <Typography.Text strong>
            {money(toNumber(row.qty) * toNumber(row.unitPrice))} đ
          </Typography.Text>
        ),
      },
    ],
    [],
  );

  const onSave = async () => {
    if (!po?.supplierCustomerId) {
      notify.error("Không lấy được nhà cung cấp từ đơn mua");
      return;
    }

    if (!invoiceLines.length) {
      notify.error("Hóa đơn phải có ít nhất 1 dòng hàng");
      return;
    }

    const v = await form.validateFields();

    try {
      const res = await createMut.mutateAsync({
        supplierCustomerId: po.supplierCustomerId,
        purchaseOrderId: po.id,
        invoiceNo: String(v.invoiceNo || "").trim(),
        invoiceSymbol: v.invoiceSymbol
          ? String(v.invoiceSymbol).trim()
          : undefined,
        invoiceDate: dayjs(v.invoiceDate).format("YYYY-MM-DD"),
        note: v.note ? String(v.note).trim() : undefined,

        sourceFileId: pdfMeta.fileId,
        sourceFileUrl: pdfMeta.fileUrl,
        sourceFileName: pdfMeta.fileName,
        sourceFileChecksum: pdfMeta.checksum,

        lines: invoiceLines.map((l) => ({
          supplierLocationId: l.supplierLocationId,
          productId: l.productId,
          qty: Number(l.qty || 0),
          unitPrice: Number(l.unitPrice || 0),
          goodsReceiptId: l.goodsReceiptId,
        })),
      });

      notify.success("Đã tạo hóa đơn");

      if (res?.id) {
        navigate(`/purchase-invoices/${res.id}`);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Tạo hóa đơn thất bại";

      if (String(message).includes("INVOICE_DUPLICATE")) {
        notify.error("Hóa đơn đã tồn tại");
        return;
      }

      if (String(message).includes("PO_SUPPLIER_MISMATCH")) {
        notify.error("Nhà cung cấp không khớp với đơn mua");
        return;
      }

      if (String(message).includes("INVENTORY_NEGATIVE_PENDING")) {
        notify.error("Không thể tạo hóa đơn vì PendingDocQty không đủ");
        return;
      }

      if (String(message).includes("INVOICE_LINE_GR_NOT_CONFIRMED")) {
        notify.error("Có dòng hàng tham chiếu phiếu nhận chưa xác nhận");
        return;
      }

      notify.error("Tạo hóa đơn thất bại");
    }
  };

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
              Hóa đơn NCC
            </Typography.Title>
            {po?.orderNo ? (
              <Typography.Text type="secondary">
                cho đơn {po.orderNo}
              </Typography.Text>
            ) : null}
          </Space>
        </div>

        <Button
          icon={<LeftOutlined />}
          onClick={() =>
            poId
              ? navigate(`/purchase-orders/${poId}`)
              : navigate("/purchase-orders")
          }
        >
          Quay lại đơn mua
        </Button>
      </div>

      <Row gutter={16} align="top">
        <Col xs={24} xl={14}>
          <Card
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Thông tin hóa đơn</span>
                <Space wrap>
                  <Upload
                    beforeUpload={handleUpload}
                    showUploadList={false}
                    disabled={!po?.supplierCustomerId || loadingPdf}
                  >
                    <Button icon={<UploadOutlined />} loading={loadingPdf}>
                      Import PDF
                    </Button>
                  </Upload>

                  {pdfMeta.fileName ? (
                    <Tag color="blue">{pdfMeta.fileName}</Tag>
                  ) : null}

                  {pdfMeta.fileUrl ? (
                    <Button
                      onClick={() => window.open(pdfMeta.fileUrl, "_blank")}
                    >
                      Mở file PDF
                    </Button>
                  ) : null}
                </Space>
              </div>
            }
            size="small"
          >
            <Form layout="vertical" form={form}>
              <Form.Item
                name="invoiceNo"
                label="Số hóa đơn"
                rules={[{ required: true, message: "Nhập số hóa đơn" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item name="invoiceSymbol" label="Ký hiệu">
                <Input />
              </Form.Item>

              <Form.Item
                name="invoiceDate"
                label="Ngày hóa đơn"
                rules={[{ required: true, message: "Chọn ngày hóa đơn" }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Form>

            {/* <Typography.Title level={5}>Dòng hàng hóa đơn</Typography.Title>
            <Table
              size="small"
              rowKey="key"
              dataSource={invoiceLines}
              columns={columns}
              pagination={false}
            /> */}

            <Space style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                onClick={onSave}
                loading={createMut.isPending}
                disabled={!po?.supplierCustomerId}
                icon={<UploadOutlined />}
              >
                Tạo hóa đơn
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Tệp đính kèm" size="small">
            {loadingPdf ? (
              <Typography.Text type="secondary">
                Đang xử lý PDF...
              </Typography.Text>
            ) : pdfMeta.fileName ? (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text>
                  <b>Tên file:</b> {pdfMeta.fileName}
                </Typography.Text>

                {pdfMeta.checksum ? (
                  <Typography.Text
                    type="secondary"
                    style={{ wordBreak: "break-all" }}
                  >
                    <b>Checksum:</b> {pdfMeta.checksum}
                  </Typography.Text>
                ) : null}

                {pdfMeta.fileUrl ? (
                  <Button
                    onClick={() => window.open(pdfMeta.fileUrl, "_blank")}
                  >
                    Mở file ở tab mới
                  </Button>
                ) : null}
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Chưa có file PDF
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
