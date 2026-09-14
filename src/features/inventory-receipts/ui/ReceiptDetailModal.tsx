import { Button, Modal, Space, Table } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useInventoryReceiptDetail } from "../hooks";
import "../inventory-receipts.css";

/**
 * Chi tiết một phiếu nhập. Tách ra khỏi màn danh sách vì Thẻ kho cũng cần mở đúng
 * phiếu này khi người dùng bấm vào dòng bút toán nhập — hai màn, một modal.
 */

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

const SOURCE_META: Record<string, string> = {
  COMMERCIAL_LOT_WITHDRAWAL: "Rút lô mua hàng",
  PURCHASE_RECEIPT: "Nhập từ đơn mua",
};

export function ReceiptDetailModal({
  receiptId,
  onClose,
}: {
  receiptId?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const detail = useInventoryReceiptDetail(receiptId);
  const receipt = detail.data;

  return (
    <Modal
      open={Boolean(receiptId)}
      title={receipt ? `Phiếu nhập ${receipt.receiptNo}` : "Chi tiết phiếu nhập"}
      footer={
        receipt?.purchaseOrder ? (
          <Button
            type="primary"
            onClick={() =>
              navigate(
                receipt.purchaseOrder?.orderType === "LOT"
                  ? `/commercial-purchases/lots/${receipt.purchaseOrder.id}`
                  : `/purchase-orders/${receipt.purchaseOrder?.id}`,
              )
            }
          >
            Mở đơn mua
          </Button>
        ) : null
      }
      onCancel={onClose}
      width={820}
      destroyOnHidden
      loading={detail.isLoading}
    >
      {receipt ? (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div className="inventory-receipt-detail-meta">
            <div><span>Ngày nhập</span><strong>{dayjs(receipt.receiptDate).format("DD/MM/YYYY HH:mm")}</strong></div>
            <div><span>Nguồn</span><strong>{SOURCE_META[receipt.sourceType]}</strong></div>
            <div><span>Chứng từ nguồn</span><strong>{receipt.sourceNo ?? "-"}</strong></div>
            <div><span>Kho nhận</span><strong>{receipt.warehouse.code} - {receipt.warehouse.name}</strong></div>
            <div><span>Nhà cung cấp</span><strong>{receipt.supplier.code ?? ""} - {receipt.supplier.name}</strong></div>
            <div><span>Bút toán kho</span><strong>{receipt.posting?.postingNo ?? "-"}</strong></div>
          </div>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={receipt.lines}
            columns={[
              { title: "Mặt hàng", render: (_, row: any) => `${row.product.code ?? ""} - ${row.product.name}` },
              { title: "Lô", render: (_, row: any) => row.lot?.lotNo ?? "-" },
              { title: "Số lượng", dataIndex: "actualQty", align: "right", render: formatQty },
              { title: "V15", dataIndex: "v15Qty", align: "right", render: (value) => value == null ? "-" : formatQty(value) },
            ]}
          />
        </Space>
      ) : null}
    </Modal>
  );
}
