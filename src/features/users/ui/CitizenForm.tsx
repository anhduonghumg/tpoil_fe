// src/features/users/ui/CitizenForm.tsx
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
  Space,
  Image,
  Popconfirm,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import type { User } from "../types";
import { CCCD_12, CMND_9, PASSPORT } from "../validators";
import { useRef, useState } from "react";
import DocImageUploader from "../../../shared/ui/DocImageUploader";
import { CloseCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { notify } from "../../../shared/lib/notification";

export default function CitizenForm({
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

  const c = data?.citizen;
  const init = {
    type: c?.type,
    number: c?.number,
    issuedDate: c?.issuedDate ? dayjs(c.issuedDate) : undefined,
    issuedPlace: c?.issuedPlace,
    expiryDate: c?.expiryDate ? dayjs(c.expiryDate) : undefined,
    frontImageUrl: c?.frontImageUrl,
    backImageUrl: c?.backImageUrl,
  };

  // state tạm cho 2 ảnh (giữ blob để upload khi submit)
  const [tmpFront, setTmpFront] = useState<null | {
    blob: Blob;
    previewUrl: string;
  }>(null);
  const [tmpBack, setTmpBack] = useState<null | {
    blob: Blob;
    previewUrl: string;
  }>(null);
  const [openFront, setOpenFront] = useState(false);
  const [openBack, setOpenBack] = useState(false);

  const lastObjFrontRef = useRef<string | null>(null);
  const lastObjBackRef = useRef<string | null>(null);

  const setFrontPreview = (url: string) => {
    if (lastObjFrontRef.current && lastObjFrontRef.current !== url)
      URL.revokeObjectURL(lastObjFrontRef.current);
    lastObjFrontRef.current = url;
    form.setFieldsValue({ frontImageUrl: url });
  };
  const setBackPreview = (url: string) => {
    if (lastObjBackRef.current && lastObjBackRef.current !== url)
      URL.revokeObjectURL(lastObjBackRef.current);
    lastObjBackRef.current = url;
    form.setFieldsValue({ backImageUrl: url });
  };

  // (tuỳ chọn) upload thật khi submit
  const uploadDoc = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("file", blob, "citizen.webp");
    const res = await fetch("/api/uploads/citizen", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Upload document failed");
    const json = (await res.json()) as { url: string };
    return json.url;
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={init}
        scrollToFirstError
        onFinish={async (v) => {
          let frontUrl = v.frontImageUrl;
          let backUrl = v.backImageUrl;

          try {
            if (tmpFront) frontUrl = await uploadDoc(tmpFront.blob);
            if (tmpBack) backUrl = await uploadDoc(tmpBack.blob);
          } catch (e) {
            message.error("Upload ảnh giấy tờ thất bại");
            return;
          } finally {
            if (lastObjFrontRef.current) {
              URL.revokeObjectURL(lastObjFrontRef.current);
              lastObjFrontRef.current = null;
            }
            if (lastObjBackRef.current) {
              URL.revokeObjectURL(lastObjBackRef.current);
              lastObjBackRef.current = null;
            }
            setTmpFront(null);
            setTmpBack(null);
          }

          onSave({
            citizen: {
              type: v.type,
              number: v.number?.trim(),
              issuedDate: v.issuedDate?.format("DD-MM-YYYY"),
              issuedPlace: v.issuedPlace,
              expiryDate: v.expiryDate?.format("DD-MM-YYYY"),
              frontImageUrl: frontUrl,
              backImageUrl: backUrl,
            },
          });
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Form.Item label="Loại giấy tờ" name="type">
              <Select
                allowClear
                options={[
                  { value: "CCCD", label: "CCCD" },
                  { value: "CMND", label: "CMND" },
                  { value: "PASSPORT", label: "Hộ chiếu" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              label="Số giấy tờ"
              name="number"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, val: string) {
                    const t = getFieldValue("type");
                    if (!val) return Promise.resolve();
                    if (t === "CCCD" && !CCCD_12.test(val))
                      return Promise.reject(new Error("CCCD phải 12 số"));
                    if (t === "CMND" && !CMND_9.test(val))
                      return Promise.reject(new Error("CMND phải 9 số"));
                    if (t === "PASSPORT" && !PASSPORT.test(val))
                      return Promise.reject(
                        new Error("Số hộ chiếu không hợp lệ")
                      );
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="Ngày cấp" name="issuedDate">
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="Nơi cấp" name="issuedPlace">
              <Input />
            </Form.Item>
          </Col>

          <Col xs={12} md={6}>
            <Form.Item label="Ngày hết hạn" name="expiryDate">
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>

          {/* Ảnh mặt trước */}
          <Col xs={24} md={9}>
            <Form.Item label="Ảnh mặt trước">
              <Input.Group compact style={{ display: "flex" }}>
                <Form.Item name="frontImageUrl" noStyle>
                  <Input placeholder="https://..." style={{ flex: 1 }} />
                </Form.Item>
                <Button
                  onClick={() => setOpenFront(true)}
                  style={{ marginLeft: 0 }}
                  icon={<UploadOutlined />}
                >
                  Upload
                </Button>
              </Input.Group>
            </Form.Item>
            <Space size={8} wrap>
              {form.getFieldValue("frontImageUrl") && (
                <div
                  style={{
                    marginTop: 8,
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  <Image
                    src={form.getFieldValue("frontImageUrl")}
                    width={180}
                    height={Math.round(180 / 1.6)}
                    style={{
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                      display: "block",
                    }}
                    preview
                  />
                  {/* Nút xoá nổi trên góc phải */}
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "rgba(0,0,0,0.45)",
                      borderRadius: 999,
                      padding: 2,
                      lineHeight: 0,
                    }}
                  >
                    <Popconfirm
                      title="Xóa ảnh mặt trước?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => {
                        // Cleanup Object URL nếu có
                        if (lastObjFrontRef.current) {
                          URL.revokeObjectURL(lastObjFrontRef.current);
                          lastObjFrontRef.current = null;
                        }
                        form.setFieldsValue({ frontImageUrl: undefined });
                        setTmpFront(null);
                        message.success("Đã xóa ảnh mặt trước");
                      }}
                    >
                      <Tooltip title="Xóa ảnh">
                        <Button
                          type="text"
                          size="small"
                          icon={
                            <CloseCircleOutlined
                              style={{ color: "white", fontSize: 18 }}
                            />
                          }
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              )}
            </Space>
          </Col>

          {/* Ảnh mặt sau */}
          <Col xs={24} md={9}>
            <Form.Item label="Ảnh mặt sau">
              <Input.Group compact style={{ display: "flex" }}>
                <Form.Item name="backImageUrl" noStyle>
                  <Input placeholder="https://..." style={{ flex: 1 }} />
                </Form.Item>
                <Button
                  onClick={() => setOpenBack(true)}
                  style={{ marginLeft: 0 }}
                  icon={<UploadOutlined />}
                >
                  Upload
                </Button>
              </Input.Group>
            </Form.Item>
            <Space size={8} wrap>
              {form.getFieldValue("backImageUrl") && (
                <div
                  style={{
                    marginTop: 8,
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  <Image
                    src={form.getFieldValue("backImageUrl")}
                    width={180}
                    height={Math.round(180 / 1.6)}
                    style={{
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                      display: "block",
                    }}
                    preview
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "rgba(0,0,0,0.45)",
                      borderRadius: 999,
                      padding: 2,
                      lineHeight: 0,
                    }}
                  >
                    <Popconfirm
                      title="Xóa ảnh mặt sau?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => {
                        if (lastObjBackRef.current) {
                          URL.revokeObjectURL(lastObjBackRef.current);
                          lastObjBackRef.current = null;
                        }
                        form.setFieldsValue({ backImageUrl: undefined });
                        setTmpBack(null);
                        message.success("Đã xóa ảnh mặt sau");
                      }}
                    >
                      <Tooltip title="Xóa ảnh">
                        <Button
                          type="text"
                          size="small"
                          icon={
                            <CloseCircleOutlined
                              style={{ color: "white", fontSize: 18 }}
                            />
                          }
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              )}
            </Space>
          </Col>
        </Row>

        {!hideInlineSubmit && (
          <Form.Item style={{ marginTop: 8 }}>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </Form.Item>
        )}
      </Form>

      {/* Uploader mặt trước */}
      <DocImageUploader
        open={openFront}
        onClose={() => setOpenFront(false)}
        title="Upload ảnh mặt trước"
        aspect={1.6}
        targetMaxDim={1280}
        targetKB={350}
        onDone={({ blob, previewUrl }) => {
          setTmpFront({ blob, previewUrl });
          setFrontPreview(previewUrl);
          notify.success("Đã cập nhật ảnh mặt trước (tạm)");
        }}
      />

      {/* Uploader mặt sau */}
      <DocImageUploader
        open={openBack}
        onClose={() => setOpenBack(false)}
        title="Upload ảnh mặt sau"
        aspect={1.6}
        targetMaxDim={1280}
        targetKB={350}
        onDone={({ blob, previewUrl }) => {
          setTmpBack({ blob, previewUrl });
          setBackPreview(previewUrl);
          notify.success("Đã cập nhật ảnh mặt sau (tạm)");
        }}
      />
    </>
  );
}
