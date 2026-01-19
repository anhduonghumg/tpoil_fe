import React, { useMemo, useState } from "react";
import { Select, Spin, Tag, Space } from "antd";
import type { SelectProps } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";
import type { ApiResponse } from "../lib/types";

type OptionValue = string;

type PartyRole = "CUSTOMER" | "SUPPLIER" | "ALL";

interface PartySelectItem {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;

  isCustomer?: boolean;
  isSupplier?: boolean;
  isInternal?: boolean;
}

interface PartySelectResponse {
  items: PartySelectItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PartySelectProps
  extends Omit<SelectProps<OptionValue>, "options" | "loading" | "onChange"> {
  value?: OptionValue | null;
  onChange?: (value: OptionValue | null) => void;
  partyRole?: PartyRole;
  pageSize?: number;
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

async function fetchPartyOptions(params: {
  keyword?: string;
  page: number;
  pageSize: number;
  partyRole: PartyRole;
}): Promise<PartySelectResponse> {
  const res = await apiCall<ApiResponse<PartySelectResponse>>(
    "customer.select",
    {
      query: {
        keyword: params.keyword,
        page: params.page,
        pageSize: params.pageSize,
        role: params.partyRole,
      },
    }
  );

  return res.data!.data!;
}

function getRoleLabel(
  item: PartySelectItem
): "KH" | "NCC" | "Nội bộ" | "ALL" | null {
  if (item.isInternal) return "Nội bộ";
  if (item.isSupplier && !item.isCustomer) return "NCC";
  if (item.isCustomer && !item.isSupplier) return "KH";
  if (item.isCustomer && item.isSupplier) return "ALL";
  return null;
}

export const PartySelect: React.FC<PartySelectProps> = ({
  value,
  onChange,
  placeholder,
  allowClear = true,
  disabled,
  partyRole = "ALL",
  pageSize = 50,
  ...rest
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["party", "select", partyRole, debouncedSearch],
      queryFn: ({ pageParam }) =>
        fetchPartyOptions({
          keyword: debouncedSearch || undefined,
          page: pageParam as number,
          pageSize,
          partyRole,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const { page, pageSize, total } = lastPage;
        const hasMore = page * pageSize < total;
        return hasMore ? page + 1 : undefined;
      },
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !disabled,
    });

  const options = useMemo(() => {
    const rows = (data?.pages ?? []).flatMap((p) => p.items);

    return rows.map((p) => {
      const roleLabel = getRoleLabel(p);

      return {
        value: p.id,
        label: (
          <Space size={8}>
            <span style={{ fontWeight: 500 }}>
              {p.code ? `${p.code} — ${p.name}` : p.name}
            </span>
            {roleLabel ? (
              <Tag style={{ marginInlineStart: 0 }}>{roleLabel}</Tag>
            ) : null}
          </Space>
        ),
        raw: p,
      };
    });
  }, [data]);

  const handleScroll: React.UIEventHandler<HTMLDivElement> = async (e) => {
    const target = e.target as HTMLDivElement;
    if (!hasNextPage || isFetchingNextPage) return;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 40) {
      await fetchNextPage();
    }
  };

  const finalPlaceholder =
    placeholder ??
    (partyRole === "CUSTOMER"
      ? "Chọn khách hàng"
      : partyRole === "SUPPLIER"
      ? "Chọn nhà cung cấp"
      : "Chọn đối tác");

  return (
    <Select<OptionValue>
      size="small"
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      placeholder={finalPlaceholder}
      value={value ?? undefined}
      onChange={(val) => onChange?.(val ?? null)}
      filterOption={false}
      onSearch={(val) => setSearch(val)}
      onPopupScroll={handleScroll}
      notFoundContent={isFetching ? <Spin size="small" /> : "Không tìm thấy"}
      options={options as any}
      loading={isFetching && !isFetchingNextPage}
      {...rest}
    />
  );
};
