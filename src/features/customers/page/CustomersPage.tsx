// features/customers/page/CustomerPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Drawer, Grid } from "antd";
import { useSearchParams } from "react-router-dom";
import { CustomerFilters } from "../ui/CustomerFilters";
import { CustomerTable } from "../ui/CustomerTable";
import { CustomerOverviewPanel } from "../ui/CustomerOverviewPanel";
import { CustomerUpsertOverlay } from "../ui/CustomerUpsertOverlay";
import {
  useCustomerList,
  useCustomerOverview,
  useDeleteCustomer,
} from "../hooks";
import type { CustomerListQuery, PartyType } from "../types";
import { notify } from "../../../shared/lib/notification";
import CustomerOverviewSidebar from "../ui/CustomerOverviewSidebar";
import CustomerAddressHistoryModal from "../ui/CustomerAddressHistoryModal";

const { useBreakpoint } = Grid;
const SIDEBAR_WIDTH = 350;

const EMPTY_ARRAY: any[] = [];

export const CustomerPage: React.FC<{
  partyTypeDefault?: PartyType;
}> = ({ partyTypeDefault }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCustomerId = searchParams.get("customerId");

  // ✅ Router tách đôi: KH / NCC -> role filter cố định theo trang
  const listRole: CustomerListQuery["role"] =
    partyTypeDefault === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";

  const [addrModal, setAddrModal] = useState<{
    open: boolean;
    customerId: string | null;
    customerName?: string;
  }>({ open: false, customerId: null, customerName: undefined });

  const [filters, setFilters] = useState<CustomerListQuery>({
    keyword: "",
    status: undefined,
    page: 1,
    pageSize: 20,
    role: listRole,
    salesOwnerEmpId: undefined,
    accountingOwnerEmpId: undefined,
    documentOwnerEmpId: undefined,
  });

  const [upsertState, setUpsertState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    id: string | null;
  }>({
    open: false,
    mode: "create",
    id: null,
  });

  const { data: listData, isLoading: listLoading } = useCustomerList(filters);
  const { data: overviewData, isLoading: overviewLoading } =
    useCustomerOverview(selectedCustomerId || undefined);

  const deleteMutation = useDeleteCustomer();

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      role: listRole,
      page: 1,
    }));

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("customerId");
      return next;
    });
  }, [listRole]);

  useEffect(() => {
    if (
      !listLoading &&
      listData?.items?.length &&
      !selectedCustomerId &&
      !isMobile
    ) {
      const firstId = listData.items[0].id;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("customerId", firstId);
        return next;
      });
    }
  }, [listData, listLoading, selectedCustomerId, isMobile, setSearchParams]);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setFilters((prev) => ({ ...prev, page, pageSize }));
  }, []);

  const handleFilterChange = useCallback((next: Partial<CustomerListQuery>) => {
    const {
      role: _ignoreRole,
      partyType: _ignorePartyType,
      ...safe
    } = (next as any) ?? {};

    setFilters((prev) => ({
      ...prev,
      ...safe,
      role: prev.role,
      page: 1,
    }));
  }, []);

  const handleSelectCustomer = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("customerId", id);
        else next.delete("customerId");
        return next;
      });
    },
    [setSearchParams]
  );

  const openCreate = useCallback(() => {
    setUpsertState({ open: true, mode: "create", id: null });
  }, []);

  const openEdit = useCallback((id: string) => {
    setUpsertState({ open: true, mode: "edit", id: id });
  }, []);

  const closeUpsert = useCallback(() => {
    setUpsertState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleUpsertSuccess = useCallback(() => {
    notify.success(
      upsertState.mode === "create"
        ? partyTypeDefault === "SUPPLIER"
          ? "Tạo nhà cung cấp thành công"
          : "Tạo khách hàng thành công"
        : partyTypeDefault === "SUPPLIER"
        ? "Cập nhật nhà cung cấp thành công"
        : "Cập nhật khách hàng thành công"
    );
    closeUpsert();
  }, [upsertState.mode, closeUpsert, partyTypeDefault]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          notify.success(
            partyTypeDefault === "SUPPLIER"
              ? "Xóa nhà cung cấp thành công"
              : "Xóa khách hàng thành công"
          );
          if (selectedCustomerId === id) {
            handleSelectCustomer("");
          }
        },
      });
    },
    [deleteMutation, selectedCustomerId, handleSelectCustomer, partyTypeDefault]
  );

  const filterProps = useMemo(
    () => ({
      keyword: filters.keyword,
      status: filters.status,
      salesOwnerEmpId: filters.salesOwnerEmpId,
      accountingOwnerEmpId: filters.accountingOwnerEmpId,
      documentOwnerEmpId: filters.documentOwnerEmpId,
    }),
    [
      filters.keyword,
      filters.status,
      filters.salesOwnerEmpId,
      filters.accountingOwnerEmpId,
      filters.documentOwnerEmpId,
    ]
  );

  const tableProps = {
    data: listData?.items ?? EMPTY_ARRAY,
    loading: listLoading,
    total: listData?.total ?? 0,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    selectedCustomerId: selectedCustomerId ?? undefined,
    onPageChange: handlePageChange,
    onSelect: handleSelectCustomer,
    onEdit: openEdit,
    onDelete: handleDelete,
    onOpenAddressHistory: (id: string, name: string) => {
      setAddrModal({ open: true, customerId: id, customerName: name });
    },
  };

  const pageTitle =
    partyTypeDefault === "SUPPLIER" ? "Nhà cung cấp" : "Khách hàng";

  if (isMobile) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CustomerFilters
          value={filterProps}
          onChange={handleFilterChange}
          onCreate={openCreate}
          loading={listLoading}
        />

        <div style={{ flex: 1 }}>
          <CustomerTable {...tableProps} />
        </div>

        <Drawer
          placement="right"
          open={!!selectedCustomerId}
          width="100%"
          onClose={() => handleSelectCustomer("")}
          title={`Chi tiết ${pageTitle.toLowerCase()}`}
        >
          <CustomerOverviewPanel
            data={overviewData}
            loading={overviewLoading}
            customerId={selectedCustomerId}
          />
        </Drawer>

        {upsertState.open && (
          <CustomerUpsertOverlay
            mode={upsertState.mode}
            open={upsertState.open}
            customerId={
              upsertState.mode === "edit"
                ? upsertState.id || undefined
                : undefined
            }
            onClose={closeUpsert}
            onSuccess={handleUpsertSuccess}
            partyTypeDefault={partyTypeDefault}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        padding: 12,
        background: "#f5f5f5",
        boxSizing: "border-box",
      }}
    >
      {/* LEFT */}
      <div
        style={{
          flex: 1,
          marginRight: 12,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <CustomerFilters
          value={filterProps}
          onChange={handleFilterChange}
          onCreate={openCreate}
          loading={listLoading}
        />

        <div style={{ flex: 1, padding: "4px 8px 8px" }}>
          <CustomerTable {...tableProps} />
        </div>
      </div>

      <div style={{ width: 1, background: "#e5e7eb", margin: "4px 4px" }} />

      {/* RIGHT SIDEBAR */}
      <div
        style={{
          width: SIDEBAR_WIDTH,
          flex: `0 0 ${SIDEBAR_WIDTH}px`,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
          padding: 12,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <CustomerOverviewSidebar customerId={selectedCustomerId} />
      </div>

      {upsertState.open && (
        <CustomerUpsertOverlay
          mode={upsertState.mode}
          open={upsertState.open}
          customerId={
            upsertState.mode === "edit"
              ? upsertState.id || undefined
              : undefined
          }
          onClose={closeUpsert}
          onSuccess={handleUpsertSuccess}
          partyTypeDefault={partyTypeDefault}
        />
      )}

      <CustomerAddressHistoryModal
        open={addrModal.open}
        onClose={() =>
          setAddrModal({
            open: false,
            customerId: null,
            customerName: undefined,
          })
        }
        customerId={addrModal.customerId || ""}
        customerName={addrModal.customerName}
      />
    </div>
  );
};
