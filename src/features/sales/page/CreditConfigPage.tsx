import React, { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Progress,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import {
  useCreditCustomerDetail,
  useCreditCustomers,
  useUpdateCustomerCredit,
} from "../hooks";
import type { CreditCustomerRow, CreditLimitPeriod } from "../types";
import { formatMoney } from "../ui/labels";
import "../sales.css";

type EditForm = {
  creditLimit?: number | null;
  tempLimit?: number | null;
  tempRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  paymentTermDays?: number | null;
  reason: string;
};

/** Bao nhiêu phần hạn mức đang bị chiếm — quá 100% thì đỏ. */
function usagePercent(row: CreditCustomerRow) {
  const limit = Number(row.effectiveLimit ?? 0);
  if (!limit) return null;
  return Math.round((Number(row.exposure) / limit) * 100);
}

/**
 * Cấu hình hạn mức tín dụng — màn hình của kế toán công nợ, tách khỏi hồ sơ khách
 * hàng của Sale. Đặt hạn mức mà không thấy khách đang dùng bao nhiêu thì chỉ là đoán,
 * nên mỗi dòng hiện luôn công nợ chưa thu + đơn đã duyệt chưa xuất hóa đơn.
 */
export default function CreditConfigPage() {
  const { can } = useCan();
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [accountingOwnerEmpId, setAccountingOwnerEmpId] = useState<string>();
  const [missingLimitOnly, setMissingLimitOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [overLimitOnly, setOverLimitOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [editTarget, setEditTarget] = useState<CreditCustomerRow>();
  const [form, setForm] = useState<EditForm>({ reason: "" });

  const query = useCreditCustomers({
    keyword: keyword.trim() || undefined,
    accountingOwnerEmpId,
    missingLimitOnly: missingLimitOnly || undefined,
    overdueOnly: overdueOnly || undefined,
    overLimitOnly: overLimitOnly || undefined,
    page,
    limit: 20,
  });
  const detailQuery = useCreditCustomerDetail(detailId);
  const updateMutation = useUpdateCustomerCredit();

  // Ai duyệt được tín dụng cho đơn thì cũng đặt được hạn mức (backend gác cùng bộ quyền).
  const canManage = can(PERMS.SALES_CREDIT_MANAGE) || can(PERMS.SALES_APPROVE_CREDIT);

  const openEdit = (row: CreditCustomerRow) => {
    setEditTarget(row);
    setForm({
      creditLimit: row.creditLimit == null ? undefined : Number(row.creditLimit),
      tempLimit: row.tempLimit == null ? undefined : Number(row.tempLimit),
      tempRange:
        row.tempFrom && row.tempTo ? [dayjs(row.tempFrom), dayjs(row.tempTo)] : null,
      paymentTermDays: row.paymentTermDays ?? undefined,
      reason: "",
    });
  };

  const resetFilters = () => {
    setAccountingOwnerEmpId(undefined);
    setMissingLimitOnly(false);
    setOverdueOnly(false);
    setOverLimitOnly(false);
    setPage(1);
  };

  const activeFilterCount =
    Number(Boolean(accountingOwnerEmpId)) +
    Number(missingLimitOnly) +
    Number(overdueOnly) +
    Number(overLimitOnly);

  const filterTags = [
    accountingOwnerEmpId && {
      key: "accountant",
      label: "Đang lọc theo kế toán phụ trách",
      onClear: () => {
        setAccountingOwnerEmpId(undefined);
        setPage(1);
      },
    },
    missingLimitOnly && {
      key: "missing",
      label: "Chưa đặt hạn mức",
      onClear: () => {
        setMissingLimitOnly(false);
        setPage(1);
      },
    },
    overdueOnly && {
      key: "overdue",
      label: "Đang có nợ quá hạn",
      onClear: () => {
        setOverdueOnly(false);
        setPage(1);
      },
    },
    overLimitOnly && {
      key: "overlimit",
      label: "Đang vượt hạn mức",
      onClear: () => {
        setOverLimitOnly(false);
        setPage(1);
      },
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Kế toán phụ trách
        </Typography.Text>
        <EmployeeSelect
          allowClear
          style={{ width: "100%" }}
          placeholder="Mọi kế toán"
          value={accountingOwnerEmpId}
          onChange={(value) => {
            setAccountingOwnerEmpId(value ?? undefined);
            setPage(1);
          }}
        />
      </div>
      <Space direction="vertical" size={4} style={{ marginBottom: 10 }}>
        <Checkbox
          checked={missingLimitOnly}
          onChange={(e) => {
            setMissingLimitOnly(e.target.checked);
            setPage(1);
          }}
        >
          Chưa đặt hạn mức
        </Checkbox>
        <Checkbox
          checked={overdueOnly}
          onChange={(e) => {
            setOverdueOnly(e.target.checked);
            setPage(1);
          }}
        >
          Đang có nợ quá hạn
        </Checkbox>
        <Checkbox
          checked={overLimitOnly}
          onChange={(e) => {
            setOverLimitOnly(e.target.checked);
            setPage(1);
          }}
        >
          Đang vượt hạn mức
        </Checkbox>
      </Space>
      <div style={{ textAlign: "right" }}>
        <Button size="small" onClick={resetFilters}>
          Đặt lại
        </Button>
      </div>
    </div>
  );

  const columns: ColumnsType<CreditCustomerRow> = [
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, row) => (
        <div>
          <div>{row.name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.code}
            {row.taxCode ? ` · MST ${row.taxCode}` : ""}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Kế toán phụ trách",
      key: "accountant",
      width: 160,
      render: (_, row) => row.accountingOwnerEmp?.fullName ?? "—",
    },
    {
      title: "Hạn mức",
      key: "limit",
      width: 170,
      align: "right",
      // Bấm thẳng vào hạn mức để sửa — kế toán không phải đi tìm nút.
      render: (_, row) => {
        const body =
          row.effectiveLimit == null ? (
            <Tag color="orange" style={{ marginInlineEnd: 0 }}>
              Chưa đặt
            </Tag>
          ) : (
            <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
              <strong>{formatMoney(row.effectiveLimit)}</strong>
              {row.effectiveLimitIsTemp && (
                <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                  tạm, đến {row.tempTo ? dayjs(row.tempTo).format("DD/MM/YYYY") : "?"}
                </Tag>
              )}
            </Space>
          );
        if (!canManage) return body;
        return (
          <Tooltip title="Bấm để sửa hạn mức">
            <Button
              type="link"
              style={{ padding: 0, height: "auto", textAlign: "right" }}
              onClick={() => openEdit(row)}
            >
              {body}
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: "Đang dùng",
      key: "exposure",
      width: 190,
      align: "right",
      render: (_, row) => {
        const percent = usagePercent(row);
        return (
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            <span>{formatMoney(row.exposure)}</span>
            {percent != null && (
              <Progress
                percent={Math.min(percent, 100)}
                size="small"
                showInfo={false}
                status={percent > 100 ? "exception" : percent > 80 ? "active" : "normal"}
              />
            )}
            {percent != null && (
              <Typography.Text type={percent > 100 ? "danger" : "secondary"} style={{ fontSize: 11 }}>
                {percent}% hạn mức
              </Typography.Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Còn dùng được",
      dataIndex: "availableCredit",
      width: 140,
      align: "right",
      render: (value: string | null) =>
        value == null ? (
          "—"
        ) : (
          <Typography.Text strong type={Number(value) < 0 ? "danger" : undefined}>
            {formatMoney(value)}
          </Typography.Text>
        ),
    },
    {
      title: "Quá hạn",
      dataIndex: "overdueAmount",
      width: 130,
      align: "right",
      render: (value: string) =>
        Number(value) > 0 ? (
          <Typography.Text type="danger" strong>
            {formatMoney(value)}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Kỳ hạn TT",
      dataIndex: "paymentTermDays",
      width: 100,
      align: "right",
      render: (value: number | null) => (value == null ? "—" : `${value} ngày`),
    },
    {
      title: "",
      key: "actions",
      width: 150,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => setDetailId(row.id)}>
            Lịch sử
          </Button>
          {canManage && (
            <Button size="small" type="primary" icon={<SettingOutlined />} onClick={() => openEdit(row)}>
              Đặt
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const timelineColumns: ColumnsType<CreditLimitPeriod> = [
    {
      title: "Áp dụng từ",
      dataIndex: "validFrom",
      width: 130,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Đến",
      dataIndex: "validTo",
      width: 130,
      render: (value: string | null) =>
        value ? (
          dayjs(value).format("DD/MM/YYYY HH:mm")
        ) : (
          <Tag color="green" style={{ marginInlineEnd: 0 }}>
            đang áp dụng
          </Tag>
        ),
    },
    {
      title: "Hạn mức",
      dataIndex: "creditLimit",
      width: 150,
      align: "right",
      render: (value: string | null, row) => (
        <Typography.Text strong={row.isCurrent}>
          {value == null ? "không đặt" : formatMoney(value)}
        </Typography.Text>
      ),
    },
    {
      title: "Hạn mức tạm",
      key: "temp",
      width: 210,
      render: (_, row) =>
        row.tempLimit == null ? (
          "—"
        ) : (
          <span>
            {formatMoney(row.tempLimit)}{" "}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ({row.tempFrom ? dayjs(row.tempFrom).format("DD/MM/YYYY") : "?"} –{" "}
              {row.tempTo ? dayjs(row.tempTo).format("DD/MM/YYYY") : "?"})
            </Typography.Text>
          </span>
        ),
    },
    {
      title: "Người đổi",
      key: "changedBy",
      width: 140,
      render: (_, row) => row.changedByName ?? (row.changedBy ? "—" : ""),
    },
    { title: "Lý do", dataIndex: "reason", render: (value) => value ?? "—" },
  ];

  const detail = detailQuery.data;

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Cấu hình tín dụng khách hàng
        </Typography.Title>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="“Đang dùng” gồm công nợ chưa thu và đơn đã duyệt nhưng chưa xuất hóa đơn — đúng con số mà hệ thống dùng để chặn đơn khi Sale gửi kiểm duyệt."
      />

      <FilterToolbar
        left={
          <Input
            allowClear
            size="small"
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            placeholder="Tìm tên, mã hoặc MST khách hàng"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => {
              setKeyword(searchText);
              setPage(1);
            }}
          />
        }
        right={
          <>
            <FilterButton
              count={activeFilterCount}
              open={filterOpen}
              onOpenChange={setFilterOpen}
              content={filterPanel}
            />
            <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
          </>
        }
      />

      <FilterTags items={filterTags} />

      <Table<CreditCustomerRow>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: 1250 }}
        rowClassName={(row) => (row.isOverLimit || row.hasOverdue ? "sales-row-attention" : "")}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Drawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(undefined)}
        width={820}
        title={detail ? `Tín dụng — ${detail.name}` : "Tín dụng"}
      >
        {detailQuery.isLoading || !detail ? (
          <Skeleton active />
        ) : (
          <>
            <Space size={28} wrap style={{ marginBottom: 16 }}>
              <Statistic
                title="Hạn mức áp dụng"
                value={detail.effectiveLimit == null ? "chưa đặt" : formatMoney(detail.effectiveLimit)}
              />
              <Statistic title="Công nợ chưa thu" value={formatMoney(detail.receivableOutstanding)} />
              <Statistic
                title="Đơn đã duyệt chưa HĐ"
                value={formatMoney(detail.committedOrderValue)}
              />
              <Statistic
                title="Còn dùng được"
                value={
                  detail.availableCredit == null ? "—" : formatMoney(detail.availableCredit)
                }
                valueStyle={{
                  color: Number(detail.availableCredit ?? 0) < 0 ? "#cf1322" : undefined,
                }}
              />
            </Space>

            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Kế toán phụ trách">
                {detail.accountingOwnerEmp?.fullName ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Sale phụ trách">
                {detail.salesOwnerEmp?.fullName ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Hạn mức chính thức">
                {detail.creditLimit == null ? "—" : formatMoney(detail.creditLimit)}
              </Descriptions.Item>
              <Descriptions.Item label="Hạn mức tạm">
                {detail.tempLimit == null
                  ? "—"
                  : `${formatMoney(detail.tempLimit)} (${
                      detail.tempFrom ? dayjs(detail.tempFrom).format("DD/MM/YYYY") : "?"
                    } – ${detail.tempTo ? dayjs(detail.tempTo).format("DD/MM/YYYY") : "?"})`}
              </Descriptions.Item>
              <Descriptions.Item label="Kỳ hạn thanh toán">
                {detail.paymentTermDays == null ? "—" : `${detail.paymentTermDays} ngày`}
              </Descriptions.Item>
              <Descriptions.Item label="Nợ quá hạn">
                {Number(detail.overdueAmount) > 0 ? (
                  <Typography.Text type="danger">{formatMoney(detail.overdueAmount)}</Typography.Text>
                ) : (
                  "không có"
                )}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Text strong>Các kỳ hạn mức</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: "4px 0 8px" }}>
              Mỗi lần đổi hạn mức mở một kỳ mới và đóng kỳ trước; kỳ chưa có ngày kết thúc là kỳ
              đang áp dụng.
            </Typography.Paragraph>
            <Table<CreditLimitPeriod>
              rowKey="id"
              size="small"
              pagination={false}
              columns={timelineColumns}
              dataSource={detail.timeline}
              scroll={{ x: 900 }}
              rowClassName={(row) => (row.isCurrent ? "sales-row-current" : "")}
              locale={{ emptyText: "Chưa có thay đổi nào được ghi nhận" }}
            />
          </>
        )}
      </Drawer>

      <Modal
        open={Boolean(editTarget)}
        title={`Đặt hạn mức — ${editTarget?.name ?? ""}`}
        okText="Lưu"
        cancelText="Đóng"
        okButtonProps={{ disabled: !form.reason.trim() }}
        confirmLoading={updateMutation.isPending}
        onCancel={() => setEditTarget(undefined)}
        onOk={async () => {
          if (!editTarget) return;
          await updateMutation.mutateAsync({
            customerPartyId: editTarget.id,
            payload: {
              creditLimit: form.creditLimit ?? null,
              tempLimit: form.tempLimit ?? null,
              tempFrom: form.tempRange?.[0]?.format("YYYY-MM-DD") ?? null,
              tempTo: form.tempRange?.[1]?.format("YYYY-MM-DD") ?? null,
              paymentTermDays: form.paymentTermDays ?? null,
              reason: form.reason.trim(),
            },
          });
          setEditTarget(undefined);
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Hạn mức chính thức (để trống = không giới hạn theo hạn mức)
            </Typography.Text>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              controls={false}
              value={form.creditLimit ?? undefined}
              onChange={(value) => setForm((current) => ({ ...current, creditLimit: value }))}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Hạn mức tạm (ưu tiên hơn hạn mức chính thức trong khoảng ngày dưới đây)
            </Typography.Text>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              controls={false}
              value={form.tempLimit ?? undefined}
              onChange={(value) => setForm((current) => ({ ...current, tempLimit: value }))}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Hiệu lực hạn mức tạm
            </Typography.Text>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={form.tempRange ?? undefined}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  tempRange: (value as [dayjs.Dayjs, dayjs.Dayjs] | null) ?? null,
                }))
              }
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Kỳ hạn thanh toán mặc định (ngày)
            </Typography.Text>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              controls={false}
              value={form.paymentTermDays ?? undefined}
              onChange={(value) => setForm((current) => ({ ...current, paymentTermDays: value }))}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Lý do thay đổi (bắt buộc — sẽ lưu vào lịch sử)
            </Typography.Text>
            <Input.TextArea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
              placeholder="VD: Nâng hạn mức theo phê duyệt của BGĐ ngày 05/08"
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
