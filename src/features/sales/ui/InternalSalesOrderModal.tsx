import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import {
  useCreateInternalSalesOrder,
  useCurrentDiscountBoard,
  useUpdateSalesOrder,
} from "../hooks";
import type { SalesLotInvoiceMode, SalesOrder } from "../types";
import { formatMoney } from "./labels";
import "../sales.css";

type LineForm = {
  key: string;
  productId?: string;
  issueWarehouseId?: string;
  vehiclePlate?: string;
  driverName?: string;
  orderedActualQty?: number;
  unitPrice?: number;
  /** CK công bố — lấy từ bảng thông báo, không sửa tay. */
  discountBaseAmount?: number;
  /** CK điều chỉnh — phần Sale/người duyệt tự thêm bớt, được phép âm. */
  discountAdjustmentAmount?: number;
  supplySource?: "TP" | "NCC";
  note?: string;
};

/** Chiết khấu là theo ĐƠN VỊ: thành tiền = SL × (giá − CK gốc − CK điều chỉnh). */
const lineTotalOf = (line: Partial<LineForm>) =>
  Number(line.orderedActualQty ?? 0) *
  (Number(line.unitPrice ?? 0) -
    Number(line.discountBaseAmount ?? 0) -
    Number(line.discountAdjustmentAmount ?? 0));

type FormValues = {
  kind: "SINGLE" | "LOT";
  customerPartyId: string;
  orderDate: dayjs.Dayjs;
  lotInvoiceMode: SalesLotInvoiceMode;
  paymentTermType: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number;
  note?: string;
  lines: LineForm[];
};

const newKey = () => `${Date.now()}-${Math.random()}`;

const emptyLine = (): LineForm => ({
  key: newKey(),
  orderedActualQty: undefined,
  discountAdjustmentAmount: 0,
  supplySource: "TP",
});

function linesFromOrder(order: SalesOrder): LineForm[] {
  return order.lines.map((line) => ({
    key: line.id,
    productId: line.productId,
    issueWarehouseId: line.issueWarehouseId ?? undefined,
    vehiclePlate: line.vehiclePlate ?? undefined,
    driverName: line.driverName ?? undefined,
    orderedActualQty: Number(line.orderedActualQty),
    unitPrice: Number(line.unitPrice),
    discountBaseAmount:
      line.discountBaseAmount == null ? undefined : Number(line.discountBaseAmount),
    discountAdjustmentAmount: Number(line.discountAdjustmentAmount ?? 0),
    supplySource: line.supplySource ?? "TP",
    note: line.note ?? undefined,
  }));
}

/**
 * Tạo/sửa đơn bán nội bộ. Đơn lấy 1 lần bắt buộc BKS + lái xe ngay từ đầu vì
 * xuất luôn; đơn lô thì khai sau ở từng lần rút.
 */
