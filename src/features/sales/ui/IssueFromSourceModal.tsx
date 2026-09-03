import React, { useEffect, useState } from "react";
import { Alert, Modal, Skeleton } from "antd";
import dayjs from "dayjs";
import { useCancelInvoice, useCreateInvoiceDraft, useInvoicePreview, useIssueInvoice } from "../hooks";
import type { InvoiceCreditAssessment, UnissuedInvoiceSource } from "../types";
import { extractApiError } from "../../../shared/lib/httpError";
import { IssueInvoiceModal } from "./IssueInvoiceModal";
import { CreditWarningModal, creditAssessmentFromError } from "./CreditWarningModal";

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
  // Bản nháp được dựng tạm để chạy kiểm tra công nợ. Nếu kiểm tra trước khi
  // gọi MISA bị chặn, phải dọn bản nháp này để chứng từ nguồn vẫn nằm ở
  // "Chưa xuất HĐ" (không biến thành "Xuất nháp").
  const cleanupDraftMutation = useCancelInvoice(undefined, { silent: true });
  const [creditAssessment, setCreditAssessment] = useState<InvoiceCreditAssessment | null>(null);
  /** Giữ lại ID khi đã gửi sang MISA để có thể retry đúng chứng từ đó. */
  const [draftId, setDraftId] = useState<string>();

  useEffect(() => {
    if (!open) {
      setCreditAssessment(null);
      setDraftId(undefined);
    }
  }, [open]);

  const preview = previewQuery.data;
  const busy = draftMutation.isPending || issueMutation.isPending || cleanupDraftMutation.isPending;

  /** Dựng nháp (nếu chưa có) rồi phát hành. Vướng công nợ thì nhường cho hộp cảnh báo. */
  const issue = async (overrideCredit?: InvoiceCreditAssessment) => {
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
        overrideCredit: overrideCredit ? true : undefined,
        creditSnapshotHash: overrideCredit?.snapshotHash,
      });
      setCreditAssessment(null);
      onClose();
    } catch (error) {
      const assessment = creditAssessmentFromError(error);
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

      // Không phải cảnh báo công nợ thì hook đã báo lỗi rồi; giữ hộp mở để bấm lại được.
      if (assessment) {
        setCreditAssessment(assessment);
      }
    }
  };

  if (creditAssessment) {
    return (
      <CreditWarningModal
        open={open}
        assessment={creditAssessment}
        loading={busy}
        onCancel={onClose}
        onConfirm={() => void issue(creditAssessment)}
      />
    );
  }

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
      }}
      onCancel={onClose}
      onConfirm={() => void issue()}
    />
  );
}
