import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloudDownloadOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useDeleteVcbRate,
  useFetchVcbRateFromVcb,
  useUpsertVcbRate,
  useVcbRates,
} from "../hooks";
import type { VcbFxRate } from "../types";
import { notify } from "../../../shared/lib/notification";

const { Text } = Typography;

type RowItem = {
  key: string;
  rateDate: string;
  day: number;
  weekday: string;
  isSaturday: boolean;
  isSunday: boolean;
  rate: VcbFxRate | null;
};

type EditState = {
  open: boolean;
  rateDate?: string;
  rate?: VcbFxRate;
};

function dateKey(date: Dayjs) {
  return date.format("YYYY-MM-DD");
}

function normDate(value: string) {
  return dayjs(value).format("YYYY-MM-DD");
}

function weekdayLabel(date: Dayjs) {
  const d = date.day();
  if (d === 0) return "CN";
  if (d === 6) return "T7";
  return `T${d + 1}`;
}

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function formatRate(v?: number | string | null) {
  if (!v && v !== 0) return "";

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(v));
}

function buildRows(month: Dayjs, rates: VcbFxRate[]): RowItem[] {
  const map = new Map<string, VcbFxRate>();

  rates.forEach((r) => {
    map.set(normDate(r.rateDate), r);
  });

  return Array.from({ length: month.daysInMonth() }, (_, i) => {
    const d = month.date(i + 1);
    const key = dateKey(d);

    return {
      key,
      rateDate: key,
      day: i + 1,
      weekday: weekdayLabel(d),
      isSaturday: d.day() === 6,
      isSunday: d.day() === 0,
      rate: map.get(key) ?? null,
    };
  });
}

function RateCell({
  value,
  onClick,
}: {
  value?: number | string | null;
  onClick: () => void;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div
      onClick={onClick}
      className={`master-rate-cell ${hasValue ? "has-value" : "empty"}`}
    >
      {hasValue ? formatRate(value) : "+"}
    </div>
  );
}

