import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Segmented, Select } from "antd";
import dayjs from "dayjs";
import { useBankAccountsOptions, useCreateManualBankTransaction } from "../hooks";
import type { CreateManualBankTransactionPayload } from "../types";
import "../banking.css";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  defaultDirection?: "IN" | "OUT";
};

export function ManualBankTransactionModal({
  open,
  onCancel,
  onSuccess,
  defaultDirection = "OUT",
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
      className="banking-modal"
      open={open}
      title="Thêm giao dịch thủ công"
      okText="Lưu"
      cancelText="Hủy"
      width={680}
      confirmLoading={createMutation.isPending}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnHidden
    >
      <Form
        className="banking-form"
        form={form}
        layout="vertical"
        initialValues={{
          txnDate: dayjs(),
          direction: defaultDirection,
        }}
      >
        <Row gutter={10}>
          <Col span={16}>
            <Form.Item name="bankAccountId" label="Tài khoản ngân hàng" rules={[{ required: true, message: "Chọn tài khoản ngân hàng" }]}>
              <Select
                showSearch
                loading={accountsQuery.isLoading}
                placeholder="Chọn tài khoản"
                optionFilterProp="label"
                options={(accountsQuery.data || []).map((x: any) => ({
                  value: x.id,
                  label: `${x.bankCode} · ${x.accountNo}${x.accountName ? ` — ${x.accountName}` : ""}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="direction" label="Thu / Chi" rules={[{ required: true, message: "Chọn thu/chi" }]}>
              <Segmented
                block
                options={[
                  { value: "IN", label: "Tiền vào" },
                  { value: "OUT", label: "Tiền ra" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="txnDate" label="Ngày giao dịch" rules={[{ required: true, message: "Chọn ngày giao dịch" }]}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="amount" label="Số tiền (VND)" rules={[{ required: true, message: "Nhập số tiền" }]}>
              <InputNumber<number>
                min={0}
                precision={0}
                style={{ width: "100%" }}
                formatter={(value) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(value) => Number(String(value || "").replace(/\./g, ""))}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label="Nội dung giao dịch" rules={[{ required: true, message: "Nhập nội dung giao dịch" }]}>
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder="Như trên sao kê, vd. CTY THUY DUONG TRA TIEN HANG" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="counterpartyName" label="Đối tượng">
              <Input placeholder="Người chuyển / người nhận" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="counterpartyAcc" label="STK đối ứng">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="externalRef" label="Mã tham chiếu">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="documentCode" label="Mã chứng từ / đơn hàng">
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
