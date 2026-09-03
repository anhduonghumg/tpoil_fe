import React, { useEffect, useState } from "react";
import { Button, Divider, Select, Space } from "antd";
import { SupplierLocationsApi } from "../api";
import type { SupplierOption, WarehouseArea } from "../types";

type Values = { supplierCustomerId?: string; areaId?: string };

/**
 * Nội dung sổ xuống của nút Bộ lọc. Ô tìm kiếm, nút lọc và trạng thái hoạt động do
 * trang giữ (ô tìm nằm trên thanh công cụ, trạng thái nằm ở tab), nên panel này chỉ
 * còn hai điều kiện ít dùng.
 */
export const SupplierLocationsFilterPanel: React.FC<{
  value: Values;
  onApply: (next: Values) => void;
  onClear: () => void;
}> = ({ value, onApply, onClear }) => {
  const [areaId, setAreaId] = useState(value.areaId);
  const [supplierId, setSupplierId] = useState(value.supplierCustomerId);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [supplierFetching, setSupplierFetching] = useState(false);
  const [areas, setAreas] = useState<WarehouseArea[]>([]);

  useEffect(() => setAreaId(value.areaId), [value.areaId]);
  useEffect(() => setSupplierId(value.supplierCustomerId), [value.supplierCustomerId]);
  useEffect(() => {
    SupplierLocationsApi.areas(true).then((items) => setAreas(items ?? []));
  }, []);

  const fetchSuppliers = async (keyword: string) => {
    setSupplierFetching(true);
    try {
      const result = await SupplierLocationsApi.operatorPartiesSelect(keyword);
      setSupplierOptions(result.items ?? []);
    } finally {
      setSupplierFetching(false);
    }
  };

  return (
    <div className="table-filter-panel">
      <div className="table-filter-label">Khu vực kho</div>
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

      <div className="table-filter-label">Đối tác vận hành kho</div>
      <Select
        size="small"
        style={{ width: "100%" }}
        showSearch
        allowClear
        value={supplierId}
        placeholder="Chọn NCC / khách hàng"
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

      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button
          size="small"
          type="text"
          onClick={() => {
            setAreaId(undefined);
            setSupplierId(undefined);
            onClear();
          }}
        >
          Xóa lọc
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => onApply({ areaId, supplierCustomerId: supplierId })}
        >
          Áp dụng
        </Button>
      </Space>
    </div>
  );
};
