import React from "react";
import {
  Alert,
  Button,
  Col,
  ConfigProvider,
  DatePicker,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import {
  InfoCircleOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import dayjs from "dayjs";
import type {
  MerchantRole,
  MerchantRolePeriod,
  PartnerRole,
  PartyType,
} from "../types";
import { MERCHANT_ROLE_HINTS, MERCHANT_ROLE_LABELS } from "../types";
import { notify } from "../../../shared/lib/notification";
import { normalizeCode } from "../../../shared/lib/helper";
import { useGenerateCustomerCode } from "../hooks";
import TextArea from "antd/es/input/TextArea";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import CustomerGroupSelect from "./CustomerGroupSelect";

/**
 * Ba loại thương nhân xăng dầu. Thay cho bộ "Vai trò" (Đại lý/Bán lẻ/Bán buôn) cũ vốn
 * chồng lấn với chính nó và với "Loại hình" — cùng một chuyện khai ba chỗ.
 */
const MERCHANT_ROLE_OPTIONS = (Object.keys(MERCHANT_ROLE_LABELS) as MerchantRole[]).map(
  (value) => ({
    value,
    label: `${value} — ${MERCHANT_ROLE_LABELS[value]}`,
    title: MERCHANT_ROLE_HINTS[value],
  }),
);

/**
 * Khách hàng / Nhà cung cấp không nằm trong danh sách này: hai vai trò đó được suy ra từ
 * loại thương nhân (TNPP mua và bán, TNDM chỉ bán cho ta, TNDL chỉ mua của ta). Chỉ đối
 * tác dịch vụ — không mua bán xăng dầu — mới cần tick tay, nên chúng chỉ hiện khi bỏ
 * trống ô loại thương nhân.
 */
const SERVICE_PARTNER_ROLE_OPTIONS = [
  { label: "Chủ tàu", value: "SHIP_OWNER" },
  { label: "Đơn vị vận tải biển", value: "SEA_CARRIER" },
] as const;

const TRADE_PARTNER_ROLE_OPTIONS = [
  { label: "Khách hàng", value: "CUSTOMER" },
  { label: "Nhà cung cấp", value: "SUPPLIER" },
  { label: "Nội bộ", value: "INTERNAL" },
] as const;

const VIETQR_TAX_ENDPOINT = "https://api.vietqr.io/v2/business/{taxCode}";

async function vietqrFetchByTax(taxCode: string) {
  const url = VIETQR_TAX_ENDPOINT.replace(
    "{taxCode}",
    encodeURIComponent(taxCode)
  );
  if (!url) throw new Error("Chưa cấu hình VietQR endpoint trên FE");
  const res = await fetch(url);
  if (!res.ok) throw new Error("VietQR trả về lỗi");
  return res.json() as Promise<{
    data?: { name?: string; address?: string };
    code: string;
    desc?: string;
  }>;
}

const fmtDate = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "");

interface CustomerCompactFormProps {
  form: FormInstance;
  onFinish?: (values: any) => void;
  partyTypeDefault?: PartyType;
  partnerRoleDefault?: PartnerRole;
  /** Các kỳ phân loại thương nhân đã có; chỉ hiện khi sửa hồ sơ. */
  merchantHistory?: MerchantRolePeriod[];
}

export default function CustomerCompactForm({
  form,
  onFinish,
  partyTypeDefault = "CUSTOMER",
  partnerRoleDefault,
  merchantHistory,
}: CustomerCompactFormProps) {
  const gen = useGenerateCustomerCode();

  const isSupplierScreen = partyTypeDefault === "SUPPLIER";
  const partyNoun = isSupplierScreen ? "nhà cung cấp" : "khách hàng";

  const defaultPartnerRole: PartnerRole = isSupplierScreen
    ? "SUPPLIER"
    : partyTypeDefault === "INTERNAL"
    ? "INTERNAL"
    : "CUSTOMER";

  const merchantRole = Form.useWatch<MerchantRole | undefined>(
    "merchantRole",
    form,
  );

  const partnerRoleOptions = merchantRole
    ? SERVICE_PARTNER_ROLE_OPTIONS
    : [...TRADE_PARTNER_ROLE_OPTIONS, ...SERVICE_PARTNER_ROLE_OPTIONS];

  const currentMerchant = merchantHistory?.find((p) => p.isCurrent);

  const handleGenerateCode = async () => {
    try {
      const code: any = await gen.mutateAsync();
      form.setFieldsValue({ code: code?.code });
      notify.success("Đã tạo mã tự động");
    } catch (e: any) {
      notify.error(e?.message || "Lỗi tạo mã");
    }
  };

  const handleReadTax = async () => {
    const taxCode = form.getFieldValue("taxCode");
    if (!taxCode) return notify.warning("Nhập mã số thuế trước");
    try {
      const json = await vietqrFetchByTax(taxCode);
      if (json?.code === "00") {
        const name = json?.data?.name;
        const address = json?.data?.address;
        if (name) form.setFieldsValue({ name });
        if (address) form.setFieldsValue({ billingAddress: address });

        form.setFieldsValue({ taxVerified: true, taxSource: "Other" });
        notify.success("Đã đọc thông tin từ MST (VietQR)");
      } else {
        notify.warning(json?.desc || "Không lấy được thông tin từ MST");
      }
    } catch (e: any) {
      notify.error(e?.message || "Không đọc được MST");
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: { fontSize: 13, lineHeight: 1.3, borderRadius: 8 },
        components: {
          Form: { itemMarginBottom: 8 },
          Input: { controlHeight: 32 },
          Select: { controlHeight: 32, controlHeightLG: 36 },
          InputNumber: { controlHeight: 32 },
          Button: { controlHeight: 32 },
          Divider: { marginLG: 12, marginSM: 8 },
          Checkbox: { borderRadius: 8 },
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        className="form-compact"
        initialValues={{
          partnerRoles: [partnerRoleDefault ?? defaultPartnerRole],
        }}
        onFinish={onFinish}
      >
        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Thông tin định danh
        </Divider>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={6} lg={6}>
            <Form.Item
              name="code"
              rules={[{ required: true, message: `Nhập mã ${partyNoun}` }]}
              label={
                <Space>
                  {`Mã ${partyNoun}`}
                  <Tooltip title="In hoa, viết liền, không dấu. Có thể để trống để hệ thống tạo.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <Input
                size="small"
                placeholder={isSupplierScreen ? "VD: NCC2025-0001" : "VD: KH2025-0001-TPOIL"}
                onBlur={(e) =>
                  form.setFieldsValue({ code: normalizeCode(e.target.value) })
                }
                suffix={
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={handleGenerateCode}
                  >
                    Tạo
                  </Button>
                }
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={6} lg={6}>
            <Form.Item
              name="taxCode"
              label="Mã số thuế"
              rules={[{ required: true, message: "Nhập mã số thuế" }]}
            >
              <Input
                size="small"
                placeholder="Nhập MST"
                suffix={
                  <Button
                    size="small"
                    icon={<SearchOutlined />}
                    onClick={handleReadTax}
                  >
                    Đọc MST
                  </Button>
                }
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={6} lg={6}>
            <Form.Item
              name="name"
              label={`Tên ${partyNoun}`}
              rules={[{ required: true, message: `Nhập tên ${partyNoun}` }]}
            >
              <Input size="small" placeholder="Tên đối tác trên giấy phép kinh doanh" />
            </Form.Item>
          </Col>

          <Col xs={24} md={6}>
            <Form.Item name="groupId" label="Nhóm đối tác">
              <CustomerGroupSelect size="small" placeholder="Chọn nhóm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={12}>
            <Form.Item name="billingAddress" label="Địa chỉ xuất HĐ">
              <Input.TextArea
                size="small"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="shippingAddress"
              label={isSupplierScreen ? "Địa chỉ giao hàng" : "Địa chỉ nhận hàng"}
            >
              <Input.TextArea
                size="small"
                placeholder="Nếu khác địa chỉ xuất HĐ"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Liên hệ
        </Divider>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="contactEmail"
              label="Email"
              rules={[{ type: "email", message: "Email không hợp lệ" }]}
            >
              <Input size="small" placeholder="name@company.com" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="contactPhone"
              label="Điện thoại"
              rules={[
                { pattern: /^0\d{9}$/, message: "Số điện thoại không hợp lệ" },
              ]}
            >
              <Input size="small" placeholder="0967699999" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Phân loại thương nhân
        </Divider>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            {/*
              Loại thương nhân quyết định chiều giao dịch, và hệ thống tự suy ra
              khách hàng / nhà cung cấp từ đây — không khai hai lần nữa.
            */}
            <Form.Item
              name="merchantRole"
              label="Loại thương nhân xăng dầu"
              tooltip="Để trống nếu là đối tác dịch vụ (vận tải, giám định, bảo hiểm…) — họ không mua bán xăng dầu."
            >
              <Select
                size="small"
                allowClear
                placeholder="Không phải thương nhân xăng dầu"
                options={MERCHANT_ROLE_OPTIONS}
                optionLabelProp="label"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            {/*
              Phân loại đổi theo từng năm và chứng từ cũ phải đọc theo loại tại thời điểm
              của nó, nên kỳ mới cần ngày riêng chứ không mặc định là hôm nay.
            */}
            <Form.Item
              name="merchantEffectiveFrom"
              label={
                <Space>
                  Áp dụng từ ngày
                  <Tooltip title="Kỳ phân loại cũ được đóng lại ngay trước ngày này. Chứng từ trước đó vẫn tra ra loại thương nhân cũ.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <DatePicker
                size="small"
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder="Mặc định: hôm nay"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="partnerRoles"
              label="Vai trò đối tác"
              tooltip={
                merchantRole
                  ? "Khách hàng / Nhà cung cấp đã được suy ra từ loại thương nhân, chỉ chọn thêm vai trò dịch vụ nếu có."
                  : undefined
              }
              rules={[
                {
                  validator: async (_, v) => {
                    if (merchantRole) return;
                    if (Array.isArray(v) && v.length > 0) return;
                    throw new Error("Chọn ít nhất 1 vai trò");
                  },
                },
              ]}
            >
              <Select
                size="small"
                mode="multiple"
                allowClear
                placeholder={
                  merchantRole
                    ? "Thêm vai trò dịch vụ (nếu có)"
                    : "Chọn vai trò (có thể chọn nhiều)"
                }
                options={partnerRoleOptions as any}
                maxTagCount="responsive"
                optionFilterProp="label"
                showSearch
              />
            </Form.Item>
          </Col>
        </Row>

        {currentMerchant && (
          <Row gutter={[12, 8]}>
            <Col span={24}>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 8 }}
                message={
                  <span>
                    Đang áp dụng: <b>{currentMerchant.label}</b> từ{" "}
                    {fmtDate(currentMerchant.validFrom)}
                  </span>
                }
                description={
                  merchantHistory && merchantHistory.length > 1 ? (
                    <Space size={[6, 6]} wrap>
                      {merchantHistory
                        .filter((p) => !p.isCurrent)
                        .map((p) => (
                          <Tag key={p.id}>
                            {p.role}: {fmtDate(p.validFrom)} –{" "}
                            {p.validTo ? fmtDate(p.validTo) : "nay"}
                          </Tag>
                        ))}
                    </Space>
                  ) : undefined
                }
              />
            </Col>
          </Row>
        )}

        <Row gutter={[12, 8]}>
          <Col span={24}>
            <Form.Item name="taxVerified" hidden valuePropName="checked">
              <input type="checkbox" />
            </Form.Item>
            <Form.Item name="taxSource" hidden>
              <input />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Phụ trách & Quản lý
        </Divider>

        <Row gutter={12}>
          {/* Nhân viên kinh doanh dùng để định tuyến đơn bán — không áp dụng cho NCC. */}
          {!isSupplierScreen && (
            <Col span={6}>
              <Form.Item label="Kinh doanh" name="salesOwnerEmpId">
                <EmployeeSelect placeholder="Chọn nhân viên kinh doanh" />
              </Form.Item>
            </Col>
          )}

          <Col span={6}>
            <Form.Item label="Kế toán" name="accountingOwnerEmpId">
              <EmployeeSelect placeholder="Chọn nhân viên kế toán" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item label="Chứng từ" name="documentOwnerEmpId">
              <EmployeeSelect allowClear />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item label="Pháp chế" name="legalOwnerEmpId">
              <EmployeeSelect placeholder="Chọn nhân viên pháp lý" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={24}>
            <Form.Item label="Ghi chú" name="note">
              <TextArea size="small" rows={3} autoSize={{ minRows: 3, maxRows: 5 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ConfigProvider>
  );
}
