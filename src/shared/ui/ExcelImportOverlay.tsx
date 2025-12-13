// shared/ui/ExcelImportOverlay.tsx
import React, { useEffect, useState } from "react";
import {
  Upload,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Progress,
  message,
} from "antd";
import type { UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import CommonModal from "./CommonModal";
import { notify } from "../lib/notification";

const { Dragger } = Upload;
const { Text } = Typography;

export interface ParsedRow<T> {
  index: number;
  raw: Record<string, any>;
  data: T | null;
  errors: string[];
}

export interface ExcelImportConfig<T> {
  previewColumns: {
    dataIndex: keyof T | string;
    title: string;
    width?: number;
    render?: (value: any, row: ParsedRow<T>) => React.ReactNode;
  }[];
  parseRow: (excelRow: Record<string, any>, index: number) => T | null;
  validateRow?: (row: T, index: number) => string[];
  onSubmit: (rows: T[]) => Promise<void>;
  chunkSize?: number;
  helperText?: React.ReactNode;
  templateUrl?: string;
}

export interface ExcelImportOverlayProps<T> {
  title?: string;
  open: boolean;
  onClose: () => void;
  config: ExcelImportConfig<T>;
}

export function ExcelImportOverlay<T>({
  title = "Nhập dữ liệu từ Excel",
  open,
  onClose,
  config,
}: ExcelImportOverlayProps<T>) {
  const [parsedRows, setParsedRows] = useState<ParsedRow<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const hasData = parsedRows.length > 0;

  const resetState = () => {
    setParsedRows([]);
    setProgress(0);
    setLoading(false);
    setImporting(false);
    setDownloadingTemplate(false);
  };

  const handleCloseInternal = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
      });

      const rows: ParsedRow<T>[] = json.map((row, idx) => {
        const excelIndex = idx + 2;
        const data = config.parseRow(row, excelIndex);
        let errors: string[] = [];

        if (data && config.validateRow) {
          errors = config.validateRow(data, excelIndex);
        }

        return {
          index: excelIndex,
          raw: row,
          data,
          errors,
        };
      });

      setParsedRows(rows);
    } catch (e) {
      console.error(e);
      notify.error("Không đọc được file Excel. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }

    return false;
  };

  const uploadProps: UploadProps = {
    multiple: false,
    accept:
      ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    beforeUpload: handleFile,
    showUploadList: false,
  };

  const handleImport = async () => {
    if (!hasData) return;

    const validRows = parsedRows.filter(
      (r) => r.data && (!r.errors || r.errors.length === 0)
    );

    if (!validRows.length) return;

    setImporting(true);
    setProgress(0);

    const chunkSize = config.chunkSize ?? 200;
    const total = validRows.length;
    const chunks = Math.ceil(total / chunkSize);

    try {
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = validRows.slice(start, end).map((r) => r.data!) as T[];

        await config.onSubmit(chunk);

        const nextProgress = Math.round(((i + 1) / chunks) * 100);
        setProgress(nextProgress);
      }

      // Xong
      handleCloseInternal();
      notify.success(`Đã nhập ${validRows.length} dòng hợp lệ.`);
    } catch (e) {
      console.error(e);
      notify.error("Có lỗi xảy ra khi nhập dữ liệu. Vui lòng thử lại.");
      setImporting(false);
    }
  };

  const errorCount = parsedRows.filter(
    (r) => r.errors && r.errors.length > 0
  ).length;
  const validCount = parsedRows.length - errorCount;

  const handleDownloadTemplate = async () => {
    // if (!config.templateUrl) return;
    try {
      setDownloadingTemplate(true);
      const res = await fetch("/api/contracts/import/template", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "import-template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      notify.error("Không tải được file mẫu. Vui lòng thử lại.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  return (
    <CommonModal
      title={title}
      open={open}
      onCancel={handleCloseInternal}
      onOk={hasData && validCount > 0 ? handleImport : undefined}
      okText="Nhập dữ liệu"
      cancelText="Đóng"
      loading={importing}
      size="xtra"
      footer={null}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {/* {config.templateUrl && ( */}
        <Space
          style={{ width: "100%", justifyContent: "space-between" }}
          size={8}
        >
          <Text type="secondary">
            Nên sử dụng file mẫu của hệ thống để cột và định dạng chính xác.
          </Text>
          <Button
            type="link"
            onClick={handleDownloadTemplate}
            loading={downloadingTemplate}
          >
            Tải file mẫu Excel
          </Button>
        </Space>
        {/* )} */}

        <Dragger
          {...uploadProps}
          disabled={loading || importing}
          style={{ padding: 12 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Kéo thả file Excel vào đây hoặc bấm để chọn file
          </p>
          <p className="ant-upload-hint">
            Hỗ trợ định dạng .xls, .xlsx. Nên dùng mẫu chuẩn của hệ thống.
          </p>
        </Dragger>

        {config.helperText && (
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {config.helperText}
          </div>
        )}

        {loading && <Text>Đang đọc file...</Text>}

        {hasData && (
          <>
            <Space size={12} align="center" wrap>
              <Tag color="green">Hợp lệ: {validCount}</Tag>
              <Tag color={errorCount ? "red" : "default"}>
                Lỗi: {errorCount}
              </Tag>
              {importing && (
                <div style={{ minWidth: 160 }}>
                  <Progress percent={progress} size="small" />
                </div>
              )}
            </Space>

            <Table<ParsedRow<T>>
              size="small"
              rowKey={(r) => r.index}
              dataSource={parsedRows}
              pagination={{ pageSize: 20 }}
              scroll={{ x: true, y: 320 }}
              columns={[
                {
                  title: "#",
                  dataIndex: "index",
                  width: 60,
                  fixed: "left",
                },
                ...config.previewColumns.map((col) => ({
                  title: col.title,
                  dataIndex: col.dataIndex as string,
                  width: col.width,
                  ellipsis: true,
                  render: (_: any, row: ParsedRow<T>) => {
                    const value =
                      row.data && (row.data as any)[col.dataIndex as string];
                    return col.render ? col.render(value, row) : value ?? "";
                  },
                })),
                {
                  title: "Lỗi",
                  key: "errors",
                  width: 220,
                  render: (_, row) =>
                    row.errors && row.errors.length > 0 ? (
                      <Space direction="vertical" size={2}>
                        {row.errors.map((err, idx) => (
                          <Tag key={idx} color="red">
                            {err}
                          </Tag>
                        ))}
                      </Space>
                    ) : (
                      <Tag color="green">OK</Tag>
                    ),
                },
              ]}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
              }}
            >
              <Button onClick={handleCloseInternal} disabled={importing}>
                Đóng
              </Button>
              <Button
                type="primary"
                onClick={handleImport}
                disabled={!validCount || importing}
                loading={importing}
              >
                Nhập {validCount} dòng hợp lệ
              </Button>
            </div>
          </>
        )}
      </Space>
    </CommonModal>
  );
}
