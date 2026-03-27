import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useBankAccountsOptions, useBankTemplatesOptions } from "../hooks";
import { apiCall } from "../../../shared/lib/api";
import { notify } from "../../../shared/lib/notification";

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
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    // đổi tài khoản thì clear template cũ
    setTemplateId(undefined);
  }, [bankAccountId]);

  const handleClose = () => {
    resetForm();
    onCancel();
  };

  const handleSubmit = async () => {
    if (!bankAccountId) {
      notify.error("Chọn tài khoản ngân hàng");
      return;
    }

    if (!file) {
      notify.error("Chọn file sao kê");
      return;
    }

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

      notify.success("Import thành công");
      resetForm();
      onSuccess();
      onCancel();
    } catch (e: any) {
      notify.error(
        e?.response?.data?.message || e?.message || "Import thất bại",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Import sao kê ngân hàng"
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
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
            placeholder="Chọn template"
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
  );
}
