// features/contracts/page/ContractsPage.tsx
import React, { useState, useMemo } from "react";
import { Button, Flex, Space, Dropdown } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  useContractList,
  useDeleteContract,
  useImportContracts,
} from "../hooks";
import type { ContractListQuery, ContractImportRow } from "../types";
import { ContractUpsertOverlay } from "../ui/ContractUpsertOverlay";

import { ContractFilters } from "../ui/ContractFilters";
import { ContractTable } from "../ui/ContractTable";
import { notify } from "../../../shared/lib/notification";
import ContractFilesModal from "../ui/ContractFilesModal";
import {
  ExcelImportOverlay,
  ExcelImportConfig,
} from "../../../shared/ui/ExcelImportOverlay";
import dayjs from "dayjs";

const DEFAULT_PAGE_SIZE = 20;

export const ContractsPage: React.FC = () => {
  // ===== Query state =====
  const [query, setQuery] = useState<ContractListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading } = useContractList(query);
  const deleteMutation = useDeleteContract();
  const importMutation = useImportContracts();

  // ===== Overlay state =====
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Import Excel
  const [importOpen, setImportOpen] = useState(false);

  const [filePreviewContractId, setFilePreviewContractId] = useState<
    string | null
  >(null);

  // ===== Data helpers =====
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? query.page ?? 1;
  const pageSize = data?.pageSize ?? query.pageSize ?? DEFAULT_PAGE_SIZE;

  const loadingTable = isLoading || deleteMutation.isPending;

  // ===== Handlers =====

  const handleFilterChange = (
    next: Omit<ContractListQuery, "page" | "pageSize">
  ) => {
    setQuery((prev) => ({
      ...prev,
      ...next,
      page: 1,
    }));
  };

  const handlePageChange = (nextPage: number, nextPageSize?: number) => {
    setQuery((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: nextPageSize ?? prev.pageSize ?? DEFAULT_PAGE_SIZE,
    }));
  };

  const handleCreate = () => {
    setOverlayMode("create");
    setEditingId(undefined);
    setOverlayOpen(true);
  };

  const handleEdit = (id: string) => {
    setOverlayMode("edit");
    setEditingId(id);
    setOverlayOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      notify.success("Đã xoá hợp đồng");
      setEditingId(undefined);
    } catch (err) {
      notify.error("Xoá hợp đồng thất bại");
    }
  };

  const handleUpsertSuccess = (id: string) => {
    notify.success(
      overlayMode === "create"
        ? "Tạo hợp đồng thành công"
        : "Cập nhật hợp đồng thành công"
    );
    setOverlayOpen(false);
    setEditingId(undefined);
  };

  // ===== Dropdown "Thêm mới / Nhập từ Excel" =====

  const actionMenuItems = [
    { key: "create", label: "Thêm mới" },
    { key: "import", label: "Nhập từ Excel" },
  ];

  const handleActionClick = ({ key }: { key: string }) => {
    if (key === "create") {
      handleCreate();
    } else if (key === "import") {
      setImportOpen(true);
    }
  };

  // ===== Config cho ExcelImportOverlay =====

  const contractImportConfig: ExcelImportConfig<ContractImportRow> =
    useMemo(() => {
      // helper parse date từ Excel -> YYYY-MM-DD
      const parseExcelDate = (value: any): string | null => {
        if (!value) return null;
        // Nếu là Date thật
        if (value instanceof Date) {
          return dayjs(value).format("YYYY-MM-DD");
        }
        // Nếu là số seri Excel, tuỳ file của bạn có dùng không
        if (typeof value === "number") {
          const excelEpoch = new Date(1899, 11, 30);
          return dayjs(excelEpoch).add(value, "day").format("YYYY-MM-DD");
        }
        // Nếu là string
        const s = String(value).trim();
        if (!s) return null;
        const d = dayjs(s, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
        return d.isValid() ? d.format("YYYY-MM-DD") : null;
      };

      const mapStatus = (
        raw: string
      ): ContractImportRow["status"] | undefined => {
        const s = raw.trim();
        if (!s) return undefined;
        // Cho phép nhập Enum hoặc tiếng Việt
        const lower = s.toLowerCase();
        if (lower === "draft" || lower === "nháp") return "Draft";
        if (lower === "pending" || lower === "chờ duyệt") return "Pending";
        if (
          lower === "active" ||
          lower === "hiệu lực" ||
          lower === "đang hiệu lực"
        )
          return "Active";
        if (
          lower === "terminated" ||
          lower === "kết thúc" ||
          lower === "đã chấm dứt"
        )
          return "Terminated";
        if (lower === "cancelled" || lower === "hủy" || lower === "đã hủy")
          return "Cancelled";
        return undefined;
      };

      const mapRisk = (
        raw: string
      ): ContractImportRow["riskLevel"] | undefined => {
        const s = raw.trim();
        if (!s) return undefined;
        const lower = s.toLowerCase();
        if (lower === "low" || lower === "thấp") return "Low";
        if (lower === "medium" || lower === "trung bình") return "Medium";
        if (lower === "high" || lower === "cao") return "High";
        return undefined;
      };

      return {
        previewColumns: [
          { title: "Mã HĐ", dataIndex: "code", width: 120 },
          { title: "Tên hợp đồng", dataIndex: "name", width: 200 },
          { title: "Mã KH", dataIndex: "customerCode", width: 200 },
          { title: "Mã loại HĐ", dataIndex: "contractTypeCode", width: 200 },
          { title: "Ngày bắt đầu", dataIndex: "startDate", width: 200 },
          { title: "Ngày kết thúc", dataIndex: "endDate", width: 200 },
          { title: "Trạng thái", dataIndex: "status", width: 200 },
        ],

        // map 1 dòng Excel -> ContractImportRow (hoặc null để bỏ qua dòng trống)
        parseRow: (excelRow: Record<string, any>) => {
          const code = String(excelRow["Mã HĐ"] ?? "").trim();
          const name = String(excelRow["Tên hợp đồng"] ?? "").trim();
          const customerCode = String(excelRow["Mã KH"] ?? "").trim();
          const contractTypeCode = String(excelRow["Mã loại HĐ"] ?? "").trim();

          // Dòng hoàn toàn trống -> bỏ qua
          if (!code && !name && !customerCode && !contractTypeCode) {
            return null;
          }

          const startDate = parseExcelDate(excelRow["Ngày bắt đầu"]);
          const endDate = parseExcelDate(excelRow["Ngày kết thúc"]);

          const status =
            mapStatus(String(excelRow["Trạng thái"] ?? "")) ?? "Draft";

          const paymentTermDaysRaw = excelRow["Điều khoản (ngày)"];
          const creditLimitOverrideRaw = excelRow["Hạn mức override"];

          const riskLevel = mapRisk(String(excelRow["Rủi ro"] ?? "")) ?? "Low";

          const sla = excelRow["SLA"] ? String(excelRow["SLA"]).trim() : null;
          const deliveryScope = excelRow["Phạm vi giao dịch"]
            ? String(excelRow["Phạm vi giao dịch"]).trim()
            : null;
          const renewalOfCode = excelRow["Gia hạn từ HĐ"]
            ? String(excelRow["Gia hạn từ HĐ"]).trim()
            : null;

          const row: ContractImportRow = {
            code,
            name,
            customerCode,
            contractTypeCode,
            startDate: startDate ?? "",
            endDate: endDate ?? "",
            status,
            paymentTermDays:
              paymentTermDaysRaw !== undefined && paymentTermDaysRaw !== null
                ? Number(paymentTermDaysRaw)
                : null,
            creditLimitOverride:
              creditLimitOverrideRaw !== undefined &&
              creditLimitOverrideRaw !== null
                ? Number(creditLimitOverrideRaw)
                : null,
            riskLevel,
            sla,
            deliveryScope,
            renewalOfCode,
          };

          return row;
        },

        // validate 1 dòng sau khi parse
        validateRow: (row: ContractImportRow, index: number) => {
          const errors: string[] = [];

          if (!row.code) errors.push("Thiếu mã hợp đồng");
          if (!row.customerCode) errors.push("Thiếu mã khách hàng");
          if (!row.contractTypeCode) errors.push("Thiếu mã loại hợp đồng");
          if (!row.startDate) errors.push("Thiếu ngày bắt đầu");
          if (!row.endDate) errors.push("Thiếu ngày kết thúc");

          if (row.startDate && row.endDate) {
            const start = dayjs(row.startDate, "YYYY-MM-DD");
            const end = dayjs(row.endDate, "YYYY-MM-DD");
            if (start.isValid() && end.isValid() && end.isBefore(start)) {
              errors.push("Ngày kết thúc phải >= ngày bắt đầu");
            }
          }

          return errors;
        },

        // submit 1 chunk lên server
        onSubmit: async (rows: ContractImportRow[]) => {
          // Hook useImportContracts đã theo chuẩn apiCall, mình chỉ gọi mutateAsync
          await importMutation.mutateAsync(rows);
        },

        // chunk để tránh quá tải
        chunkSize: 200,

        helperText: (
          <>
            File Excel nên có các cột:{" "}
            <b>
              Mã HĐ, Tên hợp đồng, Mã KH, Mã loại HĐ, Ngày bắt đầu, Ngày kết
              thúc, Trạng thái, Rủi ro
            </b>
            … Ngày nên để dạng <code>DD/MM/YYYY</code> hoặc{" "}
            <code>YYYY-MM-DD</code>.
          </>
        ),
      } as ExcelImportConfig<ContractImportRow>;
    }, [importMutation]);

  // ===== Render =====

  return (
    <Flex vertical gap={16} style={{ height: "100%", padding: 16 }}>
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        {/* Header: Filters + actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <ContractFilters value={query} onChange={handleFilterChange} />

          {/* Nút hành động: Thêm mới / Nhập từ Excel */}
          <Dropdown
            menu={{ items: actionMenuItems, onClick: handleActionClick }}
            trigger={["click"]}
          >
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              style={{ marginTop: 5 }}
            >
              Thêm mới
            </Button>
          </Dropdown>
        </div>

        {/* Table */}
        <ContractTable
          loading={loadingTable}
          items={items}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenFiles={(id) => setFilePreviewContractId(id)}
        />
      </Space>

      {/* Overlay tạo / sửa HĐ */}
      <ContractUpsertOverlay
        open={isOverlayOpen}
        mode={overlayMode}
        contractId={overlayMode === "edit" ? editingId : undefined}
        onClose={() => {
          setOverlayOpen(false);
          setEditingId(undefined);
        }}
        onSuccess={handleUpsertSuccess}
      />

      {/* Modal xem file đính kèm */}
      <ContractFilesModal
        contractId={filePreviewContractId || undefined}
        open={!!filePreviewContractId}
        onClose={() => setFilePreviewContractId(null)}
      />

      {/* Overlay import Excel */}
      <ExcelImportOverlay<ContractImportRow>
        title="Nhập hợp đồng từ Excel"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        config={contractImportConfig}
      />
    </Flex>
  );
};

export default ContractsPage;
