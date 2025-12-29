import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type { CustomerAddress } from "../types";
import { useCustomerAddresses } from "../hooks";
import { notify } from "../../../shared/lib/notification";

type EditableRow = CustomerAddress & { isNew?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
};

const fmt = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "");

function displayValidToInclusive(validTo?: string | null) {
  if (!validTo) return null;
  // BE dùng validTo > d (exclusive), FE hiển thị inclusive => trừ 1 ngày
  return dayjs(validTo).subtract(1, "day").format("DD/MM/YYYY");
}

const formatDateOnly = (v?: string | null) => {
  if (!v) return "—";
  const s = v.includes("T") ? v.slice(0, 10) : v;
  return dayjs(s, "YYYY-MM-DD").format("DD/MM/YYYY");
};

export default function CustomerAddressesModal({
  open,
  onClose,
  customerId,
  customerName,
}: Props) {
  const { list, create, update, remove } = useCustomerAddresses(
    open ? customerId : null
  );

  const loading =
    list.isLoading || create.isPending || update.isPending || remove.isPending;
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<string>("");
  const [data, setData] = useState<EditableRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setEditingKey("");
    form.resetFields();
  }, [open, form]);

  useEffect(() => {
    setData((list.data ?? []) as EditableRow[]);
  }, [list.data]);

  const isEditing = (r: EditableRow) => r.id === editingKey;

  const startEdit = (r: EditableRow) => {
    setEditingKey(r.id);
    form.setFieldsValue({
      addressLine: r.addressLine ?? "",
      validFrom: r.validFrom ? dayjs(r.validFrom) : null,
      note: r.note ?? "",
    });
  };

  const cancelEdit = () => {
    const key = editingKey;
    setEditingKey("");
    form.resetFields();
    setData((prev) => prev.filter((x) => !(x.id === key && x.isNew)));
  };

  const addNewRow = () => {
    if (editingKey) {
      return notify.warning("Đang sửa một dòng. Hãy lưu hoặc hủy trước.");
    }

    const id = `NEW_${Date.now()}`;
    const newRow: EditableRow = {
      id,
      customerId,
      addressLine: "",
      validFrom: dayjs().format("YYYY-MM-DD"),
      validTo: null,
      note: "",
      createdAt: "",
      updatedAt: "",
      isNew: true,
    };

    setData((prev) => [newRow, ...prev]);
    startEdit(newRow);
  };

  const saveRow = async (r: EditableRow) => {
    try {
      const values = await form.validateFields();

      const payload = {
        addressLine: String(values.addressLine ?? "").trim(),
        validFrom: (values.validFrom as Dayjs).format("YYYY-MM-DD"),
        note: String(values.note ?? "").trim() || null,
      };

      if (!payload.addressLine) return notify.error("Địa chỉ không được rỗng.");

      if (r.isNew) {
        await create.mutateAsync(payload);
        notify.success("Đã thêm địa chỉ");
      } else {
        await update.mutateAsync({
          addressId: r.id,
          data: payload,
        });
        notify.success("Đã cập nhật địa chỉ");
      }

      setEditingKey("");
      form.resetFields();
    } catch (e: any) {
      if (e?.errorFields) return;
      const msg = e?.response?.data?.message || e?.message || "Lưu thất bại";
      notify.error(msg);
    }
  };

  const deleteRow = async (r: EditableRow) => {
    if (r.isNew) {
      setData((prev) => prev.filter((x) => x.id !== r.id));
      return;
    }
    await remove.mutateAsync(r.id);
    notify.success("Đã xóa");
  };

  const columns: ColumnsType<EditableRow> = useMemo(
    () => [
      {
        title: "Địa chỉ",
        dataIndex: "addressLine",
        width: 520,
        render: (_, r) => {
          if (!isEditing(r)) {
            return (
              <div style={{ lineHeight: 1.35 }}>
                <div style={{ fontWeight: 500 }}>{r.addressLine}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  {fmt(r.validFrom)} <span style={{ margin: "0 6px" }}>→</span>
                  {r.validTo ? (
                    <span>{formatDateOnly(r.validTo)}</span>
                  ) : (
                    <Tag
                      color="green"
                      style={{ marginInlineStart: 0, borderRadius: 999 }}
                    >
                      Hiện tại
                    </Tag>
                  )}
                </div>
              </div>
            );
          }

          return (
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Form.Item
                name="addressLine"
                style={{ margin: 0 }}
                rules={[{ required: true, message: "Nhập địa chỉ" }]}
              >
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>

              <div style={{ display: "flex", gap: 8 }}>
                <Form.Item
                  name="validFrom"
                  style={{ margin: 0 }}
                  rules={[{ required: true, message: "Chọn từ ngày" }]}
                >
                  <DatePicker format="DD/MM/YYYY" />
                </Form.Item>

                <Form.Item name="note" style={{ margin: 0, flex: 1 }}>
                  <Input placeholder="Ghi chú (tuỳ chọn)" />
                </Form.Item>
              </div>

              <div style={{ fontSize: 12, color: "#6B7280" }}>
                * Không nhập “Đến ngày”. Hệ thống tự chốt ngày kết thúc địa chỉ
                cũ khi bạn thêm địa chỉ mới.
              </div>
            </Space>
          );
        },
      },
      {
        title: "Ghi chú",
        dataIndex: "note",
        width: 240,
        render: (_, r) => {
          if (isEditing(r)) return null;
          return (
            <span style={{ color: r.note ? "#111827" : "#9CA3AF" }}>
              {r.note || "—"}
            </span>
          );
        },
      },
      {
        title: "",
        width: 96,
        fixed: "right",
        align: "right",
        render: (_, r) => {
          const editing = isEditing(r);

          if (editing) {
            return (
              <Space size={6}>
                <Tooltip title="Lưu">
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={() => saveRow(r)}
                    loading={create.isPending}
                  />
                </Tooltip>
                <Tooltip title="Hủy">
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={cancelEdit}
                  />
                </Tooltip>
              </Space>
            );
          }

          return (
            <Space size={6}>
              <Tooltip title="Sửa">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => startEdit(r)}
                  disabled={!!editingKey}
                />
              </Tooltip>

              <Popconfirm
                title="Xóa địa chỉ này?"
                okText="Xóa"
                cancelText="Hủy"
                onConfirm={() => deleteRow(r)}
                disabled={!!editingKey}
              >
                <Tooltip title="Xóa">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!!editingKey}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [editingKey, create.isPending, update.isPending]
  );

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (editingKey) {
          return notify.warning("Đang sửa một dòng. Hãy lưu hoặc hủy trước.");
        }
        onClose();
      }}
      footer={null}
      width={980}
      title={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Typography.Text strong style={{ fontSize: 16 }}>
              📍 Lịch sử địa chỉ
            </Typography.Text>
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              Địa chỉ xuất hóa đơn theo thời gian
            </div>
          </div>
        </div>
      }
      destroyOnClose
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <Typography.Text type="secondary">
          {customerName ? `Khách: ${customerName}` : ""}
        </Typography.Text>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={addNewRow}
          disabled={!!editingKey}
        >
          Thêm địa chỉ
        </Button>
      </div>

      <Form form={form} component={false}>
        <Table<EditableRow>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={false}
          // scroll={{ x: 920, y: 520 }}
        />
      </Form>
    </Modal>
  );
}
