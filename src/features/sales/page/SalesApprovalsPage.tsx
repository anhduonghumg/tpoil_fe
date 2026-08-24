import { ApprovalQueue } from "../ui/ApprovalQueue";

/**
 * Hàng đợi phê duyệt giá / công nợ / ngoại lệ. Bảng nằm ở `ApprovalQueue` vì tab
 * "Chờ duyệt" trong màn đơn bán dùng đúng bảng đó.
 */
export default function SalesApprovalsPage() {
  return <ApprovalQueue />;
}
