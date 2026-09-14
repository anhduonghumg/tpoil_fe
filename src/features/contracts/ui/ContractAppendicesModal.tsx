import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type {
  ContractAppendix,
  ContractAppendixItem,
  UpsertContractAppendixPayload,
} from "../types";
import { useContractAppendices, useContractTermsAt } from "../hooks";
import { useProductSelect } from "../../products/hooks";

const { Text } = Typography;

const fmt = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");
const money = (v?: string | number | null) =>
  v == null || v === "" ? "—" : Number(v).toLocaleString("vi-VN");

type Props = {
  open: boolean;
  onClose: () => void;
  contractId?: string;
  contractCode?: string;
  contractName?: string;
};

export default function ContractAppendicesModal({
  open,
  onClose,
  contractId,
  contractCode,
  contractName,
}: Props) {
  const { list, create, update, remove } = useContractAppendices(
    open ? contractId : undefined,
  );

  // Ngày để soi điều khoản: mặc định hôm nay, đổi được để xem đơn ngày khác sẽ bị
  // chấm theo mức nào.
  const [atDate, setAtDate] = useState<Dayjs>(dayjs());
  const terms = useContractTermsAt(
    open ? contractId : undefined,
    atDate.format("YYYY-MM-DD"),
  );

  const [editing, setEditing] = useState<ContractAppendix | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const appendices = list.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: ContractAppendix) => {
    setEditing(a);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: UpsertContractAppendixPayload) => {
    if (editing) await update.mutateAsync({ appendixId: editing.id, data: payload });
    else await create.mutateAsync(payload);
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      destroyOnClose
      title={
        <Space direction="vertical" size={0}>
          <Space size={8}>
            <FileTextOutlined />
            <span>Phụ lục hợp đồng</span>
          </Space>
          {(contractCode || contractName) && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {contractCode}
              {contractName ? ` — ${contractName}` : ""}
            </Text>
          )}
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Phụ lục không sửa đè hợp đồng gốc"
        description="Mỗi phụ lục có ngày hiệu lực riêng. Đơn hàng được chấm theo điều khoản đúng tại ngày của nó, nên đơn cũ vẫn giữ giá sàn cũ khi bạn thêm phụ lục mới."
      />

      <Row gutter={16}>
        {/* ===== Cột trái: dòng thời gian các phụ lục ===== */}
        <Col xs={24} lg={10}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text strong>Dòng thời gian</Text>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
            >
              Thêm phụ lục
            </Button>
          </div>

          <div style={{ maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
            <Timeline
              mode="left"
              items={[
                ...appendices.map((a) => ({
                  color: dayjs(a.effectiveDate).isAfter(dayjs()) ? "gray" : "blue",
                  children: (
                    <AppendixCard
                      appendix={a}
                      onEdit={() => openEdit(a)}
                      onDelete={() => remove.mutate(a.id)}
                    />
                  ),
                })),
                {
                  color: "green",
                  children: (
                    <div style={{ paddingBottom: 4 }}>
                      <Text strong>Hợp đồng gốc</Text>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        Điều khoản ban đầu, áp dụng khi chưa có phụ lục nào
                      </div>
                    </div>
                  ),
                },
              ]}
            />
            {appendices.length === 0 && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có phụ lục nào"
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        </Col>

        {/* ===== Cột phải: điều khoản đang áp tại một ngày ===== */}
        <Col xs={24} lg={14}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 8,
            }}
          >
            <Space size={6}>
              <Text strong>Điều khoản áp dụng</Text>
              <Tooltip title="Kết quả sau khi chồng các phụ lục có hiệu lực tính đến ngày này lên hợp đồng gốc. Đây đúng là mức mà đơn hàng ngày đó sẽ bị chấm.">
                <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
              </Tooltip>
            </Space>
            <DatePicker
              size="small"
              allowClear={false}
              value={atDate}
              onChange={(d) => d && setAtDate(d)}
              format="DD/MM/YYYY"
              suffixIcon={<CalendarOutlined />}
            />
          </div>

          <Card size="small" style={{ background: "#FAFAFA", marginBottom: 12 }}>
            <Row gutter={12}>
              <Col span={12}>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>Kỳ thanh toán</div>
                <div style={{ fontWeight: 600 }}>
                  {terms.data?.paymentTermDays != null
                    ? `${terms.data.paymentTermDays} ngày`
                    : "—"}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>Hạn mức override</div>
                <div style={{ fontWeight: 600 }}>
                  {money(terms.data?.creditLimitOverride)}
                </div>
              </Col>
            </Row>
            {terms.data?.appliedAppendices?.length ? (
              <>
                <Divider style={{ margin: "10px 0" }} />
                <Space size={[6, 6]} wrap>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Đã áp:
                  </Text>
                  {terms.data.appliedAppendices.map((a) => (
                    <Tag key={a.code} color="blue">
                      {a.code} · từ {fmt(a.effectiveDate)}
                    </Tag>
                  ))}
                </Space>
              </>
            ) : (
              <>
                <Divider style={{ margin: "10px 0" }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Chưa phụ lục nào có hiệu lực tại ngày này — đang theo hợp đồng gốc.
                </Text>
              </>
            )}
          </Card>

          <Table
            size="small"
            rowKey="productId"
            loading={terms.isLoading}
            pagination={false}
            scroll={{ y: 280 }}
            locale={{ emptyText: "Hợp đồng chưa quy định giá sàn cho sản phẩm nào" }}
            dataSource={terms.data?.items ?? []}
            columns={[
              {
                title: "Sản phẩm",
                dataIndex: "productId",
                render: (id: string) => <ProductName productId={id} />,
              },
              {
                title: "Giá sàn",
                dataIndex: "price",
                width: 130,
                align: "right",
                render: (v: string) => <b>{money(v)}</b>,
              },
              { title: "ĐVT", dataIndex: "uom", width: 70 },
              {
                title: "Nguồn",
                dataIndex: "fromAppendixCode",
                width: 130,
                render: (code: string | null) =>
                  code ? (
                    <Tag color="blue">{code}</Tag>
                  ) : (
                    <Tag color="default">Hợp đồng gốc</Tag>
                  ),
              },
            ]}
          />
        </Col>
      </Row>

      <AppendixFormModal
        open={formOpen}
        editing={editing}
        saving={create.isPending || update.isPending}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}

/* ---------- Một phụ lục trên dòng thời gian ---------- */

function AppendixCard({
  appendix,
  onEdit,
  onDelete,
}: {
  appendix: ContractAppendix;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const future = dayjs(appendix.effectiveDate).isAfter(dayjs());
  const changes: string[] = [];
  if (appendix.paymentTermDays != null)
    changes.push(`Kỳ thanh toán → ${appendix.paymentTermDays} ngày`);
  if (appendix.creditLimitOverride != null)
    changes.push(`Hạn mức → ${money(appendix.creditLimitOverride)}`);
  if (appendix.items?.length) changes.push(`${appendix.items.length} mức giá sàn`);

  return (
    <Card
      size="small"
      style={{ marginBottom: 8, borderColor: future ? "#d9d9d9" : "#91caff" }}
      styles={{ body: { padding: 10 } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <Space size={6} wrap>
            <Text strong>{appendix.code}</Text>
            {future && <Tag color="default">Chưa hiệu lực</Tag>}
          </Space>
          <div style={{ fontSize: 12, color: "#595959" }}>
            Hiệu lực từ <b>{fmt(appendix.effectiveDate)}</b>
          </div>
          {appendix.changeSummary && (
            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
              {appendix.changeSummary}
            </div>
          )}
          {changes.length > 0 && (
            <Space size={[4, 4]} wrap style={{ marginTop: 6 }}>
              {changes.map((c) => (
                <Tag key={c} style={{ fontSize: 11, marginInlineEnd: 0 }}>
                  {c}
                </Tag>
              ))}
            </Space>
          )}
        </div>
        <Space size={2} direction="vertical">
          <Tooltip title="Sửa">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
          <Popconfirm
            title="Xóa phụ lục này?"
            description="Điều khoản sẽ quay về mức trước đó."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={onDelete}
          >
            <Tooltip title="Xóa">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>
    </Card>
  );
}

/* ---------- Tên sản phẩm từ id ---------- */

function ProductName({ productId }: { productId: string }) {
  const { data } = useProductSelect("");
  const product = (data ?? []).find((p: any) => p.id === productId);
  return <span>{product ? product.name : productId.slice(0, 8) + "…"}</span>;
}

/* ---------- Form thêm / sửa phụ lục ---------- */

function AppendixFormModal({
  open,
  editing,
  saving,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  editing: ContractAppendix | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpsertContractAppendixPayload) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const { data: products } = useProductSelect("");

  const productOptions = useMemo(
    () =>
      (products ?? []).map((p: any) => ({
        value: p.id,
        label: p.code ? `${p.code} — ${p.name}` : p.name,
        uom: p.uom,
      })),
    [products],
  );

  React.useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        effectiveDate: dayjs(editing.effectiveDate),
        changeSummary: editing.changeSummary ?? undefined,
        docUrl: editing.docUrl ?? undefined,
        paymentTermDays: editing.paymentTermDays ?? undefined,
        creditLimitOverride:
          editing.creditLimitOverride != null
            ? Number(editing.creditLimitOverride)
            : undefined,
        items: (editing.items ?? []).map((i) => ({
          productId: i.productId,
          uom: i.uom,
          price: Number(i.price),
          discount: i.discount != null ? Number(i.discount) : undefined,
        })),
      });
    } else {
      form.setFieldsValue({ effectiveDate: dayjs(), items: [] });
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const v = await form.validateFields();
    await onSubmit({
      code: String(v.code).trim(),
      effectiveDate: (v.effectiveDate as Dayjs).format("YYYY-MM-DD"),
      changeSummary: v.changeSummary?.trim() || null,
      docUrl: v.docUrl?.trim() || null,
      paymentTermDays: v.paymentTermDays ?? null,
      creditLimitOverride: v.creditLimitOverride ?? null,
      items: ((v.items ?? []) as ContractAppendixItem[])
        .filter((i) => i?.productId && i?.price != null)
        .map((i) => ({
          productId: i.productId,
          uom:
            i.uom ||
            productOptions.find((p) => p.value === i.productId)?.uom ||
            "LITER",
          price: Number(i.price),
          discount: i.discount != null ? Number(i.discount) : null,
        })),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={saving}
      okText={editing ? "Lưu" : "Thêm phụ lục"}
      cancelText="Hủy"
      width={760}
      destroyOnClose
      title={editing ? `Sửa phụ lục ${editing.code}` : "Thêm phụ lục"}
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col xs={24} md={10}>
            <Form.Item
              name="code"
              label="Số phụ lục"
              rules={[{ required: true, message: "Nhập số phụ lục" }]}
            >
              <Input placeholder="VD: PL01/2026" />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item
              name="effectiveDate"
              label="Hiệu lực từ ngày"
              tooltip="Chứng từ trước ngày này vẫn theo điều khoản cũ. Đây là ngày áp dụng, không phải ngày ký."
              rules={[{ required: true, message: "Chọn ngày hiệu lực" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="changeSummary" label="Nội dung điều chỉnh">
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Tóm tắt những gì phụ lục này thay đổi so với hợp đồng gốc"
          />
        </Form.Item>

        <Divider orientation="left" plain style={{ margin: "8px 0 12px" }}>
          Điều khoản thanh toán
        </Divider>
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item
              name="paymentTermDays"
              label="Kỳ thanh toán (ngày)"
              tooltip="Bỏ trống nếu phụ lục không đụng tới kỳ thanh toán."
            >
              <InputNumber min={0} style={{ width: "100%" }} placeholder="Giữ nguyên" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="creditLimitOverride"
              label="Hạn mức (VND)"
              tooltip="Bỏ trống nếu phụ lục không đụng tới hạn mức."
            >
              <InputNumber
                min={0}
                step={100000}
                style={{ width: "100%" }}
                placeholder="Giữ nguyên"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="docUrl" label="Link file phụ lục">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" plain style={{ margin: "8px 0 12px" }}>
          Điều chỉnh giá sàn
        </Divider>
        <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 8 }}>
          Chỉ thêm sản phẩm <b>có điều chỉnh</b>. Sản phẩm không liệt kê ở đây vẫn giữ
          nguyên giá sàn đang áp.
        </div>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Row gutter={8} key={field.key} align="middle">
                  <Col xs={24} md={11}>
                    <Form.Item
                      name={[field.name, "productId"]}
                      label={index === 0 ? "Sản phẩm" : undefined}
                      rules={[{ required: true, message: "Chọn sản phẩm" }]}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn sản phẩm"
                        options={productOptions}
                        onChange={(id) => {
                          const uom = productOptions.find((p) => p.value === id)?.uom;
                          const items = form.getFieldValue("items") ?? [];
                          items[field.name] = { ...items[field.name], uom };
                          form.setFieldsValue({ items });
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      name={[field.name, "price"]}
                      label={index === 0 ? "Giá sàn mới" : undefined}
                      rules={[{ required: true, message: "Nhập giá sàn" }]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="VD: 21500"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={8} md={4}>
                    <Form.Item
                      name={[field.name, "uom"]}
                      label={index === 0 ? "ĐVT" : undefined}
                    >
                      <Input disabled placeholder="—" />
                    </Form.Item>
                  </Col>
                  <Col xs={4} md={3}>
                    <Form.Item label={index === 0 ? " " : undefined}>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                Thêm sản phẩm điều chỉnh giá
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