export default function VcbRatesPage() {
  const [month, setMonth] = useState(dayjs().startOf("month"));
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [edit, setEdit] = useState<EditState>({ open: false });
  const [form] = Form.useForm();

  const query = useMemo(
    () => ({
      month: month.format("YYYY-MM"),
      bankCode: "VCB",
      currencyCode,
    }),
    [currencyCode, month],
  );

  const ratesQuery = useVcbRates(query);
  const upsert = useUpsertVcbRate();
  const fetchFromVcb = useFetchVcbRateFromVcb();
  const remove = useDeleteVcbRate();

  const rates = ratesQuery.data ?? [];
  const rows = useMemo(() => buildRows(month, rates), [month, rates]);

  const openEditor = (rateDate: string, rate?: VcbFxRate | null) => {
    setEdit({
      open: true,
      rateDate,
      rate: rate ?? undefined,
    });

    form.setFieldsValue({
      cashBuyRate: toNumber(rate?.cashBuyRate),
      transferBuyRate: toNumber(rate?.transferBuyRate),
      sellRate: toNumber(rate?.sellRate),
      note: rate?.note,
    });
  };

  const close = () => {
    setEdit({ open: false });
    form.resetFields();
  };

  const save = async () => {
    const v = await form.validateFields();

    await upsert.mutateAsync({
      rateDate: edit.rateDate!,
      bankCode: "VCB",
      currencyCode,
      cashBuyRate: toNumber(v.cashBuyRate),
      transferBuyRate: toNumber(v.transferBuyRate),
      sellRate: Number(v.sellRate),
      note: v.note,
    });

    notify.success("Đã lưu tỷ giá VCB");
    close();
  };

  const del = async () => {
    if (!edit.rate?.id) return;

    await remove.mutateAsync(edit.rate.id);

    notify.success("Đã xóa tỷ giá VCB");
    close();
  };

  const fetchTodayFromVcb = async () => {
    const saved = await fetchFromVcb.mutateAsync({
      rateDate: dayjs().format("YYYY-MM-DD"),
      currencyCode,
    });

    if (saved?.rateDate) {
      setMonth(dayjs(saved.rateDate).startOf("month"));
    }

    notify.success("Đã lấy tỷ giá từ VCB");
  };

  const columns: ColumnsType<RowItem> = [
    {
      title: "Thứ",
      dataIndex: "weekday",
      width: 72,
      fixed: "left",
      align: "center",
      render: (value, row) => (
        <Tag
          color={row.isSunday ? "red" : row.isSaturday ? "gold" : "default"}
          style={{
            width: 48,
            textAlign: "center",
            margin: 0,
            fontWeight: 800,
          }}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "day",
      width: 76,
      fixed: "left",
      align: "center",
      render: (value) => (
        <span style={{ fontWeight: 900, color: "#0f172a" }}>
          {String(value).padStart(2, "0")}
        </span>
      ),
    },
    {
      title: "Mua tiền mặt",
      dataIndex: "rate",
      width: 150,
      align: "center",
      render: (rate: VcbFxRate | null, row) => (
        <RateCell
          value={rate?.cashBuyRate}
          onClick={() => openEditor(row.rateDate, rate)}
        />
      ),
    },
    {
      title: "Mua chuyển khoản",
      dataIndex: "rate",
      width: 170,
      align: "center",
      render: (rate: VcbFxRate | null, row) => (
        <RateCell
          value={rate?.transferBuyRate}
          onClick={() => openEditor(row.rateDate, rate)}
        />
      ),
    },
    {
      title: "Bán ra",
      dataIndex: "rate",
      width: 150,
      align: "center",
      render: (rate: VcbFxRate | null, row) => (
        <RateCell
          value={rate?.sellRate}
          onClick={() => openEditor(row.rateDate, rate)}
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "rate",
      ellipsis: true,
      render: (rate: VcbFxRate | null) => rate?.note || "-",
    },
  ];

  const filledCount = rates.filter((r) =>
    normDate(r.rateDate).startsWith(month.format("YYYY-MM")),
  ).length;
  const missingCount = Math.max(0, month.daysInMonth() - filledCount);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: 12 }}>
      <style>
        {`
          .master-rate-card {
            border-radius: 16px !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: 0 8px 24px rgba(15,23,42,.04) !important;
          }

          .master-rate-toolbar {
            display: grid;
            grid-template-columns: 220px 180px 120px 120px 150px;
            gap: 10px;
            align-items: end;
          }

          .master-rate-table .ant-table {
            border-radius: 14px;
            overflow: hidden;
          }

          .master-rate-table .ant-table-thead > tr > th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 900 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 10px 8px !important;
          }

          .master-rate-table .ant-table-tbody > tr > td {
            padding: 6px 8px !important;
            border-bottom: 1px solid #eef2f7 !important;
            background: #fff;
          }

          .master-rate-table .ant-table-tbody > tr:hover > td {
            background: #f8fafc !important;
          }

          .master-rate-cell {
            height: 34px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 13px;
            transition: all .12s ease;
            user-select: none;
          }

          .master-rate-cell.has-value {
            font-weight: 900;
            color: #075985;
            background: #e0f2fe;
            border: 1px solid #7dd3fc;
          }

          .master-rate-cell.empty {
            font-weight: 700;
            color: #94a3b8;
            background: #f8fafc;
            border: 1px solid #eef2f7;
          }

          .master-rate-cell:hover {
            border-color: #1677ff !important;
            background: #eff6ff !important;
            color: #1677ff !important;
            transform: translateY(-1px);
          }

          @media (max-width: 900px) {
            .master-rate-toolbar {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Card
          size="small"
          className="master-rate-card"
          style={{ marginBottom: 10 }}
          styles={{ body: { padding: 12 } }}
        >
          <div className="master-rate-toolbar">
            <div>
              <Text
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 4,
                  color: "#64748b",
                }}
              >
                Tháng
              </Text>

              <DatePicker
                picker="month"
                value={month}
                onChange={(v) => v && setMonth(v.startOf("month"))}
                style={{ width: "100%" }}
                format="YYYY-MM"
                allowClear={false}
              />
            </div>

            <div>
              <Text
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 4,
                  color: "#64748b",
                }}
              >
                Ngoại tệ
              </Text>

              <Select
                value={currencyCode}
                onChange={setCurrencyCode}
                options={[
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                ]}
                style={{ width: "100%" }}
              />
            </div>

            <div
              style={{
                background: "#e0f2fe",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b" }}>Đã nhập</div>
              <b>{filledCount}</b>
            </div>

            <div
              style={{
                background: "#fff7ed",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b" }}>Còn trống</div>
              <b>{missingCount}</b>
            </div>

            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              loading={fetchFromVcb.isPending}
              onClick={fetchTodayFromVcb}
            >
              Lấy từ VCB
            </Button>
          </div>
        </Card>

        <Card
          size="small"
          className="master-rate-card"
          styles={{ body: { padding: 4 } }}
        >
          <div className="master-rate-table">
            <Table
              size="small"
              bordered={false}
              columns={columns}
              dataSource={rows}
              pagination={false}
              loading={ratesQuery.isLoading}
              scroll={{
                x: 880,
                y: "calc(100vh - 255px)",
              }}
            />
          </div>
        </Card>

        <Modal
          open={edit.open}
          title="Cập nhật tỷ giá VCB"
          onCancel={close}
          width={460}
          footer={
            <Space>
              {edit.rate && (
                <Button danger loading={remove.isPending} onClick={del}>
                  Xóa
                </Button>
              )}

              <Button onClick={close}>Hủy</Button>

              <Button type="primary" loading={upsert.isPending} onClick={save}>
                Lưu
              </Button>
            </Space>
          }
        >
          <Space size={6} wrap style={{ marginBottom: 12 }}>
            <Tag color="blue">VCB</Tag>
            <Tag>{currencyCode}</Tag>
            <Tag color="green">
              {edit.rateDate ? dayjs(edit.rateDate).format("DD/MM/YYYY") : ""}
            </Tag>
          </Space>

          <Form form={form} layout="vertical" size="small">
            <Form.Item name="cashBuyRate" label="Mua tiền mặt">
              <InputNumber
                min={0}
                precision={6}
                style={{ width: "100%" }}
                addonAfter="VND"
              />
            </Form.Item>

            <Form.Item name="transferBuyRate" label="Mua chuyển khoản">
              <InputNumber
                min={0}
                precision={6}
                style={{ width: "100%" }}
                addonAfter="VND"
              />
            </Form.Item>

            <Form.Item
              name="sellRate"
              label="Bán ra"
              rules={[{ required: true, message: "Nhập tỷ giá bán" }]}
            >
              <InputNumber
                min={0}
                precision={6}
                style={{ width: "100%" }}
                addonAfter="VND"
              />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={3} placeholder="Ghi chú nếu có" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
