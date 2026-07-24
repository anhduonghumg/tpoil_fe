import React from "react";
import { Badge, Button, Popover, Tag, Tooltip, Typography } from "antd";
import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ProductsApi } from "../products/api";
import { SupplierLocationsApi } from "../supplierLocations/api";
import { operationsApi } from "./api";
import type {
  CharterOrderStatus,
  ContractStatus,
  FreightRateSource,
  FreightRateStatus,
  RegistrationStatus,
  ShipCharterContract,
} from "./ship-charter.types";

export const DATE_FIELDS = [
  "signedDate", "effectiveFrom", "effectiveTo", "appendixDate", "laycanFrom", "laycanTo",
  "policyDate", "registeredDate", "plannedInspectionDate",
];

export const dateLabel = (value?: string | null) => value ? dayjs(value).format("DD/MM/YYYY") : "-";
export const numberLabel = (value?: number | string | null) =>
  value === null || value === undefined || value === "" ? "-" : Number(value).toLocaleString("vi-VN");

export const ORDER_STATUS_LABELS: Record<CharterOrderStatus, string> = {
  DRAFT: "Nháp",
  WAITING_CONFIRMATION: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  APPENDIX_CREATED: "Đã sinh phụ lục",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: "Nháp", ACTIVE: "Đang hiệu lực", EXPIRED: "Hết hiệu lực", TERMINATED: "Đã chấm dứt",
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  DRAFT: "Nháp", REGISTERED: "Đã đăng ký", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy",
};

export const FREIGHT_STATUS_LABELS: Record<FreightRateStatus, string> = {
  DRAFT: "Nháp", ACTIVE: "Đang áp dụng", INACTIVE: "Ngừng áp dụng",
};

export const SOURCE_LABELS: Record<FreightRateSource | "DIRECT" | "FROM_TERM", string> = {
  CONTRACT: "Hợp đồng", APPENDIX: "Phụ lục", MANUAL: "Nhập tay", DIRECT: "Tạo trực tiếp", FROM_TERM: "Từ đơn TERM",
};

const statusColor = (status?: string) => {
  if (["ACTIVE", "CONFIRMED", "COMPLETED", "REGISTERED"].includes(status || "")) return "green";
  if (["CANCELLED", "EXPIRED", "TERMINATED", "INACTIVE"].includes(status || "")) return "red";
  if (["WAITING_CONFIRMATION", "APPENDIX_CREATED"].includes(status || "")) return "gold";
  if (status === "IN_PROGRESS") return "blue";
  return "default";
};

export const WorkflowStatusTag: React.FC<{ status?: string; labels?: Record<string, string> }> = ({ status, labels }) => (
  <Tag color={statusColor(status)}>{status ? labels?.[status] ?? status : "-"}</Tag>
);

export const WorkflowPageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="charter-page-header">
    <div>
      <Typography.Title level={2}>{title}</Typography.Title>
      {subtitle ? <Typography.Text>{subtitle}</Typography.Text> : null}
    </div>
    <div className="charter-page-actions">{action}</div>
  </div>
);

export const FilterButton: React.FC<{
  count: number;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  content: React.ReactNode;
}> = ({ count, open, onOpenChange, content }) => (
  <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={onOpenChange} content={content}>
    <Badge dot={count > 0} offset={[-2, 2]}>
      <Button size="small" icon={<FilterOutlined />}>Bộ lọc</Button>
    </Badge>
  </Popover>
);

export const RefreshButton: React.FC<{ loading?: boolean; onClick: () => void }> = ({ loading, onClick }) => (
  <Tooltip title="Làm mới"><Button size="small" aria-label="Làm mới" icon={<ReloadOutlined spin={loading} />} onClick={onClick} /></Tooltip>
);

export function useCharterOptions(ownerCustomerId?: string) {
  const owners = useQuery({
    queryKey: ["operations", "ship-owner-options"],
    queryFn: () => operationsApi.shipOwnerSelect(),
    staleTime: 5 * 60_000,
  });
  const vessels = useQuery({
    queryKey: ["operations", "vessel-options", ownerCustomerId],
    queryFn: () => operationsApi.vesselSelect({ ownerCustomerId, isActive: true }),
    enabled: Boolean(ownerCustomerId),
    staleTime: 60_000,
  });
  const contracts = useQuery({
    queryKey: ["operations", "contract-options", ownerCustomerId],
    queryFn: () => operationsApi.charterContracts({ page: 1, pageSize: 200 }),
    select: (data) => ((data?.items ?? []) as ShipCharterContract[]).filter((item) => !ownerCustomerId || item.ownerCustomerId === ownerCustomerId),
    staleTime: 60_000,
  });
  const products = useQuery({
    queryKey: ["products", "select", "charter"],
    queryFn: () => ProductsApi.select(""),
    staleTime: 5 * 60_000,
  });
  const warehouses = useQuery({
    queryKey: ["supplierLocations", "charter-options"],
    queryFn: () => SupplierLocationsApi.list({ page: 1, pageSize: 200, isActive: true }),
    select: (data) => data?.items ?? [],
    staleTime: 5 * 60_000,
  });
  return { owners, vessels, contracts, products, warehouses };
}

export function normalizeFormValues(values: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      DATE_FIELDS.includes(key) && dayjs.isDayjs(value) ? value.format("YYYY-MM-DD") : value,
    ]),
  );
}

export function toFormValues(row?: Record<string, any>) {
  if (!row) return {};
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      DATE_FIELDS.includes(key) && value ? dayjs(value as string) : value,
    ]),
  );
}
