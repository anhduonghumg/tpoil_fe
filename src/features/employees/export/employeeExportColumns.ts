// src/modules/users/export/employeeExportColumns.ts
import dayjs from "dayjs";
import type { User } from "../types";
import { STATUS_LABELS, TITLE_LABELS } from "../../../shared/constants/labels";
import { ExportColumn } from "../../../shared/lib/exportExcel";

const fmt = (d?: string | Date) => (d ? dayjs(d).format("DD-MM-YYYY") : "");
const deptName = (r: any) =>
  r?.memberships?.[0]?.department?.name ?? r?.departmentName ?? "";

export const EMPLOYEE_EXPORT_COLUMNS: ExportColumn<User>[] = [
  {
    key: "fullName",
    label: "Nhân viên",
    accessor: (r) => r.fullName ?? (r as any).name,
  },
  { key: "workEmail", label: "Email công việc" },
  { key: "personalEmail", label: "Email cá nhân" },
  { key: "phone", label: "Điện thoại" },
  { key: "departmentName", label: "Phòng ban", accessor: (r) => deptName(r) },
  {
    key: "title",
    label: "Chức danh",
    accessor: (r) => TITLE_LABELS[r.title ?? ""] ?? r.title ?? "",
  },
  {
    key: "joinedAt",
    label: "Ngày vào",
    accessor: (r) => fmt((r as any).joinedAt),
  },
  { key: "leftAt", label: "Ngày rời", accessor: (r) => fmt((r as any).leftAt) },
  {
    key: "status",
    label: "Trạng thái",
    accessor: (r) => STATUS_LABELS[r.status ?? ""] ?? r.status ?? "",
  },
];
