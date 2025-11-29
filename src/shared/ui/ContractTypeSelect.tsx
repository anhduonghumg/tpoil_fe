// src/shared/ui/ContractTypeSelect.tsx
import { Select } from "antd";
import { useContractTypeOptions } from "../hook/seContractTypeOptions";

export default function ContractTypeSelect({
  value,
  onChange,
  allowClear = true,
  disabled,
  mode,
  placeholder = "Chọn loại hợp đồng",
}: {
  value?: string | string[];
  onChange?: (v: string | string[] | undefined) => void;
  allowClear?: boolean;
  disabled?: boolean;
  mode?: "multiple";
  placeholder?: string;
}) {
  const { data, isLoading } = useContractTypeOptions(true);
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
      options={data?.data.map((x) => ({
        label: `${x.name}`,
        value: x.id,
      }))}
      showSearch
      optionFilterProp="label"
    />
  );
}
