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
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import { useCreateWithdrawal, useWithdrawalSourceCandidates } from "../hooks";
import type { SalesWithdrawalRequest, WithdrawalSourceCandidate } from "../types";
import { formatQty } from "./labels";

type LineForm = {
  key: string;
  productId?: string;
  warehouseId?: string;
  requestedQty?: number;
};

type FormValues = {
  customerPartyId: string;
  requestDate: dayjs.Dayjs;
  vehiclePlate: string;
  driverName: string;
  note?: string;
  lines: LineForm[];
};

const emptyLine = (): LineForm => ({ key: `${Date.now()}-${Math.random()}` });

/**
 * Rút lô gắn vào đơn lô đã có — không tạo đơn bán mới. Khi khách có nhiều đơn lô
 * phù hợp thì Sale phải chọn, hệ thống chỉ đề xuất theo lô cũ nhất.
 */
export function WithdrawalCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (request: SalesWithdrawalRequest) => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const [lineKeys, setLineKeys] = useState<string[]>([]);
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");
  const [sourceOrderId, setSourceOrderId] = useState<string>();
  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const createMutation = useCreateWithdrawal();

  const customerPartyId = Form.useWatch("customerPartyId", form);
  const watchedLines = (Form.useWatch("lines", form) ?? []) as LineForm[];
  const firstLine = watchedLines[0];

  // Ứng viên lô nguồn tính theo dòng đầu — đủ để Sale thấy còn lô nào và bao nhiêu.
  const candidatesQuery = useWithdrawalSourceCandidates({
    customerPartyId,
    productId: firstLine?.productId,
    warehouseId: firstLine?.warehouseId,
    qty: firstLine?.requestedQty,
  });
  const candidates = candidatesQuery.data?.candidates ?? [];
  const mustChoose = candidatesQuery.data?.mustChoose ?? false;

  useEffect(() => {
    if (!open) return;
    const line = emptyLine();
    setLineKeys([line.key]);
    setSourceOrderId(undefined);
    form.setFieldsValue({
      customerPartyId: undefined as unknown as string,
      requestDate: dayjs(),
      vehiclePlate: "",
      driverName: "",
      note: undefined,
      lines: [line],
    });
  }, [open, form]);

  // Đổi khách/hàng thì lựa chọn cũ không còn ý nghĩa.
  useEffect(() => {
    setSourceOrderId(undefined);
  }, [customerPartyId, firstLine?.productId, firstLine?.warehouseId]);

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
    const request = await createMutation.mutateAsync({
      customerPartyId: values.customerPartyId,
      salesOrderId: sourceOrderId,
      requestDate: values.requestDate.format("YYYY-MM-DD"),
      vehiclePlate: values.vehiclePlate.trim(),
      driverName: values.driverName.trim(),
      note: values.note?.trim() || undefined,
      lines: values.lines.map((line) => ({
        productId: line.productId!,
        warehouseId: line.warehouseId!,
        requestedQty: Number(line.requestedQty),
      })),
    });
    onCreated?.(request);
    onClose();
  };

  const lineColumns: ColumnsType<{ key: string }> = [
    {
      title: "Mặt hàng",
      dataIndex: "productId",
      width: 220,
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
            options={(productsQuery.data ?? []).map((product) => ({
              value: product.id,
              label: `${product.code} - ${product.name}`,
            }))}
          />
        </Form.Item>
      ),
    },
    {
      title: "Kho lấy",
      dataIndex: "warehouseId",
      width: 220,
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "warehouseId"]}
          rules={[{ required: true, message: "Chọn kho" }]}
          noStyle
        >
          <Select
            size="small"
            showSearch
            filterOption={false}
            placeholder="Kho lấy hàng"
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
      title: "Số lượng rút",
      dataIndex: "requestedQty",
      width: 130,
      align: "right",
      render: (_, __, index) => (
        <Form.Item
          name={["lines", index, "requestedQty"]}
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

  const candidateColumns: ColumnsType<WithdrawalSourceCandidate> = [
    {
      title: "",
      key: "pick",
      width: 40,
      render: (_, candidate) => <Radio value={candidate.salesOrderId} />,
    },
    { title: "Đơn lô", dataIndex: "orderNo", width: 150 },
    {
      title: "Ngày",
      dataIndex: "orderDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    { title: "Kho", key: "warehouse", render: (_, candidate) => candidate.warehouse?.name ?? "—" },
    {
      title: "Tổng",
      dataIndex: "totalQty",
      width: 100,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đã rút",
      dataIndex: "issuedQty",
      width: 100,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đang giữ",
      dataIndex: "heldQty",
      width: 100,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      width: 110,
      align: "right",
      render: (value) => <strong>{formatQty(value)}</strong>,
    },
  ];

  const canSubmit = !mustChoose || Boolean(sourceOrderId);

  return (
    <Modal
      open={open}
      title="Tạo phiếu rút lô"
      width={1040}
      okText="Tạo phiếu rút"
      cancelText="Đóng"
      okButtonProps={{ disabled: !canSubmit }}
      confirmLoading={createMutation.isPending}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Phiếu rút gắn vào đơn lô sẵn có của khách, không tạo đơn bán mới."
      />

      <Form<FormValues> form={form} layout="vertical" size="small">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 130px 140px 160px minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <Form.Item
            name="customerPartyId"
            label="Khách hàng"
            rules={[{ required: true, message: "Chọn khách hàng" }]}
          >
            <PartySelect partyRole="CUSTOMER" placeholder="Chọn khách hàng" />
          </Form.Item>
          <Form.Item name="requestDate" label="Ngày rút" rules={[{ required: true }]}>
            <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="vehiclePlate"
            label="Biển số xe"
            rules={[{ required: true, message: "Nhập BKS" }]}
          >
            <Input size="small" placeholder="51C-123.45" />
          </Form.Item>
          <Form.Item
            name="driverName"
            label="Lái xe"
            rules={[{ required: true, message: "Nhập tên lái xe" }]}
          >
            <Input size="small" placeholder="Tên lái xe" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input size="small" placeholder="Ghi chú (nếu có)" />
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
          <Typography.Text strong>Hàng rút</Typography.Text>
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
          columns={lineColumns}
          dataSource={lineKeys.map((key) => ({ key }))}
          scroll={{ x: 620 }}
        />
      </Form>

      {customerPartyId && firstLine?.productId && (
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            <Typography.Text strong>Lô nguồn</Typography.Text>
            {mustChoose && <Typography.Text type="danger">(bắt buộc chọn)</Typography.Text>}
          </Space>

          {candidatesQuery.isFetching ? (
            <Typography.Text type="secondary">Đang tìm đơn lô phù hợp…</Typography.Text>
          ) : candidates.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="Khách chưa có đơn lô nào còn đủ hàng cho lần rút này. Phiếu sẽ được tạo ở trạng thái chờ chọn lô nguồn."
            />
          ) : (
            <Radio.Group
              value={sourceOrderId}
              onChange={(e) => setSourceOrderId(e.target.value)}
              style={{ width: "100%" }}
            >
              <Table<WithdrawalSourceCandidate>
                rowKey="salesOrderId"
                size="small"
                pagination={false}
                columns={candidateColumns}
                dataSource={candidates}
                scroll={{ x: 800 }}
                onRow={(candidate) => ({
                  onClick: () => setSourceOrderId(candidate.salesOrderId),
                  style: { cursor: "pointer" },
                })}
              />
            </Radio.Group>
          )}
        </div>
      )}
    </Modal>
  );
}
