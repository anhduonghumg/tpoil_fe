import React, { useEffect, useMemo, useState } from "react";
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

type ProductOption = { id: UUID; name: string; code?: string | null };

function toNumber(x: unknown): number {
  if (x == null) return 0;
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  const n = Number(String(x).replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export type LinesEditorValue = UpsertPurchaseOrderLinePayload[];

export type PurchaseOrderLinesEditorProps = {
  value: LinesEditorValue;
  onChange: (next: LinesEditorValue) => void;

  regionCode: string;
  onDate: string;
  disabled?: boolean;
  products: ProductOption[];
  onSearchProducts: (keyword: string) => void;
};

type Row = UpsertPurchaseOrderLinePayload & { key: string };

export default function PurchaseOrderLinesEditor(
  props: PurchaseOrderLinesEditorProps
) {
  const {
    value,
    onChange,
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
        key: `${l.productId}-${idx}`,
        discount: l.discount ?? 0,
        unitPrice: l.unitPrice ?? null,
      })),
    [value]
  );

  const [quoting, setQuoting] = useState(false);

  const productMap = useMemo(() => {
    const m = new Map<string, ProductOption>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const addRow = () => {
    onChange([
      ...(value || []),
      {
        productId: "" as any,
        orderedQty: 0,
        unitPrice: null,
        discount: 0,
        taxRate: null,
      },
    ]);
  };

  const removeRow = (index: number) => {
    const next = [...(value || [])];
    next.splice(index, 1);
    onChange(next);
  };

  const updateRow = (
    index: number,
    patch: Partial<UpsertPurchaseOrderLinePayload>
  ) => {
    const next = [...(value || [])];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  useEffect(() => {
    const ids = (value || []).map((x) => x.productId).filter((x) => !!x);

    const uniq = Array.from(new Set(ids));
    if (!uniq.length || !regionCode || !onDate) return;

    let cancelled = false;

    (async () => {
      try {
        setQuoting(true);
        const res: PriceQuoteBatchResult = await PurchasesApi.quoteBatch({
          productIds: uniq,
          regionCode,
          onDate,
        });

        if (cancelled) return;

        const priceMap = new Map<string, number>();
        res.items.forEach((it) => {
          priceMap.set(
            it.productId,
            it.price == null ? NaN : toNumber(it.price)
          );
        });

        const next = [...(value || [])].map((line) => {
          if (!line.productId) return line;
          const p = priceMap.get(line.productId);
          if (p == null || Number.isNaN(p)) return line;
          const cur = toNumber(line.unitPrice);
          if (cur > 0) return line;
          return { ...line, unitPrice: p };
        });

        onChange(next);
      } catch (e) {
        notify.error("Không lấy được bảng giá. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [regionCode, onDate]);

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
          onSearch={onSearchProducts}
          options={products.map((p) => ({
            value: p.id,
            label: p.code ? `${p.code} - ${p.name}` : p.name,
          }))}
          onChange={(pid) => updateRow(idx, { productId: pid })}
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
            updateRow(idx, { unitPrice: v == null ? null : toNumber(v) })
          }
        />
      ),
    },
    {
      title: "Chiết khấu",
      dataIndex: "discount",
      width: 160,
      align: "right",
      render: (_: any, row, idx) => (
        <InputNumber
          disabled={disabled}
          value={row.discount == null ? 0 : toNumber(row.discount)}
          min={0}
          style={{ width: "100%" }}
          addonAfter="đ"
          onChange={(v) =>
            updateRow(idx, { discount: v == null ? 0 : toNumber(v) })
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
        const disc = toNumber(row.discount);
        const line = qty * Math.max(price - disc, 0);
        return <Typography.Text strong>{money(line)} đ</Typography.Text>;
      },
    },
    {
      title: (
        <>
          <Button
            onClick={addRow}
            disabled={disabled}
            icon={<PlusOutlined />}
          ></Button>
        </>
      ),
      key: "actions",
      width: 50,
      render: (_: any, __, idx) => (
        <Button
          danger
          disabled={disabled}
          onClick={() => removeRow(idx)}
          icon={<DeleteOutlined />}
        ></Button>
      ),
    },
  ];

  const totals = useMemo(() => {
    let gross = 0;
    let disc = 0;
    let net = 0;

    (value || []).forEach((r) => {
      const qty = toNumber(r.orderedQty);
      const price = toNumber(r.unitPrice);
      const d = toNumber(r.discount);
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
