import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PercentageOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { RefreshButton } from "../../../shared/ui/TableFilter";
import { PERMS } from "../../../shared/authz/perms";
import { useCan } from "../../../shared/authz/useCan";
import {
  useDeleteDepositInterestRate,
  useDepositInterestRates,
  useReceivableInterestReport,
  useSaveDepositInterestRate,
} from "../hooks";
import type {
  DepositInterestRate,
  ReceivableInterestItem,
  ReceivableInterestRow,
} from "../types";
import { formatMoney } from "../ui/labels";
import "../sales.css";

const EMPTY = <span className="sales-grid-empty">—</span>;

const num = (value: unknown) => <span className="sales-grid-num">{formatMoney(value as any)}</span>;
const lost = (value: unknown) => (
  <span className={`sales-grid-num sales-grid-strong${Number(value) > 0 ? " sales-grid-danger" : ""}`}>
    {formatMoney(value as any)}
  </span>
);
const dateText = (value?: string | null) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");
const rateText = (value: string | number) =>
  `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 4 })}%`;

const RANGE_PRESETS: Array<{ label: string; value: [Dayjs, Dayjs] }> = [
  { label: "Tháng này", value: [dayjs().startOf("month"), dayjs()] },
  { label: "Tháng trước", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
  { label: "Quý này", value: [dayjs().startOf("month").subtract(dayjs().month() % 3, "month"), dayjs()] },
  { label: "Năm nay", value: [dayjs().startOf("year"), dayjs()] },
];

/**
 * Lãi bị mất do khách nợ: nếu số tiền khách đang nợ được gửi ngân hàng thì công ty đã
 * nhận được bao nhiêu lãi.
 *
 * Backend tính y như ngân hàng tính lãi tiền gửi — mỗi ngày: dư nợ cuối ngày × lãi suất
 * năm có hiệu lực ngày đó ÷ 365 — nên khách trả dần hay lãi đổi giữa kỳ đều ra đúng. Lãi
 * suất nhập tay theo mốc ngày ngay trên màn này (nút "Lãi suất").
 */
export default function ReceivableInterestPage() {
  const { can } = useCan();
  const canEditRates = can(PERMS.SALES_CREDIT_MANAGE);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(RANGE_PRESETS[0].value);
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [ratesOpen, setRatesOpen] = useState(false);

  const query = useMemo(
    () => ({
      customerPartyId,
      fromDate: range[0].format("YYYY-MM-DD"),
      toDate: range[1].format("YYYY-MM-DD"),
    }),
    [customerPartyId, range],
  );
  const reportQuery = useReceivableInterestReport(query);
  const report = reportQuery.data;

  const ratesUsed = report?.ratesUsed ?? [];
  const ratesUsedText = ratesUsed.length
    ? ratesUsed.map((rate) => rateText(rate.annualRate)).join(" → ")
    : "Chưa có";

  const itemColumns: ColumnsType<ReceivableInterestItem> = [
    {
      title: "Chứng từ",
      dataIndex: "documentNo",
      width: 200,
      render: (value) => <span className="sales-grid-clip sales-grid-strong">{value}</span>,
    },
    { title: "Ngày phát sinh", dataIndex: "issuedDate", width: 115, render: dateText },
    { title: "Hạn thanh toán", dataIndex: "dueDate", width: 120, render: dateText },
    {
      title: "Số ngày nợ",
      key: "days",
      width: 110,
      align: "right",
      render: (_, item) => (
        <span className="sales-grid-stack" style={{ alignItems: "flex-end" }}>
          <span className="sales-grid-num">{item.daysOutstanding}</span>
          <span className={`sales-grid-sub${item.overdueDays ? " sales-grid-danger" : ""}`}>
            {item.overdueDays ? `trễ ${item.overdueDays} ngày` : "trong hạn"}
          </span>
        </span>
      ),
    },
    { title: "Dư nợ bình quân", dataIndex: "averageBalance", width: 150, align: "right", render: num },
    { title: "Lãi bị mất", dataIndex: "lostInterest", width: 140, align: "right", render: lost },
    {
      title: "Do trễ hạn",
      dataIndex: "overdueLostInterest",
      width: 130,
      align: "right",
      render: (value) => (Number(value) > 0 ? num(value) : EMPTY),
    },
  ];

  const columns: ColumnsType<ReceivableInterestRow> = [
    {
      title: "Khách hàng",
      key: "customer",
      width: 260,
      render: (_, row) => (
        <span className="sales-grid-stack">
          <span className="sales-grid-clip sales-grid-strong">{row.customer.code || row.customer.name}</span>
          <span className="sales-grid-clip sales-grid-sub">
            {row.customer.code ? row.customer.name : "—"}
          </span>
        </span>
      ),
    },
    {
      /* Bình quân trên TOÀN kỳ (kể cả ngày không nợ) — nhân với lãi suất và số ngày của kỳ
         là ra lại đúng tiền lãi, nên con số đọc được một cách trực quan. */
      title: "Dư nợ bình quân",
      dataIndex: "averageDebt",
      width: 170,
      align: "right",
      render: num,
    },
    { title: "Nợ cuối kỳ", dataIndex: "closingDebt", width: 170, align: "right", render: num },
    { title: "Lãi bị mất", dataIndex: "lostInterest", width: 160, align: "right", render: lost },
    {
      /* Tách riêng phần mất SAU hạn thanh toán: phần trong hạn là giá của việc mình chủ động
         cho nợ, phần này mới là tiền mất vì khách vi phạm hạn trả. */
      title: "Trong đó do trễ hạn",
      dataIndex: "overdueLostInterest",
      width: 170,
      align: "right",
      render: (value) => (Number(value) > 0 ? num(value) : EMPTY),
    },
  ];

  return (
    <div className="sales-page receivables-page">
      <div className="receivable-interest-header">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Lãi bị mất do khách nợ
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Nếu số tiền khách đang nợ được gửi ngân hàng thì công ty đã nhận được bao nhiêu lãi —
            tính từng ngày theo lãi suất tiền gửi đã nhập.
          </Typography.Text>
        </div>
        <Space size={6} wrap>
          <DatePicker.RangePicker
            size="small"
            allowClear={false}
            format="DD/MM/YYYY"
            value={range}
            presets={RANGE_PRESETS}
            onChange={(value) => value?.[0] && value?.[1] && setRange([value[0], value[1]])}
          />
          <PartySelect
            partyRole="CUSTOMER"
            allowClear
            size="small"
            style={{ width: 220 }}
            placeholder="Mọi khách hàng"
            value={customerPartyId}
            onChange={(value) => setCustomerPartyId(value ?? undefined)}
          />
          <Button size="small" icon={<PercentageOutlined />} onClick={() => setRatesOpen(true)}>
            Lãi suất
          </Button>
          <RefreshButton loading={reportQuery.isFetching} onClick={() => reportQuery.refetch()} />
        </Space>
      </div>

      {report?.missingRate ? (
        <Alert
          type="warning"
          showIcon
          message={`Chưa có lãi suất cho ${report.missingRate.days} ngày (${dateText(report.missingRate.fromDate)} – ${dateText(report.missingRate.toDate)})`}
          description="Những ngày này đang tính lãi bằng 0, nên tổng tiền lãi bị mất đang thấp hơn thực tế. Nhập mức lãi suất có hiệu lực từ ngày đầu tiên để tính đủ."
          action={
            <Button size="small" onClick={() => setRatesOpen(true)}>
              Nhập lãi suất
            </Button>
          }
        />
      ) : null}

      <div className="receivables-summary">
        <div className="is-outstanding">
          <span>Tổng lãi bị mất</span>
          <strong>{formatMoney(report?.totals.lostInterest)}</strong>
        </div>
        <div>
          <span>Trong đó do trễ hạn</span>
          <strong>{formatMoney(report?.totals.overdueLostInterest)}</strong>
        </div>
        <div>
          <span>Dư nợ bình quân</span>
          <strong>{formatMoney(report?.totals.averageDebt)}</strong>
        </div>
        <div>
          <span>Lãi suất áp dụng</span>
          <strong>{ratesUsedText}</strong>
        </div>
      </div>

      {report && report.toDate < query.toDate ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {`Số liệu tính đến ngày ${dateText(report.toDate)} — không tính những ngày chưa tới.`}
        </Typography.Text>
      ) : null}

      <Table<ReceivableInterestRow>
        className="sales-grid"
        rowKey={(row) => row.customer.id}
        size="small"
        bordered
        loading={reportQuery.isLoading || reportQuery.isFetching}
        columns={columns}
        dataSource={report?.items ?? []}
        scroll={{ x: 930 }}
        locale={{ emptyText: <Empty description="Không có khoản nợ nào trong kỳ." /> }}
        expandable={{
          expandedRowRender: (row) => (
            <Table<ReceivableInterestItem>
              className="sales-grid receivable-interest-items"
              rowKey="id"
              size="small"
              bordered
              pagination={false}
              columns={itemColumns}
              dataSource={row.items}
              scroll={{ x: 965 }}
            />
          ),
        }}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (total) => `${total} khách hàng`,
        }}
      />

      <DepositRateDrawer open={ratesOpen} canEdit={canEditRates} onClose={() => setRatesOpen(false)} />
    </div>
  );
}

