import React from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";
import { CustomersApi } from "../customers-api-bridge"; // cầu nối mỏng, xem file bên dưới

interface Props extends Omit<SelectProps<string>, "options"> {
  value?: string;
  onChange?: (v?: string) => void;
}

export function ContractCustomerSelect(props: Props) {
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState<
    { label: string; value: string }[]
  >([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await CustomersApi.list({
        page: 1,
        pageSize: 200,
        status: "Active" as any,
      });
      setOptions(
        res.items.map((c: any) => ({
          value: c.id,
          label: `${c.code} - ${c.name}`,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Select
      showSearch
      optionFilterProp="label"
      loading={loading}
      options={options}
      {...props}
    />
  );
}
