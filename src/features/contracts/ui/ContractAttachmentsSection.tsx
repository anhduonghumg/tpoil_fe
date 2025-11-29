// features/contracts/ui/ContractAttachmentsSection.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  FileOutlined,
  LinkOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { AttachmentCategory, ContractAttachment } from "../types";
import { ContractsApi } from "../api";
import { notify } from "../../../shared/lib/notification";
import { useUploadFile } from "../../../shared/hook/useUploadImage";

// ===== Common =====

const categoryLabel: Record<AttachmentCategory, string> = {
  ScanSigned: "Hợp đồng đã ký",
  Draft: "Bản nháp",
  Appendix: "Phụ lục",
  Other: "Khác",
};

function guessFileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean);
    if (path.length) return decodeURIComponent(path[path.length - 1]);
    return u.host;
  } catch {
    return url;
  }
}

// ===== CREATE MODE =====

export type PendingContractAttachment = {
  id: string; // temp id trên FE
  fileName: string;
  fileUrl?: string;
  category: AttachmentCategory;
  externalUrl?: string | null;
};

interface ContractAttachmentsCreateSectionProps {
  attachments: PendingContractAttachment[];
  onChange: (next: PendingContractAttachment[]) => void;
  disabled?: boolean;
}

export const ContractAttachmentsCreateSection: React.FC<
  ContractAttachmentsCreateSectionProps
