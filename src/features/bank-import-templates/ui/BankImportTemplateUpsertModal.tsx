import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  BANK_IMPORT_TEMPLATE_PRESET_BY_KEY,
  BANK_IMPORT_TEMPLATE_PRESETS,
  findPresetByBankCode,
  type BankImportPresetKey,
} from "../presets";
import type {
  BankImportColumnMap,
  BankImportNormalizeRule,
  BankImportTemplate,
  UpsertBankImportTemplatePayload,
} from "../types";

type Props = {
  open: boolean;
  initialValue?: BankImportTemplate | null;
  defaultPresetKey?: BankImportPresetKey;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpsertBankImportTemplatePayload) => void;
};

type TemplateFormValues = {
  presetKey?: BankImportPresetKey;
  bankCode: string;
  name: string;
  version: number;
  isActive: boolean;
  sheetName?: string;
  headerRow: number;
  amountMode: "DEBIT_CREDIT" | "SIGNED_AMOUNT";
  date: string;
  valueDate?: string;
  description: string;
  amount?: string;
  debit?: string;
  credit?: string;
  direction?: string;
  counterpartyName?: string;
  counterpartyAcc?: string;
  externalRef?: string;
  documentCode?: string;
  purpose?: string;
  balance?: string;
  skipEmptyRows: boolean;
  fileFormat: "XLSX" | "HTML_XLS" | "BINARY_XLS";
};

const optionalColumnKeys = [
  "sheetName",
  "valueDate",
  "amount",
  "debit",
  "credit",
  "direction",
  "counterpartyName",
  "counterpartyAcc",
  "externalRef",
  "documentCode",
  "purpose",
  "balance",
] as const;

function cleanText(value?: string) {
  const text = value?.trim();
  return text || undefined;
}

function valuesFromPreset(key: BankImportPresetKey): TemplateFormValues {
  const preset = BANK_IMPORT_TEMPLATE_PRESET_BY_KEY[key];
  return {
    presetKey: key,
    bankCode: preset.bankCode,
    name: preset.name,
    version: 1,
    isActive: true,
    amountMode: preset.amountMode,
    skipEmptyRows: preset.normalizeRule.skipEmptyRows !== false,
    fileFormat: preset.normalizeRule.fileFormat ?? "XLSX",
    ...preset.columnMap,
  };
}

function valuesFromTemplate(template: BankImportTemplate): TemplateFormValues {
  const preset = findPresetByBankCode(template.bankCode);
  return {
    presetKey: preset?.key,
    bankCode: template.bankCode,
    name: template.name,
    version: template.version,
    isActive: template.isActive,
    amountMode: template.columnMap.amount ? "SIGNED_AMOUNT" : "DEBIT_CREDIT",
    skipEmptyRows: template.normalizeRule?.skipEmptyRows !== false,
    fileFormat: template.normalizeRule?.fileFormat ?? "XLSX",
    ...template.columnMap,
  };
}

