// src/shared/ui/EmployeeSelect.tsx
import { Select } from "antd";
import type { SelectProps } from "antd";
import { useEmployeeOptions } from "../hook/useEmployeeOptions";

type ValueType = string | string[] | undefined;

export default function EmployeesSelect({
  value,
  onChange,
  allowClear = true,
  disabled,
  mode,
  placeholder = "Chọn nhân viên",
}: {
  value?: ValueType;
  onChange?: (v: ValueType) => void;
  allowClear?: boolean;
  disabled?: boolean;
  mode?: SelectProps<string>["mode"];
  placeholder?: string;
}) {
  const { data, isLoading } = useEmployeeOptions(true);

  //   console.log("data:", data);

  return (
    <Select
      size="small"
      value={value}
      onChange={onChange}
      allowClear={allowClear}
      disabled={disabled}
      mode={mode}
      loading={isLoading}
      placeholder={placeholder}
      options={data?.map((x) => ({
        label: x.fullName,
        value: x.id,
      }))}
      showSearch
      optionFilterProp="label"
    />
  );
}
