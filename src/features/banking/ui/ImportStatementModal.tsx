import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useBankAccountsOptions, useBankTemplatesOptions } from "../hooks";
import { apiCall } from "../../../shared/lib/api";
import { notify } from "../../../shared/lib/notification";
import { BankingApi } from "../api";
import type { BankImportPreviewResponse } from "../types";
import { ImportPreviewModal } from "./ImportPreviewModal";

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

      await apiCall("banking.importCommit", {
        data: formData,
      });

      notify.success("Import sao kê thành công");
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
        open={open}
        title="Import sao kê ngân hàng"
        onCancel={handleClose}
        onOk={handlePreview}
        okText="Xem trước"
        cancelText="Hủy"
        confirmLoading={loading}
        width={600}
        destroyOnHidden
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 font-medium">Tài khoản ngân hàng</div>
            <Select
              size="small"
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
            <div className="mb-1 font-medium">Template import</div>
            <Select
              size="small"
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
            <div className="mb-1 font-medium">File sao kê (.xlsx)</div>
            <Upload
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              onRemove={() => {
                setFile(null);
              }}
              maxCount={1}
              accept=".xlsx"
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
              <Button size="small" icon={<UploadOutlined />}>
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
