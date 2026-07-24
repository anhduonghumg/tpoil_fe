import React, { useEffect, useState } from "react";
import { Badge, Button, Divider, Input, Popover, Select, Space, Switch } from "antd";
import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import { SupplierLocationsApi } from "../api";
import type { SupplierOption, WarehouseArea } from "../types";

type Props = {
  defaultSupplierId?: string;
  defaultAreaId?: string;
  defaultKeyword?: string;
  defaultIsActive?: boolean;
  loading?: boolean;
  onSearch: (next: {
    supplierCustomerId?: string;
    areaId?: string;
    keyword?: string;
    isActive?: boolean;
  }) => void;
  onRefresh: () => void;
};

export const SupplierLocationsFilters: React.FC<Props> = ({
  defaultSupplierId,
  defaultAreaId,
  defaultKeyword,
  defaultIsActive,
  loading,
  onSearch,
  onRefresh,
}) => {
  const [supplierId, setSupplierId] = useState(defaultSupplierId);
  const [areaId, setAreaId] = useState(defaultAreaId);
  const [draftKeyword, setDraftKeyword] = useState(defaultKeyword || "");
  const [onlyActive, setOnlyActive] = useState(defaultIsActive ?? true);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [supplierFetching, setSupplierFetching] = useState(false);
  const [areas, setAreas] = useState<WarehouseArea[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => setSupplierId(defaultSupplierId), [defaultSupplierId]);
  useEffect(() => setAreaId(defaultAreaId), [defaultAreaId]);
  useEffect(() => setDraftKeyword(defaultKeyword || ""), [defaultKeyword]);
  useEffect(() => setOnlyActive(defaultIsActive ?? true), [defaultIsActive]);
  useEffect(() => {
    SupplierLocationsApi.areas(true).then((items) => setAreas(items ?? []));
  }, []);

  const doSearch = () =>
    onSearch({
      supplierCustomerId: supplierId,
      areaId,
      keyword: draftKeyword.trim() || undefined,
      isActive: onlyActive,
    });

  const clear = () => {
    setSupplierId(undefined);
    setAreaId(undefined);
    setDraftKeyword("");
    setOnlyActive(true);
    onSearch({
      areaId: undefined,
      supplierCustomerId: undefined,
      keyword: undefined,
      isActive: true,
    });
    setFilterOpen(false);
  };

  const fetchSuppliers = async (keyword: string) => {
    setSupplierFetching(true);
    try {
      const result = await SupplierLocationsApi.suppliersSelect(keyword);
      setSupplierOptions(result.items ?? []);
    } finally {
      setSupplierFetching(false);
    }
  };

  const activeFilterCount = Number(Boolean(areaId)) + Number(Boolean(supplierId)) + Number(!onlyActive);
  const filterContent = (
    <div style={{ width: 280 }}>
      <div style={{ color: "#596579", fontSize: 12, marginBottom: 6 }}>Khu vực kho</div>
      <Select
        size="small"
        style={{ width: "100%" }}
        showSearch
        allowClear
        value={areaId}
        optionFilterProp="label"
        placeholder="Chọn khu vực"
        options={areas.map((area) => ({ value: area.id, label: `${area.code} - ${area.name}` }))}
        onChange={setAreaId}
      />
      <Divider style={{ margin: "12px 0" }} />
      <div style={{ color: "#596579", fontSize: 12, marginBottom: 6 }}>NCC vận hành kho</div>
      <Select
        size="small"
        style={{ width: "100%" }}
        showSearch
        allowClear
        value={supplierId}
        placeholder="Chọn NCC"
        filterOption={false}
        onSearch={fetchSuppliers}
        onFocus={() => fetchSuppliers("")}
        loading={supplierFetching}
        options={supplierOptions.map((item) => ({
          value: item.id,
          label: `${item.code ? `${item.code} - ` : ""}${item.name}`,
        }))}
        onChange={setSupplierId}
      />
      <Divider style={{ margin: "12px 0" }} />
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <span style={{ color: "#596579", fontSize: 12 }}>Đang hoạt động</span>
        <Switch size="small" checked={onlyActive} onChange={setOnlyActive} />
      </Space>
      <Divider style={{ margin: "12px 0" }} />
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button size="small" type="text" onClick={clear}>Xóa lọc</Button>
        <Button size="small" type="primary" onClick={() => { doSearch(); setFilterOpen(false); }}>
          Áp dụng
        </Button>
      </Space>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <Input.Search
        size="small"
        allowClear
        value={draftKeyword}
        onChange={(event) => setDraftKeyword(event.target.value)}
        placeholder="Tìm mã hoặc tên kho"
        onSearch={doSearch}
        loading={loading}
        style={{ width: 425, maxWidth: "100%" }}
      />
      <Space size={6}>
        <Popover open={filterOpen} onOpenChange={setFilterOpen} content={filterContent} trigger="click" placement="bottomRight">
          <Badge count={activeFilterCount} size="small" offset={[-3, 3]}>
            <Button size="small" icon={<FilterOutlined />}>Bộ lọc</Button>
          </Badge>
        </Popover>
        <Button size="small" aria-label="Làm mới" icon={<ReloadOutlined spin={loading} />} onClick={onRefresh} />
      </Space>
    </div>
  );
};
