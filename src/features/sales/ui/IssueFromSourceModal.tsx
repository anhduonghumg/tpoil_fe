import React, { useEffect, useState } from "react";
import { Alert, Modal, Skeleton } from "antd";
import dayjs from "dayjs";
import { useCancelInvoice, useCreateInvoiceDraft, useInvoicePreview, useIssueInvoice } from "../hooks";
import type { UnissuedInvoiceSource } from "../types";
import { extractApiError } from "../../../shared/lib/httpError";
import { IssueInvoiceModal } from "./IssueInvoiceModal";

/**
 * Phát hành hóa đơn thẳng từ một chứng từ ở tab "Chưa xuất HĐ".
 *
 * Cố ý KHÔNG dựng hóa đơn nháp lúc bấm nút: dựng trước thì chứng từ rời khỏi tab "Chưa
 * xuất HĐ" sang "Xuất nháp" ngay cả khi kế toán chỉ định mở ra xem rồi đóng lại. Ở đây
 * chỉ gọi `preview` (không ghi gì xuống DB) để dựng bản xem trước; bấm "Phát hành" rồi
 * mới dựng nháp và phát hành liền trong một mạch.
 *
 * Bản nháp chỉ tồn tại trong lúc phát hành. Nếu kiểm tra trước khi gọi MISA bị lỗi,
 * bản nháp tạm được hủy để lần xác nhận sau dựng lại một bản mới; lỗi MISA thì giữ
 * nguyên hóa đơn ở trạng thái `ISSUE_FAILED` để retry.
 */
export function IssueFromSourceModal({
  row,
  open,
  onClose,
}: {
  row?: UnissuedInvoiceSource;
  open: boolean;
  onClose: () => void;
}) {
  const source = row?.source ?? {};
  const previewQuery = useInvoicePreview(source, open);
  const draftMutation = useCreateInvoiceDraft({ silent: true });
  const issueMutation = useIssueInvoice();
  // Bản nháp dựng tạm để chạy các bước kiểm trước khi gọi MISA. Nếu bị chặn, phải dọn
  // bản nháp này để chứng từ nguồn vẫn nằm ở "Chưa xuất HĐ" (không biến thành "Xuất nháp").
  const cleanupDraftMutation = useCancelInvoice(undefined, { silent: true });
  /** Giữ lại ID khi đã gửi sang MISA để có thể retry đúng chứng từ đó. */
  const [draftId, setDraftId] = useState<string>();

  useEffect(() => {
    if (!open) setDraftId(undefined);
  }, [open]);

  const preview = previewQuery.data;
  const busy = draftMutation.isPending || issueMutation.isPending || cleanupDraftMutation.isPending;

  /** Dựng nháp (nếu chưa có) rồi phát hành liền trong một mạch. */
  const issue = async (overrideMissingPurchaseInvoice = false) => {
    if (!row) return;
    let invoiceId = draftId;
    let draftCreatedInThisAttempt = false;
    if (!invoiceId) {
      const draft = await draftMutation.mutateAsync(row.source).catch(() => undefined);
      if (!draft) return;
      invoiceId = draft.id;
      draftCreatedInThisAttempt = true;
      setDraftId(draft.id);
    }
    try {
      await issueMutation.mutateAsync({
        invoiceId,
        overrideMissingPurchaseInvoice:
          overrideMissingPurchaseInvoice ||
          preview?.warnings?.some((warning) => warning.code === "PURCHASE_INVOICE_PENDING") ||
          undefined,
      });
      onClose();
    } catch (error) {
      const errorCode = extractApiError(error).code;
      const isMisaFailure = Boolean(errorCode?.startsWith("MISA_"));

      // Các lỗi validation/preflight xảy ra trước khi gọi MISA không được để
      // lại bản nháp tạm. Ngược lại, lỗi MISA sau khi đã gửi phải giữ nguyên
      // ISSUE_FAILED để người dùng retry ở tab "Xuất HĐ lỗi".
      if (draftCreatedInThisAttempt && invoiceId && !isMisaFailure) {
        try {
          await cleanupDraftMutation.mutateAsync({
            invoiceId,
            reason: "Dọn bản nháp tạm — lỗi kiểm tra trước khi phát hành",
          });
          setDraftId(undefined);
        } catch {
          // Giữ ID để người dùng có thể tiếp tục trên bản nháp nếu việc dọn
          // tự động bị lỗi (hook đã hiển thị thông báo lỗi).
        }
      }

      // Các lỗi khác đã được hook báo bằng toast; giữ hộp mở để bấm lại được.
      if (errorCode === "PURCHASE_INVOICE_CONFIRMATION_REQUIRED") {
        Modal.confirm({
          title: "Chưa có hóa đơn đầu vào",
          content: extractApiError(error).message,
          okText: "Xác nhận phát hành",
          cancelText: "Dừng lại",
          onOk: () => issue(true),
        });
      }
    }
  };

  // Chưa dựng được bản xem trước thì không cho bấm phát hành — chưa biết sẽ xuất cái gì.
  if (previewQuery.isLoading || previewQuery.isError || !preview) {
    return (
      <Modal
        open={open}
        title="Phát hành hóa đơn"
        okText="Phát hành"
        cancelText="Đóng"
        okButtonProps={{ disabled: true }}
        onCancel={onClose}
        onOk={onClose}
      >
        {previewQuery.isError ? (
          <Alert
            showIcon
            type="error"
            message={`Chưa dựng được hóa đơn cho ${row?.sourceNo ?? "chứng từ này"}`}
            description={extractApiError(previewQuery.error).message}
          />
        ) : (
          <Skeleton active paragraph={{ rows: 6 }} />
        )}
      </Modal>
    );
  }

  return (
    <IssueInvoiceModal
      open={open}
      loading={busy}
      invoice={{
        // Số ký hiệu và ngày do bước phát hành cấp; bản xem trước lấy ngày hôm nay đúng
        // như `createDraft` vẫn làm, để con số trên hộp khớp với hóa đơn sắp dựng.
        invoiceDate: dayjs().format("YYYY-MM-DD"),
        buyerName: preview.buyer.name,
        buyerTaxCode: preview.buyer.taxCode,
        buyerAddress: preview.buyer.address,
        buyerEmail: preview.buyer.email,
        subtotal: preview.totals.subtotal,
        discountTotal: preview.totals.discountTotal,
        taxTotal: preview.totals.taxTotal,
        grandTotal: preview.totals.grandTotal,
        lines: preview.lines,
        creditWarning: row.creditWarning,
        purchaseInvoiceWarning:
          preview.warnings?.find((warning) => warning.code === "PURCHASE_INVOICE_PENDING") ??
          row.purchaseInvoiceWarning,
      }}
      onCancel={onClose}
      onConfirm={() => void issue()}
    />
  );
}