> = ({ attachments, onChange, disabled }) => {
  const [linkInput, setLinkInput] = useState("");

  // 🔹 dùng chung folder "contracts"
  const { upload, loading: uploading } = useUploadFile("contracts", "contract");

  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    try {
      // validate sơ sơ
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      notify.error("Link không hợp lệ");
      return;
    }

    const name = guessFileNameFromUrl(url);
    const next: PendingContractAttachment = {
      id: `${Date.now()}-link-${Math.random().toString(36).slice(2, 8)}`,
      fileName: name || "Liên kết Google Drive",
      category: "Other",
      externalUrl: url,
    };

    onChange([...attachments, next]);
    setLinkInput("");
    notify.success("Đã thêm link đính kèm");
  };

  const columns: ColumnsType<PendingContractAttachment> = [
    {
      title: "Tên file / link",
      dataIndex: "fileName",
      key: "fileName",
      ellipsis: true,
      render: (value, record) => {
        if (record.externalUrl) {
          return (
            <a href={record.externalUrl} target="_blank" rel="noreferrer">
              <Space size={4}>
                <LinkOutlined />
                <span>{value}</span>
              </Space>
            </a>
          );
        }
        return (
          <Tooltip title={value}>
            <Space size={4}>
              <FileOutlined />
              <span>{value}</span>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: "Loại",
      dataIndex: "category",
      key: "category",
      width: 160,
      render: (cat: AttachmentCategory) => (
        <Tag>{categoryLabel[cat] ?? cat}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 80,
      align: "right" as const,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() =>
            onChange(attachments.filter((att) => att.id !== record.id))
          }
        />
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Tài liệu đính kèm"
      style={{ marginTop: 12, paddingBottom: 8 }}
      extra={
        <Space.Compact size="small">
          <Upload
            showUploadList={false}
            disabled={disabled}
            beforeUpload={async (file) => {
              try {
                // 🔹 upload qua BE, lấy URL thật
                const result = await upload(file, file.name);
                const fileUrl =
                  typeof result === "string"
                    ? result
                    : result?.url ?? result?.path ?? "";

                if (!fileUrl) {
                  notify.error("Không lấy được URL file sau khi upload");
                  return false;
                }

                const next: PendingContractAttachment = {
                  id: `${Date.now()}-${file.uid}`,
                  fileName: file.name,
                  fileUrl,
                  category: "ScanSigned",
                };

                onChange([...attachments, next]);
                notify.success("Đã thêm file vào danh sách đính kèm");
              } catch {
                notify.error("Tải lên file thất bại");
              }
              // luôn trả false để AntD không tự upload
              return false;
            }}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              disabled={disabled}
            >
              File
            </Button>
          </Upload>

          <Input
            placeholder="Link Google Drive"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            style={{ width: 220 }}
            disabled={disabled}
          />
          <Button type="default" onClick={handleAddLink} disabled={disabled}>
            Thêm link
          </Button>
        </Space.Compact>
      }
    >
      <Table<PendingContractAttachment>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={attachments}
        pagination={false}
      />
    </Card>
  );
};

// ===== EDIT MODE =====

interface ContractAttachmentsEditSectionProps {
  contractId: string;
  initialAttachments: ContractAttachment[];
  disabled?: boolean;
}

export const ContractAttachmentsEditSection: React.FC<
  ContractAttachmentsEditSectionProps
> = ({ contractId, initialAttachments, disabled }) => {
  const [items, setItems] = useState<ContractAttachment[]>(initialAttachments);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");

  // 🔹 reuse hook upload cho edit mode
  const { upload, loading: uploading } = useUploadFile("contracts", "contract");

  useEffect(() => {
    setItems(initialAttachments);
  }, [initialAttachments]);

  const handleAddFile = async (file: File) => {
    try {
      // upload BE
      const result = await upload(file, file.name);
      const fileUrl =
        typeof result === "string" ? result : result?.url ?? result?.path ?? "";

      if (!fileUrl) {
        notify.error("Không lấy được URL file sau khi upload");
        return;
      }

      const apiRes = await ContractsApi.createAttachment({
        contractId,
        fileName: file.name,
        fileUrl,
        category: "ScanSigned",
      });

      // tùy ContractsApi.createAttachment trả gì,
      // ở api.ts mình đang .then((r) => r.data!) => đã là ContractAttachment
      const newAttachment = apiRes as any;

      setItems((prev) => [...prev, newAttachment]);
      notify.success("Đã tải lên file");
    } catch {
      notify.error("Tải lên file thất bại");
    }
  };

  const handleAddLink = async () => {
    const url = linkInput.trim();
    if (!url) return;
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      notify.error("Link không hợp lệ");
      return;
    }

    try {
      const name = guessFileNameFromUrl(url);
      const apiRes = await ContractsApi.createAttachment({
        contractId,
        fileName: name || "Liên kết Google Drive",
        category: "Other",
        externalUrl: url,
      });

      const newAttachment = apiRes as any;
      setItems((prev) => [...prev, newAttachment]);
      setLinkInput("");
      notify.success("Đã thêm link");
    } catch {
      notify.error("Thêm link thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await ContractsApi.deleteAttachment(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      notify.success("Đã xóa file");
    } catch {
      notify.error("Xóa file thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnsType<ContractAttachment> = [
    {
      title: "Tên file / link",
      dataIndex: "fileName",
      key: "fileName",
      ellipsis: true,
      render: (value, record) => {
        const url = record.fileUrl || record.externalUrl || undefined;
        if (!url) {
          return (
            <Space size={4}>
              <FileOutlined />
              <span>{value}</span>
            </Space>
          );
        }
        const isLinkOnly = !!record.externalUrl && !record.fileUrl;
        return (
          <a href={url} target="_blank" rel="noreferrer">
            <Space size={4}>
              {isLinkOnly ? <LinkOutlined /> : <FileOutlined />}
              <span>{value}</span>
            </Space>
          </a>
        );
      },
    },
    {
      title: "Loại",
      dataIndex: "category",
      key: "category",
      width: 160,
      render: (cat: AttachmentCategory) => (
        <Tag>{categoryLabel[cat] ?? cat}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 80,
      align: "right" as const,
      render: (_, record) => (
        <Popconfirm
          title="Xóa file đính kèm"
          description="Bạn chắc chắn muốn xóa file này?"
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{
            danger: true,
            loading: deletingId === record.id,
          }}
          onConfirm={() => handleDelete(record.id)}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Tài liệu đính kèm"
      style={{ marginTop: 12, paddingBottom: 8 }}
      extra={
        <Space.Compact size="small">
          <Upload
            showUploadList={false}
            disabled={disabled}
            beforeUpload={async (file) => {
              await handleAddFile(file);
              return false;
            }}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              disabled={disabled}
            >
              File
            </Button>
          </Upload>
          <Input
            placeholder="Link Google Drive"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            style={{ width: 220 }}
            disabled={disabled}
          />
          <Button type="default" onClick={handleAddLink} disabled={disabled}>
            Thêm link
          </Button>
        </Space.Compact>
      }
    >
      <Table<ContractAttachment>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={false}
      />
    </Card>
  );
};
