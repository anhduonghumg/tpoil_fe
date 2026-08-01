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

type LineForm = {
  key: string;
  productId?: string;
  receivingWarehouseId?: string;
  orderedActualQty?: number;
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
});

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
          orderedActualQty: Number(line.orderedActualQty),
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
            placeholder="Chọn mặt hàng"
            loading={productsQuery.isFetching}
            onSearch={setProductKeyword}
            options={(productsQuery.data ?? []).map((product) => ({
              value: product.id,
              label: `${product.code} - ${product.name}`,
            }))}
          />
        </Form.Item>
      ),
    },
    {
      title: "Kho nhận",
      dataIndex: "receivingWarehouseId",
      width: 220,
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
            placeholder="Chọn kho nhận"
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
      title: "Số lượng khách đặt",
      dataIndex: "orderedActualQty",
      width: 170,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "orderedActualQty"]}
          rules={[{ required: true, type: "number", min: 0.001, message: "Nhập số lượng" }]}
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
      title: "",
      key: "action",
      width: 48,
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
      width={720}
      okText="Lưu và báo mua hàng"
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
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <Form.Item
            name="customerPartyId"
            label="Khách hàng"
            rules={[{ required: true, message: "Chọn khách hàng" }]}
          >
            <PartySelect partyRole="CUSTOMER" placeholder="Chọn khách hàng đặt hàng" />
          </Form.Item>
          <Form.Item
            name="orderDate"
            label="Ngày đặt"
            rules={[{ required: true, message: "Chọn ngày đặt" }]}
          >
            <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item name="note" label="Ghi chú">
          <Input size="small" placeholder="Yêu cầu thêm của khách (nếu có)" />
        </Form.Item>

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
          rowKey="key"
          size="small"
          pagination={false}
          tableLayout="fixed"
          columns={columns}
          dataSource={lineRows}
        />
      </Form>
    </Modal>
  );
}
