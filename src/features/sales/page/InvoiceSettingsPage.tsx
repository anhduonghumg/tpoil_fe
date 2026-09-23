import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  SaveOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { RefreshButton } from "../../../shared/ui/TableFilter";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { useActivateMisaEnvironment, useMisaSettings, useUpdateMisaSettings } from "../hooks";
import { useVatRatesSelect } from "../../tax-rates/hooks";
import type {
  InvoiceEnvironment,
  MisaEnvironmentConfig,
  UpdateMisaSettingsPayload,
} from "../types";
import "../invoice-settings.css";

/**
 * Quyết định hóa đơn có thật sự ra hay không nằm ở đây, không phải ở đâu khác:
 * SignType 1 chỉ lập XML để ký bằng USB token tại máy — gọi qua API sẽ không bao giờ
 * phát hành. Muốn phát hành từ hệ thống thì phải để MISA ký (SignType 2).
 */
const SIGN_TYPE_OPTIONS = [
  { value: 2, label: "MISA ký và phát hành — dùng cho tích hợp API" },
  { value: 1, label: "Ký tại máy bằng USB Token — chỉ lập, không phát hành" },
  { value: 5, label: "Ký qua dịch vụ ký số của MISA" },
];

const ENV_LABEL: Record<InvoiceEnvironment, string> = {
  TEST: "Thử nghiệm",
  PRODUCTION: "Thật",
};

/** Mặc định gợi ý theo môi trường để không ai phải nhớ địa chỉ nào của bên nào. */
const ENV_BASE_URL: Record<InvoiceEnvironment, string> = {
  TEST: "https://testapi.meinvoice.vn/api/integration",
  PRODUCTION: "https://api.meinvoice.vn/api/integration",
};

/** Gợi ý dài đưa vào dấu ⓘ cạnh nhãn, không chiếm thêm một dòng dưới mỗi ô. */
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip title={children}>
      <InfoCircleOutlined className="cfg-hint" />
    </Tooltip>
  );
}

