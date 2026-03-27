import React from "react";
import { Button, Card, DatePicker, Input, Row, Col, Select } from "antd";
import type { BankStatementFilters } from "../types";

const { RangePicker } = DatePicker;

type Props = {
  filters: BankStatementFilters;
  onChange: (next: BankStatementFilters) => void;
  onSearch: () => void;
};

export function StatementFilterBar({ filters, onChange, onSearch }: Props) {
  return (
    <Row gutter={[12, 12]} align="middle">
      <Col xs={24} sm={12} md={7} lg={7}>
        <RangePicker
          size="small"
          value={filters.range as any}
          onChange={(v) => onChange({ ...filters, range: v as any })}
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
        />
      </Col>
      <Col xs={24} sm={12} md={2} lg={3}>
        <Select
          size="small"
          allowClear
          placeholder="Loại"
          value={filters.direction || undefined}
          onChange={(v) => onChange({ ...filters, direction: v || "" })}
          style={{ width: "100%" }}
          options={[
            { value: "IN", label: "Thu" },
            { value: "OUT", label: "Chi" },
          ]}
        />
      </Col>

      <Col xs={24} sm={12} md={6} lg={4}>
        <Select
          size="small"
          allowClear
          placeholder="Trạng thái"
          value={filters.matchStatus || undefined}
          onChange={(v) => onChange({ ...filters, matchStatus: v || "" })}
          style={{ width: "100%" }}
          options={[
            { value: "UNMATCHED", label: "Chưa khớp" },
            { value: "AUTO_MATCHED", label: "Gợi ý khớp" },
            { value: "PARTIAL_MATCHED", label: "Một phần" },
            { value: "MANUAL_MATCHED", label: "Đã khớp" },
          ]}
        />
      </Col>

      <Col xs={24} sm={12} md={6} lg={3}>
        <Select
          size="small"
          value={filters.confirmed ?? ""}
          onChange={(v) => onChange({ ...filters, confirmed: v })}
          placeholder="Xác nhận"
          style={{ width: "100%" }}
          options={[
            { value: "", label: "Tất cả" },
            { value: "true", label: "Đã xác nhận" },
            { value: "false", label: "Chưa xác nhận" },
          ]}
        />
      </Col>

      <Col xs={24} md={12} lg={7}>
        <Input.Search
          size="small"
          allowClear
          placeholder="Từ khóa..."
          value={filters.keyword}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          onSearch={onSearch}
          enterButton="Tìm kiếm"
        />
      </Col>
    </Row>
  );
}
