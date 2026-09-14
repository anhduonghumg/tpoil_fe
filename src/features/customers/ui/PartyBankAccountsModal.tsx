import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { PartyBankAccount } from "../types";
import { usePartyBankAccounts } from "../hooks";
import { notify } from "../../../shared/lib/notification";

type EditableRow = PartyBankAccount & { id: string; isNew?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  /** Màn NCC nói về thanh toán đi, màn khách hàng nói về tiền về. */
  partyKind?: "CUSTOMER" | "SUPPLIER";
};

export default function PartyBankAccountsModal({
  open,
  onClose,
  customerId,
  customerName,
  partyKind = "SUPPLIER",
}: Props) {
  const { list, create, update, remove } = usePartyBankAccounts(
    open ? customerId : undefined,
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
      bankName: r.bankName ?? "",
      accountNo: r.accountNo ?? "",
      accountName: r.accountName ?? "",
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
      bankName: "",
      accountNo: "",
      accountName: customerName ?? "",
      // Tài khoản đầu tiên mặc nhiên là mặc định, nếu không sẽ không có gì để điền sẵn.
      isDefault: data.length === 0,
      isActive: true,
      isNew: true,
    };
    setData((prev) => [newRow, ...prev]);
    startEdit(newRow);
  };

  const saveRow = async (r: EditableRow) => {
    try {
      const values = await form.validateFields();
      const payload = {
        bankName: String(values.bankName ?? "").trim(),
        accountNo: String(values.accountNo ?? "").trim(),
        accountName: String(values.accountName ?? "").trim(),
      };

      if (r.isNew) {
        await create.mutateAsync({ ...payload, isDefault: r.isDefault });
      } else {
        await update.mutateAsync({ accountId: r.id, data: payload });
      }

      setEditingKey("");
      form.resetFields();
    } catch (e: any) {
      if (e?.errorFields) return;
      notify.error(e?.response?.data?.message || e?.message || "Lưu thất bại");
    }
  };

  const columns: ColumnsType<EditableRow> = [
    {
      title: "Ngân hàng",
      dataIndex: "bankName",
      width: 200,
      render: (_, r) =>
        isEditing(r) ? (
          <Form.Item
            name="bankName"
            style={{ margin: 0 }}
            rules={[{ required: true, message: "Nhập tên ngân hàng" }]}
          >
            <Input size="small" placeholder="VD: Vietcombank" />
          </Form.Item>
        ) : (
          <span>{r.bankName}</span>
        ),
    },
    {
      title: "Số tài khoản",
      dataIndex: "accountNo",
      width: 200,
      render: (_, r) =>
        isEditing(r) ? (
          <Form.Item
            name="accountNo"
            style={{ margin: 0 }}
            rules={[{ required: true, message: "Nhập số tài khoản" }]}
          >
            <Input size="small" placeholder="Số tài khoản" />
          </Form.Item>
        ) : (
          <Typography.Text copyable={{ text: r.accountNo }}>
            {r.accountNo}
          </Typography.Text>
        ),
    },
    {
      title: "Chủ tài khoản",
      dataIndex: "accountName",
      render: (_, r) =>
        isEditing(r) ? (
          <Form.Item
            name="accountName"
            style={{ margin: 0 }}
            rules={[{ required: true, message: "Nhập tên chủ tài khoản" }]}
          >
            <Input size="small" placeholder="Tên chủ tài khoản" />
          </Form.Item>
        ) : (
          <span>{r.accountName}</span>
        ),
    },
    {
      title: "Trạng thái",
      width: 190,
      render: (_, r) => {
        if (r.isNew) return <Tag>Chưa lưu</Tag>;
        return (
          <Space size={4}>
            {r.isDefault ? (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Mặc định
              </Tag>
            ) : (
              r.isActive !== false && (
                <Tooltip title="Dùng tài khoản này khi lập chứng từ">
                  <Button
                    size="small"
                    onClick={() =>
                      update.mutate({
                        accountId: r.id,
                        data: { isDefault: true },
                      })
                    }
                  >
                    Đặt mặc định
                  </Button>
                </Tooltip>
              )
            )}
            {r.isActive === false && <Tag color="default">Ngừng dùng</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Dùng",
      width: 70,
      align: "center",
      render: (_, r) =>
        r.isNew ? null : (
          <Tooltip title="Tắt để tài khoản không còn xuất hiện trong ô chọn">
            <Switch
              size="small"
              checked={r.isActive !== false}
              onChange={(checked) =>
                update.mutate({ accountId: r.id, data: { isActive: checked } })
              }
            />
          </Tooltip>
        ),
    },
    {
      title: "",
      width: 100,
      align: "right",
      render: (_, r) =>
        isEditing(r) ? (
          <Space size={4}>
            <Tooltip title="Lưu">
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => saveRow(r)}
              />
            </Tooltip>
            <Tooltip title="Hủy">
              <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit} />
            </Tooltip>
          </Space>
        ) : (
          <Space size={4}>
            <Tooltip title="Sửa">
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={Boolean(editingKey)}
                onClick={() => startEdit(r)}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa tài khoản này?"
              description="Nếu tài khoản đã gắn với đề nghị thanh toán thì hệ thống chỉ ngừng sử dụng chứ không xóa."
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => remove.mutate(r.id)}
            >
              <Tooltip title="Xóa">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={Boolean(editingKey)}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnClose
      title={
        <Space direction="vertical" size={0}>
          <span>Tài khoản ngân hàng</span>
          {customerName && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {customerName}
            </Typography.Text>
          )}
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message={
          partyKind === "SUPPLIER"
            ? "Đề nghị thanh toán lấy tài khoản mặc định để điền sẵn thông tin thụ hưởng."
            : "Dùng để nhận diện khách hàng khi đối soát tiền chuyển về."
        }
      />

      <Space style={{ marginBottom: 8 }}>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={addNewRow}
          disabled={Boolean(editingKey)}
        >
          Thêm tài khoản
        </Button>
      </Space>

      <Form form={form} component={false}>
        <Table<EditableRow>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={false}
          locale={{ emptyText: "Chưa có tài khoản nào" }}
        />
      </Form>
    </Modal>
  );
}