/** Bảng lãi suất tiền gửi tham chiếu: mỗi mức áp dụng từ ngày hiệu lực tới trước mốc kế tiếp. */
const DepositRateDrawer: React.FC<{ open: boolean; canEdit: boolean; onClose: () => void }> = ({
  open,
  canEdit,
  onClose,
}) => {
  const ratesQuery = useDepositInterestRates();
  const saveRate = useSaveDepositInterestRate();
  const deleteRate = useDeleteDepositInterestRate();
  const [editingId, setEditingId] = useState<string>();
  const [form] = Form.useForm<{ effectiveFrom: Dayjs; annualRate: number; note?: string }>();

  const resetForm = () => {
    setEditingId(undefined);
    form.resetFields();
  };

  const submit = async () => {
    const values = await form.validateFields();
    await saveRate.mutateAsync({
      id: editingId,
      data: {
        effectiveFrom: values.effectiveFrom.format("YYYY-MM-DD"),
        annualRate: values.annualRate,
        note: values.note,
      },
    });
    resetForm();
  };

  const columns: ColumnsType<DepositInterestRate> = [
    {
      title: "Hiệu lực từ",
      dataIndex: "effectiveFrom",
      width: 120,
      render: (value: string) => dateText(value.slice(0, 10)),
    },
    {
      title: "Lãi suất/năm",
      dataIndex: "annualRate",
      width: 120,
      align: "right",
      render: (value: string) => <span className="sales-grid-num sales-grid-strong">{rateText(value)}</span>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (value) => (value ? <span className="sales-grid-clip">{value}</span> : EMPTY),
    },
    ...(canEdit
      ? [
          {
            title: "",
            key: "actions",
            width: 76,
            align: "center" as const,
            render: (_: unknown, row: DepositInterestRate) => (
              <Space size={2}>
                <Tooltip title="Sửa">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingId(row.id);
                      form.setFieldsValue({
                        effectiveFrom: dayjs(row.effectiveFrom.slice(0, 10)),
                        annualRate: Number(row.annualRate),
                        note: row.note ?? undefined,
                      });
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Xóa mức lãi suất này?"
                  description="Tiền lãi các kỳ dùng mức này sẽ được tính lại."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteRate.mutateAsync(row.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <Drawer
      title="Lãi suất tiền gửi tham chiếu"
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      width={560}
      destroyOnHidden
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Mỗi mức áp dụng từ ngày hiệu lực tới trước mốc kế tiếp. Ngân hàng đổi lãi thì thêm một
          dòng mới với ngày đổi — đừng sửa dòng cũ, để các kỳ trước vẫn tính theo lãi cũ.
        </Typography.Text>

        {canEdit ? (
          <Form form={form} layout="vertical" size="small" className="receivable-interest-rate-form">
            <Space align="start" wrap>
              <Form.Item
                name="effectiveFrom"
                label="Hiệu lực từ"
                rules={[{ required: true, message: "Chọn ngày" }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: 140 }} />
              </Form.Item>
              <Form.Item
                name="annualRate"
                label="Lãi suất (%/năm)"
                rules={[{ required: true, message: "Nhập lãi suất" }]}
              >
                <InputNumber min={0} max={100} step={0.1} precision={4} style={{ width: 130 }} placeholder="vd. 5,5" />
              </Form.Item>
              <Form.Item name="note" label="Ghi chú">
                <Input style={{ width: 200 }} placeholder="vd. VCB kỳ hạn 1 tháng" maxLength={500} />
              </Form.Item>
            </Space>
            <Space>
              <Button type="primary" size="small" loading={saveRate.isPending} onClick={submit}>
                {editingId ? "Lưu thay đổi" : "Thêm mức lãi suất"}
              </Button>
              {editingId ? (
                <Button size="small" onClick={resetForm}>
                  Hủy sửa
                </Button>
              ) : null}
            </Space>
          </Form>
        ) : (
          <Alert type="info" showIcon message="Bạn chỉ có quyền xem. Cần quyền quản lý tín dụng để thêm hoặc sửa lãi suất." />
        )}

        <Table<DepositInterestRate>
          className="sales-grid"
          rowKey="id"
          size="small"
          bordered
          loading={ratesQuery.isLoading}
          columns={columns}
          dataSource={ratesQuery.data ?? []}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có mức lãi suất nào." /> }}
        />
      </Space>
    </Drawer>
  );
};
