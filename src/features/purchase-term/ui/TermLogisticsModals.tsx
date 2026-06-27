import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Switch } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import type {
  CreateTermLogisticsCostPayload,
  CreateTermShipmentPayload,
  TermPurchaseOrderDetail,
  TermTransportMode,
} from "../types";

type ShipmentFormValues = {
  transportMode?: TermTransportMode;
  vesselName?: string;
  voyageNo?: string;
  blNo?: string;
  loadingPort?: string;
  dischargePort?: string;
  etd?: dayjs.Dayjs;
  eta?: dayjs.Dayjs;
  surveyorName?: string;
  note?: string;
};

const fieldGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px 12px",
};

const modalBodyStyle: React.CSSProperties = {
  maxHeight: "calc(100vh - 180px)",
  overflowY: "auto",
  paddingRight: 4,
};

export function TermShipmentModal({
  open,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermShipmentPayload) => void;
}) {
  const [form] = Form.useForm<ShipmentFormValues>();

  return (
    <Modal
      open={open}
      title="Thêm chuyến vận chuyển"
      width="min(860px, calc(100vw - 32px))"
      onCancel={onCancel}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: modalBodyStyle }}
      onOk={async () => {
        const v = await form.validateFields();
        onSubmit({
          transportMode: v.transportMode,
          vesselName: v.vesselName?.trim() || undefined,
          voyageNo: v.voyageNo?.trim() || undefined,
          blNo: v.blNo?.trim() || undefined,
          loadingPort: v.loadingPort?.trim() || undefined,
          dischargePort: v.dischargePort?.trim() || undefined,
          etd: v.etd?.toISOString(),
          eta: v.eta?.toISOString(),
          surveyorName: v.surveyorName?.trim() || undefined,
          note: v.note?.trim() || undefined,
        });
      }}
    >
      <Form form={form} layout="vertical" size="small" initialValues={{ transportMode: "PIPELINE" }}>
        <div style={fieldGrid}>
          <Form.Item name="transportMode" label="Phương thức" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "PIPELINE", label: "Đường ống" },
                { value: "SEA", label: "Đường biển" },
                // { value: "TRUCK", label: "Đường bộ" },
                // { value: "BARGE", label: "Sà lan" },
                { value: "OTHER", label: "Khác" },
              ]}
            />
          </Form.Item>
          <Form.Item name="vesselName" label="Tên tàu/phương tiện">
            <Input />
          </Form.Item>
          <Form.Item name="voyageNo" label="Số chuyến">
            <Input />
          </Form.Item>
          <Form.Item name="blNo" label="Số B/L">
            <Input />
          </Form.Item>
          <Form.Item name="loadingPort" label="Nơi xuất">
            <Input />
          </Form.Item>
          <Form.Item name="dischargePort" label="Nơi nhận">
            <Input />
          </Form.Item>
          <Form.Item name="etd" label="ETD">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="eta" label="ETA">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="surveyorName" label="Giám định">
            <Input />
          </Form.Item>
        </div>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

type LogisticsLineForm = {
  costType?: string;
  productId?: string;
  purchaseOrderLineId?: string;
  goodsReceiptId?: string;
  allocationBasis?: string;
  amountBeforeVat?: number;
  vatRate?: number;
  isCapitalizedToCost?: boolean;
  note?: string;
};

type LogisticsFormValues = {
  shipmentId?: string;
  vendorCustomerId?: string;
  documentNo?: string;
  documentDate?: dayjs.Dayjs;
  currency?: string;
  fxRate?: number;
  note?: string;
  lines: LogisticsLineForm[];
};

const costTypeOptions = [
  { value: "FREIGHT", label: "Cước vận chuyển" },
  { value: "INSURANCE", label: "Bảo hiểm" },
  { value: "INSPECTION", label: "Giám định" },
  { value: "PORT_FEE", label: "Phí cảng" },
  { value: "HANDLING", label: "Bốc xếp" },
  { value: "PIPELINE_FEE", label: "Phí đường ống" },
  { value: "STORAGE", label: "Lưu kho" },
  { value: "OTHER", label: "Khác" },
];

