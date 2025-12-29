import { Select } from "antd";
import { useCustomerGroupsSelect } from "../hooks";

export default function CustomerGroupSelect(props: any) {
  const { data, isLoading } = useCustomerGroupsSelect(props.searchValue || "");

  return (
    <Select
      showSearch
      loading={isLoading}
      optionFilterProp="label"
      options={(data ?? []).map((g) => ({
        value: g.id,
        label: `${g.name}`,
      }))}  
      placeholder="Chọn nhóm"
      {...props}
    />
  );
}
