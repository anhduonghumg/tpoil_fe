import { useState } from "react";
import { Form, Input, Button, message, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useLogin } from "../hooks";
import { useNavigate, useLocation } from "react-router-dom";

// @ts-ignore
import logo from "../../../assets/logo_200.png";
import { saveUserToCache } from "../session";

export default function Login() {
  const [form] = Form.useForm();
  const nav = useNavigate();
  const { search } = useLocation();
  const redirectTo =
    new URLSearchParams(search).get("redirectTo") || "/dashboard";

  const mLogin = useLogin();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  type LoginResponse = {
    statusCode: number;
    [key: string]: any;
  };

  const onFinish = async (vals: any) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const login = (await mLogin.mutateAsync(vals)) as LoginResponse;
      if (login?.statusCode == 200) {
        saveUserToCache(login.data?.user || null);
        nav(redirectTo, { replace: true });
      }
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.message || e?.message || "Đăng nhập thất bại";
      let displayError = "";

      if (errorMsg.includes("email") || errorMsg.includes("username")) {
        displayError = "Email hoặc tên đăng nhập không tồn tại trong hệ thống.";
      } else if (errorMsg.includes("password")) {
        displayError = "Mật khẩu không chính xác. Vui lòng thử lại.";
      } else if (
        errorMsg.includes("network") ||
        errorMsg.includes("connection")
      ) {
        displayError =
          "Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.";
      } else if (errorMsg.includes("blocked") || errorMsg.includes("locked")) {
        displayError =
          "Tài khoản đã bị khóa. Vui lòng liên hệ admin để được hỗ trợ.";
      } else {
        displayError =
          "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.";
      }

      setErrorMessage(displayError);
      // messageApi.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {contextHolder}
      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            -45deg,
            #22c55e 0%,
            #16a34a 25%,
            #15803d 50%,
            #14532d 75%,
            #065f46 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .login-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
              circle at 20% 80%,
              rgba(34, 197, 94, 0.3) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(22, 163, 74, 0.3) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 40% 40%,
              rgba(255, 255, 255, 0.1) 0%,
              transparent 50%
            );
          animation: floatingBubbles 20s ease-in-out infinite;
        }

        @keyframes floatingBubbles {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-30px) rotate(120deg);
          }
          66% {
            transform: translateY(-60px) rotate(240deg);
          }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 24px 20px;
          width: 100%;
          max-width: 340px;
          /* Xóa hoặc giảm chiều cao tối thiểu */
          min-height: unset;
          height: auto;
          position: relative;
          box-shadow: 0 25px 45px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation: cardFloat 6s ease-in-out infinite;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        @keyframes cardFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .glass-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 24px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.2) 0%,
            rgba(255, 255, 255, 0.05) 100%
          );
          pointer-events: none;
        }

        .logo-container {
          text-align: center;
          /* margin-bottom: 24px; */
          position: relative;
          z-index: 2;
        }

        .logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
          animation: logoFloat 3s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        .logo::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: logoShine 2s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(3deg);
          }
        }

        @keyframes logoShine {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          50% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }

        .logo-icon {
          font-size: 40px;
          color: white;
          z-index: 1;
        }

        .company-name {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          letter-spacing: 0.5px;
        }

        .login-title {
          text-align: center;
          margin: 0;
          margin-bottom: 20px;
          color: white;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(
            135deg,
            #fff 0%,
            rgba(255, 255, 255, 0.8) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 10px rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 2;
        }

        .login-title::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          border-radius: 2px;
          animation: titleUnderline 2s ease-in-out infinite alternate;
        }

        @keyframes titleUnderline {
          0% {
            width: 40px;
            opacity: 0.6;
          }
          100% {
            width: 80px;
            opacity: 1;
          }
        }

        .error-alert {
          margin-bottom: 24px;
          border-radius: 12px;
          animation: slideInDown 0.3s ease-out;
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ant-form-item {
          margin-bottom: 24px;
          position: relative;
          z-index: 2;
        }

        .ant-form-item-label > label {
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500;
          font-size: 14px;
        }

        .glass-input {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px !important;
          padding: 12px 16px !important;
          color: white !important;
          font-size: 16px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          backdrop-filter: blur(10px);
        }

        .glass-input:hover {
          border-color: rgba(34, 197, 94, 0.4) !important;
          background: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.1);
        }

        .glass-input:focus,
        .glass-input.ant-input-focused {
          border-color: rgba(34, 197, 94, 0.6) !important;
          background: rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
          transform: translateY(-2px);
        }

        .glass-input::placeholder {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .glass-input .ant-input-prefix {
          color: rgba(255, 255, 255, 0.7) !important;
          margin-right: 8px;
        }

        .glass-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
          -webkit-text-fill-color: white !important;
          border-radius: 12px !important;
        }

        .glass-button {
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.9) 0%,
            rgba(22, 163, 74, 0.9) 100%
          ) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px !important;
          height: 52px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          color: white !important;
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative;
          overflow: hidden;
          z-index: 2;
        }

        .glass-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.5s;
        }

        .glass-button:hover::before {
          left: 100%;
        }

        .glass-button:hover {
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 1) 0%,
            rgba(22, 163, 74, 1) 100%
          ) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 15px 35px rgba(34, 197, 94, 0.4) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }

        .glass-button:active {
          transform: translateY(-1px) !important;
          box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3) !important;
        }

        .floating-particles {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          animation: particleFloat 15s linear infinite;
        }

        .particle:nth-child(1) {
          width: 6px;
          height: 6px;
          left: 10%;
          animation-delay: 0s;
          animation-duration: 12s;
        }

        .particle:nth-child(2) {
          width: 8px;
          height: 8px;
          left: 20%;
          animation-delay: 2s;
          animation-duration: 15s;
        }

        .particle:nth-child(3) {
          width: 4px;
          height: 4px;
          left: 30%;
          animation-delay: 4s;
          animation-duration: 10s;
        }

        .particle:nth-child(4) {
          width: 10px;
          height: 10px;
          left: 60%;
          animation-delay: 6s;
          animation-duration: 18s;
        }

        .particle:nth-child(5) {
          width: 5px;
          height: 5px;
          left: 80%;
          animation-delay: 8s;
          animation-duration: 14s;
        }

        .particle:nth-child(6) {
          width: 7px;
          height: 7px;
          left: 90%;
          animation-delay: 10s;
          animation-duration: 16s;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .login-container {
            padding: 16px;
          }

          .glass-card {
            padding: 32px 24px;
            margin: 16px;
            border-radius: 20px;
          }

          .logo {
            width: 70px;
            height: 70px;
          }

          .logo-icon {
            font-size: 35px;
          }

          .company-name {
            font-size: 16px;
          }

          .login-title {
            font-size: 28px;
            margin: 0;
          }

          .glass-input {
            padding: 14px 16px !important;
            font-size: 16px !important;
          }

          .glass-button {
            height: 50px !important;
            font-size: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .glass-card {
            padding: 24px 20px;
            border-radius: 16px;
          }

          .logo {
            width: 60px;
            height: 60px;
          }

          .logo-icon {
            font-size: 30px;
          }

          .company-name {
            font-size: 14px;
          }

          .login-title {
            font-size: 28px;
            margin: 0;
          }

          .glass-input {
            padding: 12px 14px !important;
            font-size: 16px !important;
          }
        }

        @media (max-height: 600px) {
          .login-container {
            align-items: flex-start;
            padding-top: 40px;
          }

          .glass-card {
            padding: 24px 32px;
          }

          .logo {
            width: 60px;
            height: 60px;
            margin-bottom: 12px;
          }

          .logo-icon {
            font-size: 28px;
          }

          .login-title {
            font-size: 28px;
            margin: 0;
          }
        }
      `}</style>

      {/* <div className="floating-particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div> */}

      <div className="glass-card">
        <div className="logo-container">
          {/* <div className="logo"> */}
          <div className="logo-icon">
            <img src={logo} width={150} className="db-logo" alt="Logo" />
          </div>
          {/* </div> */}
          {/* <h3 className="company-name">TPOIL</h3> */}
        </div>

        <h5 className="login-title">Chào Mừng Trở Lại</h5>

        {errorMessage && (
          <Alert
            message="Đăng nhập thất bại"
            description={errorMessage}
            type="error"
            showIcon
            className="error-alert"
            closable
            onClose={() => setErrorMessage("")}
          />
        )}

        <div>
          <Form form={form} layout="vertical" size="large" onFinish={onFinish}>
            <Form.Item
              name="email"
              label="Tên đăng nhập"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập email hoặc tên đăng nhập của bạn!",
                },
                {
                  min: 3,
                  message: "Email hoặc tên đăng nhập phải có ít nhất 3 ký tự!",
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
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu của bạn!" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự!" },
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
              onClick={() => form.validateFields().then(onFinish)}
              loading={loading}
              block
            >
              {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
