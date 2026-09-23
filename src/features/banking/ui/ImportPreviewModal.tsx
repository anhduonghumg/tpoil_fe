import { useMemo, useState } from "react";
import { Alert, Modal, Segmented, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import type { BankImportPreviewResponse, BankImportPreviewRow } from "../types";
import { RecognitionTag } from "./RecognitionTag";
import { BankingKpis } from "./BankingKpis";
import { SignedAmount, formatMoney } from "../lib/format";
import "../../../shared/ui/data-grid.css";
import "../banking.css";

type Props = {
  open: boolean;
  data: BankImportPreviewResponse | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type Filter = "ALL" | "IN" | "OUT" | "REVIEW" | "DUPLICATE";

export function ImportPreviewModal({ open, data, loading, onCancel, onConfirm }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const rows = data?.rows ?? [];
  const summary = data?.summary;

  const counts = useMemo(() => {
    const fresh = rows.filter((row) => !row.isDuplicate);
    const sum = (list: BankImportPreviewRow[]) => list.reduce((total, row) => total + Number(row.amount || 0), 0);
    const incoming = fresh.filter((row) => row.direction === "IN");
    const outgoing = fresh.filter((row) => row.direction === "OUT");
    return {
      inCount: incoming.length,
      inAmount: sum(incoming),
      outCount: outgoing.length,
      outAmount: sum(outgoing),
      // Tiền vào của khách mà chưa chắc là ai: sau import phải có người chọn khách.
      review: fresh.filter((row) => row.direction === "IN" && row.recognition?.kind !== "INTERNAL" && row.recognition?.kind !== "BANK_FEE" && row.recognition?.confidence !== "HIGH").length,
      duplicate: rows.length - fresh.length,
    };
  }, [rows]);

  const visible = rows.filter((row) => {
    if (filter === "IN") return !row.isDuplicate && row.direction === "IN";
    if (filter === "OUT") return !row.isDuplicate && row.direction === "OUT";
    if (filter === "DUPLICATE") return row.isDuplicate;
    if (filter === "REVIEW")
      return !row.isDuplicate && row.direction === "IN" && row.recognition?.kind !== "INTERNAL" && row.recognition?.kind !== "BANK_FEE" && row.recognition?.confidence !== "HIGH";
    return true;
  });

  const columns: ColumnsType<BankImportPreviewRow> = [
    {
      title: "Ngày giao dịch",
      dataIndex: "txnDate",
      width: 130,
      render: (value, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip">{value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—"}</span>
          <span className="data-grid-clip data-grid-sub">HT {row.valueDate ? dayjs(row.valueDate).format("DD/MM/YYYY") : "—"}</span>
        </div>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (value, row) => <SignedAmount direction={row.direction} value={value} />,
    },
    {
      title: "Người chuyển / nội dung",
      dataIndex: "description",
      render: (value, row) => {
        const payer = row.counterpartyName || row.recognition?.payerName;
        const account = row.counterpartyAcc || row.recognition?.payerAccount;
        return (
          <Tooltip title={value} placement="topLeft">
            <div className="data-grid-stack">
              <span className="data-grid-clip data-grid-strong">
                {payer || "Chưa rõ người chuyển"}
                {account ? <span className="data-grid-sub-inline"> · {account}</span> : null}
              </span>
              <span className="data-grid-clip data-grid-sub">{value}</span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Nhận diện",
      width: 250,
      render: (_, row) => <RecognitionTag recognition={row.recognition} />,
    },
    {
      title: "",
      dataIndex: "isDuplicate",
      width: 80,
      align: "center",
      render: (value) => (value ? <Tag color="orange">Trùng</Tag> : <Tag color="green">Mới</Tag>),
    },
  ];

  const undeclared = summary?.undeclaredCompanyAccounts ?? [];

  return (
    <Modal
      className="banking-modal"
      open={open}
      title={data ? `Xem trước sao kê · ${data.bankAccount.bankCode} ${data.bankAccount.accountNo}` : "Xem trước sao kê"}
      width="min(1240px, 96vw)"
      onCancel={onCancel}
      onOk={onConfirm}
      okText={`Import ${summary ? summary.validCount : ""} dòng`}
      okButtonProps={{ disabled: !summary?.validCount }}
      cancelText="Đóng"
      confirmLoading={loading}
    >
      {data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="banking-hint">
            File <b>{data.fileName}</b> · mẫu {data.template ? `${data.template.name} v${data.template.version}` : "chưa chọn"}
            {data.existedImport ? " · file này đã từng được import, các dòng trùng sẽ tự bỏ qua" : ""}
          </div>

          <BankingKpis
            activeKey={filter}
            items={[
              { key: "IN", label: "Tiền vào", value: counts.inCount, hint: `${formatMoney(counts.inAmount)} đ`, color: "#1d7a3a", onClick: () => setFilter(filter === "IN" ? "ALL" : "IN") },
              { key: "OUT", label: "Tiền ra", value: counts.outCount, hint: `${formatMoney(counts.outAmount)} đ`, color: "#c0392b", onClick: () => setFilter(filter === "OUT" ? "ALL" : "OUT") },
              {
                key: "RECOGNIZED",
                label: "Đã nhận ra khách",
                value: `${summary?.customerHighCount ?? 0} chắc chắn`,
                hint: `${summary?.customerRecognizedCount ?? 0} dòng thu có gợi ý khách`,
              },
              {
                key: "REVIEW",
                label: "Thu cần xác định khách",
                value: counts.review,
                hint: "Chọn khách ở màn Thu tiền sau khi import",
                warning: counts.review > 0,
                onClick: () => setFilter(filter === "REVIEW" ? "ALL" : "REVIEW"),
              },
              { key: "INTERNAL", label: "Nội bộ / phí NH", value: (summary?.internalCount ?? 0) + (summary?.bankFeeCount ?? 0), hint: "Không tính vào công nợ" },
              { key: "DUPLICATE", label: "Trùng, bỏ qua", value: counts.duplicate, onClick: () => setFilter(filter === "DUPLICATE" ? "ALL" : "DUPLICATE") },
            ]}
          />

          {undeclared.length ? (
            <Alert
              type="warning"
              showIcon
              message={`Có chuyển tiền nội bộ từ ${undeclared.length > 1 ? "các" : ""} tài khoản chưa khai báo: ${undeclared.join(", ")}`}
              description={
                <>
                  Khai báo ở <Link to="/bank-accounts">Tài khoản công ty</Link> để lần sau nhận ra chuyển nội bộ theo số tài khoản, không bị
                  lẫn với tiền khách trả.
                </>
              }
            />
          ) : null}

          <Segmented<Filter>
            size="small"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: `Tất cả (${rows.length})` },
              { value: "IN", label: `Tiền vào (${counts.inCount})` },
              { value: "OUT", label: `Tiền ra (${counts.outCount})` },
              { value: "REVIEW", label: `Cần xác định khách (${counts.review})` },
              { value: "DUPLICATE", label: `Trùng (${counts.duplicate})` },
            ]}
            style={{ alignSelf: "flex-start" }}
          />

          <Table
            className="data-grid"
            rowKey={(row) => `${row.rowNo}-${row.fingerprint}`}
            size="small"
            columns={columns}
            dataSource={visible}
            pagination={{ pageSize: 12, showSizeChanger: false, hideOnSinglePage: true }}
            scroll={{ x: 1000 }}
          />
          {summary && summary.totalRows > summary.previewCount ? (
            <div className="banking-hint">Đang xem {summary.previewCount}/{summary.totalRows} dòng đầu; import sẽ lấy đủ cả file.</div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
