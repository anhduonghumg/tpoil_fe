// features/customers/page/CustomerPage.tsx
import React, { useState } from "react";
import { Drawer, Grid } from "antd";
import { CustomerFilters } from "../ui/CustomerFilters";
import { CustomerTable } from "../ui/CustomerTable";
import { CustomerOverviewPanel } from "../ui/CustomerOverviewPanel";
import { CustomerUpsertOverlay } from "../ui/CustomerUpsertOverlay";
import {
  useCustomerList,
  useCustomerOverview,
  useDeleteCustomer,
} from "../hooks";
import type { CustomerListQuery } from "../types";
import { notify } from "../../../shared/lib/notification";
import CustomerOverviewSidebar from "../ui/CustomerOverviewSidebar";

const { useBreakpoint } = Grid;
const SIDEBAR_WIDTH = 380;

export const CustomerPage: React.FC = () => {
  const [filters, setFilters] = useState<CustomerListQuery>({
    keyword: "",
    type: undefined,
    status: undefined,
    page: 1,
    pageSize: 20,
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
  const [upsertCustomerId, setUpsertCustomerId] = useState<string | null>(null);
  const [upsertOpen, setUpsertOpen] = useState(false);

  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const { data: listData, isLoading: listLoading } = useCustomerList(filters);
  const { data: overviewData, isLoading: overviewLoading } =
    useCustomerOverview(selectedCustomerId || undefined);
  const deleteMutation = useDeleteCustomer();

  const handlePageChange = (page: number, pageSize: number) => {
    setFilters((prev) => ({ ...prev, page, pageSize }));
  };

  const handleFilterChange = (next: {
    keyword?: string;
    type?: CustomerListQuery["type"];
    status?: CustomerListQuery["status"];
  }) => {
    setFilters((prev) => ({
      ...prev,
      ...next,
      page: 1,
    }));
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
  };

  const openCreate = () => {
    setUpsertMode("create");
    setUpsertCustomerId(null);
    setUpsertOpen(true);
  };

  const openEdit = (id: string) => {
    setUpsertMode("edit");
    setUpsertCustomerId(id);
    setUpsertOpen(true);
  };

  const closeUpsert = () => {
    setUpsertOpen(false);
    setUpsertCustomerId(null);
  };

  const handleUpsertSuccess = () => {
    notify.success(
      upsertMode === "create"
        ? "Tạo khách hàng thành công"
        : "Cập nhật khách hàng thành công"
    );
    setUpsertOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        notify.success("Xóa khách hàng thành công");
        if (selectedCustomerId === id) {
          setSelectedCustomerId(null);
        }
      },
    });
  };

  // layout desktop: card lớn bên trái + sidebar phải cố định
  if (!isMobile) {
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
        {/* LEFT: card list */}
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
            value={{
              keyword: filters.keyword,
              type: filters.type,
              status: filters.status,
            }}
            onChange={handleFilterChange}
            onCreate={openCreate}
            loading={listLoading}
          />

          <div style={{ flex: 1, padding: "4px 8px 8px" }}>
            <CustomerTable
              data={listData?.items ?? []}
              loading={listLoading}
              total={listData?.total ?? 0}
              page={filters.page ?? 1}
              pageSize={filters.pageSize ?? 20}
              selectedCustomerId={selectedCustomerId ?? undefined}
              onPageChange={handlePageChange}
              onSelect={handleSelectCustomer}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>

        {/* VERTICAL DIVIDER */}
        <div
          style={{
            width: 1,
            background: "#e5e7eb",
            margin: "4px 4px",
          }}
        />

        {/* RIGHT: fixed sidebar overview */}
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
          {/* <CustomerOverviewPanel
            data={overviewData}
            loading={overviewLoading}
            customerId={selectedCustomerId}
          /> */}
          <CustomerOverviewSidebar customerId={selectedCustomerId} />
        </div>

        {upsertOpen && (
          <CustomerUpsertOverlay
            mode={upsertMode}
            open={upsertOpen}
            customerId={
              upsertMode === "edit" ? upsertCustomerId || undefined : undefined
            }
            onClose={closeUpsert}
            onSuccess={handleUpsertSuccess}
          />
        )}
      </div>
    );
  }

  // layout mobile (giữ Drawer như cũ, nhưng filter/header cũng đã compact lại)
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CustomerFilters
        value={{
          keyword: filters.keyword,
          type: filters.type,
          status: filters.status,
        }}
        onChange={handleFilterChange}
        onCreate={openCreate}
        loading={listLoading}
      />

      <div style={{ flex: 1 }}>
        <CustomerTable
          data={listData?.items ?? []}
          loading={listLoading}
          total={listData?.total ?? 0}
          page={filters.page ?? 1}
          pageSize={filters.pageSize ?? 20}
          selectedCustomerId={selectedCustomerId ?? undefined}
          onPageChange={handlePageChange}
          onSelect={handleSelectCustomer}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      <Drawer
        placement="right"
        open={!!selectedCustomerId}
        width="100%"
        onClose={() => setSelectedCustomerId(null)}
        title="Chi tiết khách hàng"
      >
        <CustomerOverviewPanel
          data={overviewData}
          loading={overviewLoading}
          customerId={selectedCustomerId}
        />
      </Drawer>

      {upsertOpen && (
        <CustomerUpsertOverlay
          mode={upsertMode}
          open={upsertOpen}
          customerId={
            upsertMode === "edit" ? upsertCustomerId || undefined : undefined
          }
          onClose={closeUpsert}
          onSuccess={handleUpsertSuccess}
        />
      )}
    </div>
  );
};
