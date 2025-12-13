import React, { useMemo, useState } from "react";
import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";
import type { ApiResponse } from "../lib/types";

type OptionValue = string;

export interface EmployeeSelectItem {
  id: string;
  fullName: string;
}

export interface EmployeeSelectResponse {
  items: EmployeeSelectItem[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface EmployeeSelectProps
  extends Omit<SelectProps<OptionValue>, "options" | "loading" | "onChange"> {
  value?: OptionValue | null;
  onChange?: (value: OptionValue | null) => void;
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

async function fetchEmployeeOptions(params: {
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<EmployeeSelectResponse> {
  const res = await apiCall<ApiResponse<any>>("employee.select", {
    query: {
      keyword: params.keyword,
      page: params.page,
      pageSize: params.pageSize,
    },
  });

  const data = res.data?.data;
  const payload = data?.items
    ? data
    : data?.data?.items
    ? data.data
    : data ?? {};

  const items: EmployeeSelectItem[] = (payload.items ?? []).map((x: any) => ({
    id: x.id,
    fullName: x.fullName ?? x.name ?? "",
  }));

  return {
    items,
    total: payload.total ?? items.length,
    page: payload.page ?? params.page,
    pageSize: payload.pageSize ?? params.pageSize,
  };
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  value,
  onChange,
  placeholder = "Chọn nhân viên",
  allowClear = true,
  disabled,
  ...rest
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const PAGE_SIZE = 20;

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["employee", "select", debouncedSearch],
      queryFn: ({ pageParam }) =>
        fetchEmployeeOptions({
          keyword: debouncedSearch || undefined,
          page: pageParam as number,
          pageSize: PAGE_SIZE,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const page = lastPage.page ?? 1;
        const pageSize = lastPage.pageSize ?? PAGE_SIZE;
        const total = lastPage.total ?? lastPage.items.length;

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
        .map((e) => ({
          label: e.fullName,
          value: e.id,
          employee: e,
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
