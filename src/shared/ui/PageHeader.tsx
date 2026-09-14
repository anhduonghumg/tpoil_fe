import React from "react";
import { Typography } from "antd";
import "./page-shell.css";

/**
 * Đầu màn danh sách: tiêu đề cấp 4, một dòng mô tả, thao tác dồn phải.
 *
 * Dùng chung với .page-shell (page-shell.css), .data-grid và FilterButton/FilterTags
 * để các màn danh sách trong hệ thống nhìn ra là cùng một bộ.
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  /** Thẻ mô tả tính chất của màn, đứng trên tiêu đề. */
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, badges, actions }) => (
  <div className="page-shell-header">
    <div className="page-shell-heading">
      {badges ? <div className="page-shell-badges">{badges}</div> : null}
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      {subtitle ? (
        <Typography.Text type="secondary">{subtitle}</Typography.Text>
      ) : null}
    </div>
    {actions ? <div className="page-shell-actions">{actions}</div> : null}
  </div>
);
