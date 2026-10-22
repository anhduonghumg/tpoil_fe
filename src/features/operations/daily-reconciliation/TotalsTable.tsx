import { Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import type { Ref } from "./api";
import { qty } from "./ResolveModal";

type Pair = { actual: number; v15: number };
type Line = { key: string; code: string; name?: string; ncc: Pair; mine: Pair };
const zero = (): Pair => ({ actual: 0, v15: 0 });
const add = (p: Pair, o: any) => { p.actual += Number(o.actualQty ?? 0); p.v15 += Number(o.v15Qty ?? 0); };
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Tổng lượng bên NCC so với bên mình theo mặt hàng, tính thẳng từ file và từ phiếu nội bộ
 * trong kỳ (bỏ phiếu hủy, bỏ phiếu khác loại TP/NCC) — không phụ thuộc dòng nào đã ghép được.
 */
export default function TotalsTable({ session, products }: { session: any; products: Ref[] }) {
  const payload = session.payload;
  const bothBases = payload.options.template === "TP";
  const basis: keyof Pair = payload.options.basis === "V15" ? "v15" : "actual";
  const inPeriod = (d: string) => d >= session.dateFrom && d <= session.dateTo;

  const lines = new Map<string, Line>();
  const line = (productId: string | undefined, fallback: string) => {
    const key = productId ?? `code:${fallback}`;
    if (!lines.has(key)) {
      const p = products.find((x) => x.id === productId);
      lines.set(key, { key, code: p?.code ?? fallback, name: p?.name, ncc: zero(), mine: zero() });
    }
    return lines.get(key)!;
  };
  for (const r of payload.rows ?? []) {
    if (!r.date || !inPeriod(r.date) || r.cancelled || !r.productCode) continue;
    add(line(payload.options.productMapping?.[r.productCode], r.productCode).ncc, r);
  }
  for (const i of payload.internal ?? []) {
    if (i.cancelled || (i.releaseCode && i.releaseCode !== session.mode)) continue;
    add(line(i.productId, i.productName).mine, i);
  }
  const data = [...lines.values()].sort((a, b) => a.code.localeCompare(b.code));
  const total = data.reduce((t, l) => {
    t.ncc.actual += l.ncc.actual; t.ncc.v15 += l.ncc.v15; t.mine.actual += l.mine.actual; t.mine.v15 += l.mine.v15; return t;
  }, { ncc: zero(), mine: zero() });

  const delta = (d: number) => {
    const v = round(d);
    return <span className={v === 0 ? "data-grid-num" : "data-grid-num sales-grid-danger"}>{v > 0 ? "+" : ""}{qty(v)}</span>;
  };
  const num = (v: number) => <span className="data-grid-num">{qty(round(v))}</span>;
  const cells = (l: { ncc: Pair; mine: Pair }): ReactNode[] => bothBases
    ? [num(l.ncc.actual), num(l.mine.actual), delta(l.ncc.actual - l.mine.actual), num(l.ncc.v15), num(l.mine.v15), delta(l.ncc.v15 - l.mine.v15)]
    : [num(l.ncc[basis]), num(l.mine[basis]), delta(l.ncc[basis] - l.mine[basis])];
  const heads = bothBases
    ? ["NCC (TT)", "Mình (TT)", "Lệch TT", "NCC (L15)", "Mình (L15)", "Lệch L15"]
    : [`NCC (${basis === "actual" ? "TT" : "L15"})`, `Mình (${basis === "actual" ? "TT" : "L15"})`, "Lệch"];

  const columns: ColumnsType<Line> = [
    { title: "Hàng", width: 90, render: (_, l) => <Tooltip title={l.name}><span className="data-grid-strong">{l.code}</span></Tooltip> },
    ...heads.map((title, i) => ({ title, width: 96, align: "right" as const, render: (_: unknown, l: Line) => cells(l)[i] })),
  ];

  return (
    <Table<Line>
      className="data-grid" size="small" rowKey="key" pagination={false} dataSource={data} columns={columns}
      style={{ marginBottom: 8, maxWidth: 90 + heads.length * 96 }}
      summary={() => data.length > 1 ? (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}><b>Tổng cộng</b></Table.Summary.Cell>
          {cells(total).map((c, i) => <Table.Summary.Cell key={i} index={i + 1} align="right"><b>{c}</b></Table.Summary.Cell>)}
        </Table.Summary.Row>
      ) : null}
    />
  );
}
