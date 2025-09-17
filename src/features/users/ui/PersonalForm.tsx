import {
  Button,
  Col,
  DatePicker,
  Form,
  FormInstance,
  Input,
  Row,
  Select,
  App,
  Avatar,
  Space,
} from "antd";
import dayjs from "dayjs";
import type { User } from "../types";
import { useEffect, useRef, useState } from "react";
import AvatarUploader from "../ui/AvatarUploader";
import { notify } from "../../../shared/lib/notification";

export default function PersonalForm({
  data,
  onSave,
  form: externalForm,
  hideInlineSubmit = false,
}: {
  data?: User;
  form?: FormInstance;
  hideInlineSubmit?: boolean;
  onSave: (p: Partial<User>) => void;
}) {
  const [internal] = Form.useForm();
  const form = externalForm ?? internal;
  const { message } = App.useApp();
  const [openUploader, setOpenUploader] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<null | {
    blob: Blob;
    previewUrl: string;
  }>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  const avatarUrl = Form.useWatch("avatarUrl", form);

  const init = {
    name: data?.name,
    gender: data?.gender,
    dob: data?.dob ? dayjs(data.dob) : undefined,
    nationality: data?.nationality || "Việt Nam",
    maritalStatus: data?.maritalStatus,
    avatarUrl: data?.avatarUrl,
  };

  const uploadAvatar = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("file", blob, "avatar.webp");
    const res = await fetch("/api/uploads/avatar", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = (await res.json()) as { url: string };
    return json.url;
  };

  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current)
        URL.revokeObjectURL(lastObjectUrlRef.current);
    };
  }, []);

  const setPreviewUrl = (url: string) => {
    // cleanup url cũ
    if (lastObjectUrlRef.current && lastObjectUrlRef.current !== url) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    lastObjectUrlRef.current = url;
    form.setFieldsValue({ avatarUrl: url });
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={init}
        scrollToFirstError={true}
        onFinish={async (vals) => {
          let finalAvatarUrl = vals.avatarUrl;

          if (tempAvatar) {
            try {
              const uploaded = await uploadAvatar(tempAvatar.blob);
              finalAvatarUrl = uploaded;
            } finally {
              
              if (lastObjectUrlRef.current) {
                URL.revokeObjectURL(lastObjectUrlRef.current);
                lastObjectUrlRef.current = null;
              }
              setTempAvatar(null);
            }
          }

          onSave({
            name: vals.name?.trim(),
            gender: vals.gender,
            dob: vals.dob?.format("DD-MM-YYYY"),
            nationality: vals.nationality,
            maritalStatus: vals.maritalStatus,
            avatarUrl: vals.avatarUrl,
          });
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Space align="center" size={16}>
              <Avatar
                size={96}
                src={avatarUrl}
                shape="circle"
                style={{ border: "1px solid rgba(0,0,0,0.06)" }}
              >
                {!avatarUrl && (init.name?.[0] || "U")}
              </Avatar>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Ảnh đại diện
                </div>
                <Space>
                  <Button onClick={() => setOpenUploader(true)}>Đổi ảnh</Button>
                  <Form.Item name="avatarUrl" noStyle>
                    <Input style={{ width: 320 }} placeholder="https://..." />
                  </Form.Item>
                </Space>
                <div style={{ color: "#888", fontSize: 12, marginTop: 6 }}>
                  Hỗ trợ crop & nén tự động. Khuyến nghị ảnh vuông, dung lượng ≤
                  200KB.
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Họ và tên"
              name="name"
              rules={[{ required: true, message: "Bắt buộc" }]}
            >
              <Input maxLength={128} showCount />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="Giới tính" name="gender">
              <Select
                allowClear
                options={[
                  { value: "male", label: "Nam" },
                  { value: "female", label: "Nữ" },
                  { value: "other", label: "Khác" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              label="Ngày sinh"
              name="dob"
              rules={[{ required: true, message: "Bắt buộc" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>

          <Col xs={12} md={6}>
            <Form.Item label="Quốc tịch" name="nationality">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="Hôn nhân" name="maritalStatus">
              <Select
                allowClear
                options={[
                  { value: "single", label: "Độc thân" },
                  { value: "married", label: "Kết hôn" },
                  { value: "divorced", label: "Ly hôn" },
                  { value: "widowed", label: "Góa" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        {!hideInlineSubmit && (
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </Form.Item>
        )}
      </Form>

      {/* Uploader Modal */}
      <AvatarUploader
        open={openUploader}
        onClose={() => setOpenUploader(false)}
        onDone={({ blob, previewUrl }) => {
          setTempAvatar({ blob, previewUrl });
          setPreviewUrl(previewUrl);
          notify.success("Đã cập nhật ảnh tạm thời");
        }}
        // uploadFn={uploadAvatar}
        // onDone={({ previewUrl, uploadedUrl }) => {
        //   form.setFieldsValue({ avatarUrl: uploadedUrl || previewUrl });
        //   message.success("Đã cập nhật ảnh đại diện");
        // }}
      />
    </>
  );
}
