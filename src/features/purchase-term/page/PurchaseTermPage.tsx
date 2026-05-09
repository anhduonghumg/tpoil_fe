import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";

import { PartySelect } from "../../../shared/ui/PartySelect";

import type {
  PaymentMode,
  PurchaseOrderStatus,
  TermNextAction,
  TermPurchaseOrderListItem,
  TermPurchaseOrderListQuery,
} from "../types";
import { useTermPurchaseOrderList } from "../hooks";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type FilterValues = {
  keyword?: string;
  status?: PurchaseOrderStatus;
  paymentMode?: PaymentMode;
  supplierCustomerId?: string | null;
  dateRange?: [Dayjs, Dayjs] | null;
};

function money(v?: number | null) {
  if (v === null || v === undefined) return "--";
  return new Intl.NumberFormat("vi-VN").format(Math.round(Number(v)));
}

function qty(v?: number | null) {
  if (v === null || v === undefined) return "--";
  return new Intl.NumberFormat("vi-VN").format(Number(v));
}

function dateText(v?: string | null) {
  return v ? dayjs(v).format("DD/MM/YYYY") : "--";
}

function statusTag(status: PurchaseOrderStatus) {
  switch (status) {
    case "DRAFT":
      return <Tag>Nháp</Tag>;
    case "APPROVED":
      return <Tag color="blue">Đã duyệt</Tag>;
    case "IN_PROGRESS":
      return <Tag color="gold">Đang xử lý</Tag>;
    case "COMPLETED":
      return <Tag color="green">Hoàn tất</Tag>;
    case "CANCELLED":
      return <Tag color="red">Đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
}

function paymentModeTag(mode: PaymentMode) {
  return mode === "PREPAID" ? (
    <Tag color="purple">Trả trước</Tag>
  ) : (
    <Tag color="cyan">Trả sau</Tag>
  );
}

function nextActionTag(action: TermNextAction) {
  const map: Record<TermNextAction, { text: string; color?: string }> = {
    APPROVE_ORDER: { text: "Cần duyệt", color: "orange" },
    CREATE_RECEIPT: { text: "Nhận hàng", color: "blue" },
    CALCULATE_ESTIMATE: { text: "Tính giá tạm", color: "gold" },
    CALCULATE_BILL_NORMALIZE: { text: "Bảng xuất HĐ", color: "purple" },
    CALCULATE_FINAL: { text: "Chốt giá", color: "green" },
    COMPLETE_ORDER: { text: "Hoàn tất", color: "green" },
    VIEW_ONLY: { text: "Xem", color: "default" },
  };

  const item = map[action] ?? { text: action };
  return <Tag color={item.color}>{item.text}</Tag>;
}

export default function TermPurchaseOrdersPage() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState<FilterValues>({});
  const [filter, setFilter] = useState<FilterValues>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const query = useMemo<TermPurchaseOrderListQuery>(() => {
    return {
      keyword: filter.keyword?.trim() || undefined,
      status: filter.status,
      paymentMode: filter.paymentMode,
      supplierCustomerId: filter.supplierCustomerId || undefined,
      fromDate: filter.dateRange?.[0]?.format("YYYY-MM-DD"),
      toDate: filter.dateRange?.[1]?.format("YYYY-MM-DD"),
      page,
      pageSize,
    };
  }, [filter, page, pageSize]);

  const listQuery = useTermPurchaseOrderList(query);

  const data = listQuery.data;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const search = () => {
    setPage(1);
    setFilter(draft);
  };

  const reset = () => {
    setDraft({});
    setFilter({});
    setPage(1);
  };

  const columns: ColumnsType<TermPurchaseOrderListItem> = [
    {
      title: "Mã đơn",
      dataIndex: "orderNo",
      width: 150,
      fixed: "left",
      render: (value, record) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontWeight: 800 }}
          onClick={() => navigate(`/purchase-terms/${record.id}`)}
        >
          {value}
        </Button>
      ),
    },
    {
      title: "Ngày đơn",
      dataIndex: "orderDate",
      width: 110,
      render: dateText,
    },
    {
      title: "NCC",
      dataIndex: "supplierName",
      width: 180,
      ellipsis: true,
      render: (v) => v || "--",
    },
    {
      title: "Sản phẩm",
      dataIndex: "productSummary",
      width: 220,
      ellipsis: true,
      render: (v) => v || "--",
    },
    {
      title: "Tổng lượng",
      dataIndex: "totalQty",
      width: 120,
      align: "right",
      render: (v) => `${qty(v)} L`,
    },
    {
      title: "Tạm tính",
      dataIndex: "totalAmount",
      width: 140,
      align: "right",
      render: money,
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentMode",
      width: 120,
      render: paymentModeTag,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: statusTag,
    },
    {
      title: "Bước tiếp theo",
      dataIndex: "nextAction",
      width: 150,
      render: nextActionTag,
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      width: 130,
      render: dateText,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: 12 }}>
      <div style={{ maxWidth: 1580, margin: "0 auto" }}>
        <Card
          size="small"
          style={{
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            marginBottom: 10,
          }}
          styles={{ body: { padding: 12 } }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <Space size={6} wrap>
                <Tag color="blue">TERM</Tag>
                <Tag color="green">1 bộ BILL chung</Tag>
                <Tag color="gold">Nhiều dòng hàng</Tag>
              </Space>

              <Title level={4} style={{ margin: "6px 0 0" }}>
                Đơn mua TERM
              </Title>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Danh sách đơn TERM. Không phân lô/lẻ, mỗi đơn có thể có nhiều
                dòng hàng và một bộ bảng giá chung.
              </Text>
            </div>

            <Button
              type="primary"
              onClick={() => navigate("/purchase-terms/create")}
            >
              Thêm đơn TERM
            </Button>
          </div>
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            marginBottom: 10,
          }}
          styles={{ body: { padding: 12 } }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 1.4fr) minmax(220px, 1.3fr) 160px 160px minmax(260px, 1.4fr) 170px",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                Từ khóa
              </div>
              <Input
                allowClear
                placeholder="Mã đơn / NCC / sản phẩm"
                value={draft.keyword}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, keyword: e.target.value }))
                }
                onPressEnter={search}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                Nhà cung cấp
              </div>
              <PartySelect
                partyRole="SUPPLIER"
                placeholder="Tất cả NCC"
                value={draft.supplierCustomerId ?? null}
                onChange={(value) =>
                  setDraft((p) => ({
                    ...p,
                    supplierCustomerId: value,
                  }))
                }
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                Trạng thái
              </div>
              <Select
                allowClear
                placeholder="Tất cả"
                style={{ width: "100%" }}
                value={draft.status}
                onChange={(value) => setDraft((p) => ({ ...p, status: value }))}
                options={[
                  { value: "DRAFT", label: "Nháp" },
                  { value: "APPROVED", label: "Đã duyệt" },
                  { value: "IN_PROGRESS", label: "Đang xử lý" },
                  { value: "COMPLETED", label: "Hoàn tất" },
                  { value: "CANCELLED", label: "Đã hủy" },
                ]}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                Thanh toán
              </div>
              <Select
                allowClear
                placeholder="Tất cả"
                style={{ width: "100%" }}
                value={draft.paymentMode}
                onChange={(value) =>
                  setDraft((p) => ({ ...p, paymentMode: value }))
                }
                options={[
                  { value: "PREPAID", label: "Trả trước" },
                  { value: "POSTPAID", label: "Trả sau" },
                ]}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                Khoảng ngày
              </div>
              <RangePicker
                style={{ width: "100%" }}
                value={draft.dateRange ?? null}
                format="DD/MM/YYYY"
                onChange={(value) =>
                  setDraft((p) => ({
                    ...p,
                    dateRange: value as [Dayjs, Dayjs] | null,
                  }))
                }
              />
            </div>

            <Space>
              <Button type="primary" onClick={search}>
                Tìm kiếm
              </Button>
              <Button onClick={reset}>Xóa lọc</Button>
            </Space>
          </div>
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 16,
            border: "1px solid #e5e7eb",
          }}
          styles={{ body: { padding: 12 } }}
        >
          <Table<TermPurchaseOrderListItem>
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isLoading}
            scroll={{ x: 1320 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `Tổng ${t} đơn`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </Card>
      </div>
    </div>
  );
}