export function InternalSalesOrderModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Có order = sửa đơn nháp; không có = tạo mới. */
  order?: SalesOrder;
  onClose: () => void;
  onSaved?: (salesOrderId: string) => void;
}) {
  const isEdit = Boolean(order);
  const [form] = Form.useForm<FormValues>();
  const [lineKeys, setLineKeys] = useState<string[]>([]);
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");
  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const createMutation = useCreateInternalSalesOrder();
  const updateMutation = useUpdateSalesOrder(order?.id);

  const watchedLines = (Form.useWatch("lines", form) ?? []) as LineForm[];
  const kind = Form.useWatch("kind", form) ?? "SINGLE";
  const orderDate = Form.useWatch("orderDate", form) as dayjs.Dayjs | undefined;

  // Chiết khấu lấy từ bảng thông báo đang hiệu lực; Sale vẫn sửa được từng dòng.
  const discountBoard = useCurrentDiscountBoard(open);
  const discountOf = (warehouseId?: string, productId?: string) => {
    if (!warehouseId || !productId) return undefined;
    const line = discountBoard.data?.lines.find(
      (row) => row.warehouseId === warehouseId && row.productId === productId,
    );
    return line ? Number(line.discountPerUnit) : undefined;
  };

  /**
   * Chọn đủ kho + mặt hàng thì điền chiết khấu công bố. Chỉ điền khi ô còn trống hoặc
   * đang bằng đúng giá trị công bố cũ — không đè lên con số Sale đã tự sửa.
   */
  const applyAnnouncedDiscount = (index: number, patch: Partial<LineForm>) => {
    const current = (form.getFieldValue("lines") ?? []) as LineForm[];
    const line = { ...current[index], ...patch };
    const announced = discountOf(line.issueWarehouseId, line.productId);
    if (announced == null) return;

    const previous = discountOf(
      patch.issueWarehouseId ? current[index]?.issueWarehouseId : line.issueWarehouseId,
      patch.productId ? current[index]?.productId : line.productId,
    );
    const untouched = line.discountBaseAmount == null || line.discountBaseAmount === previous;
    if (!untouched) return;

    const next = [...current];
    next[index] = { ...line, discountBaseAmount: announced };
    form.setFieldsValue({ lines: next });
  };
  const paymentTermType = Form.useWatch("paymentTermType", form);
  const grandTotal = watchedLines.reduce((sum, line) => sum + lineTotalOf(line), 0);

  useEffect(() => {
    if (!open) return;
    if (order) {
      const lines = linesFromOrder(order);
      setLineKeys(lines.map((line) => line.key));
      form.setFieldsValue({
        kind: order.kind === "LOT" ? "LOT" : "SINGLE",
        customerPartyId: order.customer.id,
        orderDate: dayjs(order.orderDate),
        lotInvoiceMode: order.lotInvoiceMode ?? "ON_WITHDRAWAL",
        paymentTermType: order.paymentTermType ?? "SAME_DAY",
        paymentTermDays: order.paymentTermDays ?? undefined,
        note: order.note ?? undefined,
        lines,
      });
    } else {
      const line = emptyLine();
      setLineKeys([line.key]);
      form.setFieldsValue({
        kind: "SINGLE",
        customerPartyId: undefined as unknown as string,
        orderDate: dayjs(),
        lotInvoiceMode: "ON_WITHDRAWAL",
        paymentTermType: "SAME_DAY",
        paymentTermDays: undefined,
        note: undefined,
        lines: [line],
      });
    }
  }, [open, order, form]);

  const addLine = () => {
    const line = emptyLine();
    const current = (form.getFieldValue("lines") ?? []) as LineForm[];
    form.setFieldsValue({ lines: [...current, line] });
    setLineKeys((keys) => [...keys, line.key]);
  };

  const removeLine = (index: number) => {
    const current = (form.getFieldValue("lines") ?? []) as LineForm[];
    if (current.length <= 1) return;
    form.setFieldsValue({ lines: current.filter((_, i) => i !== index) });
    setLineKeys((keys) => keys.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const values = await form.validateFields();
    const lines = values.lines.map((line) => ({
      productId: line.productId!,
      issueWarehouseId: line.issueWarehouseId!,
      orderedActualQty: Number(line.orderedActualQty),
      unitPrice: Number(line.unitPrice ?? 0),
      discountBaseAmount:
        line.discountBaseAmount == null ? undefined : Number(line.discountBaseAmount),
      discountAdjustmentAmount: Number(line.discountAdjustmentAmount ?? 0),
      supplySource: line.supplySource ?? "TP",
      vehiclePlate: line.vehiclePlate?.trim() || undefined,
      driverName: line.driverName?.trim() || undefined,
      note: line.note?.trim() || undefined,
    }));
    const common = {
      orderDate: values.orderDate.format("YYYY-MM-DD"),
      note: values.note?.trim() || undefined,
      // Chỉ đơn lô mới có khái niệm này; gửi cho đơn lấy 1 lần sẽ bị backend từ chối.
      lotInvoiceMode: values.kind === "LOT" ? values.lotInvoiceMode : undefined,
      paymentTermType: values.paymentTermType,
      paymentTermDays:
        values.paymentTermType === "NET_DAYS" ? Number(values.paymentTermDays ?? 0) : undefined,
      lines,
    };
    const saved = isEdit
      ? await updateMutation.mutateAsync(common)
      : await createMutation.mutateAsync({
          ...common,
          kind: values.kind,
          customerPartyId: values.customerPartyId,
        });
    onSaved?.(saved.id);
    onClose();
  };

  const columns: ColumnsType<{ key: string }> = [
    {
      title: "Mặt hàng",
      dataIndex: "productId",
      width: 150,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "productId"]}
          rules={[{ required: true, message: "Chọn mặt hàng" }]}
          noStyle
        >
          <Select
            size="small"
            showSearch
            filterOption={false}
            placeholder="Mặt hàng"
            style={{ width: "100%" }}
            loading={productsQuery.isFetching}
            onSearch={setProductKeyword}
            onChange={(value) => applyAnnouncedDiscount(index, { productId: value })}
            optionLabelProp="shortLabel"
            options={(productsQuery.data ?? []).map((product) => ({
              value: product.id,
              shortLabel: product.code,
              label: `${product.code} - ${product.name}`,
            }))}
          />
        </Form.Item>
      ),
    },
    {
      title: "Kho nhận",
      dataIndex: "issueWarehouseId",
      width: 170,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "issueWarehouseId"]}
          rules={[{ required: true, message: "Chọn kho nhận" }]}
          noStyle
        >
          <Select
            size="small"
            showSearch
            filterOption={false}
            placeholder="Kho nhận"
            style={{ width: "100%" }}
            loading={warehousesQuery.isFetching}
            onSearch={setWarehouseKeyword}
            onChange={(value) => applyAnnouncedDiscount(index, { issueWarehouseId: value })}
            options={(warehousesQuery.data ?? []).map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.label,
            }))}
          />
        </Form.Item>
      ),
    },
    {
      title: "Mã NCC",
      key: "supplierCode",
      width: 110,
      render: () => <Typography.Text type="secondary">Tự động FIFO</Typography.Text>,
    },
    {
      title: "Số lượng",
      dataIndex: "orderedActualQty",
      width: 100,
      align: "right",
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "orderedActualQty"]}
          rules={[{ required: true, type: "number", min: 0.001, message: "Nhập SL" }]}
          noStyle
        >
          <InputNumber
            size="small"
            min={0.001}
            precision={3}
            controls={false}
            placeholder="0"
            style={{ width: "100%" }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 110,
      align: "right",
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "unitPrice"]}
          rules={[{ required: true, type: "number", min: 0, message: "Nhập giá" }]}
          noStyle
        >
          <InputNumber
            size="small"
            min={0}
            controls={false}
            placeholder="0"
            style={{ width: "100%" }}
          />
        </Form.Item>
      ),
    },
    {
      // CK công bố: khóa lại đúng như bảng nhập nhanh. Muốn lệch bảng giá thì ghi vào
      // CKDC, để lúc duyệt còn nhìn ra ai đã điều chỉnh bao nhiêu so với mức công bố.
      title: "CK",
      dataIndex: "discountBaseAmount",
      width: 100,
      align: "right",
      render: (_, __, index) => {
        const line: Partial<LineForm> = watchedLines[index] ?? {};
        const announced = discountOf(line.issueWarehouseId, line.productId);
        const missing = Boolean(line.issueWarehouseId && line.productId && announced == null);
        return (
          <div>
            <Form.Item name={["lines", index, "discountBaseAmount"]} noStyle>
              <InputNumber
                size="small"
                min={0}
                controls={false}
                disabled
                placeholder="0"
                status={missing ? "error" : undefined}
                style={{ width: "100%" }}
              />
            </Form.Item>
            {missing && (
              <Tooltip title="Kho này chưa có thông báo chiết khấu cho mặt hàng — không gửi duyệt được">
                <Typography.Text type="danger" style={{ fontSize: 11 }}>
                  chưa công bố
                </Typography.Text>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "CKDC",
      dataIndex: "discountAdjustmentAmount",
      width: 95,
      align: "right",
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "discountAdjustmentAmount"]} noStyle>
          <InputNumber size="small" controls={false} placeholder="0" style={{ width: "100%" }} />
        </Form.Item>
      ),
    },
    {
      title: "Nguồn",
      dataIndex: "supplySource",
      width: 80,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "supplySource"]} noStyle>
          <Select
            size="small"
            style={{ width: "100%" }}
            options={[
              { value: "TP", label: "TP" },
              { value: "NCC", label: "NCC" },
            ]}
          />
        </Form.Item>
      ),
    },
    {
      title: "BKS",
      dataIndex: "vehiclePlate",
      width: 110,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "vehiclePlate"]}
          rules={
            kind === "SINGLE" ? [{ required: true, message: "Đơn lấy 1 lần phải có BKS" }] : []
          }
          noStyle
        >
          <Input size="small" placeholder={kind === "SINGLE" ? "29C-123.45" : "Khai khi rút"} />
        </Form.Item>
      ),
    },
    {
      title: "Lái xe",
      dataIndex: "driverName",
      width: 120,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "driverName"]}
          rules={
            kind === "SINGLE" ? [{ required: true, message: "Đơn lấy 1 lần phải có lái xe" }] : []
          }
          noStyle
        >
          <Input size="small" placeholder={kind === "SINGLE" ? "Tên lái xe" : "Khai khi rút"} />
        </Form.Item>
      ),
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 110,
      align: "right",
      render: (_, __, index) => (
        <Typography.Text strong>{formatMoney(lineTotalOf(watchedLines[index] ?? {}))}</Typography.Text>
      ),
    },
    {
      title: "",
      key: "action",
      width: 34,
      render: (_, __, index) => (
        <Button
          danger
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          title="Xóa dòng"
          disabled={lineKeys.length === 1}
          onClick={() => removeLine(index)}
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={isEdit ? `Sửa đơn bán ${order?.orderNo}` : "Tạo đơn bán"}
      width={1180}
      okText={isEdit ? "Lưu thay đổi" : "Lưu nháp"}
      cancelText="Đóng"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
    >
      <Form<FormValues> form={form} layout="vertical" size="small">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "210px 240px 130px 150px minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <Form.Item name="kind" label="Loại đơn" rules={[{ required: true }]}>
            <Radio.Group size="small" disabled={isEdit} optionType="button" buttonStyle="solid">
              <Radio.Button value="SINGLE">Lấy 1 lần</Radio.Button>
              <Radio.Button value="LOT">Lấy nhiều lần</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="customerPartyId"
            label="Khách hàng"
            rules={[{ required: true, message: "Chọn khách hàng" }]}
          >
            <PartySelect
              partyRole="SELLABLE"
              effectiveAt={orderDate?.format("YYYY-MM-DD")}
              disabled={isEdit}
              // Không có nhãn dự phòng thì ô sửa đơn hiện trơ ra UUID của khách.
              fallbackLabel={order ? (order.customer.code ?? order.customer.name) : undefined}
              placeholder="Chọn khách hàng"
            />
          </Form.Item>
          <Form.Item
            name="orderDate"
            label="Ngày đơn"
            rules={[{ required: true, message: "Chọn ngày" }]}
          >
            <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Điều khoản TT" required style={{ marginBottom: 0 }}>
            <Input.Group compact>
              <Form.Item name="paymentTermType" noStyle rules={[{ required: true }]}>
                <Select
                  size="small"
                  style={{ width: paymentTermType === "NET_DAYS" ? "60%" : "100%" }}
                  options={[
                    { value: "SAME_DAY", label: "Trong ngày" },
                    { value: "NET_DAYS", label: "Công nợ" },
                  ]}
                />
              </Form.Item>
              {paymentTermType === "NET_DAYS" && (
                <Form.Item
                  name="paymentTermDays"
                  noStyle
                  rules={[{ required: true, type: "number", min: 1, message: "Số ngày" }]}
                >
                  <InputNumber size="small" min={1} controls={false} style={{ width: "40%" }} placeholder="ngày" />
                </Form.Item>
              )}
            </Input.Group>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input size="small" placeholder="Ghi chú nội bộ (nếu có)" />
          </Form.Item>
        </div>

        {kind === "LOT" && (
          <>
            <Form.Item
              name="lotInvoiceMode"
              label="Thời gian xuất hóa đơn"
              rules={[{ required: true, message: "Chọn cách xuất hóa đơn" }]}
              style={{ marginBottom: 8 }}
            >
              <Radio.Group>
                <Radio value="ON_CONFIRMATION">
                  Ngay sau khi xác nhận đơn hàng (một hóa đơn cho cả lô)
                </Radio>
                <Radio value="ON_WITHDRAWAL">
                  Theo tiến độ rút hàng (xuất hóa đơn nhiều lần)
                </Radio>
              </Radio.Group>
            </Form.Item>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Đơn lô không có hạn rút. Sau khi duyệt, khách rút dần bằng phiếu rút lô — không tạo đơn bán mới."
            />
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Typography.Text strong>Hàng bán</Typography.Text>
          <Button size="small" icon={<PlusOutlined />} htmlType="button" onClick={addLine}>
            Thêm dòng
          </Button>
        </div>

        <Table<{ key: string }>
          className="sales-order-lines"
          rowKey="key"
          size="small"
          pagination={false}
          tableLayout="fixed"
          columns={columns}
          dataSource={lineKeys.map((key) => ({ key }))}
          scroll={{ x: 1190 }}
          footer={() => (
            <div style={{ textAlign: "right" }}>
              <Typography.Text type="secondary">Tổng tiền chưa thuế: </Typography.Text>
              <Typography.Text strong>{formatMoney(grandTotal)} đ</Typography.Text>
            </div>
          )}
        />
      </Form>
    </Modal>
  );
}
