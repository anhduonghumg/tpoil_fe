import React, { useEffect, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Select, Space, Tag, Upload } from "antd";
import dayjs from "dayjs";
import { TermPurchaseOrdersApi } from "../api";
import type {
  CreateTermGoodsReceiptPayload,
  TermGoodsReceipt,
  TermPurchaseOrderDetail,
} from "../types";

type FormValues = {
  purchaseOrderLineId: string;
  supplierLocationId?: string;
  productId: string;
  receiptDate: dayjs.Dayjs;
  billQty: number;
  tankQty: number;
  temporaryWithdrawQty: number;
  billToTankLossQty: number;
  billQtyV15?: number;
  tankQtyV15?: number;
  billToTankLossQtyV15?: number;
  billDate?: dayjs.Dayjs;
  tankDate?: dayjs.Dayjs;
  factoryBarrelQty?: number;
  receiptDocumentTemplate?: "TEMPLATE_1" | "TEMPLATE_2";
  note?: string;
};

type Props = {
  open: boolean;
  data: TermPurchaseOrderDetail;
  /** Phiếu đã có: nháp thì mở để sửa, đã xác nhận/hủy thì chỉ xem. */
  receipt?: TermGoodsReceipt | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermGoodsReceiptPayload) => void;
  onUpdate?: (id: string, payload: CreateTermGoodsReceiptPayload) => void;
};

const toNumberOrUndefined = (value?: number | string | null) =>
  value === undefined || value === null || value === "" ? undefined : Number(value);

const toDayjsOrUndefined = (value?: string | null) => (value ? dayjs(value) : undefined);

const qtyGridRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px 140px 110px minmax(0, 1fr) minmax(0, 1fr)",
  gap: 8,
  alignItems: "center",
  padding: "6px 10px",
};

function parseVietnameseNumber(value?: string) {
  if (!value) return NaN;
  const n = Number(value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : NaN;
}

function formatVietnameseNumber(
  value: number | string | null | undefined,
  info?: { userTyping: boolean; input: string },
) {
  if (info?.userTyping) return info.input;
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(n) : "";
}

const numberProps = {
  style: { width: "100%" },
  formatter: formatVietnameseNumber,
  parser: parseVietnameseNumber,
} as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 700, margin: "4px 0 6px", color: "#0f172a" }}>{children}</div>;
}

function RowLabel({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ lineHeight: 1.25 }}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{desc}</div>
    </div>
  );
}

