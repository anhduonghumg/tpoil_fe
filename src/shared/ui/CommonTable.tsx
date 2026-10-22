import React, { useEffect, useRef, useState } from "react";
import { Button, DatePicker, Input, InputNumber, Space, Table, Tooltip } from "antd";
import { FilterOutlined, UndoOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { clampColumnWidth, parseColumnWidths, TABLE_MAX_WIDTH, TABLE_MIN_WIDTH } from "./table-widths";
import "./data-grid.css";
import "./common-table.css";

export type CommonColumnTool = { label: string; active: boolean; render: (close: () => void) => React.ReactNode };
export type CommonTableProps<T extends object> = TableProps<T> & {
  tableKey: string;
  columnTools?: Record<string, CommonColumnTool>;
  toolbar?: React.ReactNode;
};
type HeaderProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  resizeWidth?: number;
  resizeLabel?: string;
  onResizeColumn?: (width: number) => void;
  onResetColumn?: () => void;
};
function ResizableHeaderCell({ resizeWidth, resizeLabel, onResizeColumn, onResetColumn, children, ...props }: HeaderProps) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  return <th {...props}>{children}{resizeWidth != null && onResizeColumn ? <span className="common-table-resize"
    role="separator" aria-orientation="vertical" aria-label={`Đổi độ rộng ${resizeLabel ?? "cột"}`} aria-valuemin={TABLE_MIN_WIDTH} aria-valuemax={TABLE_MAX_WIDTH} aria-valuenow={resizeWidth} tabIndex={0}
    onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => { event.stopPropagation(); onResetColumn?.(); }}
    onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); drag.current = { x: event.clientX, width: resizeWidth }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={(event) => { if (drag.current) onResizeColumn(clampColumnWidth(drag.current.width + event.clientX - drag.current.x)); }}
    onPointerUp={(event) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { drag.current = null; }}
    onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); onResizeColumn(clampColumnWidth(resizeWidth + (event.key === "ArrowLeft" ? -16 : 16))); } else if (event.key === "Home") { event.preventDefault(); onResetColumn?.(); } }}
  /> : null}</th>;
}

/** Stable tableKey isolates remembered widths by screen/schema; business filters stay feature-owned. */
export function CommonTable<T extends object>(props: CommonTableProps<T>) {
  return <StatefulTable<T> key={props.tableKey} {...props} />;
}
function StatefulTable<T extends object>({ tableKey, columnTools, toolbar, columns = [], components, scroll, className, ...props }: CommonTableProps<T>) {
  const storageKey = `tpoil:table-widths:v1:${tableKey}`;
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try { return parseColumnWidths(window.localStorage.getItem(storageKey)); } catch { return {}; }
  });
  const latestWidths = useRef(widths);
  latestWidths.current = widths;
  useEffect(() => () => {
    try { if (Object.keys(latestWidths.current).length) window.localStorage.setItem(storageKey, JSON.stringify(latestWidths.current)); else window.localStorage.removeItem(storageKey); } catch { /* Remember the final resize even when leaving before the debounce. */ }
  }, [storageKey]);
  useEffect(() => {
    const timer = setTimeout(() => { try { if (Object.keys(widths).length) window.localStorage.setItem(storageKey, JSON.stringify(widths)); else window.localStorage.removeItem(storageKey); } catch { /* Private mode/storage limits must not break the table. */ } }, 150);
    return () => clearTimeout(timer);
  }, [widths, storageKey]);
  const resetColumn = (key: string) => setWidths((current) => { const next = { ...current }; delete next[key]; return next; });
  let totalWidth = 0;
  const enhance = (items: ColumnsType<T>, prefix = ""): ColumnsType<T> => items.map((column, index) => {
    const key = String(column.key ?? ("dataIndex" in column && column.dataIndex ? Array.isArray(column.dataIndex) ? column.dataIndex.join(".") : column.dataIndex : `${prefix}${index}`));
    if ("children" in column) return { ...column, children: enhance(column.children, `${key}.`) };
    const width = typeof column.width === "number" && column.width > 0 ? widths[key] ?? column.width : undefined;
    totalWidth += width ?? 160;
    const tool = columnTools?.[key];
    return {
      ...column,
      ...(width != null ? { width, onHeaderCell: (record) => ({ ...column.onHeaderCell?.(record), resizeWidth: width >= TABLE_MIN_WIDTH && column.title !== "" ? width : undefined, resizeLabel: typeof column.title === "string" ? column.title : key,
        onResizeColumn: (value: number) => setWidths((current) => ({ ...current, [key]: value })), onResetColumn: () => resetColumn(key) }) } : {}),
      ...(tool ? {
        filterDropdown: (dropdown) => <div className="common-table-filter-panel" aria-label={tool.label} onKeyDown={(event) => event.stopPropagation()}>{tool.render(() => dropdown.confirm({ closeDropdown: true }))}</div>,
        filterIcon: () => <FilterOutlined aria-label={tool.label} className={tool.active ? "common-table-filter-active" : undefined} />,
        filteredValue: tool.active ? ["active"] : null,
      } : {}),
    };
  });
  const enhanced = enhance(columns);
  return <div className="common-table">
    {toolbar || Object.keys(widths).length ? <div className="common-table-toolbar">
      {toolbar ? <div className="common-table-toolbar-left">{toolbar}</div> : null}
      {Object.keys(widths).length ? <Tooltip title="Khôi phục độ rộng cột mặc định"><Button className="common-table-reset-widths" size="small" type="text" aria-label="Khôi phục độ rộng cột mặc định" icon={<UndoOutlined />} onClick={() => setWidths({})} /></Tooltip> : null}
    </div> : null}
    <Table<T> {...props} size={props.size ?? "small"} columns={enhanced} className={`data-grid ${className ?? ""}`}
      tableLayout={props.tableLayout ?? "fixed"} components={{ ...components, header: { ...components?.header, cell: ResizableHeaderCell } }}
      scroll={{ ...scroll, x: Math.max(typeof scroll?.x === "number" ? scroll.x : 0, totalWidth + (props.rowSelection ? 40 : 0) + (props.expandable ? 48 : 0)) }} />
  </div>;
}