export function TermLogisticsCostModal({
  open,
  data,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  data: TermPurchaseOrderDetail;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermLogisticsCostPayload) => void;
}) {
  const [form] = Form.useForm<LogisticsFormValues>();

  return (
    <Modal
      open={open}
      title="Thêm chi phí logistics"
      width="min(1040px, calc(100vw - 32px))"
      onCancel={onCancel}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: modalBodyStyle }}
      onOk={async () => {
        const v = await form.validateFields();
        onSubmit({
          shipmentId: v.shipmentId || undefined,
          vendorCustomerId: v.vendorCustomerId || undefined,
          documentNo: v.documentNo?.trim() || undefined,
          documentDate: v.documentDate?.format("YYYY-MM-DD"),
          currency: v.currency || "VND",
          fxRate: v.fxRate,
          note: v.note?.trim() || undefined,
          lines: (v.lines || [])
            .filter((x) => x.costType && Number(x.amountBeforeVat || 0) > 0)
            .map((x) => ({
              costType: x.costType as any,
              productId: x.productId || undefined,
              purchaseOrderLineId: x.purchaseOrderLineId || undefined,
              goodsReceiptId: x.goodsReceiptId || undefined,
              allocationBasis: (x.allocationBasis as any) || "BY_ACTUAL_QTY",
              amountBeforeVat: Number(x.amountBeforeVat || 0),
              vatRate: Number(x.vatRate || 0),
              isCapitalizedToCost: x.isCapitalizedToCost ?? true,
              note: x.note?.trim() || undefined,
            })),
        });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          currency: "VND",
          lines: [{ costType: "FREIGHT", vatRate: 10, isCapitalizedToCost: true }],
        }}
      >
        <div style={fieldGrid}>
          <Form.Item name="shipmentId" label="Chuyến vận chuyển">
            <Select
              allowClear
              options={(data.shipments || []).map((x) => ({
                value: x.id,
                label: [x.vesselName, x.voyageNo, x.blNo].filter(Boolean).join(" - ") || x.transportMode || x.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="vendorCustomerId" label="Nhà cung cấp dịch vụ">
            <PartySelect partyRole="SUPPLIER" placeholder="Chọn NCC" />
          </Form.Item>
          <Form.Item name="documentNo" label="Số chứng từ">
            <Input />
          </Form.Item>
          <Form.Item name="documentDate" label="Ngày chứng từ">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="currency" label="Tiền tệ">
            <Select options={[{ value: "VND" }, { value: "USD" }]} />
          </Form.Item>
          <Form.Item name="fxRate" label="Tỷ giá">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <b>Dòng chi phí</b>
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({ costType: "FREIGHT", vatRate: 10, isCapitalizedToCost: true })}
                >
                  Thêm dòng
                </Button>
              </div>

              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
                    gap: 8,
                    alignItems: "end",
                  }}
                >
                  <Form.Item name={[field.name, "costType"]} label="Loại phí" style={{ margin: 0 }} rules={[{ required: true }]}>
                    <Select options={costTypeOptions} />
                  </Form.Item>
                  <Form.Item name={[field.name, "productId"]} label="Sản phẩm" style={{ margin: 0 }}>
                    <Select allowClear options={data.lines.map((x) => ({ value: x.productId, label: x.productName || x.productId }))} />
                  </Form.Item>
                  <Form.Item name={[field.name, "purchaseOrderLineId"]} label="Dòng đơn" style={{ margin: 0 }}>
                    <Select allowClear options={data.lines.map((x) => ({ value: x.id, label: x.productName || x.id }))} />
                  </Form.Item>
                  <Form.Item name={[field.name, "goodsReceiptId"]} label="Phiếu nhận" style={{ margin: 0 }}>
                    <Select allowClear options={(data.receipts || []).map((x) => ({ value: x.id, label: x.receiptNo }))} />
                  </Form.Item>
                  <Form.Item name={[field.name, "amountBeforeVat"]} label="Tiền trước VAT" style={{ margin: 0 }} rules={[{ required: true }]}>
                    <InputNumber min={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "vatRate"]} label="VAT" style={{ margin: 0 }}>
                    <InputNumber min={0} max={100} addonAfter="%" style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "isCapitalizedToCost"]} label="Vốn hóa" valuePropName="checked" style={{ margin: 0 }}>
                    <Switch checkedChildren="Có" unCheckedChildren="Không" />
                  </Form.Item>
                  <Form.Item label=" " style={{ margin: 0 }}>
                    <Button block danger onClick={() => remove(field.name)}>
                      Xóa
                    </Button>
                  </Form.Item>
                </div>
              ))}
            </div>
          )}
        </Form.List>

        <Form.Item name="note" label="Ghi chú" style={{ marginTop: 10 }}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
