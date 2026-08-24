import React, { useMemo, useState } from "react";
import { Select, Spin, Tag, Space } from "antd";
import type { SelectProps } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";
import type { ApiResponse } from "../lib/types";

type OptionValue = string;

/**
 * SELLABLE / PURCHASABLE lọc theo chiều giao dịch xăng dầu (TNPP+TNĐL / TNPP+TNĐM) —
 * dùng ở chứng từ bán và mua để không chọn được đối tác sai chiều ngay từ đầu.
 */
type PartyRole = "CUSTOMER" | "SUPPLIER" | "SELLABLE" | "PURCHASABLE" | "ALL";

interface PartySelectItem {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
  merchantRole?: "TNPP" | "TNDM" | "TNDL" | null;

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
  /** NgÃ y chÃ©n thá»¥c tá»« Ä‘á»ƒ lá»c Ä‘Ãºng loáº¡i thÆ°Æ¡ng nhÃ¢n cÃ²n hiá»‡u lá»±c. */
  effectiveAt?: string;
  pageSize?: number;
  /** "code" keeps the picked value short; the dropdown still shows the full name. */
  displayMode?: "full" | "code";
  /** Controls whether dropdown options show the full name or only the partner code. */
  optionDisplayMode?: "full" | "code";
  /**
   * Label to show when `value` was resolved elsewhere (quick entry, prefill) and its
   * option is not in the loaded page yet — without it the raw id leaks into the box.
   */
  fallbackLabel?: string | null;
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
  effectiveAt?: string;
}): Promise<PartySelectResponse> {
  const res = await apiCall<ApiResponse<PartySelectResponse>>(
    "customer.select",
    {
      query: {
        keyword: params.keyword,
        page: params.page,
        pageSize: params.pageSize,
        // Backend chỉ nhận CUSTOMER/SUPPLIER/INTERNAL/...; "ALL" không phải một vai trò
        // mà là "không lọc vai trò nào", nên phải bỏ hẳn tham số thay vì gửi "ALL".
        role: params.partyRole === "ALL" ? undefined : params.partyRole,
        effectiveAt: params.effectiveAt,
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
  effectiveAt,
  pageSize = 50,
  displayMode = "full",
  optionDisplayMode = "full",
  fallbackLabel,
  ...rest
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["party", "select", partyRole, effectiveAt, debouncedSearch],
      queryFn: ({ pageParam }) =>
        fetchPartyOptions({
          keyword: debouncedSearch || undefined,
          page: pageParam as number,
          pageSize,
          partyRole,
          effectiveAt,
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

    const mapped = rows.map((p) => {
      const roleLabel = getRoleLabel(p);

      return {
        value: p.id,
        shortLabel: p.code || p.name,
        label: optionDisplayMode === "code"
          ? [p.code || p.name, p.merchantRole].filter(Boolean).join(" · ")
          : (
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

    // A value resolved elsewhere may not be on the loaded page; without a stand-in
    // option antd renders the raw id.
    if (value && fallbackLabel && !mapped.some((option) => option.value === value)) {
      return [
        { value, shortLabel: fallbackLabel, label: fallbackLabel, raw: undefined },
        ...mapped,
      ];
    }
    return mapped;
  }, [data, value, fallbackLabel, optionDisplayMode]);

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
      notFoundContent={
        isFetching ? (
          <Spin size="small" />
        ) : error ? (
          // Hỏng thì phải nói ra, đừng để người dùng ngồi nhìn danh sách rỗng mà đoán.
          <span style={{ color: "#cf1322" }}>Không tải được danh sách đối tác</span>
        ) : (
          "Không tìm thấy"
        )
      }
      optionLabelProp={displayMode === "code" ? "shortLabel" : undefined}
      options={options as any}
      loading={isFetching && !isFetchingNextPage}
      popupMatchSelectWidth={false}
      styles={{ popup: { root: { minWidth: 360 } } }}
      {...rest}
    />
  );
};
