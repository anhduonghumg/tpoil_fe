// shared/ui/selects/CustomerSelect.tsx
import React, { useMemo, useState } from "react";
import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";
import { ApiResponse } from "../lib/types";

type OptionValue = string;

interface CustomerSelectItem {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
}

interface CustomerSelectResponse {
  items: CustomerSelectItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerSelectProps
  extends Omit<SelectProps<OptionValue>, "options" | "loading" | "onChange"> {
  value?: OptionValue | null;
  onChange?: (value: OptionValue | null) => void;
}

// debounce nhỏ cho search
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

async function fetchCustomerOptions(params: {
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<CustomerSelectResponse> {
  const res = await apiCall<ApiResponse<CustomerSelectResponse>>(
    "customer.select",
    {
      query: {
        keyword: params.keyword,
        page: params.page,
        pageSize: params.pageSize,
      },
    }
  );
  return res.data!.data!;
}

export const CustomerSelect: React.FC<CustomerSelectProps> = ({
  value,
  onChange,
  placeholder = "Chọn khách hàng",
  allowClear = true,
  disabled,
  ...rest
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const PAGE_SIZE = 50;

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["customer", "select", debouncedSearch],
      queryFn: ({ pageParam }) =>
        fetchCustomerOptions({
          keyword: debouncedSearch || undefined,
          page: pageParam as number,
          pageSize: PAGE_SIZE,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const { page, pageSize, total } = lastPage;
        const hasMore = page * pageSize < total;
        return hasMore ? page + 1 : undefined;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !disabled,
    });

  const options = useMemo(
    () =>
      (data?.pages ?? [])
        .flatMap((p) => p.items)
        .map((c) => ({
          label: c.code ? `${c.code} — ${c.name}` : c.name,
          value: c.id,
          customer: c,
        })),
    [data]
  );

  const handleScroll: React.UIEventHandler<HTMLDivElement> = async (e) => {
    const target = e.target as HTMLDivElement;
    if (!hasNextPage || isFetchingNextPage) return;

    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 40) {
      await fetchNextPage();
    }
  };

  return (
    <Select<OptionValue>
      size="small"
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? undefined}
      onChange={(val) => onChange?.(val ?? null)}
      filterOption={false}
      onSearch={(val) => setSearch(val)}
      onPopupScroll={handleScroll}
      notFoundContent={isFetching ? <Spin size="small" /> : "Không tìm thấy"}
      options={options}
      loading={isFetching && !isFetchingNextPage}
      {...rest}
    />
  );
};
