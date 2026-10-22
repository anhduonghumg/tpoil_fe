import React, { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Spin, message } from "antd";
import { isAxiosError } from "axios";
import { CheckOutlined, LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { useChangeOwnPassword, useProfile, useUpdateOwnProfile } from "../hooks";
import "./profile.css";

type PasswordValues = { currentPassword: string; newPassword: string; confirmPassword: string };

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message || fallback;
  return error instanceof Error ? error.message : fallback;
}

export default function ProfilePage() {
  const profile = useProfile();
  const saveProfile = useUpdateOwnProfile();
  const changePassword = useChangeOwnPassword();
  const [nameForm] = Form.useForm<{ name: string }>();
  const [passwordForm] = Form.useForm<PasswordValues>();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (profile.data) nameForm.setFieldsValue({ name: profile.data.name || "" });
  }, [profile.data, nameForm]);

  const onSaveName = async ({ name }: { name: string }) => {
    setProfileError(null);
    try {
      await saveProfile.mutateAsync({ name: name.trim() });
      message.success("Đã cập nhật tên hiển thị");
    } catch (error) {
      setProfileError(errorMessage(error, "Không thể lưu hồ sơ. Vui lòng thử lại."));
    }
  };

  const onChangePassword = async (values: PasswordValues) => {
    setPasswordError(null);
    setPasswordSaved(false);
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordForm.resetFields();
      setPasswordSaved(true);
    } catch (error) {
      setPasswordError(errorMessage(error, "Không thể đổi mật khẩu. Vui lòng thử lại."));
    } finally {
      changePassword.reset();
    }
  };

  return <div className="page-shell profile-page">
    <header className="profile-page-heading">
      <h1>Hồ sơ của tôi</h1>
    </header>
    {profile.isPending ? <Spin tip="Đang tải hồ sơ"><div style={{ minHeight: 160 }} /></Spin> : profile.isError ? (
      <Alert type="error" showIcon message="Không tải được hồ sơ" description={errorMessage(profile.error, "Vui lòng thử lại.")} action={<Button onClick={() => void profile.refetch()}>Thử lại</Button>} />
    ) : <div className="profile-layout">
      <aside className="profile-sidebar" aria-label="Tài khoản đang đăng nhập">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{(profile.data?.name || profile.data?.email || "U").trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase()}</div>
          <div className="profile-identity-details">
            <h2>{profile.data?.name || "Tài khoản của bạn"}</h2>
          </div>
          <div className="profile-contact">
            <span className="profile-email"><MailOutlined /><span>{profile.data?.email || "—"}</span></span>
          </div>
        </div>
      </aside>
      <div className="profile-settings">
      <section className="profile-settings-section" aria-labelledby="profile-info-heading">
        <div className="profile-section-heading">
          <span className="profile-section-icon"><UserOutlined /></span>
          <div><h2 id="profile-info-heading">Thông tin cá nhân</h2><p>Tên của bạn được hiển thị trong hệ thống.</p></div>
        </div>
        {profileError && <Alert className="profile-feedback" type="error" showIcon message={profileError} />}
        <Form form={nameForm} layout="vertical" requiredMark={false} onFinish={onSaveName} disabled={saveProfile.isPending} onValuesChange={() => setProfileError(null)}>
          <Form.Item name="name" label="Tên hiển thị" rules={[
            { required: true, whitespace: true, message: "Vui lòng nhập tên hiển thị" },
            { max: 100, message: "Tên hiển thị tối đa 100 ký tự" },
          ]}>
            <Input className="profile-name-input" maxLength={100} autoComplete="name" placeholder="Nhập tên hiển thị" />
          </Form.Item>
          <div className="profile-form-footer"><Button type="primary" htmlType="submit" icon={<CheckOutlined />} loading={saveProfile.isPending}>Lưu thay đổi</Button></div>
        </Form>
      </section>
      <section className="profile-settings-section" aria-labelledby="profile-password-heading">
        <div className="profile-section-heading">
          <span className="profile-section-icon"><LockOutlined /></span>
          <div><h2 id="profile-password-heading">Mật khẩu & bảo mật</h2><p>Chọn mật khẩu mới có ít nhất 8 ký tự.</p></div>
        </div>
        {passwordError && <Alert className="profile-feedback" type="error" showIcon message={passwordError} />}
        {passwordSaved && <Alert className="profile-feedback" type="success" showIcon message="Đã đổi mật khẩu thành công" />}
        <Form form={passwordForm} layout="vertical" requiredMark={false} onFinish={onChangePassword} disabled={changePassword.isPending} onValuesChange={() => { setPasswordError(null); setPasswordSaved(false); }}>
          <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}>
            <Input.Password autoComplete="current-password" maxLength={1024} placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <div className="profile-password-fields">
          <Form.Item name="newPassword" label="Mật khẩu mới" dependencies={["currentPassword"]} rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới" },
            ({ getFieldValue }) => ({ validator: async (_, value?: string) => {
              if (!value) return;
              if (Array.from(value).length < 8) throw new Error("Mật khẩu mới cần ít nhất 8 ký tự");
              if (new TextEncoder().encode(value).length > 72) throw new Error("Mật khẩu mới quá dài");
              if (value === getFieldValue("currentPassword")) throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại");
            } }),
          ]}>
            <Input.Password autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Nhập lại mật khẩu mới" dependencies={["newPassword"]} rules={[
            { required: true, message: "Vui lòng nhập lại mật khẩu mới" },
            ({ getFieldValue }) => ({ validator: async (_, value?: string) => {
              if (value && value !== getFieldValue("newPassword")) throw new Error("Mật khẩu nhập lại chưa khớp");
            } }),
          ]}>
            <Input.Password autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          </div>
          <div className="profile-form-footer"><Button className="profile-password-submit" htmlType="submit" icon={<LockOutlined />} loading={changePassword.isPending}>Đổi mật khẩu</Button></div>
        </Form>
      </section>
      </div>
    </div>}
  </div>;
}