export default function InvoiceSettingsPage() {
  const navigate = useNavigate();
  const { can } = useCan();
  const [form] = Form.useForm<UpdateMisaSettingsPayload>();
  const [tab, setTab] = useState<InvoiceEnvironment>("TEST");

  const query = useMisaSettings();
  const saveMutation = useUpdateMisaSettings();
  const activateMutation = useActivateMisaEnvironment();
  const settings = query.data;
  const canEdit = can(PERMS.SALES_INVOICE_ISSUE);

  const current = settings?.environments.find((item) => item.environment === tab);
  const configured = current?.configured === true ? current : null;
  const isActiveTab = settings?.activeEnvironment === tab;

  // Bật/tắt giả lập đổi ngay dòng cảnh báo, không đợi bấm lưu.
  const mock = Form.useWatch("mock", form);
  const vatRatesQuery = useVatRatesSelect();

  // Đổi tab là nạp lại đúng cấu hình của môi trường đó; chưa có thì để trống với gợi ý sẵn.
  useEffect(() => {
    if (!settings) return;
    form.resetFields();
    form.setFieldsValue({
      environment: tab,
      baseUrl: configured?.baseUrl ?? ENV_BASE_URL[tab],
      taxCode: configured?.taxCode ?? "",
      username: "",
      password: "",
      appId: "",
      templateNo: configured?.templateNo ?? "",
      serial: configured?.serial ?? "",
      signType: configured?.signType ?? 1,
      paymentMethod: configured?.paymentMethod ?? "TM/CK",
      publishMinGapMs: configured?.publishMinGapMs ?? 3000,
      defaultVatRateId: configured?.defaultVatRateId ?? undefined,
      mock: configured?.mock ?? false,
    });
    // configured suy ra từ settings + tab nên không cần liệt kê riêng.
  }, [settings, tab, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmActivate = () => {
    if (tab === "PRODUCTION") {
      Modal.confirm({
        title: "Chuyển sang MISA THẬT?",
        icon: <WarningOutlined style={{ color: "#cf1322" }} />,
        content:
          "Từ sau khi chuyển, mọi lần phát hành đều tạo hóa đơn điện tử có giá trị pháp lý và không rút lại được. Hãy chắc chắn đã thử xong ở môi trường thử nghiệm.",
        okText: "Tôi hiểu, chuyển sang thật",
        okButtonProps: { danger: true },
        cancelText: "Để sau",
        onOk: () => activateMutation.mutateAsync(tab),
      });
      return;
    }
    activateMutation.mutate(tab);
  };

  const running = settings?.running;
  const target = running?.mock
    ? { tone: "warn" as const, label: "Chế độ giả lập — không gọi ra MISA" }
    : running?.environment === "PRODUCTION"
      ? {
          tone: "danger" as const,
          label: "Đang dùng MISA THẬT — hóa đơn có giá trị pháp lý, không rút lại được",
        }
      : {
          tone: "info" as const,
          label: "Đang dùng MISA thử nghiệm — hóa đơn không có giá trị pháp lý",
        };

  return (
    <div className="cfg-page">
      <div className="cfg-toolbar">
        <Space align="center" size={8}>
          <Button
            size="small"
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/sales/invoices")}
          />
          <Typography.Title level={5} style={{ margin: 0 }}>
            Cấu hình xuất hóa đơn
          </Typography.Title>
          {settings?.source === "ENV" ? (
            <Tooltip title="Chưa lưu môi trường nào — đang đọc từ biến môi trường máy chủ. Lưu một môi trường để chuyển sang cấu hình quản lý trong hệ thống.">
              <Tag color="orange">Theo biến môi trường</Tag>
            </Tooltip>
          ) : null}
        </Space>
        <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
      </div>

      {query.isLoading || !settings ? (
        <Skeleton active />
      ) : (
        <Form
          form={form}
          layout="vertical"
          size="small"
          disabled={!canEdit || saveMutation.isPending}
          onFinish={(values) => saveMutation.mutate({ ...values, environment: tab })}
        >
          <div className={`cfg-target tone-${target.tone}`}>
            <WarningOutlined />
            <span>{target.label}</span>
            <span className="cfg-target-meta">
              {running?.baseUrl} · Ký hiệu {running?.serial}
            </span>
          </div>

          {/* Chọn môi trường ĐỂ SỬA. Đang dùng cái nào là chuyện khác — xem nút bên phải. */}
          <div className="cfg-switch">
            <Segmented
              value={tab}
              onChange={(value) => setTab(value as InvoiceEnvironment)}
              options={settings.environments.map((item) => ({
                value: item.environment,
                label: (
                  <span className="cfg-seg">
                    {ENV_LABEL[item.environment]}
                    {settings.activeEnvironment === item.environment ? (
                      <CheckCircleFilled className="cfg-seg-active" />
                    ) : !item.configured ? (
                      <span className="cfg-seg-empty">chưa có</span>
                    ) : null}
                  </span>
                ),
              }))}
            />

            {isActiveTab ? (
              <Tag color="green" className="cfg-using">
                <CheckCircleFilled /> Đang dùng môi trường này
              </Tag>
            ) : (
              <Tooltip
                title={
                  configured
                    ? `Chuyển hóa đơn sang phát hành bằng cấu hình ${ENV_LABEL[tab]}`
                    : "Phải nhập và lưu cấu hình này trước khi chuyển sang dùng"
                }
              >
                <Button
                  size="small"
                  danger={tab === "PRODUCTION"}
                  type={tab === "PRODUCTION" ? "primary" : "default"}
                  icon={<SwapOutlined />}
                  disabled={!canEdit || !configured}
                  loading={activateMutation.isPending}
                  onClick={confirmActivate}
                >
                  Chuyển sang dùng {ENV_LABEL[tab]}
                </Button>
              </Tooltip>
            )}
          </div>

          <div className="cfg-columns">
            <section className="cfg-card">
              <h4>Kết nối</h4>

              <Form.Item
                label="Địa chỉ API (Base URI)"
                name="baseUrl"
                rules={[{ required: true, message: "Bắt buộc" }]}
              >
                <Input placeholder={ENV_BASE_URL[tab]} />
              </Form.Item>

              <div className="cfg-row">
                <Form.Item
                  label="Mã số thuế"
                  name="taxCode"
                  rules={[{ required: true, message: "Bắt buộc" }]}
                >
                  <Input placeholder="0101234567" />
                </Form.Item>

                <Form.Item
                  label={
                    <>
                      User / Partner
                      <Hint>
                        {configured?.username
                          ? `Đang lưu: ${configured.username} — để trống nếu không đổi`
                          : "Chưa có, lần lưu đầu tiên bắt buộc nhập"}
                      </Hint>
                    </>
                  }
                  name="username"
                  rules={[{ required: !configured?.username, message: "Bắt buộc" }]}
                >
                  <Input
                    autoComplete="off"
                    placeholder={
                      configured?.username
                        ? `Giữ nguyên (${configured.username})`
                        : "Tên đăng nhập tích hợp"
                    }
                  />
                </Form.Item>
              </div>

              <div className="cfg-row">
                <Form.Item
                  label={
                    <>
                      Password / Token
                      <Hint>
                        {configured?.hasPassword
                          ? "Đã có — để trống nếu không đổi"
                          : "Chưa có, lần lưu đầu tiên bắt buộc nhập"}
                      </Hint>
                    </>
                  }
                  name="password"
                >
                  <Input.Password
                    autoComplete="new-password"
                    placeholder={configured?.hasPassword ? "Giữ nguyên" : "Nhập mật khẩu"}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <>
                      AppID
                      <Hint>
                        {configured?.hasAppId
                          ? "Đã có — để trống nếu không đổi"
                          : "Chưa có, lần lưu đầu tiên bắt buộc nhập"}
                      </Hint>
                    </>
                  }
                  name="appId"
                >
                  <Input.Password
                    autoComplete="off"
                    placeholder={configured?.hasAppId ? "Giữ nguyên" : "Nhập AppID"}
                  />
                </Form.Item>
              </div>
            </section>

            <section className="cfg-card">
              <h4>Hóa đơn</h4>

              <div className="cfg-row">
                <Form.Item
                  label="Mẫu số"
                  name="templateNo"
                  rules={[{ required: true, message: "Bắt buộc" }]}
                >
                  <Input placeholder="1" />
                </Form.Item>

                <Form.Item
                  label={
                    <>
                      Ký hiệu / Serial
                      <Hint>Phải khớp dải hóa đơn đã đăng ký trên meInvoice</Hint>
                    </>
                  }
                  name="serial"
                  rules={[{ required: true, message: "Bắt buộc" }]}
                >
                  <Input placeholder="1K26TYY" />
                </Form.Item>
              </div>

              <div className="cfg-row">
                <Form.Item
                  label={
                    <>
                      Hình thức ký số
                      <Hint>
                        Phải chọn "MISA ký và phát hành" thì hóa đơn mới ra được qua API. Chọn
                        USB Token thì MISA chỉ lập chứng từ rồi dừng, không phát hành.
                      </Hint>
                    </>
                  }
                  name="signType"
                >
                  <Select options={SIGN_TYPE_OPTIONS} />
                </Form.Item>

                <Form.Item label="Hình thức thanh toán" name="paymentMethod">
                  <Input placeholder="TM/CK" />
                </Form.Item>
              </div>

              <div className="cfg-row">
                <Form.Item
                  label={
                    <>
                      Giãn cách phát hành (ms)
                      <Hint>
                        MISA yêu cầu phát hành tuần tự trên cùng một dải ký hiệu; đặt quá
                        thấp sẽ bị từ chối vì gọi dồn.
                      </Hint>
                    </>
                  }
                  name="publishMinGapMs"
                >
                  <InputNumber min={0} max={60000} step={500} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                  label={
                    <>
                      Chế độ giả lập
                      <Hint>Bật = không gọi ra MISA, chỉ chuyển trạng thái trong hệ thống</Hint>
                    </>
                  }
                  name="mock"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </div>

              <div className="cfg-row">
                <Form.Item
                  label={
                    <>
                      Thuế suất mặc định
                      <Hint>
                        Áp cho dòng đơn chưa tự chọn thuế suất. Để trống thì những dòng đó
                        xuất ra là “không chịu thuế” (KCT).
                      </Hint>
                    </>
                  }
                  name="defaultVatRateId"
                >
                  <Select
                    allowClear
                    loading={vatRatesQuery.isLoading}
                    placeholder="Không đặt — dòng chưa chọn sẽ là KCT"
                    options={(vatRatesQuery.data ?? []).map((rate) => ({
                      value: rate.id,
                      label: rate.isExempt ? `${rate.name} (KCT)` : `${rate.name} — ${rate.rate}%`,
                    }))}
                  />
                </Form.Item>
              </div>
            </section>
          </div>

          <div className="cfg-actions">
            <Typography.Text type="secondary">
              {canEdit
                ? `Đang sửa cấu hình ${ENV_LABEL[tab]}. Lưu không đổi môi trường đang dùng — muốn đổi phải bấm nút chuyển.`
                : "Bạn chỉ có quyền xem. Cần quyền phát hành hóa đơn mới sửa được cấu hình."}
              {mock ? " Chế độ giả lập đang bật cho môi trường này." : ""}
            </Typography.Text>
            <Space>
              <Button onClick={() => query.refetch()}>Đặt lại</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saveMutation.isPending}
              >
                Lưu cấu hình {ENV_LABEL[tab]}
              </Button>
            </Space>
          </div>
        </Form>
      )}
    </div>
  );
}
