import {
  Button,
  Col,
  DatePicker,
  Form,
  FormInstance,
  Input,
  Row,
  Select,
  Avatar,
  Space,
} from "antd";
import dayjs from "dayjs";
import type { User } from "../types";
import { useEffect, useRef, useState } from "react";
import AvatarUploader from "../ui/AvatarUploader";
import { notify } from "../../../shared/lib/notification";
import { toAbsUrl } from "../../../shared/lib/url";

export default function PersonalForm({
  data,
  onSave,
  onAvatarTemp,
  form: externalForm,
  hideInlineSubmit = false,
}: {
  data?: User;
  form?: FormInstance;
  hideInlineSubmit?: boolean;
  onSave: (p: Partial<User>) => void;
  onAvatarTemp?: (f: { blob: Blob | null }) => void;
}) {
  const [internal] = Form.useForm();
  const form = externalForm ?? internal;

  const [openUploader, setOpenUploader] = useState(false);
  const lastObjectUrlRef = useRef<string | null>(null);

  // ► state preview độc lập để hiển thị blob trước, URL server sau
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  // watch avatarUrl trong form (URL từ server sau create/update hoặc khi load detail)
  const avatarUrl = Form.useWatch("avatarUrl", form);

  const init = {
    fullName: data?.fullName,
    gender: data?.gender,
    dob: data?.dob ? dayjs(data.dob) : undefined,
    nationality: data?.nationality || "Việt Nam",
    maritalStatus: data?.maritalStatus,
    avatarUrl: data?.avatarUrl,
  };

  // Khởi tạo preview từ dữ liệu server khi mở form / khi data thay đổi
  useEffect(() => {
    if (data?.avatarUrl) {
      setPreviewUrl(toAbsUrl(data.avatarUrl));
    } else {
      setPreviewUrl(undefined);
    }
    // cleanup object URL khi unmount
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.avatarUrl]);

  // Khi form được set avatarUrl bằng URL server (không phải blob), sync sang preview
  useEffect(() => {
    if (avatarUrl && !/^blob:|^data:/i.test(avatarUrl)) {
      setPreviewUrl(toAbsUrl(avatarUrl));
    }
  }, [avatarUrl]);

  // Set preview từ blob (không đụng avatarUrl server ngay)
  const setPreviewFromBlob = (blobUrl: string) => {
    // thu hồi URL cũ nếu là blob
    if (lastObjectUrlRef.current && lastObjectUrlRef.current !== blobUrl) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    lastObjectUrlRef.current = blobUrl;
    setPreviewUrl(blobUrl);
    // để giữ giá trị hiển thị trong input, vẫn set vào form (là blob:)
    form.setFieldsValue({ avatarUrl: blobUrl });
  };

  const handleClearAvatar = () => {
    // revoke blob nếu có
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    onAvatarTemp?.({ blob: null });
    setPreviewUrl(undefined);
    form.setFieldsValue({ avatarUrl: undefined });
    notify.success("Đã xóa ảnh");
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={init}
        scrollToFirstError
        onFinish={async (vals) => {
          onSave({
            fullName: vals.fullName?.trim(),
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
                src={previewUrl ?? toAbsUrl(avatarUrl)}
                shape="circle"
                style={{ border: "1px solid rgba(0,0,0,0.06)" }}
              >
                {!previewUrl && !avatarUrl && (init.fullName?.[0] || "U")}
              </Avatar>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Ảnh đại diện
                </div>
                <Space wrap>
                  <Button onClick={() => setOpenUploader(true)}>Đổi ảnh</Button>
                  <Button danger onClick={handleClearAvatar}>
                    Xóa ảnh
                  </Button>
                  <Form.Item name="avatarUrl" noStyle>
                    <Input
                      style={{ width: 320 }}
                      disabled
                      placeholder="https://..."
                    />
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
              name="fullName"
              rules={[{ required: true, message: "Bắt buộc" }]}
            >
              <Input maxLength={128} showCount placeholder="VD: Nguyễn Văn A" />
            </Form.Item>
          </Col>

          <Col xs={12} md={6}>
            <Form.Item label="Giới tính" name="gender">
              <Select
                placeholder="Chọn giới tính"
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
              <DatePicker
                style={{ width: "100%" }}
                format="DD-MM-YYYY"
                disabledDate={(d) => d && d.isAfter(dayjs(), "day")}
              />
            </Form.Item>
          </Col>

          <Col xs={12} md={6}>
            <Form.Item label="Quốc tịch" name="nationality">
              <Select
                placeholder="Chọn quốc tịch"
                allowClear
                options={[{ value: "Việt Nam", label: "Việt Nam" }]}
              />
            </Form.Item>
          </Col>

          <Col xs={12} md={6}>
            <Form.Item label="Hôn nhân" name="maritalStatus">
              <Select
                placeholder="Chọn tình trạng"
                allowClear
                options={[
                  { value: "single", label: "Độc thân" },
                  { value: "married", label: "Kết hôn" },
                  { value: "divorced", label: "Ly hôn" },
                  { value: "widowed", label: "Góa" },
                ]}
              />
            </Form.Item>

            <Form.Item name="avatarBlob" hidden>
              <Input />
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
          onAvatarTemp?.({ blob });
          setPreviewFromBlob(previewUrl);
          notify.success("Đã chọn ảnh");
        }}
      />
    </>
  );
}
