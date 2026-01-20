import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Upload,
  Table,
  Tag,
  Space,
  Button,
  Alert,
  Switch,
  Typography,
  Spin,
} from "antd";
import {
  InboxOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  LoadingOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "../../../shared/lib/notification";

import {
  useImportPdfCommit,
  useImportPdfPreview,
  useImportPdfPreviewData,
  useImportPdfStatus,
  useUpdatePreviewLine,
} from "../hooks";

const denseStyle = `
  .ant-table-wrapper .ant-table-thead > tr > th,
  .ant-table-wrapper .ant-table-tbody > tr > td {
    padding: 4px 8px !important;
  }
  .ant-modal-body {
    padding: 12px !important;
  }
  .ant-upload-drag {
    padding: 8px 0 !important;
  }
`;

export const PriceImportPdfModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const qc = useQueryClient();
  const [runId, setRunId] = useState<string>();
  const [isOverride, setIsOverride] = useState(false);

  // Hooks
  const mStart = useImportPdfPreview();
  const qStatus = useImportPdfStatus(runId);
  const qPreview = useImportPdfPreviewData(
    runId,
    qStatus.data?.status === "SUCCESS",
  );
  const mUpdateLine = useUpdatePreviewLine();
  const mCommit = useImportPdfCommit();

  // Dữ liệu bóc tách
  const payload =
    qPreview.data?.artifact?.content || qPreview.data?.content || qPreview.data;
  const effectiveFrom = payload?.effectiveFrom || "";
  const stats = payload?.stats;
  const conflict = payload?.conflict;
  const warnings = payload?.warnings || [];

  const lines: any[] = useMemo(() => {
    if (!payload?.lines) return [];
    return payload.lines.map((x: any, idx: number) => ({
      ...x,
      key: `${x.rowNo}-${x.regionId}-${idx}`,
      suggestions: x.issues?.find((i: any) => i.suggestions)?.suggestions || [],
    }));
  }, [payload]);

  const hasIssues = useMemo(() => {
    if (!lines || lines.length === 0) return true;
    return lines.some(
      (line) => !line.productId || (line.issues && line.issues.length > 0),
    );
  }, [lines]);

  const displayStats = useMemo(() => {
    const total = lines.length;
    const errorLines = lines.filter(
      (l) => !l.productId || (l.issues && l.issues.length > 0),
    ).length;
    return {
      total,
      ok: total - errorLines,
      withIssues: errorLines,
    };
  }, [lines]);

  const getStatusDisplay = () => {
    if (mStart.isPending)
      return (
        <Tag color="blue" icon={<LoadingOutlined />}>
          Đang tải lên...
        </Tag>
      );

    const status = qStatus.data?.status;
    if (status === "PROCESSING" || (runId && !status)) {
      return (
        <Tag color="processing" icon={<LoadingOutlined />}>
          Hệ thống đang bóc tách PDF...
        </Tag>
      );
    }
    if (status === "SUCCESS")
      return (
        <Tag color="success" icon={<CheckCircleFilled />}>
          Bóc tách hoàn tất
        </Tag>
      );
    if (status === "FAILED")
      return (
        <Tag color="error" icon={<ExclamationCircleFilled />}>
          Lỗi: {qStatus.data?.error || "Không xác định"}
        </Tag>
      );

    return runId ? <Tag color="default">Đang khởi tạo...</Tag> : null;
  };

  useEffect(() => {
    if (!open) {
      setRunId(undefined);
      setIsOverride(false);
    }
  }, [open]);

  const beforeUpload = async (file: File) => {
    try {
      const res = await mStart.mutateAsync(file);
      setRunId(res?.runId);
      notify.info("Đã nhận file, vui lòng chờ giây lát...");
    } catch (e: any) {
      notify.error("Lỗi tải file");
    }
    return false;
  };

  const doCommit = async () => {
    if (!effectiveFrom) return notify.error("Thiếu thời gian hiệu lực");
    if (lines.length === 0) return notify.error("Không có dữ liệu để lưu");

    try {
      await mCommit.mutateAsync({
        effectiveFrom,
        isOverride,
        lines: lines.map((l) => ({
          productId: l.productId,
          regionId: l.regionId,
          price: l.price,
        })),
      });

      notify.success("Đã cập nhật bảng giá thành công!");
      onClose();
      setRunId(undefined);
    } catch (e: any) {
      notify.error(e.message || "Lỗi khi lưu bảng giá");
    }
  };

  const columns = [
    {
      title: "#",
      dataIndex: "rowNo",
      width: 40,
      align: "center" as const,
      render: (v: number) => (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: "Sản phẩm (PDF)",
      dataIndex: "productRaw",
      width: 220,
      render: (v: string) => (
        <Typography.Text strong style={{ fontSize: 13 }}>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: "Vùng",
      width: 130,
      render: (r: any) => (
        <Space size={4}>
          <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>
            {r.regionCode}
          </Tag>
          <Typography.Text style={{ fontSize: 12 }}>
            {r.regionName}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Giá",
      dataIndex: "price",
      width: 100,
      align: "right" as const,
      render: (v: number) => (
        <Typography.Text strong style={{ color: "#1890ff", fontSize: 13 }}>
          {v?.toLocaleString()}
        </Typography.Text>
      ),
    },
    {
      title: "Trạng thái khớp",
      render: (r: any) => {
        const productIssue = r.issues?.find((i: any) =>
          i.code.startsWith("PRODUCT_"),
        );

        // Nếu đã có productId, ưu tiên hiển thị ĐÃ KHỚP ngay cả khi issues cũ còn tồn tại trong cache
        if (r.productId && !productIssue) {
          return (
            <Tag color="success" style={{ fontSize: 11 }}>
              ĐÃ KHỚP
            </Tag>
          );
        }

        if (!productIssue)
          return (
            <Tag color="success" style={{ fontSize: 11 }}>
              ĐÃ KHỚP
            </Tag>
          );

        return (
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            <Typography.Text
              type="danger"
              style={{ fontSize: "12px", display: "block", lineHeight: "14px" }}
            >
              {productIssue.message}
            </Typography.Text>
            <Space size={[4, 4]} wrap style={{ marginTop: 2 }}>
              {r.suggestions?.map((s: any) => (
                <Button
                  key={s.id}
                  size="small"
                  type="primary"
                  ghost
                  loading={
                    mUpdateLine.isPending &&
                    mUpdateLine.variables?.rowNo === r.rowNo
                  }
                  style={{ fontSize: "11px", height: "20px", padding: "0 4px" }}
                  onClick={() =>
                    mUpdateLine.mutate({
                      runId: runId!,
                      rowNo: r.rowNo,
                      data: { productId: s.id },
                    })
                  }
                >
                  {s.name}
                </Button>
              ))}
            </Space>
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      title={<Typography.Text strong>Nhập bảng giá từ PDF</Typography.Text>}
      open={open}
      width={1100}
      style={{ top: 20 }}
      onCancel={onClose}
      onOk={doCommit}
      okText="Xác nhận lưu"
      okButtonProps={{
        disabled:
          hasIssues || !lines.length || qStatus.data?.status !== "SUCCESS",
        loading: mCommit.isPending,
        size: "small",
      }}
      cancelButtonProps={{ size: "small" }}
    >
      <style>{denseStyle}</style>

      <Upload.Dragger
        accept=".pdf"
        beforeUpload={beforeUpload}
        showUploadList={false}
        style={{ marginBottom: 8 }}
        // disabled={
        //   mStart.isPending || (runId && qStatus.data?.status === "PROCESSING")
        // }
      >
        <p className="ant-upload-text" style={{ fontSize: 13 }}>
          <InboxOutlined style={{ marginRight: 8 }} />
          Kéo thả file PDF vào đây{" "}
          {runId && <Tag style={{ marginLeft: 8 }}>Mã: {runId.slice(-6)}</Tag>}
        </p>
      </Upload.Dragger>

      <div
        style={{
          background: "#f0f5ff",
          padding: "4px 12px",
          borderRadius: 4,
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #adc6ff",
        }}
      >
        <Space size={16}>
          {getStatusDisplay()}
          {stats && (
            <div style={{ background: "#f0f5ff", padding: "4px 12px" }}>
              <Space size={16}>
                <Typography.Text>
                  Tổng: <b>{displayStats.total}</b>
                </Typography.Text>
                <Typography.Text type="success">
                  Khớp: <b>{displayStats.ok}</b>
                </Typography.Text>
                <Typography.Text type="danger">
                  Lỗi: <b>{displayStats.withIssues}</b>
                </Typography.Text>
              </Space>
            </div>
          )}
        </Space>

        {effectiveFrom && (
          <Typography.Text strong style={{ fontSize: 12 }}>
            Hiệu lực:{" "}
            {new Date(effectiveFrom).toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Typography.Text>
        )}
      </div>

      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space>
          <Switch size="small" checked={isOverride} onChange={setIsOverride} />
          <span style={{ fontSize: 13 }}>Ghi đè giá trùng thời điểm</span>
        </Space>

        {conflict && (
          <Tag
            color="warning"
            icon={<ExclamationCircleFilled />}
            style={{ margin: 0 }}
          >
            {conflict.message}
          </Tag>
        )}
      </div>

      <Table
        dataSource={lines}
        columns={columns as any}
        loading={qPreview.isFetching || mUpdateLine.isPending}
        size="small"
        pagination={false}
        scroll={{ y: 500 }}
        bordered
        locale={{
          emptyText: runId ? (
            <Spin tip="Đang tải dữ liệu..." />
          ) : (
            "Chưa có dữ liệu"
          ),
        }}
      />
    </Modal>
  );
};
