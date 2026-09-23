import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useBankAccountsOptions, useBankTemplatesOptions } from "../hooks";
import { apiCall } from "../../../shared/lib/api";
import { notify } from "../../../shared/lib/notification";
import { BankingApi } from "../api";
import type { BankImportPreviewResponse } from "../types";
import { ImportPreviewModal } from "./ImportPreviewModal";
import "../banking.css";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
};

export default function ImportStatementModal({
  open,
  onCancel,
  onSuccess,
}: Props) {
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [templateId, setTemplateId] = useState<string>();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] =
    useState<BankImportPreviewResponse | null>(null);

  const accountsQuery = useBankAccountsOptions();

  const selectedAccount = useMemo(
    () => (accountsQuery.data || []).find((x: any) => x.id === bankAccountId),
    [accountsQuery.data, bankAccountId],
  );

  const templatesQuery = useBankTemplatesOptions(selectedAccount?.bankCode);

  const resetForm = () => {
    setBankAccountId(undefined);
    setTemplateId(undefined);
    setFile(null);
    setLoading(false);
    setPreviewOpen(false);
    setPreviewData(null);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    setTemplateId(undefined);
  }, [bankAccountId]);

  const handleClose = () => {
    resetForm();
    onCancel();
  };

  const validateInput = () => {
    if (!bankAccountId) {
      notify.error("Chọn tài khoản ngân hàng");
      return false;
    }

    if (!file) {
      notify.error("Chọn file sao kê");
      return false;
    }

    return true;
  };

  const handlePreview = async () => {
    if (!validateInput() || !bankAccountId || !file) return;
    setLoading(true);
    try {
      const result = await BankingApi.previewImport({
        bankAccountId,
        templateId,
        file,
      });
      setPreviewData(result);
      setPreviewOpen(true);
    } catch (e: any) {
      notify.error(
        e?.response?.data?.message || e?.message || "Xem trước sao kê thất bại",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!validateInput() || !bankAccountId || !file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bankAccountId", bankAccountId);
      if (templateId) {
        formData.append("templateId", templateId);
      }

      const response = await apiCall("banking.importCommit", {
        data: formData,
      });
      const result = ((response.data as any)?.data ?? response.data) as { importedCount?: number; duplicatedCount?: number } | undefined;
      const summary = previewData?.summary;

      // Nói rõ dòng nào đi đâu: tiền vào sang Thu tiền, tiền ra sang Sao kê & đối soát.
      notify.success(
        `Đã import ${result?.importedCount ?? summary?.validCount ?? 0} dòng` +
          (summary?.inCount !== undefined ? ` · ${summary.inCount} thu (xử lý ở Thu tiền) · ${summary.outCount ?? 0} chi (xử lý ở Sao kê)` : "") +
          (result?.duplicatedCount ? ` · bỏ qua ${result.duplicatedCount} dòng trùng` : ""),
      );
      setPreviewOpen(false);
      resetForm();
      onSuccess();
      onCancel();
    } catch (e: any) {
      notify.error(
        e?.response?.data?.message || e?.message || "Import sao kê thất bại",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        className="banking-modal"
        open={open}
        title="Import sao kê ngân hàng"
        onCancel={handleClose}
        onOk={handlePreview}
        okText="Xem trước"
        cancelText="Hủy"
        confirmLoading={loading}
        width={560}
        destroyOnHidden
      >
        <div className="banking-form" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div className="banking-field-label">Tài khoản ngân hàng</div>
            <Select
              style={{ width: "100%" }}
              placeholder="Chọn tài khoản"
              value={bankAccountId}
              onChange={setBankAccountId}
              options={(accountsQuery.data || []).map((x: any) => ({
                label: `${x.bankCode} - ${x.accountNo}${
                  x.accountName ? ` - ${x.accountName}` : ""
                }`,
                value: x.id,
              }))}
              loading={accountsQuery.isLoading}
              allowClear
            />
          </div>

          <div>
            <div className="banking-field-label">Template import</div>
            <Select
              style={{ width: "100%" }}
              placeholder="Tự chọn template active mới nhất nếu bỏ trống"
              value={templateId}
              onChange={setTemplateId}
              options={(templatesQuery.data || []).map((x: any) => ({
                label: `${x.name} (v${x.version})`,
                value: x.id,
              }))}
              loading={templatesQuery.isLoading}
              disabled={!bankAccountId}
              allowClear
            />
          </div>

          <div>
            <div className="banking-field-label">File sao kê (.xlsx, .xls — kể cả Excel 97-2003)</div>
            <Upload
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              onRemove={() => {
                setFile(null);
              }}
              maxCount={1}
              accept=".xlsx,.xls"
              fileList={
                file
                  ? [
                      {
                        uid: "local-file",
                        name: file.name,
                        status: "done",
                      } as any,
                    ]
                  : []
              }
            >
              <Button icon={<UploadOutlined />}>
                Chọn file
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>

      <ImportPreviewModal
        open={previewOpen}
        data={previewData}
        loading={loading}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleCommit}
      />
    </>
  );
}
