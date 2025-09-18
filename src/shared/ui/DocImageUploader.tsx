// src/shared/ui/DocImageUploader.tsx
import { useCallback, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { App, Button, Slider, Upload, Flex } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import CommonModal from "./CommonModal";
import {
  blobToObjectURL,
  dataURLToImage,
  fileToDataURL,
  getCroppedCanvas,
  resizeAndCompress,
} from "../utils/image";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (res: { blob: Blob; previewUrl: string }) => void;
  title?: string;
  aspect?: number;
  targetMaxDim?: number;
  targetKB?: number;
};

export default function DocImageUploader({
  open,
  onClose,
  onDone,
  title = "Chỉnh sửa ảnh tài liệu",
  aspect = 1.6,
  targetMaxDim = 1280,
  targetKB = 350,
}: Props) {
  const { message } = App.useApp();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const beforeUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        message.error("Vui lòng chọn tập tin ảnh");
        return Upload.LIST_IGNORE;
      }
      if (file.size > 20 * 1024 * 1024) {
        message.error("Ảnh quá lớn (>20MB)");
        return Upload.LIST_IGNORE;
      }
      const dataURL = await fileToDataURL(file);
      setImgSrc(dataURL);
      return Upload.LIST_IGNORE;
    },
    [message]
  );

  const onCropComplete = useCallback(
    (_: Area, px: Area) => setCroppedPixels(px),
    []
  );

  const handleOk = useCallback(async () => {
    if (!imgSrc || !croppedPixels) {
      message.warning("Vui lòng chọn ảnh và crop trước");
      return;
    }
    setLoading(true);
    try {
      const img = await dataURLToImage(imgSrc);
      const cropCanvas = getCroppedCanvas(img, {
        x: Math.round(croppedPixels.x),
        y: Math.round(croppedPixels.y),
        width: Math.round(croppedPixels.width),
        height: Math.round(croppedPixels.height),
      });
      const blob = await resizeAndCompress(cropCanvas, {
        targetMaxDim,
        targetKB,
        preferWebP: true,
        qualityStart: 0.85,
        qualityMin: 0.65,
        step: 0.07,
      });
      const previewUrl = blobToObjectURL(blob);
      onDone({ blob, previewUrl });
      onClose();
    } catch (e) {
      console.error(e);
      message.error("Xử lý ảnh thất bại");
    } finally {
      setLoading(false);
    }
  }, [imgSrc, croppedPixels, onDone, onClose, message, targetKB, targetMaxDim]);

  const content = useMemo(
    () => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 16,
          minHeight: 360,
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
              aspect={aspect}
              cropShape="rect"
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              minZoom={1}
              maxZoom={5}
            />
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{ height: 340, color: "rgba(255,255,255,0.65)" }}
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
              max={5}
              step={0.01}
              value={zoom}
              onChange={setZoom}
            />
          </div>

          <div style={{ fontSize: 12, color: "#888" }}>
            Gợi ý: đặt giấy tờ thẳng, chụp rõ nét, không lóa sáng.
          </div>
        </div>
      </div>
    ),
    [imgSrc, crop, zoom, beforeUpload, onCropComplete, aspect]
  );

  return (
    <CommonModal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      loading={loading}
      okText="Dùng ảnh này"
      cancelText="Hủy"
      size="lg"
    >
      {content}
    </CommonModal>
  );
}
