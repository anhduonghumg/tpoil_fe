import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import {
  useBankTemplates,
  useCommitBankImport,
  usePreviewBankImport,
} from "../hooks";
import type { BankAccountOption, BankImportPreviewResponse } from "../types";
import { ImportPreviewModal } from "./ImportPreviewModal";

type Props = {
  bankAccounts: BankAccountOption[];
};

export function StatementImportCard({ bankAccounts }: Props) {
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [templateId, setTemplateId] = useState<string>();
  const [file, setFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] =
    useState<BankImportPreviewResponse | null>(null);

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((x) => x.id === bankAccountId),
    [bankAccounts, bankAccountId],
  );

  const bankCode = selectedBankAccount?.bankCode;
  const { data: templates = [], isLoading: templatesLoading } =
    useBankTemplates(bankCode);
  const previewMutation = usePreviewBankImport();
  const commitMutation = useCommitBankImport();

  useEffect(() => {
    setTemplateId(undefined);
  }, [bankCode]);

  const handlePreview = async () => {
    if (!bankAccountId) {
      message.warning("Vui lòng chọn tài khoản ngân hàng");
      return;
    }
    if (!file) {
      message.warning("Vui lòng chọn file sao kê");
      return;
    }

    try {
      const res = await previewMutation.mutateAsync({
        bankAccountId,
        templateId,
        file,
      });
      setPreviewData(res);
      setPreviewOpen(true);
    } catch (e: any) {
      message.error(e?.message || "Xem trước import thất bại");
    }
  };

  const handleCommit = async () => {
    if (!previewData || !bankAccountId) return;

    try {
      await commitMutation.mutateAsync({
        bankAccountId,
        templateId,
        fileChecksum: previewData.fileChecksum,
        rows: previewData.rows,
      });
      message.success("Import sao kê thành công");
      setPreviewOpen(false);
      setPreviewData(null);
      setFile(null);
    } catch (e: any) {
      message.error(e?.message || "Import sao kê thất bại");
    }
  };

  const uploadProps = {
    accept: ".xlsx",
    maxCount: 1,
    beforeUpload: (f: File) => {
      setFile(f);
      return false;
    },
    onRemove: () => {
      setFile(null);
    },
    fileList: file
      ? [
          {
            uid: "local-file",
            name: file.name,
            status: "done",
          } as UploadFile,
        ]
      : [],
  };

  return (
    <>
      <Card
        size="small"
        title="Import sao kê"
        styles={{ body: { paddingBottom: 12 } }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Typography.Text>Tài khoản ngân hàng</Typography.Text>
            <Select
              value={bankAccountId}
              onChange={setBankAccountId}
              placeholder="Chọn tài khoản"
              style={{ width: "100%", marginTop: 6 }}
              options={bankAccounts.map((x) => ({
                value: x.id,
                label: `${x.bankCode} - ${x.accountNo}${
                  x.accountName ? ` - ${x.accountName}` : ""
                }`,
              }))}
            />
          </Col>

          <Col xs={24} md={8}>
            <Typography.Text>Template</Typography.Text>
            <Select
              allowClear
              value={templateId}
              onChange={setTemplateId}
              placeholder="Chọn template"
              loading={templatesLoading}
              style={{ width: "100%", marginTop: 6 }}
              options={templates.map((x: any) => ({
                value: x.id,
                label: `${x.name} v${x.version}`,
              }))}
            />
          </Col>

          <Col xs={24} md={8}>
            <Typography.Text>File sao kê</Typography.Text>
            <div style={{ marginTop: 6 }}>
              <Upload.Dragger {...uploadProps} style={{ padding: 8 }}>
                <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text" style={{ marginBottom: 0 }}>
                  Kéo thả hoặc bấm để chọn file .xlsx
                </p>
              </Upload.Dragger>
            </div>
          </Col>
        </Row>

        <Space style={{ marginTop: 12 }}>
          <Button onClick={handlePreview} loading={previewMutation.isPending}>
            Xem trước
          </Button>
        </Space>
      </Card>

      <ImportPreviewModal
        open={previewOpen}
        data={previewData}
        loading={commitMutation.isPending}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleCommit}
      />
    </>
  );
}
