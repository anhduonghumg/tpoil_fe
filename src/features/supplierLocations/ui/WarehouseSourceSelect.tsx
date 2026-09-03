import React, { useMemo } from "react";
import { BankOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Select, Tag } from "antd";
import type { SelectProps } from "antd";
import type { SupplierLocation, WarehouseArea } from "../types";
import "./warehouse-source-select.css";

export type WarehouseSourceChoice = { areaId: string; warehouseId?: string };

type WarehouseOptionSource = {
  id: string;
  areaId?: string | null;
  area?: { id?: string; code?: string; name: string } | null;
  code?: string;
  name?: string;
  label?: string;
};

type WarehouseSourceOption = {
  value: string;
  label: string;
  selectedLabel: string;
  searchText: string;
  kind: "area" | "warehouse";
  title: string;
  description: string;
};

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
  warehouses: WarehouseOptionSource[];
  warehouseOnly?: boolean;
  placeholder?: string;
  size?: SelectProps<string>["size"];
  disabled?: boolean;
  loading?: boolean;
  filterOption?: SelectProps<string>["filterOption"];
  onSearch?: (value: string) => void;
}> = ({ value, onChange, areas, warehouses, warehouseOnly, placeholder, size, disabled, loading, filterOption, onSearch }) => {
  const options = useMemo(() => {
    const areaOptions: WarehouseSourceOption[] = areas.map((area) => ({
      value: `area:${area.id}`,
      label: `${area.name} chưa xác định kho`,
      selectedLabel: `Khu vực ${area.name}`,
      searchText: `${area.code} ${area.name} khu vực chưa xác định kho`,
      kind: "area",
      title: area.name,
      description: "Nhận tại một kho bất kỳ trong khu vực",
    }));
    const warehouseOptions: WarehouseSourceOption[] = warehouses
      .filter((warehouse) => warehouse.areaId)
      .map((warehouse) => {
        const warehouseName = warehouse.name ?? warehouse.label ?? warehouse.code;
        const areaName = warehouse.area?.name ?? "Chưa gán khu vực";
        return {
          value: `warehouse:${warehouse.id}`,
          label: `${warehouseName} ${areaName}`,
          selectedLabel: warehouseName,
          searchText: `${warehouse.code ?? ""} ${warehouseName} ${areaName}`,
          kind: "warehouse",
          title: warehouseName,
          description: areaName,
        };
      });
    return [
      ...(!warehouseOnly ? [{ label: "Chọn theo khu vực", options: areaOptions }] : []),
      { label: "Kho cụ thể", options: warehouseOptions },
    ];
  }, [areas, warehouses, warehouseOnly]);

  return (
    <Select
      value={value}
      onChange={onChange}
      size={size}
      disabled={disabled}
      loading={loading}
      onSearch={onSearch}
      allowClear
      showSearch
      filterOption={filterOption ?? ((input, option: any) => String(option?.searchText ?? option?.label ?? "").toLocaleLowerCase("vi").includes(input.trim().toLocaleLowerCase("vi")))}
      optionLabelProp="selectedLabel"
      placeholder={placeholder ?? "Chọn khu vực hoặc kho"}
      options={options}
      popupClassName="warehouse-source-select-popup"
      popupMatchSelectWidth={360}
      optionRender={(option: any) => {
        const data = option.data as WarehouseSourceOption;
        return <div className="warehouse-source-option">
          <span className={`warehouse-source-option__icon warehouse-source-option__icon--${data.kind}`}>
            {data.kind === "area" ? <EnvironmentOutlined /> : <BankOutlined />}
          </span>
          <span className="warehouse-source-option__content">
            <span className="warehouse-source-option__title" title={data.title}>{data.title}</span>
            <span className="warehouse-source-option__description">{data.description}</span>
          </span>
          {data.kind === "area" && <Tag bordered={false} color="blue">Linh hoạt</Tag>}
        </div>;
      }}
      style={{ width: "100%" }}
    />
  );
};
