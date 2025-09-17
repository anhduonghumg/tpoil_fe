import { useCallback, useMemo, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { App, Button, Flex, Slider, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  blobToObjectURL,
  dataURLToImage,
  fileToDataURL,
  getCroppedCanvas,
  resizeAndCompress,
} from "../../../shared/utils/image";
import CommonModal from "../../../shared/ui/CommonModal";
import { notify } from "../../../shared/lib/notification";
import { no } from "zod/locales";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (result: {
    blob: Blob;
    previewUrl: string;
    uploadedUrl?: string;
  }) => void;
  uploadFn?: (file: Blob) => Promise<string>;
  title?: string;
};

export default function AvatarUploader({
  open,
  onClose,
  onDone,
  uploadFn,
  title = "Chỉnh sửa ảnh đại diện",
}: Props) {
  const { message } = App.useApp();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetAll = useCallback(() => {
    setImgSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedPixels(null);
  }, []);

  const beforeUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        message.error("Vui lòng chọn tập tin ảnh");
        return Upload.LIST_IGNORE;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.error("Ảnh quá lớn (>10MB)");
        return Upload.LIST_IGNORE;
      }
      const dataURL = await fileToDataURL(file);
      setImgSrc(dataURL);
      return Upload.LIST_IGNORE;
    },
    [message]
  );

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imgSrc || !croppedPixels) {
      message.warning("Vui lòng chọn ảnh và crop trước");
      return;
    }
    setSubmitting(true);
    try {
      const img = await dataURLToImage(imgSrc);
      const cropCanvas = getCroppedCanvas(img, {
        x: Math.round(croppedPixels.x),
        y: Math.round(croppedPixels.y),
        width: Math.round(croppedPixels.width),
        height: Math.round(croppedPixels.height),
      });
      const blob = await resizeAndCompress(cropCanvas, {
        targetMaxDim: 512,
        targetKB: 200,
        preferWebP: true,
      });
      const previewUrl = blobToObjectURL(blob);

      let uploadedUrl: string | undefined;
      if (uploadFn) {
        uploadedUrl = await uploadFn(blob);
      }

      onDone({ blob, previewUrl, uploadedUrl });
      resetAll();
      onClose();
      // notify.success(uploadFn ? "Tải ảnh thành công" : "Đã xử lý ảnh");
    } catch (e: any) {
      notify.error("Xử lý ảnh thất bại: " + (e?.message || e.toString()));
    } finally {
      setSubmitting(false);
    }
  }, [imgSrc, croppedPixels, message, onDone, onClose, uploadFn, resetAll]);

  // Modal content
  const content = useMemo(
    () => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 16,
          minHeight: 380,
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#111",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {imgSrc ? (
            <Cropper
              image={imgSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition={true}
              minZoom={1}
              maxZoom={4}
            />
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{ height: 360, color: "rgba(255,255,255,0.65)" }}
            >
              Chọn ảnh để bắt đầu
            </Flex>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={beforeUpload}
          >
            <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
          </Upload>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Zoom</div>
            <Slider
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={setZoom}
            />
          </div>

          {/* Tip: có thể thêm Rotate nếu cần */}
          <div style={{ fontSize: 12, color: "#888" }}>
            Gợi ý: dùng ảnh vuông, gương mặt ở trung tâm để hiển thị đẹp nhất.
          </div>
        </div>
      </div>
    ),
    [imgSrc, crop, zoom, beforeUpload, onCropComplete]
  );

  return (
    <CommonModal
      title={title}
      open={open}
      onCancel={() => {
        resetAll();
        onClose();
      }}
      onOk={handleConfirm}
      loading={submitting}
      size="lg"
      okText="Lưu ảnh"
      cancelText="Hủy"
    >
      {content}
    </CommonModal>
  );
}
