import React from "react";
import "../banking.css";

export type BankingKpiItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  /** Tô cam khi đang có việc tồn. */
  warning?: boolean;
  onClick?: () => void;
};

/** Dải chỉ số đầu màn. Ô nào có onClick thì bấm được, ô đang chọn được viền xanh. */
export function BankingKpis({ items, activeKey }: { items: BankingKpiItem[]; activeKey?: string }) {
  return (
    <div className="banking-kpis">
      {items.map((item) => {
        const body = (
          <>
            <span className="banking-kpi-label">
              {item.icon ? <span className="banking-kpi-icon" style={{ color: item.color }}>{item.icon}</span> : null}
              {item.label}
            </span>
            <span className={`banking-kpi-value${item.warning ? " is-warning" : ""}`}>{item.value}</span>
            {item.hint ? <span className="banking-kpi-hint">{item.hint}</span> : null}
          </>
        );
        const className = `banking-kpi${activeKey === item.key ? " is-active" : ""}`;
        return item.onClick ? (
          <button key={item.key} type="button" className={className} onClick={item.onClick}>
            {body}
          </button>
        ) : (
          <div key={item.key} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function BankingSection({
  title,
  hint,
  extra,
  children,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="banking-section">
      <div className="banking-section-head">
        <div className="banking-section-title">
          {title}
          {hint ? <small>{hint}</small> : null}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}
