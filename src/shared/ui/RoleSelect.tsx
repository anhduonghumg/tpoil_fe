import React, { useMemo } from "react";
import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";
import type { ApiResponse } from "../lib/types";

type OptionValue = string;

export interface RoleSelectItem {
  id: string;
  name: string;
}

export interface RoleSelectResponse {
  items: RoleSelectItem[];
}

export interface RoleSelectProps
  extends Omit<SelectProps<OptionValue>, "options" | "loading" | "onChange"> {
  value?: OptionValue | null;
  onChange?: (value: OptionValue | null) => void;
}

async function fetchRoleOptions(): Promise<RoleSelectResponse> {
  const res = await apiCall<ApiResponse<any>>("user.roles");

  const data = res.data?.data;
  const payload = data?.items
    ? data
    : data?.data?.items
    ? data.data
    : data ?? {};
  const items: RoleSelectItem[] = (payload.items ?? []).map((x: any) => ({
    id: x.id,
    name: x.name ?? x.code ?? "",
  }));

  return { items };
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  value,
  onChange,
  placeholder = "Chọn quyền",
  allowClear = true,
  disabled,
  ...rest
}) => {
  const { data, isFetching } = useQuery({
    queryKey: ["user", "roles", "select"],
    queryFn: fetchRoleOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !disabled,
  });

  const options = useMemo(
    () =>
      (data?.items ?? []).map((r) => ({
        label: r.name,
        value: r.id,
      })),
    [data]
  );

  return (
    <Select<OptionValue>
      size="middle"
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? undefined}
      onChange={(val) => onChange?.(val ?? null)}
      options={options}
      loading={isFetching}
      notFoundContent={isFetching ? <Spin size="small" /> : "Không có dữ liệu"}
      optionFilterProp="label"
      {...rest}
    />
  );
};
