import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
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
import { extractApiError } from "../../../shared/lib/httpError";
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
  purchaseOrderLineId: string;
  orderedQty: number;
  invoicedQty: number;
  remainingQty: number;
  selected: boolean;
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

    const invoicedByLine = new Map<string, number>();
    (po.supplierInvoices ?? []).forEach((invoice: any) => {
      (invoice.lines ?? []).forEach((line: any) => {
        if (!line.purchaseOrderLineId) return;
        const previous = invoicedByLine.get(line.purchaseOrderLineId) ?? 0;
        invoicedByLine.set(
          line.purchaseOrderLineId,
          previous + toNumber(line.actualQty),
        );
      });
    });

    const defaults: InvoiceLineDraft[] = po.lines
      .map((l: any, idx: number) => {
        const orderedQty = toNumber(l.orderedQty);
        const invoicedQty =
          invoicedByLine.get(l.id) ??
          toNumber(l.commercialLotPosition?.invoicedQty);
        const remainingQty = Math.max(orderedQty - invoicedQty, 0);

        return {
          key: l.id ?? String(idx),
          supplierLocationId: l.supplierLocationId,
          productId: l.productId,
          purchaseOrderLineId: l.id,
          orderedQty,
          invoicedQty,
          remainingQty,
          selected: remainingQty > 0,
          qty: remainingQty,
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

  const selectedInvoiceLines = invoiceLines.filter(
    (line) => line.selected && line.qty > 0,
  );

  const selectedQty = selectedInvoiceLines.reduce(
    (sum, line) => sum + line.qty,
    0,
  );

  const updateInvoiceLine = (
    key: string,
    values: Partial<InvoiceLineDraft>,
  ) => {
    setInvoiceLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, ...values } : line,
      ),
    );
  };

  const selectAllRemaining = () => {
    setInvoiceLines((current) =>
      current.map((line) => ({
        ...line,
        selected: line.remainingQty > 0,
        qty: line.remainingQty,
      })),
    );
  };

  const invoiceColumns: ColumnsType<InvoiceLineDraft> = [
    {
      title: "Mặt hàng",
      dataIndex: "productLabel",
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Kho",
      dataIndex: "locationLabel",
    },
    {
      title: "Đặt mua",
      dataIndex: "orderedQty",
      align: "right",
      render: (value: number) => money(value),
    },
    {
      title: "Đã HĐ",
      dataIndex: "invoicedQty",
      align: "right",
      render: (value: number) => money(value),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      align: "right",
      render: (value: number) => (
        <Typography.Text type={value > 0 ? undefined : "secondary"}>
          {money(value)}
        </Typography.Text>
      ),
    },
    {
      title: "SL hóa đơn",
      dataIndex: "qty",
      width: 150,
      render: (value: number, line) => (
        <InputNumber
          min={0}
          max={line.remainingQty}
          precision={3}
          value={value}
          disabled={line.remainingQty <= 0}
          style={{ width: "100%" }}
          onChange={(next) => {
            const qty = Math.min(
              Math.max(Number(next ?? 0), 0),
              line.remainingQty,
            );
            updateInvoiceLine(line.key, {
              qty,
              selected: qty > 0,
            });
          }}
        />
      ),
    },
    {
      title: "Trạng thái",
      width: 110,
      render: (_value, line) =>
        line.remainingQty > 0 ? (
          <Tag color={line.selected ? "blue" : "default"}>
            {line.selected ? "Chọn" : "Bỏ chọn"}
          </Tag>
        ) : (
          <Tag>Đủ HĐ</Tag>
        ),
    },
  ];

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

  const onSave = async () => {
    if (!po?.supplierCustomerId) {
      notify.error("Không lấy được nhà cung cấp từ đơn mua");
      return;
    }

    if (!selectedInvoiceLines.length) {
      notify.error("Chọn ít nhất một dòng và nhập số lượng hóa đơn");
      return;
    }

    const invalidLine = selectedInvoiceLines.find(
      (line) =>
        !line.supplierLocationId ||
        line.qty <= 0 ||
        line.qty > line.remainingQty,
    );
    if (invalidLine) {
      notify.error("Số lượng hóa đơn phải lớn hơn 0 và không vượt số còn lại");
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

        lines: selectedInvoiceLines.map((l) => ({
          supplierLocationId: l.supplierLocationId,
          productId: l.productId,
          purchaseOrderLineId: l.purchaseOrderLineId,
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
      const { code, message } = extractApiError(error);
      const normalized = `${code || ""} ${message}`;

      if (normalized.includes("INVOICE_DUPLICATE")) {
        notify.error("Hóa đơn đã tồn tại");
        return;
      }

      if (normalized.includes("PO_SUPPLIER_MISMATCH")) {
        notify.error("Nhà cung cấp không khớp với đơn mua");
        return;
      }

      if (normalized.includes("INVENTORY_NEGATIVE_PENDING")) {
        notify.error("Không thể tạo hóa đơn vì PendingDocQty không đủ");
        return;
      }

      if (normalized.includes("INVOICE_LINE_GR_NOT_CONFIRMED")) {
        notify.error("Có dòng hàng tham chiếu phiếu nhận chưa xác nhận");
        return;
      }

      notify.error(message || "Tạo hóa đơn thất bại");
    }
  };

  return (
    <div style={{ padding: 12, maxWidth: 1600, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div>
          <Space size={8} wrap>
            <Typography.Title level={5} style={{ margin: 0, fontSize: 18 }}>
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
          size="small"
          icon={<LeftOutlined />}
          onClick={() =>
            poId
              ? navigate(
                  po?.orderType === "LOT"
                    ? `/commercial-purchases/lots/${poId}`
                    : `/purchase-orders/${poId}`,
                )
              : navigate("/commercial-purchases/retail")
          }
        >
          Quay lại đơn mua
        </Button>
      </div>

      <Row gutter={12} align="top">
        <Col xs={24} xl={24}>
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
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                      loading={loadingPdf}
                    >
                      Import PDF
                    </Button>
                  </Upload>

                  {pdfMeta.fileName ? (
                    <Tag color="blue">{pdfMeta.fileName}</Tag>
                  ) : null}

                  {pdfMeta.fileUrl ? (
                    <Button
                      size="small"
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
            <Form layout="vertical" form={form} size="small">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0 12px",
                  alignItems: "start",
                }}
              >
                <Form.Item
                  name="invoiceNo"
                  label="Số hóa đơn"
                  rules={[{ required: true, message: "Nhập số hóa đơn" }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Nhập số hóa đơn" />
                </Form.Item>

                <Form.Item
                  name="invoiceSymbol"
                  label="Ký hiệu"
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Ký hiệu" />
                </Form.Item>

                <Form.Item
                  name="invoiceDate"
                  label="Ngày hóa đơn"
                  rules={[{ required: true, message: "Chọn ngày hóa đơn" }]}
                  style={{ marginBottom: 8 }}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: "100%" }}
                    placeholder="Chọn ngày"
                  />
                </Form.Item>

                <Form.Item
                  name="note"
                  label="Ghi chú"
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Ghi chú (không bắt buộc)" />
                </Form.Item>
              </div>
            </Form>

            <Space
              style={{
                width: "100%",
                marginTop: 8,
                marginBottom: 8,
                justifyContent: "space-between",
              }}
              align="center"
            >
              <Typography.Text strong>
                Dòng hàng hóa đơn ({selectedInvoiceLines.length}/
                {invoiceLines.length})
              </Typography.Text>
              <Space size={8}>
                <Typography.Text type="secondary">
                  Đã chọn: {money(selectedQty)}
                </Typography.Text>
                <Button size="small" onClick={selectAllRemaining}>
                  Chọn toàn bộ còn lại
                </Button>
              </Space>
            </Space>
            <Table<InvoiceLineDraft>
              size="small"
              rowKey="key"
              dataSource={invoiceLines}
              columns={invoiceColumns}
              pagination={false}
              scroll={{ x: 930 }}
              rowClassName={(line) =>
                line.remainingQty <= 0 ? "invoice-line-complete" : ""
              }
              rowSelection={{
                selectedRowKeys: invoiceLines
                  .filter((line) => line.selected)
                  .map((line) => line.key),
                onChange: (keys) => {
                  const selected = new Set(keys.map(String));
                  setInvoiceLines((current) =>
                    current.map((line) => ({
                      ...line,
                      selected: selected.has(line.key),
                    })),
                  );
                },
                getCheckboxProps: (line) => ({
                  disabled: line.remainingQty <= 0,
                }),
              }}
            />

            <Space
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                size="small"
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

        <Col xs={24} xl={10} style={{ display: "none" }}>
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
