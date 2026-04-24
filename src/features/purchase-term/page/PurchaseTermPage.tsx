// features/purchase-term/page/PurchaseTermPage.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useTermPurchaseOrders } from "../hooks";
import type { TermPurchaseOrderListQuery } from "../types";
import { PurchaseTermToolbar } from "../ui/PurchaseTermToolbar";

import { PurchaseTermTable } from "../ui/PurchaseTermTable";
import { PurchaseTermFilterDrawer } from "../ui/PurchaseTermFilters";

export default function PurchaseTermPage() {
  const navigate = useNavigate();

  const [filterOpen, setFilterOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const [query, setQuery] = useState<TermPurchaseOrderListQuery>({
    page: 1,
    pageSize: 20,
    fromDate: dayjs().subtract(29, "day").format("YYYY-MM-DD"),
    toDate: dayjs().format("YYYY-MM-DD"),
  });

  const { data, isLoading } = useTermPurchaseOrders(query);

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      keyword: keyword || undefined,
      page: 1,
    }));
  };

  const handleApplyFilter = (nextQuery: TermPurchaseOrderListQuery) => {
    setQuery({
      ...nextQuery,
      keyword: nextQuery.keyword || keyword || undefined,
      page: 1,
    });

    if (nextQuery.keyword !== undefined) {
      setKeyword(nextQuery.keyword || "");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        background: "#fff",
        border: "1px solid #e6edf5",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontSize: 15,
          fontWeight: 600,
          color: "#0f172a",
          borderBottom: "1px solid #eef2f7",
        }}
      >
        Danh sách đơn TERM
      </div>

      <PurchaseTermToolbar
        keyword={keyword}
        query={query}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onOpenFilter={() => setFilterOpen(true)}
        onCreate={() => navigate("/purchase-term/create")}
      />

      <div style={{ padding: "0 16px 12px" }}>
        <PurchaseTermTable
          loading={isLoading}
          items={data?.items ?? []}
          page={data?.page ?? 1}
          pageSize={data?.pageSize ?? 20}
          total={data?.total ?? 0}
          onChangePage={(page, pageSize) =>
            setQuery((prev) => ({ ...prev, page, pageSize }))
          }
          onOpenDetail={(id) => navigate(`/purchase-term/${id}`)}
        />
      </div>

      <PurchaseTermFilterDrawer
        open={filterOpen}
        query={query}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilter}
      />
    </div>
  );
}