export function TermReceiptModal({
  open,
  data,
  receipt,
  loading,
  onCancel,
  onSubmit,
  onUpdate,
}: Props) {
  const isEdit = !!receipt;
  const isConfirmed = receipt?.status === "CONFIRMED";
  const readOnly = receipt?.status === "VOID";
  // Phiếu đã xác nhận đã ghi kho theo ngày giao nhận, SL lên bồn và rút tạm tính: khóa 3 ô này.
  const lockInventory = isConfirmed;
  const [form] = Form.useForm<FormValues>();
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);

  const selectedTemplate = Form.useWatch("receiptDocumentTemplate", form);

  const setDefaultQuantities = (qty?: number | null) => {
    const value = Number(qty || 0);
    form.setFieldsValue({
      billQty: value,
      tankQty: value,
      temporaryWithdrawQty: value,
      billToTankLossQty: 0,
      billQtyV15: undefined,
      tankQtyV15: undefined,
      billToTankLossQtyV15: undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    setSourceFile(null);

    if (receipt) {
      const qty = toNumberOrUndefined(receipt.qty);
      form.setFieldsValue({
        purchaseOrderLineId: receipt.purchaseOrderLineId ?? undefined,
        productId: receipt.productId ?? undefined,
        supplierLocationId: receipt.supplierLocationId ?? undefined,
        receiptDate: toDayjsOrUndefined(receipt.receiptDate) ?? dayjs(),
        billDate: toDayjsOrUndefined(receipt.billDate),
        tankDate: toDayjsOrUndefined(receipt.tankDate),
        factoryBarrelQty: toNumberOrUndefined(receipt.factoryBarrelQty),
        billQty: toNumberOrUndefined(receipt.billQty) ?? qty,
        tankQty: toNumberOrUndefined(receipt.tankQty) ?? qty,
        temporaryWithdrawQty:
          toNumberOrUndefined(receipt.temporaryWithdrawQty) ?? toNumberOrUndefined(receipt.standardQtyV15) ?? qty,
        billToTankLossQty: toNumberOrUndefined(receipt.billToTankLossQty) ?? 0,
        billQtyV15: toNumberOrUndefined(receipt.billQtyV15),
        tankQtyV15: toNumberOrUndefined(receipt.tankQtyV15),
        billToTankLossQtyV15: toNumberOrUndefined(receipt.billToTankLossQtyV15),
        receiptDocumentTemplate: (receipt.receiptDocumentTemplate as FormValues["receiptDocumentTemplate"]) ?? "TEMPLATE_1",
        note: receipt.note ?? undefined,
      });
      return;
    }

    const first = data.lines?.[0];
    form.resetFields();
    form.setFieldsValue({
      purchaseOrderLineId: first?.id,
      productId: first?.productId,
      supplierLocationId:
        first?.supplierLocationId || data.supplierLocationId || undefined,
      receiptDate: dayjs(),
      receiptDocumentTemplate: "TEMPLATE_1",
    });
    setDefaultQuantities(first?.orderedQty);
  }, [open, receipt, data, form]);

  const onValuesChange = (changed: Partial<FormValues>, values: FormValues) => {
    if ("purchaseOrderLineId" in changed) {
      const line = data.lines.find((x) => x.id === changed.purchaseOrderLineId);
      if (line) {
        form.setFieldsValue({
          productId: line.productId,
          supplierLocationId: line.supplierLocationId || data.supplierLocationId || undefined,
        });
        setDefaultQuantities(line.orderedQty);
      }
      return;
    }
    syncLoss(changed, values);
  };

  const syncLoss = (_: Partial<FormValues>, values: FormValues) => {
    if ("billQty" in _ || "tankQty" in _) {
      const billQty = Number(values.billQty || 0);
      const tankQty = Number(values.tankQty || 0);
      form.setFieldValue("billToTankLossQty", Math.max(billQty - tankQty, 0));
    }
    if ("billQtyV15" in _ || "tankQtyV15" in _) {
      const hasBoth = values.billQtyV15 != null && values.tankQtyV15 != null;
      form.setFieldValue(
        "billToTankLossQtyV15",
        hasBoth ? Math.max(Number(values.billQtyV15) - Number(values.tankQtyV15), 0) : undefined,
      );
    }
  };

  const optionalNumber = (value?: number | null) =>
    value === undefined || value === null ? undefined : Number(value);

  const readDocument = async () => {
    if (!sourceFile) {
      message.warning("Chọn file chứng từ trước.");
      return;
    }
    if (!selectedTemplate) {
      message.warning("Chọn mẫu chứng từ trước.");
      return;
    }

    setReading(true);
    try {
      const result = await TermPurchaseOrdersApi.importReceiptDocument(data.id, sourceFile, selectedTemplate);
      const fields = result?.fields || {};
      form.setFieldsValue({
        billQty: fields.billQty ?? form.getFieldValue("billQty"),
        tankQty: fields.tankQty ?? form.getFieldValue("tankQty"),
        temporaryWithdrawQty: fields.temporaryWithdrawQty ?? form.getFieldValue("temporaryWithdrawQty"),
        billToTankLossQty: fields.billToTankLossQty ?? form.getFieldValue("billToTankLossQty"),
        billQtyV15: fields.billQtyV15 ?? form.getFieldValue("billQtyV15"),
        tankQtyV15: fields.tankQtyV15 ?? form.getFieldValue("tankQtyV15"),
        billToTankLossQtyV15: fields.billToTankLossQtyV15 ?? form.getFieldValue("billToTankLossQtyV15"),
      });
      if (result?.warnings?.length) {
        message.warning(result.warnings.join("; "));
      } else {
        message.success("Đã đọc chứng từ giao nhận.");
      }
    } catch (error: any) {
      message.error(error?.message || "Không đọc được chứng từ.");
    } finally {
      setReading(false);
    }
  };

  const submit = async () => {
    if (readOnly) {
      onCancel();
      return;
    }
    const v = await form.validateFields();

    const payload: CreateTermGoodsReceiptPayload = {
      purchaseOrderLineId: v.purchaseOrderLineId,
      productId: v.productId,
      supplierLocationId: v.supplierLocationId,
      receiptDate: v.receiptDate.format("YYYY-MM-DD"),
      qty: Number(v.tankQty),
      standardQtyV15: Number(v.temporaryWithdrawQty),
      billQty: Number(v.billQty),
      tankQty: Number(v.tankQty),
      temporaryWithdrawQty: Number(v.temporaryWithdrawQty),
      billToTankLossQty: Number(v.billToTankLossQty || 0),
      billQtyV15: optionalNumber(v.billQtyV15),
      tankQtyV15: optionalNumber(v.tankQtyV15),
      billToTankLossQtyV15: optionalNumber(v.billToTankLossQtyV15),
      billDate: v.billDate?.format("YYYY-MM-DD"),
      tankDate: v.tankDate?.format("YYYY-MM-DD"),
      factoryBarrelQty: optionalNumber(v.factoryBarrelQty),
      receiptDocumentTemplate: v.receiptDocumentTemplate,
      sourceFile: sourceFile || undefined,
      note: v.note?.trim() || undefined,
    };

    if (receipt) onUpdate?.(receipt.id, payload);
    else onSubmit(payload);
  };

  const title = !receipt
    ? "Tạo phiếu giao nhận TERM"
    : readOnly
      ? `Phiếu giao nhận ${receipt.receiptNo}`
      : `Sửa phiếu giao nhận ${receipt.receiptNo}`;

  return (
    <Modal
      open={open}
      title={
        <Space size={8}>
          <span>{title}</span>
          {readOnly ? <Tag color="red">Đã hủy</Tag> : isConfirmed ? <Tag color="green">Đã xác nhận</Tag> : null}
        </Space>
      }
      width={840}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={loading}
      okText={readOnly ? "Đóng" : isEdit ? "Lưu thay đổi" : "Lưu phiếu"}
      cancelText="Hủy"
      cancelButtonProps={readOnly ? { style: { display: "none" } } : undefined}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small" onValuesChange={onValuesChange} disabled={readOnly}>
        {lockInventory ? (
          <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: 6, background: "#f0f9ff", color: "#075985", fontSize: 12 }}>
            Phiếu đã xác nhận và ghi kho: ngày giao nhận, SL lên bồn (L) và rút tạm tính bị khóa. Các thông tin khác vẫn sửa được.
          </div>
        ) : null}
        {isEdit ? (
          receipt?.sourceFileUrl ? (
            <div style={{ marginBottom: 10, fontSize: 12, color: "#64748b" }}>
              Chứng từ đính kèm:{" "}
              <a href={receipt.sourceFileUrl} target="_blank" rel="noreferrer">
                {receipt.sourceFileName || "Xem file"}
              </a>
            </div>
          ) : null
        ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10, background: "#f8fafc" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Đọc từ chứng từ</div>
          <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr) 110px", gap: 8, alignItems: "end" }}>
            <Form.Item name="receiptDocumentTemplate" label="Mẫu chứng từ" style={{ marginBottom: 0 }}>
              <Select
                options={[
                  { value: "TEMPLATE_1", label: "Mẫu 1 - Phiếu xuất kho" },
                  { value: "TEMPLATE_2", label: "Mẫu 2 - Biên bản giao nhận" },
                ]}
              />
            </Form.Item>
            <Form.Item label="File ảnh/PDF" style={{ marginBottom: 0 }}>
              <Upload
                accept="image/*,.pdf"
                maxCount={1}
                beforeUpload={(file) => {
                  setSourceFile(file);
                  return false;
                }}
                onRemove={() => {
                  setSourceFile(null);
                }}
              >
                <Button block>{sourceFile ? sourceFile.name : "Chọn file"}</Button>
              </Upload>
            </Form.Item>
            <Button loading={reading} onClick={readDocument}>
              Đọc
            </Button>
          </div>
        </div>
        )}

        <SectionTitle>Thông tin chung</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 1fr) 150px",
            gap: 8,
          }}
        >
          <Form.Item
            name="purchaseOrderLineId"
            label="Dòng hàng"
            rules={[{ required: true, message: "Chọn dòng hàng" }]}
          >
            <Select
              disabled={isEdit}
              options={(data.lines || []).map((x) => ({
                value: x.id,
                label: `${x.productCode ? `${x.productCode} - ` : ""}${
                  x.productName || "Sản phẩm"
                } · ${new Intl.NumberFormat("vi-VN").format(x.orderedQty)} L`,
              }))}
            />
          </Form.Item>

          <Form.Item name="productId" label="Sản phẩm">
            <Select
              disabled
              options={(data.lines || []).map((x) => ({
                value: x.productId,
                label: x.productCode
                  ? `${x.productCode} - ${x.productName}`
                  : x.productName,
              }))}
            />
          </Form.Item>

          <Form.Item name="supplierLocationId" label="Kho nhận">
            <Select
              disabled
              options={(data.lines || [])
                .filter((x) => x.supplierLocationId)
                .map((x) => ({
                  value: x.supplierLocationId!,
                  label: x.supplierLocationName || x.supplierLocationId!,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="receiptDate"
            label="Ngày giao nhận"
            rules={[{ required: true, message: "Chọn ngày giao nhận" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabled={lockInventory} />
          </Form.Item>
        </div>

        <SectionTitle>Số lượng giao nhận</SectionTitle>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
          <div
            style={{
              ...qtyGridRow,
              background: "#f8fafc",
              borderBottom: "1px solid #e5e7eb",
              fontSize: 12,
              fontWeight: 600,
              color: "#475569",
            }}
          >
            <div />
            <div>Ngày</div>
            <div>Số thùng</div>
            <div>Thực tế (L)</div>
            <div>Quy 15°C (L15)</div>
          </div>

          <div style={{ ...qtyGridRow, borderBottom: "1px solid #f1f5f9" }}>
            <RowLabel title="Bill nhà máy" desc="Số lượng trên bill" />
            <Form.Item name="billDate" noStyle>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ngày bill" />
            </Form.Item>
            <Form.Item name="factoryBarrelQty" noStyle>
              <InputNumber {...numberProps} min={0} placeholder="Thùng" />
            </Form.Item>
            <Form.Item name="billQty" style={{ marginBottom: 0 }} rules={[{ required: true, message: "Nhập SL trên bill" }]}>
              <InputNumber {...numberProps} min={0} />
            </Form.Item>
            <Form.Item name="billQtyV15" noStyle>
              <InputNumber {...numberProps} min={0} />
            </Form.Item>
          </div>

          <div style={{ ...qtyGridRow, borderBottom: "1px solid #f1f5f9" }}>
            <RowLabel title="Lên bồn kho" desc="Số lượng thực nhận" />
            <Form.Item name="tankDate" noStyle>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ngày bồn" />
            </Form.Item>
            <div />
            <Form.Item name="tankQty" style={{ marginBottom: 0 }} rules={[{ required: true, message: "Nhập SL lên bồn" }]}>
              <InputNumber {...numberProps} min={0.001} disabled={lockInventory} />
            </Form.Item>
            <Form.Item name="tankQtyV15" noStyle>
              <InputNumber {...numberProps} min={0} />
            </Form.Item>
          </div>

          <div style={{ ...qtyGridRow, background: "#fffbeb" }}>
            <RowLabel title="Hao hụt bill về bồn" desc="Tự tính = bill − bồn" />
            <div />
            <div />
            <Form.Item name="billToTankLossQty" style={{ marginBottom: 0 }} rules={[{ required: true, message: "Nhập hao hụt" }]}>
              <InputNumber {...numberProps} min={0} />
            </Form.Item>
            <Form.Item name="billToTankLossQtyV15" noStyle>
              <InputNumber {...numberProps} min={0} />
            </Form.Item>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: 8 }}>
          <Form.Item
            name="temporaryWithdrawQty"
            label="Số lượng được rút tạm tính"
            tooltip="Số lượng dùng để nhập tồn kho (V15) khi xác nhận phiếu"
            rules={[{ required: true, message: "Nhập số lượng được rút tạm tính" }]}
          >
            <InputNumber {...numberProps} min={0} addonAfter="L" disabled={lockInventory} />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
          </Form.Item>
        </div>
        {sourceFile ? (
          <Space size={6} style={{ fontSize: 12, color: "#64748b" }}>
            <span>File sẽ lưu kèm phiếu:</span>
            <b>{sourceFile.name}</b>
          </Space>
        ) : null}
      </Form>
    </Modal>
  );
}
