import { useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import { useCreateSalesOrder } from "../hooks";
import "../sales.css";

type LineForm = {
  key: string;
  productId?: string;
  receivingWarehouseId?: string;
  vehiclePlate?: string;
  driverName?: string;
  orderedActualQty?: number;
  unitPrice?: number;
  discountAmount?: number;
};

type FormValues = {
  customerPartyId: string;
  orderDate: dayjs.Dayjs;
  note?: string;
  lines: LineForm[];
};

const emptyLine = (): LineForm => ({
  key: `${Date.now()}-${Math.random()}`,
  orderedActualQty: 0,
  discountAmount: 0,
});

const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

const lineTotal = (line?: LineForm) =>
  Number(line?.orderedActualQty ?? 0) *
  Math.max(Number(line?.unitPrice ?? 0) - Number(line?.discountAmount ?? 0), 0);

/**
 * Sales records the customer order here; saving notifies purchasing to go and buy.
 */
export function SalesOrderCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (salesOrderId: string) => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const [initialLine] = useState(emptyLine);
  const [lineRows, setLineRows] = useState<LineForm[]>([initialLine]);
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");
  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const createMutation = useCreateSalesOrder();
  const watchedLines = (Form.useWatch("lines", form) ?? []) as LineForm[];
  const orderDate = Form.useWatch("orderDate", form) as dayjs.Dayjs | undefined;
  const grandTotal = watchedLines.reduce((sum, line) => sum + lineTotal(line), 0);

  const resetForm = () => {
    const line = emptyLine();
    setLineRows([line]);
    form.resetFields();
    form.setFieldsValue({ orderDate: dayjs(), lines: [line] });
  };

  const addLine = () => {
    const nextLine = emptyLine();
    const currentLines = form.getFieldValue("lines") ?? [];
    form.setFieldsValue({ lines: [...currentLines, nextLine] });
    setLineRows((current) => [...current, nextLine]);
  };

  const removeLine = (index: number) => {
    const currentLines = form.getFieldValue("lines") ?? [];
    if (currentLines.length <= 1) return;
    form.setFieldsValue({
      lines: currentLines.filter((_: LineForm, lineIndex: number) => lineIndex !== index),
    });
    setLineRows((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const submit = async () => {
    const values = await form.validateFields();
    const result = await createMutation.mutateAsync({
      customerPartyId: values.customerPartyId,
      orderDate: values.orderDate.format("YYYY-MM-DD"),
      note: values.note?.trim() || undefined,
      lines: values.lines
        .filter((line) => line.productId && Number(line.orderedActualQty) > 0)
        .map((line) => ({
          productId: line.productId!,
          receivingWarehouseId: line.receivingWarehouseId,
          vehiclePlate: line.vehiclePlate?.trim() || undefined,
          driverName: line.driverName?.trim() || undefined,
          orderedActualQty: Number(line.orderedActualQty),
          unitPrice: line.unitPrice == null ? undefined : Number(line.unitPrice),
          discountAmount: Number(line.discountAmount ?? 0),
        })),
    });
    onCreated?.(result.id);
    resetForm();
    onClose();
  };

  const columns: ColumnsType<LineForm> = [
    {
      title: "Mặt hàng",
      dataIndex: "productId",
      width: 105,
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
      dataIndex: "receivingWarehouseId",
      width: 145,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "receivingWarehouseId"]}
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
            options={(warehousesQuery.data ?? []).map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.label,
            }))}
          />
        </Form.Item>
      ),
    },
    {
      title: "BKS",
      dataIndex: "vehiclePlate",
      width: 100,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "vehiclePlate"]} noStyle>
          <Input size="small" placeholder="29C-123.45" />
        </Form.Item>
      ),
    },
    {
      title: "Lái xe",
      dataIndex: "driverName",
      width: 115,
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "driverName"]} noStyle>
          <Input size="small" placeholder="Tên lái xe" />
        </Form.Item>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "orderedActualQty",
      width: 95,
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
      width: 95,
      align: "right",
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "unitPrice"]} noStyle>
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
      title: "Chiết khấu",
      dataIndex: "discountAmount",
      width: 95,
      align: "right",
      render: (_, __, index) => (
        <Form.Item name={["lines", index, "discountAmount"]} noStyle>
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
      title: "Thành tiền",
      key: "amount",
      width: 105,
      align: "right",
      render: (_, __, index) => (
        <Typography.Text strong>{formatMoney(lineTotal(watchedLines[index]))}</Typography.Text>
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
          disabled={lineRows.length === 1}
          onClick={() => removeLine(index)}
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Tạo đơn đặt hàng của khách"
      width={1000}
      okText="Lưu và báo mua hàng"
      cancelText="Hủy"
      confirmLoading={createMutation.isPending}
      onOk={submit}
      onCancel={() => {
        resetForm();
        onClose();
      }}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Lưu xong hệ thống sẽ báo cho bộ phận mua hàng để đi đặt hàng nhà cung cấp.
      </Typography.Paragraph>

      <Form<FormValues>
        form={form}
        layout="vertical"
        size="small"
        initialValues={{ orderDate: dayjs(), lines: [initialLine] }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 140px minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <Form.Item
            name="customerPartyId"
            label="Khách hàng"
            rules={[{ required: true, message: "Chọn khách hàng" }]}
          >
            <PartySelect
              partyRole="SELLABLE"
              effectiveAt={orderDate?.format("YYYY-MM-DD")}
              displayMode="code"
              placeholder="Chọn khách hàng đặt hàng"
            />
          </Form.Item>
          <Form.Item
            name="orderDate"
            label="Ngày đặt"
            rules={[{ required: true, message: "Chọn ngày đặt" }]}
          >
            <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input size="small" placeholder="Yêu cầu thêm của khách (nếu có)" />
          </Form.Item>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Typography.Text strong>Hàng khách đặt</Typography.Text>
          <Button size="small" icon={<PlusOutlined />} htmlType="button" onClick={addLine}>
            Thêm dòng
          </Button>
        </div>

        <Table<LineForm>
          className="sales-order-lines"
          rowKey="key"
          size="small"
          pagination={false}
          tableLayout="fixed"
          columns={columns}
          dataSource={lineRows}
          scroll={{ x: 890 }}
          footer={() => (
            <div style={{ textAlign: "right" }}>
              <Typography.Text type="secondary">Tổng tiền: </Typography.Text>
              <Typography.Text strong>{formatMoney(grandTotal)} đ</Typography.Text>
            </div>
          )}
        />
      </Form>
    </Modal>
  );
}
