import React, { useMemo, useState } from "react";
import { Modal, Input, Space, Button } from "antd";
import { CopyOutlined, ReloadOutlined } from "@ant-design/icons";
import { useResetUserPassword } from "../hooks";
import { notify } from "../../../shared/lib/notification";

function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function ResetPasswordModal({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: string;
  onClose: () => void;
}) {
  const resetMut = useResetUserPassword();
  const [pwd, setPwd] = useState(() => genPassword(10));

  const loading = resetMut.isPending;

  const onOk = async () => {
    await resetMut.mutateAsync({ id: userId, password: pwd });
    notify.success("Đã cấp mật khẩu mới");
    onClose();
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(pwd);
    notify.success("Đã copy mật khẩu");
  };

  return (
    <Modal
      open={open}
      title="Cấp mật khẩu mới"
      onCancel={onClose}
      onOk={onOk}
      okText="Cấp mật khẩu"
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Input.Password
          size="small"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Mật khẩu mới"
        />
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => setPwd(genPassword(10))}
          >
            Tạo lại
          </Button>
          <Button size="small" icon={<CopyOutlined />} onClick={onCopy}>
            Copy
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}
