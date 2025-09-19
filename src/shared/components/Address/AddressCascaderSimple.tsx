// src/components/AddressCascaderSimple.tsx
import { Cascader } from "antd";
import dataTree from "../../../data/dataTree.json"

function toOptions(tree: Record<string, any>) {
  return Object.entries(tree).map(([pName, pChildren]) => ({
    value: pName,
    label: pName,
    children: Object.entries(pChildren as Record<string, any>).map(
      ([dName, dChildren]) => ({
        value: dName,
        label: dName,
        children: (Array.isArray(dChildren)
          ? dChildren
          : Object.keys(dChildren)
        ).map((wName: string) => ({
          value: wName,
          label: wName,
        })),
      })
    ),
  }));
}

const OPTIONS = toOptions(dataTree as any);

export default function AddressCascaderSimple({
  value,
  onChange,
  placeholder = "Chọn Tỉnh/TP → Quận/Huyện → Phường/Xã",
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Cascader
      options={OPTIONS}
      value={value}
      onChange={(v) => onChange?.(v as string[])}
      placeholder={placeholder}
      showSearch={{
        filter: (input, path) =>
          path.some((o) =>
            String(o.label).toLowerCase().includes(input.toLowerCase())
          ),
      }}
    />
  );
}
