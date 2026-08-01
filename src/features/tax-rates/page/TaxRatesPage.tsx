import React, { useState } from "react"
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons"
import { useCreateVatRate, useDeleteVatRate, useUpdateVatRate, useVatRates } from "../hooks"
import type { UpsertVatRatePayload, VatRate } from "../types"

export default function TaxRatesPage() {
  const [form] = Form.useForm<UpsertVatRatePayload>()
  const [editing, setEditing] = useState<VatRate | null>(null)
  const [open, setOpen] = useState(false)
  const ratesQuery = useVatRates()
  const create = useCreateVatRate()
  const update = useUpdateVatRate()
  const remove = useDeleteVatRate()

  const close = () => {
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ rate: 10, isActive: true, isExempt: false, isDefault: false, sortOrder: 0 })
    setOpen(true)
  }

  const openEdit = (row: VatRate) => {
    setEditing(row)
    form.setFieldsValue({
      name: row.name,
      rate: Number(row.rate),
      isExempt: row.isExempt,
      isActive: row.isActive,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = { ...values, rate: values.isExempt ? 0 : Number(values.rate) }
    if (editing) await update.mutateAsync({ id: editing.id, data: payload })
    else await create.mutateAsync(payload)
    message.success("Đã lưu mức thuế")
    close()
  }

  const columns: ColumnsType<VatRate> = [
    { title: "Tên mức thuế", dataIndex: "name", render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: "Thuế suất", dataIndex: "rate", width: 150, render: (value, row) => row.isExempt ? "Không chịu thuế" : `${Number(value)}%` },
    { title: "Thứ tự", dataIndex: "sortOrder", width: 100 },
    { title: "Trạng thái", dataIndex: "isActive", width: 130, render: (value) => value ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngừng dùng</Tag> },
    { title: "VAT hiện tại", dataIndex: "isDefault", width: 130, render: (value) => value ? <Tag color="blue">Đang áp dụng</Tag> : "-" },
    {
      title: "",
      width: 92,
      render: (_, row) => (
        <Space size={2}>
          <Button size="small" type="text" icon={<EditOutlined />} title="Sửa" onClick={() => openEdit(row)} />
          <Popconfirm title="Xóa mức thuế này?" okText="Xóa" cancelText="Hủy" onConfirm={async () => { await remove.mutateAsync(row.id); message.success("Đã xóa mức thuế") }}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} title="Xóa" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <main className="commercial-lot-page">
      <div className="commercial-lot-header">
        <div>
          <Typography.Title level={3} className="commercial-lot-title">Danh mục thuế GTGT</Typography.Title>
          <Typography.Text type="secondary">Dùng chung cho các đơn mua.</Typography.Text>
        </div>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm mức thuế</Button>
      </div>
      <Table<VatRate> size="small" rowKey="id" loading={ratesQuery.isLoading} columns={columns} dataSource={ratesQuery.data ?? []} pagination={false} />
      <Modal open={open} title={editing ? "Cập nhật mức thuế" : "Thêm mức thuế"} onCancel={close} onOk={save} confirmLoading={create.isPending || update.isPending} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="name" label="Tên mức thuế" rules={[{ required: true, message: "Nhập tên mức thuế" }]}><Input placeholder="Ví dụ: 10% hoặc Không chịu thuế" /></Form.Item>
          <Form.Item name="isExempt" label="Không chịu thuế" valuePropName="checked"><Switch size="small" /></Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.isExempt !== current.isExempt}>
            {({ getFieldValue }) => !getFieldValue("isExempt") && <Form.Item name="rate" label="Thuế suất (%)" rules={[{ required: true, message: "Nhập thuế suất" }]}><InputNumber min={0} max={100} style={{ width: "100%" }} /></Form.Item>}
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="isActive" label="Đang áp dụng" valuePropName="checked"><Switch size="small" /></Form.Item>
          <Form.Item name="isDefault" label="VAT hiện tại" valuePropName="checked"><Switch size="small" /></Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
