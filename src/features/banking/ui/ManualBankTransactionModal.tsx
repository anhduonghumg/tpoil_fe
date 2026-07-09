import { DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useBankAccountsOptions, useCreateManualBankTransaction } from "../hooks";
import type { CreateManualBankTransactionPayload } from "../types";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
};

export function ManualBankTransactionModal({
  open,
  onCancel,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const accountsQuery = useBankAccountsOptions();
  const createMutation = useCreateManualBankTransaction();

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: CreateManualBankTransactionPayload = {
      bankAccountId: values.bankAccountId,
      txnDate: values.txnDate.format("YYYY-MM-DD"),
      direction: values.direction,
      amount: Number(values.amount || 0),
      description: values.description,
      counterpartyName: values.counterpartyName || undefined,
      counterpartyAcc: values.counterpartyAcc || undefined,
      externalRef: values.externalRef || undefined,
      documentCode: values.documentCode || undefined,
      purposeRaw: values.purposeRaw || undefined,
      note: values.note || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        form.resetFields();
        onSuccess();
        onCancel();
      },
    });
  };

  return (
    <Modal
      open={open}
      title="Thêm giao dịch thủ công"
      okText="Lưu"
      cancelText="Hủy"
      width={720}
      confirmLoading={createMutation.isPending}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          txnDate: dayjs(),
          direction: "OUT",
        }}
      >
        <Form.Item
          name="bankAccountId"
          label="Tài khoản ngân hàng"
          rules={[{ required: true, message: "Chọn tài khoản ngân hàng" }]}
        >
          <Select
            showSearch
            loading={accountsQuery.isLoading}
            placeholder="Chọn tài khoản"
            optionFilterProp="label"
            options={(accountsQuery.data || []).map((x: any) => ({
              value: x.id,
              label: `${x.bankCode} - ${x.accountNo}${
                x.accountName ? ` - ${x.accountName}` : ""
              }`,
            }))}
          />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Form.Item
            name="txnDate"
            label="Ngày giao dịch"
            rules={[{ required: true, message: "Chọn ngày giao dịch" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="direction"
            label="Thu/Chi"
            rules={[{ required: true, message: "Chọn thu/chi" }]}
          >
            <Select
              options={[
                { value: "OUT", label: "Chi" },
                { value: "IN", label: "Thu" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền"
            rules={[{ required: true, message: "Nhập số tiền" }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value || ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(value) => Number(String(value || "").replace(/\./g, ""))}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="description"
          label="Nội dung giao dịch"
          rules={[{ required: true, message: "Nhập nội dung giao dịch" }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item name="counterpartyName" label="Đối tượng">
            <Input />
          </Form.Item>
          <Form.Item name="counterpartyAcc" label="Số tài khoản đối ứng">
            <Input />
          </Form.Item>
          <Form.Item name="externalRef" label="Mã tham chiếu">
            <Input />
          </Form.Item>
          <Form.Item name="documentCode" label="Mã chứng từ/đơn hàng">
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
