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
  InputNumber,
  Typography,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "../../../shared/lib/notification";

import type { ProductOption } from "../types";
import {
  keys,
  useImportPdfCommit,
  useImportPdfPreview,
  useImportPdfPreviewData,
  useImportPdfStatus,
} from "../hooks";

type Issue = {
  code: string;
  message: string;
  suggestions?: Array<{
    id: string;
    code?: string;
    name: string;
    score?: number;
  }>;
};

type Row = {
  key: string;
  rowNo: number;
  productRaw: string;
  canonicalKey?: string;

  productId?: string;
  regionId: string;
  regionCode?: string;
  regionName?: string;

  price: number;

  issues: Issue[];
  suggestions?: Issue["suggestions"];
};

export const PriceImportPdfModal: React.FC<{
  open: boolean;
  onClose: () => void;
  productOptions?: ProductOption[];
}> = ({ open, onClose }) => {
  const qc = useQueryClient();

  const [runId, setRunId] = useState<string>();
  const [effectiveFrom, setEffectiveFrom] = useState<string>("");
  const [isOverride, setIsOverride] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);

  const mStart = useImportPdfPreview();
  const qStatus = useImportPdfStatus(runId);
  const qPreview = useImportPdfPreviewData(
    runId,
    qStatus.data?.status == "SUCCESS",
  );
  const mCommit = useImportPdfCommit();

  const loading =
    mStart.isPending ||
    qStatus.isFetching ||
    qPreview.isFetching ||
    mCommit.isPending;

  useEffect(() => {
    if (!open) {
      setRunId(undefined);
      setEffectiveFrom("");
      setIsOverride(false);
      setRows([]);
    }
  }, [open]);

  useEffect(() => {
    const payload = (qPreview.data as any)?.artifact?.content;
    if (!payload || rows.length > 0) return;

    setEffectiveFrom(payload.effectiveFrom || "");

    const mapped: Row[] = (payload.lines || []).map((x: any, idx: number) => {
      const issues: Issue[] = x.issues || [];
      const sug = issues.find((i: any) =>
        Array.isArray(i.suggestions),
      )?.suggestions;

      return {
        key: `${idx}-${x.rowNo}-${x.regionId}-${x.productRaw}`,
        rowNo: x.rowNo ?? idx + 1,
        productRaw: x.productRaw ?? x.productNameRaw ?? "",
        canonicalKey: x.canonicalKey,
        productId: x.productId,
        regionId: x.regionId,
        regionCode: x.regionCode,
        regionName: x.regionName,
        price: x.price,
        issues,
        suggestions: sug,
      };
    });

    setRows(mapped);
  }, [qPreview.data, rows.length]);

  const hasIssues = useMemo(
    () => rows.some((r) => (r.issues || []).length > 0),
    [rows],
  );

  const commitLines = useMemo(() => {
    return rows
      .filter(
        (r) =>
          !r.issues?.length &&
          r.productId &&
          r.regionId &&
          Number.isFinite(r.price) &&
          r.price > 0,
      )
      .map((r) => ({
        productId: r.productId!,
        regionId: r.regionId,
        price: r.price,
      }));
  }, [rows]);

  const conflict = useMemo(() => {
    const payload = (qPreview.data as any)?.data;
    const d = payload?.data ?? payload;
    return d?.conflict ?? null;
  }, [qPreview.data]);

  const warnings = useMemo(() => {
    const payload = (qPreview.data as any)?.data;
    const d = payload?.data ?? payload;
    return (d?.warnings || []) as string[];
  }, [qPreview.data]);

  const beforeUpload = async (file: File) => {
    try {
      const res: any = await mStart.mutateAsync(file);
      setRunId(res.runId);
      notify.success("Đã nhận file, đang bóc tách...");
    } catch (e: any) {
      notify.error(e?.message || "Upload thất bại");
    }
    return false;
  };

  const resolveProduct = (rowKey: string, productId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== rowKey) return r;
        const issues = (r.issues || []).filter(
          (i) => !String(i.code).startsWith("PRODUCT_"),
        );
        return { ...r, productId, issues };
      }),
    );
  };

  const changePrice = (rowKey: string, v?: number | null) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== rowKey) return r;
        const price = Number(v ?? 0);
        let issues = (r.issues || []).filter((i) => i.code !== "INVALID_PRICE");
        if (!Number.isFinite(price) || price <= 0) {
          issues = [
            ...issues,
            { code: "INVALID_PRICE", message: "Giá không hợp lệ" },
          ];
        }
        return { ...r, price, issues };
      }),
    );
  };

  const doCommit = async () => {
    if (!effectiveFrom) return notify.error("Thiếu effectiveFrom");
    if (hasIssues)
      return notify.error("Còn dòng lỗi, hãy xử lý hết trước khi commit");
    if (!commitLines.length)
      return notify.error("Không có dòng hợp lệ để commit");

    if (conflict?.type === "BACKDATED") {
      const ok = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: "Import bảng giá cho thời điểm trong quá khứ?",
          content: conflict.message || "Bạn đang import bảng giá backdated.",
          okText: "Tiếp tục",
          cancelText: "Huỷ",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!ok) return;
    }

    try {
      await mCommit.mutateAsync({
        effectiveFrom,
        isOverride,
        lines: commitLines,
      });

      qc.invalidateQueries({ queryKey: keys.all });
      notify.success("Đã cập nhật bảng giá thành công");
      onClose();
    } catch (e: any) {
      notify.error(e?.message || "Commit thất bại");
    }
  };

  const columns = [
    { title: "#", dataIndex: "rowNo", width: 60 },
    {
      title: "Sản phẩm (PDF)",
      dataIndex: "productRaw",
      render: (v: string) => <Typography.Text>{v}</Typography.Text>,
    },
    {
      title: "Vùng",
      width: 300,
      render: (_: any, r: Row) => (
        <Space>
          <Tag>{r.regionCode || "?"}</Tag>
          <span>{r.regionName || ""}</span>
        </Space>
      ),
    },
    {
      title: "Giá",
      width: 100,
      render: (_: any, r: Row) => (
        <InputNumber
          value={r.price}
          min={0}
          style={{ width: "100%" }}
          onChange={(v) => changePrice(r.key, v)}
        />
      ),
    },
    {
      title: "Resolve sản phẩm",
      width: 360,
      render: (_: any, r: Row) => {
        const prodIssue = (r.issues || []).find(
          (i) =>
            i.code === "PRODUCT_NOT_FOUND" || i.code === "PRODUCT_AMBIGUOUS",
        );
        if (!prodIssue) return <Tag color="green">OK</Tag>;

        return (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Tag color="red">{prodIssue.code}</Tag>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(r.suggestions || []).slice(0, 4).map((s) => (
                <Button
                  key={s.id}
                  size="small"
                  onClick={() => resolveProduct(r.key, s.id)}
                >
                  {s.code ? `${s.code} - ${s.name}` : s.name}
                </Button>
              ))}
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Nếu không có gợi ý đúng, sẽ cần ProductSelect search (bước sau
              mình ghép tiếp).
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: "Lỗi",
      width: 340,
      render: (_: any, r: Row) => (
        <Space direction="vertical">
          {(r.issues || []).map((i, idx) => (
            <Typography.Text key={idx} type="danger">
              • {i.message}
            </Typography.Text>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1200}
      title="Import bảng giá từ PDF"
      okText="Commit"
      cancelText="Đóng"
      okButtonProps={{ disabled: !rows.length || hasIssues, loading }}
      onOk={doCommit}
    >
      <Upload.Dragger
        multiple={false}
        accept="application/pdf"
        showUploadList={false}
        beforeUpload={(f) => beforeUpload(f as any)}
        disabled={loading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo thả PDF vào đây hoặc bấm để chọn</p>
        <p className="ant-upload-hint">
          {runId ? `runId: ${runId}` : "Chỉ nhận file PDF"}
        </p>
      </Upload.Dragger>

      <div style={{ marginTop: 12 }}>
        <Space>
          <Tag>{qStatus.data?.status ?? "—"}</Tag>
          {effectiveFrom ? (
            <Tag color="blue">effectiveFrom: {effectiveFrom}</Tag>
          ) : null}
          {hasIssues ? (
            <Tag color="red">Còn lỗi</Tag>
          ) : rows.length ? (
            <Tag color="green">Sẵn sàng commit</Tag>
          ) : null}
          <span>Override nếu trùng thời điểm</span>
          <Switch checked={isOverride} onChange={setIsOverride} />
        </Space>
      </div>

      {qStatus.data?.status === "FAILED" ? (
        <Alert
          style={{ marginTop: 12 }}
          type="error"
          message="Xử lý PDF thất bại"
          description={qStatus.data?.error}
        />
      ) : null}

      {warnings.length ? (
        <Alert
          style={{ marginTop: 12 }}
          type="warning"
          message="Cảnh báo"
          description={
            <div>
              {warnings.slice(0, 6).map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          }
        />
      ) : null}

      {conflict ? (
        <Alert
          style={{ marginTop: 12 }}
          type={conflict.type === "SAME_TIME" ? "warning" : "info"}
          message="Thông tin thời gian"
          description={conflict.message}
        />
      ) : null}

      <div style={{ marginTop: 12 }}>
        <Table<Row>
          size="small"
          rowKey="key"
          columns={columns as any}
          dataSource={rows}
          pagination={{ pageSize: 50 }}
          scroll={{ x: 1200, y: 520 }}
        />
      </div>
    </Modal>
  );
};
