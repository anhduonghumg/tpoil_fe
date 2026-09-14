// features/contracts/ui/ContractFilters.tsx
import React, { useState } from "react";
import { Button, DatePicker, Input, Select, Space, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type { ContractKind, ContractListQuery } from "../types";
import { CustomerSelect } from "../../../shared/ui/CustomerSelect";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";

const { RangePicker } = DatePicker;

const STATUS_LABELS: Record<string, string> = {
  Draft: "Nháp",
  Pending: "Chờ duyệt",
  Active: "Đang hiệu lực",
  Terminated: "Đã chấm dứt",
  Cancelled: "Đã hủy",
};

const RISK_LABELS: Record<string, string> = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
};

/**
 * Chiều không còn là thuộc tính của hợp đồng mà suy ra từ loại thương nhân của đối tác:
 * lọc "bán được" ra TNPP + TNDL, "mua được" ra TNPP + TNDM. Hợp đồng với TNPP vì thế
 * xuất hiện ở cả hai bên.
 */
const KIND_LABELS: Record<ContractKind, string> = {
  SALES: "Đối tác mình bán được",
  PURCHASE: "Đối tác mình mua được",
};

type FilterPatch = Omit<ContractListQuery, "page" | "pageSize">;

interface ContractFiltersProps {
  value: ContractListQuery;
  onChange: (next: FilterPatch) => void;
  /**
   * Workspace đã quyết chiều hợp đồng thì khóa ô đó lại: ở phân hệ bán không có lý do
   * để lật sang hợp đồng mua, và để mở chỉ khiến người dùng lạc.
   */
  lockedKind?: ContractKind;
}

export const ContractFilters: React.FC<ContractFiltersProps> = ({
  value,
  onChange,
  lockedKind,
}) => {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState(value.keyword ?? "");

  const patch = (next: Partial<FilterPatch>) =>
    onChange({
      keyword: value.keyword,
      customerId: value.customerId,
      kind: value.kind,
      status: value.status,
      riskLevel: value.riskLevel,
      startFrom: value.startFrom,
      startTo: value.startTo,
      ...next,
    });

  const reset = () => {
    setSearchText("");
    onChange({
      keyword: undefined,
      customerId: undefined,
      // Chiều hợp đồng do workspace áp đặt thì "đặt lại" không được xóa nó.
      kind: lockedKind ?? undefined,
      status: undefined,
      riskLevel: undefined,
      startFrom: undefined,
      startTo: undefined,
      endFrom: undefined,
      endTo: undefined,
    });
  };

  const activeCount =
    Number(Boolean(value.customerId)) +
    Number(Boolean(value.status)) +
    Number(Boolean(value.riskLevel)) +
    Number(Boolean(value.startFrom || value.startTo)) +
    Number(Boolean(value.kind) && !lockedKind);

  const tags = [
    value.customerId && {
      key: "customer",
      label: "Đang lọc theo đối tác",
      onClear: () => patch({ customerId: undefined }),
    },
    !lockedKind &&
      value.kind && {
        key: "kind",
        label: KIND_LABELS[value.kind],
        onClear: () => patch({ kind: undefined }),
      },
    value.status && {
      key: "status",
      label: `Trạng thái: ${STATUS_LABELS[value.status] ?? value.status}`,
      onClear: () => patch({ status: undefined }),
    },
    value.riskLevel && {
      key: "risk",
      label: `Rủi ro: ${RISK_LABELS[value.riskLevel] ?? value.riskLevel}`,
      onClear: () => patch({ riskLevel: undefined }),
    },
    (value.startFrom || value.startTo) && {
      key: "start",
      label: `Hiệu lực: ${
        value.startFrom ? dayjs(value.startFrom).format("DD/MM/YYYY") : "…"
      } – ${value.startTo ? dayjs(value.startTo).format("DD/MM/YYYY") : "…"}`,
      onClear: () => patch({ startFrom: undefined, startTo: undefined }),
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const label = (text: string) => (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      {text}
    </Typography.Text>
  );

  const panel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        {label("Khách hàng / đối tác")}
        <CustomerSelect
          allowClear
          placeholder="Mọi đối tác"
          style={{ width: "100%" }}
          value={value.customerId}
          onChange={(next: string | null) => patch({ customerId: next ?? undefined })}
        />
      </div>

      {!lockedKind && (
        <div style={{ marginBottom: 10 }}>
          {label("Chiều giao dịch")}
          <Select
            size="small"
            allowClear
            placeholder="Cả hai chiều"
            style={{ width: "100%" }}
            value={value.kind}
            onChange={(next) => patch({ kind: next })}
            options={[
              { value: "SALES", label: KIND_LABELS.SALES },
              { value: "PURCHASE", label: KIND_LABELS.PURCHASE },
            ]}
          />
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        {label("Trạng thái")}
        <Select
          size="small"
          allowClear
          placeholder="Mọi trạng thái"
          style={{ width: "100%" }}
          value={value.status}
          onChange={(next) => patch({ status: next })}
          options={Object.entries(STATUS_LABELS).map(([key, text]) => ({
            value: key,
            label: text,
          }))}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        {label("Mức rủi ro")}
        <Select
          size="small"
          allowClear
          placeholder="Mọi mức"
          style={{ width: "100%" }}
          value={value.riskLevel}
          onChange={(next) => patch({ riskLevel: next })}
          options={Object.entries(RISK_LABELS).map(([key, text]) => ({
            value: key,
            label: text,
          }))}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        {label("Ngày hiệu lực")}
        <RangePicker
          size="small"
          allowEmpty={[true, true]}
          placeholder={["Từ ngày", "Đến ngày"]}
          format="DD/MM/YYYY"
          style={{ width: "100%" }}
          value={
            value.startFrom || value.startTo
              ? [
                  value.startFrom ? dayjs(value.startFrom) : null,
                  value.startTo ? dayjs(value.startTo) : null,
                ]
              : null
          }
          onChange={(range) => {
            const next = range as [Dayjs | null, Dayjs | null] | null;
            patch({
              startFrom: next?.[0]?.format("YYYY-MM-DD"),
              startTo: next?.[1]?.format("YYYY-MM-DD"),
            });
          }}
        />
      </div>

      <div style={{ textAlign: "right" }}>
        <Button size="small" onClick={reset}>
          Đặt lại
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <FilterToolbar
        left={
          <Input
            allowClear
            size="small"
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã hoặc tên hợp đồng"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => patch({ keyword: searchText.trim() || undefined })}
          />
        }
        right={
          <Space>
            <FilterButton count={activeCount} open={open} onOpenChange={setOpen} content={panel} />
          </Space>
        }
      />
      <FilterTags items={tags} />
    </>
  );
};

export default ContractFilters;