export function TextColumnFilter({ value, onApply, close, label }: { value?: string; onApply: (value: string | undefined) => void; close: () => void; label: string }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  const apply = () => { onApply(draft.trim() || undefined); close(); };
  return <div className="common-table-filter-fields"><Input size="small" aria-label={label} placeholder={label} value={draft} allowClear onChange={(event) => setDraft(event.target.value)} onPressEnter={apply} />
    <Space><Button size="small" type="primary" onClick={apply}>Áp dụng</Button><Button size="small" onClick={() => { setDraft(""); onApply(undefined); close(); }}>Xóa lọc</Button></Space></div>;
}
export function DateColumnFilter({ from, to, onApply, close }: { from?: string; to?: string; onApply: (from?: string, to?: string) => void; close: () => void }) {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(from || to ? [from ? dayjs(from) : null, to ? dayjs(to) : null] : null);
  useEffect(() => { setRange(from || to ? [from ? dayjs(from) : null, to ? dayjs(to) : null] : null); }, [from, to]);
  return <div className="common-table-filter-fields"><DatePicker.RangePicker size="small" aria-label="Khoảng ngày đặt hàng" format="DD/MM/YYYY" value={range} onChange={(value) => setRange(value)} />
    <Space><Button size="small" type="primary" onClick={() => { onApply(range?.[0]?.format("YYYY-MM-DD"), range?.[1]?.format("YYYY-MM-DD")); close(); }}>Áp dụng</Button><Button size="small" onClick={() => { setRange(null); onApply(); close(); }}>Xóa lọc</Button></Space></div>;
}
export function NumberColumnFilter({ min, max, onApply, close }: { min?: number; max?: number; onApply: (min?: number, max?: number) => void; close: () => void }) {
  const [low, setLow] = useState(min), [high, setHigh] = useState(max);
  useEffect(() => { setLow(min); setHigh(max); }, [min, max]);
  const invalid = low != null && high != null && low > high;
  return <div className="common-table-filter-fields"><InputNumber size="small" aria-label="Giá trị từ" placeholder="Từ" value={low} onChange={(value) => setLow(value ?? undefined)} controls={false} />
    <InputNumber size="small" aria-label="Giá trị đến" placeholder="Đến" value={high} onChange={(value) => setHigh(value ?? undefined)} controls={false} status={invalid ? "error" : undefined} />
    {invalid ? <span role="alert">Giá trị đến phải lớn hơn hoặc bằng giá trị từ.</span> : null}
    <Space><Button size="small" type="primary" disabled={invalid} onClick={() => { onApply(low, high); close(); }}>Áp dụng</Button><Button size="small" onClick={() => { setLow(undefined); setHigh(undefined); onApply(); close(); }}>Xóa lọc</Button></Space></div>;
}
