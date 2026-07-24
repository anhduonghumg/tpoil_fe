import React, { useMemo } from "react";
import { Select } from "antd";
import type { SupplierLocation, WarehouseArea } from "../types";

export type WarehouseSourceChoice = { areaId: string; warehouseId?: string };

export const decodeWarehouseSource = (
  value: string,
  warehouses: SupplierLocation[],
): WarehouseSourceChoice | undefined => {
  const [kind, id] = value.split(":");
  if (kind === "area") return { areaId: id };
  const warehouse = warehouses.find((item) => item.id === id);
  if (!warehouse?.areaId) return undefined;
  return { areaId: warehouse.areaId, warehouseId: warehouse.id };
};

export const WarehouseSourceSelect: React.FC<{
  value?: string;
  onChange?: (value?: string) => void;
  areas: WarehouseArea[];
  warehouses: SupplierLocation[];
  warehouseOnly?: boolean;
  placeholder?: string;
}> = ({ value, onChange, areas, warehouses, warehouseOnly, placeholder }) => {
  const options = useMemo(() => {
    const areaOptions = areas.map((area) => ({
      value: `area:${area.id}`,
      label: `${area.name} - chưa xác định kho`,
    }));
    const warehouseOptions = warehouses
      .filter((warehouse) => warehouse.areaId)
      .map((warehouse) => ({
        value: `warehouse:${warehouse.id}`,
        label: `${warehouse.area?.name ?? "Chưa có khu vực"} / ${warehouse.name}`,
      }));
    return [
      ...(!warehouseOnly ? [{ label: "Theo khu vực", options: areaOptions }] : []),
      { label: "Kho cụ thể", options: warehouseOptions },
    ];
  }, [areas, warehouses, warehouseOnly]);

  return (
    <Select
      value={value}
      onChange={onChange}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={placeholder ?? "Chọn khu vực hoặc kho"}
      options={options}
      style={{ width: "100%" }}
    />
  );
};
