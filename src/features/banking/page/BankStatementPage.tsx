import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useBankTransactions } from "../hooks";
import type {
  BankAccountOption,
  BankStatementFilters,
  BankTransactionItem,
  BankTransactionListQuery,
} from "../types";
import { StatementImportCard } from "../ui/StatementImportCard";
import { StatementTable } from "../ui/StatementTable";
import { StatementMatchDrawer } from "../ui/StatementMatchDrawer";

const { RangePicker } = DatePicker;

type Props = {
  bankAccounts?: BankAccountOption[];
};

export default function BankStatementPage({ bankAccounts = [] }: Props) {
  const [draftFilters, setDraftFilters] = useState<BankStatementFilters>({
    confirmed: "",
    direction: "",
    matchStatus: "",
    keyword: "",
  });

  const [query, setQuery] = useState<BankTransactionListQuery>({
    page: 1,
    pageSize: 20,
    confirmed: "",
  });

  const [selected, setSelected] = useState<BankTransactionItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useBankTransactions(query);

  const handleSearch = () => {
    setQuery({
      page: 1,
      pageSize: query.pageSize || 20,
      bankAccountId: draftFilters.bankAccountId,
      keyword: draftFilters.keyword?.trim() || undefined,
      matchStatus: draftFilters.matchStatus || undefined,
      direction: draftFilters.direction || undefined,
      confirmed: draftFilters.confirmed || "",
      fromDate: draftFilters.range?.[0]
        ? draftFilters.range[0].format("YYYY-MM-DD")
        : undefined,
      toDate: draftFilters.range?.[1]
        ? draftFilters.range[1].format("YYYY-MM-DD")
        : undefined,
    });
  };

  const handleOpenMatch = (row: BankTransactionItem) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          Sao kê ngân hàng
        </Typography.Title>
        <Typography.Text type="secondary">
          Import sao kê, xem trước dữ liệu và xử lý phân bổ thanh toán.
        </Typography.Text>
      </div>

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Typography.Text>Tài khoản</Typography.Text>
            <Select
              allowClear
              value={draftFilters.bankAccountId}
              onChange={(v) =>
                setDraftFilters((s) => ({ ...s, bankAccountId: v }))
              }
              placeholder="Chọn tài khoản"
              style={{ width: "100%", marginTop: 6 }}
              options={bankAccounts.map((x) => ({
                value: x.id,
                label: `${x.bankCode} - ${x.accountNo}`,
              }))}
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={5}>
            <Typography.Text>Khoảng ngày</Typography.Text>
            <RangePicker
              value={draftFilters.range as any}
              onChange={(v) =>
                setDraftFilters((s) => ({ ...s, range: v as any }))
              }
              style={{ width: "100%", marginTop: 6 }}
              format="DD/MM/YYYY"
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Typography.Text>Trạng thái</Typography.Text>
            <Select
              allowClear
              value={draftFilters.matchStatus}
              onChange={(v) =>
                setDraftFilters((s) => ({ ...s, matchStatus: v }))
              }
              placeholder="Tất cả"
              style={{ width: "100%", marginTop: 6 }}
              options={[
                { value: "UNMATCHED", label: "Chưa khớp" },
                { value: "AUTO_MATCHED", label: "Gợi ý khớp" },
                { value: "PARTIAL_MATCHED", label: "Một phần" },
                { value: "MANUAL_MATCHED", label: "Đã khớp" },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <Typography.Text>Loại</Typography.Text>
            <Select
              allowClear
              value={draftFilters.direction}
              onChange={(v) => setDraftFilters((s) => ({ ...s, direction: v }))}
              placeholder="Tất cả"
              style={{ width: "100%", marginTop: 6 }}
              options={[
                { value: "IN", label: "Thu" },
                { value: "OUT", label: "Chi" },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={3}>
            <Typography.Text>Xác nhận</Typography.Text>
            <Select
              value={draftFilters.confirmed}
              onChange={(v) => setDraftFilters((s) => ({ ...s, confirmed: v }))}
              placeholder="Tất cả"
              style={{ width: "100%", marginTop: 6 }}
              options={[
                { value: "", label: "Tất cả" },
                { value: "true", label: "Đã xác nhận" },
                { value: "false", label: "Chưa xác nhận" },
              ]}
            />
          </Col>

          <Col xs={24} sm={24} md={12} lg={3}>
            <Typography.Text>Từ khóa</Typography.Text>
            <Input
              value={draftFilters.keyword}
              onChange={(e) =>
                setDraftFilters((s) => ({ ...s, keyword: e.target.value }))
              }
              onPressEnter={handleSearch}
              placeholder="Nội dung, đối tác..."
              style={{ marginTop: 6 }}
            />
          </Col>
        </Row>

        <Space style={{ marginTop: 12 }}>
          <Button type="primary" onClick={handleSearch}>
            Tìm kiếm
          </Button>
        </Space>
      </Card>

      <StatementImportCard bankAccounts={bankAccounts} />

      <Card size="small" title="Danh sách giao dịch">
        <StatementTable
          data={data || []}
          loading={isLoading}
          page={data?.meta.page || query.page || 1}
          pageSize={data?.meta.pageSize || query.pageSize || 20}
          total={data?.meta.total || 0}
          onChangePage={(page, pageSize) =>
            setQuery((s) => ({ ...s, page, pageSize }))
          }
          onOpenMatch={handleOpenMatch}
        />
      </Card>

      <StatementMatchDrawer
        open={drawerOpen}
        transaction={selected}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
      />
    </Space>
  );
}