export default function BankImportTemplateUpsertModal({
  open,
  initialValue,
  defaultPresetKey,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<TemplateFormValues>();
  const [baseNormalizeRule, setBaseNormalizeRule] =
    useState<BankImportNormalizeRule>({});
  const values = Form.useWatch([], form);

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      form.setFieldsValue(valuesFromTemplate(initialValue));
      setBaseNormalizeRule(initialValue.normalizeRule ?? {});
      return;
    }

    if (defaultPresetKey) {
      const preset = BANK_IMPORT_TEMPLATE_PRESET_BY_KEY[defaultPresetKey];
      form.setFieldsValue(valuesFromPreset(defaultPresetKey));
      setBaseNormalizeRule(preset.normalizeRule);
      return;
    }

    form.setFieldsValue(valuesFromPreset("BIDV"));
    setBaseNormalizeRule(BANK_IMPORT_TEMPLATE_PRESET_BY_KEY.BIDV.normalizeRule);
  }, [defaultPresetKey, form, initialValue, open]);

  const activePreset = values?.presetKey
    ? BANK_IMPORT_TEMPLATE_PRESET_BY_KEY[values.presetKey]
    : undefined;

  const mappingTags = useMemo(() => {
    const tags: Array<{ label: string; value?: string }> = [
      { label: "Ngày GD", value: values?.date },
      { label: "Nội dung", value: values?.description },
      values?.amountMode === "SIGNED_AMOUNT"
        ? { label: "Số tiền +/-", value: values?.amount }
        : { label: "Ghi có", value: values?.credit },
      ...(values?.amountMode === "DEBIT_CREDIT"
        ? [{ label: "Ghi nợ", value: values?.debit }]
        : []),
      { label: "Mã tham chiếu", value: values?.externalRef },
      { label: "Người chuyển", value: values?.counterpartyName },
    ];
    return tags.filter((item) => item.value);
  }, [values]);

  const applyPreset = (key: BankImportPresetKey) => {
    const preset = BANK_IMPORT_TEMPLATE_PRESET_BY_KEY[key];
    form.setFieldsValue(valuesFromPreset(key));
    setBaseNormalizeRule(preset.normalizeRule);
  };

  const handleFinish = (formValues: TemplateFormValues) => {
    if (
      formValues.amountMode === "DEBIT_CREDIT" &&
      !cleanText(formValues.credit) &&
      !cleanText(formValues.debit)
    ) {
      form.setFields([
        { name: "credit", errors: ["Nhập ít nhất cột ghi có hoặc ghi nợ"] },
        { name: "debit", errors: ["Nhập ít nhất cột ghi có hoặc ghi nợ"] },
      ]);
      return;
    }

    const columnMap: BankImportColumnMap = {
      headerRow: Number(formValues.headerRow || 1),
      date: formValues.date.trim(),
      description: formValues.description.trim(),
    };

    for (const key of optionalColumnKeys) {
      const value = cleanText(formValues[key]);
      if (value) columnMap[key] = value as never;
    }

    if (formValues.amountMode === "SIGNED_AMOUNT") {
      delete columnMap.credit;
      delete columnMap.debit;
    } else {
      delete columnMap.amount;
      delete columnMap.direction;
    }

    onSubmit({
      bankCode: formValues.bankCode.trim().toUpperCase(),
      name: formValues.name.trim(),
      version: Number(formValues.version || 1),
      columnMap,
      normalizeRule: {
        ...baseNormalizeRule,
        skipEmptyRows: formValues.skipEmptyRows,
        fileFormat: formValues.fileFormat,
      },
      isActive: Boolean(formValues.isActive),
    });
  };

  return (
    <Modal
      open={open}
      title={initialValue ? "Sửa mẫu import sao kê" : "Tạo mẫu import sao kê"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={initialValue ? "Lưu thay đổi" : "Tạo mẫu"}
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnHidden
      width={960}
    >
      <Form<TemplateFormValues>
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 12 }}
      >
        <Alert
          showIcon
          type="info"
          message="Chọn mẫu ngân hàng để điền sẵn đúng cấu trúc file"
          description="Tên cột phải khớp chính xác với dòng tiêu đề trong file sao kê. Bạn chỉ cần sửa khi ngân hàng thay đổi mẫu xuất file."
          style={{ marginBottom: 16 }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Form.Item label="Mẫu ngân hàng" name="presetKey">
            <Select
              placeholder="Chọn cấu trúc có sẵn"
              onChange={applyPreset}
              options={BANK_IMPORT_TEMPLATE_PRESETS.map((preset) => ({
                value: preset.key,
                label: `${preset.bankName} — ${preset.fileLabel}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Mã ngân hàng"
            name="bankCode"
            rules={[{ required: true, message: "Nhập mã ngân hàng" }]}
          >
            <Input placeholder="BIDV, MB, AGRIBANK, VCB..." />
          </Form.Item>

          <Form.Item
            label="Tên mẫu"
            name="name"
            rules={[{ required: true, message: "Nhập tên mẫu" }]}
          >
            <Input placeholder="Ví dụ: BIDV - Báo cáo chi tiết số dư" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label="Phiên bản"
              name="version"
              rules={[{ required: true, message: "Nhập phiên bản" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Đang sử dụng" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>
        </div>

        {activePreset ? (
          <Alert
            type="success"
            showIcon
            message={activePreset.note}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Divider orientation="left">Vị trí dữ liệu trong file</Divider>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
          <Form.Item label="Tên sheet" name="sheetName">
            <Input placeholder="Để trống sẽ lấy sheet đầu tiên" />
          </Form.Item>
          <Form.Item
            label="Dòng tiêu đề"
            name="headerRow"
            rules={[{ required: true, message: "Nhập dòng tiêu đề" }]}
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Định dạng file" name="fileFormat">
            <Select
              options={[
                { value: "XLSX", label: "Excel .xlsx" },
                { value: "HTML_XLS", label: "Excel .xls dạng HTML" },
                { value: "BINARY_XLS", label: "Excel .xls 97-2003" },
              ]}
            />
          </Form.Item>
        </div>

        <Divider orientation="left">Các cột bắt buộc</Divider>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Form.Item
            label="Cột ngày giao dịch"
            name="date"
            rules={[{ required: true, message: "Nhập tên cột ngày giao dịch" }]}
          >
            <Input placeholder="Ngày giao dịch" />
          </Form.Item>
          <Form.Item
            label="Cột nội dung"
            name="description"
            rules={[{ required: true, message: "Nhập tên cột nội dung" }]}
          >
            <Input placeholder="Nội dung" />
          </Form.Item>
        </div>

        <Form.Item label="Cách thể hiện số tiền" name="amountMode">
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio.Button value="DEBIT_CREDIT">Hai cột ghi nợ / ghi có</Radio.Button>
            <Radio.Button value="SIGNED_AMOUNT">Một cột số tiền +/-</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, next) => prev.amountMode !== next.amountMode}>
          {({ getFieldValue }) =>
            getFieldValue("amountMode") === "SIGNED_AMOUNT" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item
                  label="Cột số tiền"
                  name="amount"
                  rules={[{ required: true, message: "Nhập tên cột số tiền" }]}
                >
                  <Input placeholder="Số tiền giao dịch" />
                </Form.Item>
                <Form.Item label="Cột Thu/Chi (nếu có)" name="direction">
                  <Input placeholder="Loại giao dịch" />
                </Form.Item>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item label="Cột ghi nợ / tiền ra" name="debit">
                  <Input placeholder="Ghi nợ" />
                </Form.Item>
                <Form.Item label="Cột ghi có / tiền vào" name="credit">
                  <Input placeholder="Ghi có" />
                </Form.Item>
              </div>
            )
          }
        </Form.Item>

        <Collapse
          ghost
          items={[
            {
              key: "optional-columns",
              label: "Cột mở rộng để đối soát chính xác hơn",
              children: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <Form.Item label="Ngày hạch toán" name="valueDate">
                    <Input placeholder="Ngày hạch toán" />
                  </Form.Item>
                  <Form.Item label="Mã tham chiếu / bút toán" name="externalRef">
                    <Input placeholder="Số tham chiếu" />
                  </Form.Item>
                  <Form.Item label="Người chuyển / đối tác" name="counterpartyName">
                    <Input placeholder="Đơn vị chuyển" />
                  </Form.Item>
                  <Form.Item label="Tài khoản đối ứng" name="counterpartyAcc">
                    <Input placeholder="Tài khoản đối ứng" />
                  </Form.Item>
                  <Form.Item label="Mã hóa đơn / đơn hàng" name="documentCode">
                    <Input placeholder="Mã chứng từ" />
                  </Form.Item>
                  <Form.Item label="Mục đích giao dịch" name="purpose">
                    <Input placeholder="Mục đích" />
                  </Form.Item>
                  <Form.Item label="Số dư sau giao dịch" name="balance">
                    <Input placeholder="Số dư" />
                  </Form.Item>
                  <Form.Item
                    label="Bỏ qua dòng trống"
                    name="skipEmptyRows"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />

        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <Typography.Text type="secondary">Ánh xạ sẽ lưu</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Space size={[6, 6]} wrap>
              {mappingTags.map((item) => (
                <Tag key={item.label} color="blue">
                  {item.label}: {item.value}
                </Tag>
              ))}
            </Space>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
