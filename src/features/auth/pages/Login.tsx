import { useEffect, useState } from "react";
import { Form, Input, Button, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useLogin } from "../hooks";
import { useNavigate, useLocation } from "react-router-dom";
// @ts-ignore
import logo from "../../../assets/logo_200.png";
// @ts-ignore
import bg from "../../../assets/bg_new.webp";
import { saveUserToCache } from "../session";
import { notify } from "../../../shared/lib/notification";

export default function Login() {
  const [form] = Form.useForm();
  const nav = useNavigate();
  const { search } = useLocation();
  const redirectTo =
    new URLSearchParams(search).get("redirectTo") || "/dashboard";

  const mLogin = useLogin();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  type LoginResponse = { statusCode: number; [key: string]: any };

  const onFinish = async (vals: any) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const login = (await mLogin.mutateAsync(vals)) as LoginResponse;
      if (login?.statusCode === 200) {
        saveUserToCache(login.data?.user || null);
        nav(redirectTo, { replace: true });
      }
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.message || e?.message || "Đăng nhập thất bại";
      let displayError = "";
      if (/(email|username)/i.test(errorMsg))
        displayError = "Email hoặc tên đăng nhập không tồn tại trong hệ thống.";
      else if (/password/i.test(errorMsg))
        displayError = "Mật khẩu không chính xác. Vui lòng thử lại.";
      else if (/(network|connection)/i.test(errorMsg))
        displayError =
          "Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.";
      else if (/(blocked|locked)/i.test(errorMsg))
        displayError =
          "Tài khoản đã bị khóa. Vui lòng liên hệ admin để được hỗ trợ.";
      else
        displayError =
          "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.";
      setErrorMessage(displayError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (errorMessage) {
      notify.error(errorMessage, {
        title: "Đăng nhập thất bại",
        placement: "bottomRight",
      });
    }
  }, [errorMessage]);

  return (
    <div
      className="login-container"
      style={
        {
          ["--bg-url" as any]: `url(${bg})`,
        } as React.CSSProperties
      }
    >
      <style>{`
        .login-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden; 

          /* Hình nền */
          background-image: linear-gradient(
              rgba(0, 0, 0, 0.25),
              rgba(0, 0, 0, 0.25)
            ),
            var(--bg-url);
          background-size: contain;
          background-position: center;
          background-repeat: repeat;
          background-blend-mode: overlay;
          box-sizing: border-box;
          z-index: 1;
        }

        .glass-card {
          width: 100%;
          max-width: 320px;
          padding: 18px 16px;
          border-radius: 18px;

          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);

          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
        }
        .logo-wrap img {
          width: 120px; /* nhỏ hơn */
          height: auto;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
        }

        .login-title {
          text-align: center;
          margin: 4px 0 8px;
          color: #fff;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.2px;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
        }

        .error-alert {
          margin: 0 0 6px 0;
          border-radius: 10px;
        }

        /* AntD form tinh chỉnh để hợp tone glass */
        :global(.glass-input.ant-input),
        :global(.glass-input .ant-input),
        :global(.glass-input .ant-input-password-input) {
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.28) !important;
          color: #fff !important;
        }
        :global(.glass-input.ant-input:hover),
        :global(.glass-input .ant-input:hover),
        :global(.glass-input .ant-input-password:hover) {
          border-color: rgba(255, 255, 255, 0.45) !important;
        }
        :global(.ant-input-prefix) {
          color: rgba(255, 255, 255, 0.85) !important;
        }
        :global(.ant-form-item-label > label) {
          color: rgba(255, 255, 255, 0.9) !important;
          font-size: 13px;
        }
        :global(.ant-form-item) {
          margin-bottom: 14px; /* dồn form gọn lại */
        }

        .glass-button {
          height: 44px; /* thấp hơn */
          border-radius: 12px !important;
          font-weight: 600;
          font-size: 15px;
          border: 1px solid rgba(255, 255, 255, 0.28) !important;
          color: #fff !important;
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.95),
            rgba(16, 163, 74, 0.95)
          ) !important;
          backdrop-filter: blur(6px);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .glass-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(34, 197, 94, 0.35);
        }
        .glass-button:active {
          transform: translateY(0);
          box-shadow: 0 6px 16px rgba(34, 197, 94, 0.25);
        }
        .label-login {
          font-size: 16px !important;
        }

        @media (max-width: 480px) {
          .glass-card {
            max-width: 92vw;
            padding: 16px 14px;
          }
          .login-title {
            font-size: 18px;
          }
          .logo-wrap img {
            width: 100px;
          }
        }
      `}</style>

      <div className="glass-card">
        <div className="logo-wrap">
          <img src={logo} alt="Logo" />
        </div>

        <h5 className="login-title">Chào Mừng Trở Lại</h5>

        {/* {errorMessage && (
          <Alert
            message="Đăng nhập thất bại"
            description={errorMessage}
            type="error"
            showIcon
            className="error-alert"
            closable
            onClose={() => setErrorMessage("")}
          />
        )} */}

        <Form form={form} layout="vertical" size="large" onFinish={onFinish}>
          <Form.Item
            className="label-login"
            style={{ fontWeight: 600 }}
            name="email"
            label="Tên đăng nhập"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập email hoặc tên đăng nhập của bạn!",
              },
            ]}
          >
            <Input
              className="glass-input"
              prefix={<UserOutlined />}
              autoComplete="username"
              placeholder="Nhập email hoặc tên đăng nhập"
            />
          </Form.Item>

          <Form.Item
            className="label-login"
            style={{ fontWeight: 600 }}
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu của bạn!" },
            ]}
          >
            <Input.Password
              className="glass-input"
              prefix={<LockOutlined />}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          <Button
            className="glass-button"
            type="primary"
            htmlType="submit"
            loading={loading}
            block
          >
            {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
