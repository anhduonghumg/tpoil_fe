import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Switch } from "antd";
import { SupplierLocationsApi } from "../api";
import type { SupplierOption } from "../types";
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";

type Props = {
  defaultSupplierId?: string;
  defaultKeyword?: string;
  defaultIsActive?: boolean;
  loading?: boolean;
  onSearch: (next: {
    supplierCustomerId?: string;
    keyword?: string;
    isActive?: boolean;
  }) => void;
  onCreate: () => void;
};

export const SupplierLocationsFilters: React.FC<Props> = ({
  defaultSupplierId,
  defaultKeyword,
  defaultIsActive,
  loading,
  onSearch,
  onCreate,
}) => {
  const [supplierId, setSupplierId] = useState(defaultSupplierId);
  const [draftKeyword, setDraftKeyword] = useState(defaultKeyword || "");
  const [onlyActive, setOnlyActive] = useState(defaultIsActive ?? true);

  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [supplierFetching, setSupplierFetching] = useState(false);

  useEffect(() => setSupplierId(defaultSupplierId), [defaultSupplierId]);
  useEffect(() => setDraftKeyword(defaultKeyword || ""), [defaultKeyword]);
  useEffect(() => setOnlyActive(defaultIsActive ?? true), [defaultIsActive]);

  const doSearch = () =>
    onSearch({
      supplierCustomerId: supplierId,
      keyword: draftKeyword.trim() || undefined,
      isActive: onlyActive,
    });

  const clear = () => {
    setDraftKeyword("");
    setOnlyActive(true);
    onSearch({
      supplierCustomerId: supplierId,
      keyword: undefined,
      isActive: true,
    });
  };

  const fetchSuppliers = async (keyword: string) => {
    setSupplierFetching(true);
    try {
      const data = await SupplierLocationsApi.suppliersSelect(keyword);
      setSupplierOptions(data?.items);
    } finally {
      setSupplierFetching(false);
    }
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}
    >
      <Space size={8} style={{ flex: 1 }}>
        <Select
          size="small"
          style={{ width: 320 }}
          showSearch
          allowClear
          value={supplierId}
          placeholder="Chọn nhà cung cấp"
          filterOption={false}
          onSearch={fetchSuppliers}
          onFocus={() => fetchSuppliers("")}
          loading={supplierFetching}
          options={supplierOptions?.map((x) => ({
            value: x.id,
            label: `${x.code ? ` ${x.code}` : ""}`,
          }))}
          onChange={(v) => setSupplierId(v)}
        />

        <Input
          size="small"
          style={{ width: 360 }}
          value={draftKeyword}
          onChange={(e) => setDraftKeyword(e.target.value)}
          placeholder="Tìm theo mã / tên...."
          onPressEnter={doSearch}
          allowClear
        />

        <Space size={6}>
          <span style={{ color: "#666" }}>Đang hoạt động</span>
          <Switch size="small" checked={onlyActive} onChange={setOnlyActive} />
        </Space>

        <Button size="small" danger onClick={clear} icon={<DeleteOutlined />}>
          Xóa lọc
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={doSearch}
          loading={loading}
          icon={<SearchOutlined />}
        >
          Tìm kiếm
        </Button>
      </Space>

      <Button
        icon={<PlusOutlined />}
        size="small"
        type="primary"
        onClick={onCreate}
        // disabled={!supplierId}
      >
        Thêm mới
      </Button>
    </div>
  );
};
