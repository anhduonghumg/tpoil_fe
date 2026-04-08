import { Modal, Progress, Typography } from "antd";

const { Text } = Typography;

type Props = {
  open: boolean;
  metrics?: {
    total?: number;
    processed?: number;
    success?: number;
    failed?: number;
    currentOrderNo?: string | null;
  } | null;
  status?: string | null;
  onClose: () => void;
};

export default function PrintBatchModal({
  open,
  metrics,
  status,
  onClose,
}: Props) {
  const total = Number(metrics?.total ?? 0);
  const processed = Number(metrics?.processed ?? 0);
  const success = Number(metrics?.success ?? 0);
  const failed = Number(metrics?.failed ?? 0);

  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Modal
      open={open}
      title="Đang tạo bản in"
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={420}
      maskClosable={false}
    >
      <Progress percent={percent} />
      <div style={{ marginTop: 12 }}>
        <Text>Tổng số đơn: {total}</Text>
        <br />
        <Text>Đã xử lý: {processed}</Text>
        <br />
        <Text type="success">Thành công: {success}</Text>
        <br />
        <Text type={failed > 0 ? "danger" : undefined}>Lỗi: {failed}</Text>
        <br />
        <Text type="secondary">
          Đơn hiện tại: {metrics?.currentOrderNo || "-"}
        </Text>
      </div>

      {status === "SUCCESS" ? (
        <div style={{ marginTop: 12 }}>
          <Text type="success">
            Đã tạo xong file PDF, đang mở bản xem trước...
          </Text>
        </div>
      ) : null}
    </Modal>
  );
}
