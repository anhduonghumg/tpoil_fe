import React from "react";
import { Badge, Button, ConfigProvider, Popover, Space, Tag } from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { MobilePageFooter } from "./MobilePageFooter";
import type { ActiveFilterTag } from "./TableFilter";
import "./mobile-list.css";

export function MobileList({ children }: { children: React.ReactNode }) {
  return <div className="mobile-list">{children}</div>;
}

export function MobileListItem({ title, status, description, details, detailsTitle = "Thông tin chi tiết", moreLabel = "Xem thông tin chi tiết", children }: {
  title: React.ReactNode;
  status?: React.ReactNode;
  description?: React.ReactNode;
  details?: React.ReactNode;
  detailsTitle?: React.ReactNode;
  moreLabel?: string;
  children?: React.ReactNode;
}) {
  return <article className="mobile-list-row">
    <div className="mobile-list-row-heading">
      <strong>{title}</strong>{status}
      {details ? <Popover trigger="click" placement="bottomRight" title={detailsTitle} content={<div className="mobile-list-details">{details}</div>}>
        <Button size="small" type="text" aria-label={moreLabel} icon={<EllipsisOutlined />} />
      </Popover> : null}
    </div>
    {description ? <div className="mobile-list-row-description">{description}</div> : null}
    {children}
  </article>;
}

export function MobileListValues({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return <dl className="mobile-list-row-values">{items.map((item, index) => <div key={`${index}-${item.label}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

/** Applied search/filter conditions as removable tags above the list; renders nothing when none apply. */
export function MobileActiveFilters({ items }: { items: (ActiveFilterTag | null | false | undefined)[] }) {
  const active = items.filter((item): item is ActiveFilterTag => Boolean(item));
  if (!active.length) return null;
  return <div className="mobile-list-active-filters" aria-label="Điều kiện đang áp dụng">
    {active.map((item) => <Tag key={item.key} closable onClose={item.onClear}>{item.label}</Tag>)}
  </div>;
}

export type MobileListTool = {
  key: string;
  label: string;
  title?: React.ReactNode;
  icon: React.ReactNode;
  content: React.ReactNode;
  active?: boolean;
};

/** One open tool at a time; route retains ownership of query and filter state. */
export function MobileListToolbar({ tools, openTool, onToolChange, actions, summary, pagination }: {
  tools: MobileListTool[];
  openTool: string | null;
  onToolChange: (key: string | null) => void;
  actions?: React.ReactNode;
  summary: React.ReactNode;
  pagination?: React.ReactNode;
}) {
  return <MobilePageFooter><ConfigProvider componentSize="small">
    <div className="mobile-list-footer">
      <Space size={10}>
        {tools.map((tool) => <Popover key={tool.key} trigger="click" placement="topLeft" title={tool.title ?? tool.label}
          open={openTool === tool.key} onOpenChange={(value) => onToolChange(value ? tool.key : null)}
          content={<div className="mobile-list-tool-panel">{tool.content}</div>}>
          <Badge dot={tool.active}><Button size="small" type="text" aria-label={tool.label} aria-expanded={openTool === tool.key} icon={tool.icon} /></Badge>
        </Popover>)}
        {actions}
      </Space>
      <span className="mobile-list-footer-total" role="status">{summary}</span>
    </div>
    {pagination ? <div className="mobile-list-footer-pagination">{pagination}</div> : null}
  </ConfigProvider></MobilePageFooter>;
}
