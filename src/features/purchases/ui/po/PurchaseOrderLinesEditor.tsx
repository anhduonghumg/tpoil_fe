// features/purchases/ui/po/PurchaseOrderLinesEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, InputNumber, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  PriceQuoteBatchResult,
  UpsertPurchaseOrderLinePayload,
  UUID,
} from "../../types";
import { PurchasesApi } from "../../api";
import { notify } from "../../../../shared/lib/notification";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useSupplierLocationsSelect } from "../../hooks";

type ProductOption = { id: UUID; name: string; code?: string | null };

type LineUI = UpsertPurchaseOrderLinePayload & {
  supplierLocationId?: UUID | null;
  discountAmount?: number | null;
  __priceAuto?: boolean;
};

function toNumber(x: unknown): number {
  if (x == null) return 0;
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  const n = Number(String(x).replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export type LinesEditorValue = LineUI[];

export type PurchaseOrderLinesEditorProps = {
  value: LinesEditorValue;
  onChange: (next: LinesEditorValue) => void;

  supplierCustomerId?: UUID;
  regionCode: string;
  onDate: string;
  disabled?: boolean;

  products: ProductOption[];
  onSearchProducts: (keyword: string) => void;
};

type Row = LineUI & { key: string };

type CacheEntry = { at: number; promise: Promise<PriceQuoteBatchResult> };
const QUOTE_TTL_MS = 15_000;
const quoteCache = new Map<string, CacheEntry>();

function getQuoteBatchCached(
  key: string,
  req: { productIds: string[]; regionCode: string; onDate: string },
) {
  const now = Date.now();

  const old = quoteCache.get(key);
  if (old && now - old.at < QUOTE_TTL_MS) return old.promise;
  if (old) quoteCache.delete(key);

  const promise = PurchasesApi.quoteBatch(req);
  quoteCache.set(key, { at: now, promise });
  return promise;
}

export default function PurchaseOrderLinesEditor(
  props: PurchaseOrderLinesEditorProps,
) {
  const {
    value,
    onChange,
    supplierCustomerId,
    regionCode,
    onDate,
    disabled,
    products,
    onSearchProducts,
  } = props;

  const rows: Row[] = useMemo(
    () =>
      (value || []).map((l, idx) => ({
        ...l,
        key: `${l.productId || "EMPTY"}-${idx}`,
        discountAmount: (l as any).discountAmount ?? 0,
        unitPrice: l.unitPrice ?? null,
        __priceAuto: (l as any).__priceAuto ?? true,
      })),
    [value],
  );

  const [quoting, setQuoting] = useState(false);

  const [locKeyword, setLocKeyword] = useState("");
  const locQuery = useSupplierLocationsSelect(supplierCustomerId, locKeyword);
  const locOptions = locQuery.data ?? [];

  const addRow = () => {
    onChange([
      ...(value || []),
      {
        productId: "" as any,
        supplierLocationId: "",
        orderedQty: 0,
        unitPrice: null,
        discountAmount: 0,
        taxRate: null,
        __priceAuto: true,
      },
    ]);
  };

  const removeRow = (index: number) => {
    const next = [...(value || [])];
    next.splice(index, 1);
    onChange(next);
  };

  const updateRow = (index: number, patch: Partial<LineUI>) => {
    const next = [...(value || [])] as LineUI[];

    if (Object.prototype.hasOwnProperty.call(patch, "productId")) {
      const newPid = patch.productId;
      const oldPid = next[index]?.productId;
      if (newPid && newPid !== oldPid) {
        next[index] = {
          ...next[index],
          ...patch,
          unitPrice: null,
          __priceAuto: true,
        };
        onChange(next);
        return;
      }
    }

    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const lastKeyRef = useRef<string>("");

  const uniqSorted = useMemo(() => {
    const ids = (value || [])
      .map((x) => x.productId)
      .filter(Boolean) as string[];
    const uniq = Array.from(new Set(ids));
    uniq.sort();
    return uniq;
  }, [value]);

  const quoteKey = useMemo(() => {
    if (!regionCode || !onDate || !uniqSorted.length) return "";
    return `${regionCode}|${onDate}|${uniqSorted.join(",")}`;
  }, [regionCode, onDate, uniqSorted]);

  useEffect(() => {
    if (!quoteKey) return;

    if (quoteKey === lastKeyRef.current) return;
    lastKeyRef.current = quoteKey;

    let cancelled = false;

    (async () => {
      try {
        setQuoting(true);

        const res = await getQuoteBatchCached(quoteKey, {
          productIds: uniqSorted,
          regionCode,
          onDate,
        });

        if (cancelled) return;

        const priceMap = new Map<string, number>();
        res.items.forEach((it: any) => {
          priceMap.set(
            it.productId,
            it.price == null ? NaN : toNumber(it.price),
          );
        });

        let changed = false;

        const next = (value || []).map((line) => {
          if (!line.productId) return line;

          const p = priceMap.get(line.productId);
          if (p == null || Number.isNaN(p)) return line;

          const isAuto = (line as any).__priceAuto !== false;
          const cur = toNumber(line.unitPrice);

          if (!isAuto && cur > 0) return line;

          if (isAuto && cur === p) return line;

          changed = true;
          return { ...line, unitPrice: p, __priceAuto: true };
        });

        if (changed) onChange(next);
      } catch (e: any) {
        notify.error("Không lấy được bảng giá. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const columns: ColumnsType<Row> = [
    {
      title: "Sản phẩm",
      dataIndex: "productId",
      width: 320,
      render: (_: any, row, idx) => (
        <Select
          showSearch
          disabled={disabled}
          value={row.productId || undefined}
          placeholder="Chọn sản phẩm"
          style={{ width: "100%" }}
          filterOption={false}
          onDropdownVisibleChange={(open) => {
            if (open) onSearchProducts("");
          }}
          onSearch={onSearchProducts}
          options={products.map((p) => ({
            value: p.id,
            label: p.code ? `${p.code} - ${p.name}` : p.name,
          }))}
          onChange={(pid) => updateRow(idx, { productId: pid as any })}
        />
      ),
    },
    {
      title: "Kho nhận",
      dataIndex: "supplierLocationId",
      width: 220,
      render: (_: any, row, idx) => (
        <Select
          showSearch
          disabled={disabled || !supplierCustomerId}
          value={row.supplierLocationId || undefined}
          placeholder={supplierCustomerId ? "Chọn kho" : "Chọn NCC trước"}
          style={{ width: "100%" }}
          filterOption={false}
          onSearch={setLocKeyword}
          loading={locQuery.isLoading}
          options={locOptions.map((l: any) => ({
            value: l.id,
            label: l.label,
          }))}
          onChange={(v) => updateRow(idx, { supplierLocationId: v as any })}
        />
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "orderedQty",
      width: 140,
      align: "right",
      render: (_: any, row, idx) => (
        <InputNumber
          disabled={disabled}
          value={toNumber(row.orderedQty)}
          min={0}
          style={{ width: "100%" }}
          onChange={(v) => updateRow(idx, { orderedQty: toNumber(v) })}
        />
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 160,
      align: "right",
      render: (_: any, row, idx) => (
        <InputNumber
          disabled={disabled}
          value={row.unitPrice == null ? null : toNumber(row.unitPrice)}
          min={0}
          style={{ width: "100%" }}
          addonAfter="đ"
          onChange={(v) =>
            updateRow(idx, {
              unitPrice: v == null ? null : toNumber(v),
              __priceAuto: false,
            })
          }
        />
      ),
    },
    {
      title: "Chiết khấu",
      dataIndex: "discountAmount",
      width: 160,
      align: "right",
      render: (_: any, row, idx) => (
        <InputNumber
          disabled={disabled}
          value={row.discountAmount == null ? 0 : toNumber(row.discountAmount)}
          min={0}
          style={{ width: "100%" }}
          addonAfter="đ"
          onChange={(v) =>
            updateRow(idx, { discountAmount: v == null ? 0 : toNumber(v) })
          }
        />
      ),
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 180,
      align: "right",
      render: (_: any, row) => {
        const qty = toNumber(row.orderedQty);
        const price = toNumber(row.unitPrice);
        const disc = toNumber(row.discountAmount);
        const line = qty * Math.max(price - disc, 0);
        return <Typography.Text strong>{money(line)} đ</Typography.Text>;
      },
    },
    {
      title: (
        <Button onClick={addRow} disabled={disabled} icon={<PlusOutlined />} />
      ),
      key: "actions",
      width: 60,
      render: (_: any, __, idx) => (
        <Button
          danger
          disabled={disabled}
          onClick={() => removeRow(idx)}
          icon={<DeleteOutlined />}
        />
      ),
    },
  ];

  const totals = useMemo(() => {
    let gross = 0;
    let disc = 0;
    let net = 0;

    (value || []).forEach((r: any) => {
      const qty = toNumber(r.orderedQty);
      const price = toNumber(r.unitPrice);
      const d = toNumber(r.discountAmount);
      gross += qty * price;
      disc += qty * d;
      net += qty * Math.max(price - d, 0);
    });

    return { gross, disc, net };
  }, [value]);

  return (
    <div>
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Typography.Text type="secondary">
          {quoting
            ? "Đang lấy giá theo vùng..."
            : "Chọn sản phẩm, giá sẽ tự điền theo vùng"}
        </Typography.Text>
      </Space>

      <Table<Row>
        size="middle"
        rowKey="key"
        columns={columns}
        dataSource={rows}
        pagination={false}
      />

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}
      >
        <div style={{ width: 360 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Typography.Text type="secondary">Tổng tiền hàng</Typography.Text>
            <Typography.Text>{money(totals.gross)} đ</Typography.Text>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Typography.Text type="secondary">Tổng chiết khấu</Typography.Text>
            <Typography.Text>{money(totals.disc)} đ</Typography.Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography.Text strong>Tạm tính</Typography.Text>
            <Typography.Text strong>{money(totals.net)} đ</Typography.Text>
          </div>
        </div>
      </div>
    </div>
  );
}
