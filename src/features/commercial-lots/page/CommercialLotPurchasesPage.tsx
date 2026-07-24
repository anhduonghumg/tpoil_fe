import React, { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Progress,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useCommercialLotList } from "../hooks";
import type {
  CommercialLotLifecycle,
  CommercialLotPurchase,
} from "../types";
import {
  formatMoney,
  formatQty,
  LifecycleTag,
  LIFECYCLE_LABELS,
} from "../ui/labels";
import "../commercial-lots.css";

const ALL_TAB = "ALL";

export default function CommercialLotPurchasesPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [supplierId, setSupplierId] = useState<string>();
  const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [lifecycle, setLifecycle] = useState<
    CommercialLotLifecycle | undefined
  >();
  const [page, setPage] = useState(1);

  const query = useCommercialLotList({
    keyword: keyword.trim() || undefined,
    supplierCustomerId: supplierId,
    lifecycle,
    dateFrom: dates?.[0].format("YYYY-MM-DD"),
    dateTo: dates?.[1].format("YYYY-MM-DD"),
    page,
    limit: 20,
  });
  const items = query.data?.items ?? [];

  const columns = useMemo<ColumnsType<CommercialLotPurchase>>(
    () => [
      {
        title: "Số đơn",
        dataIndex: "orderNo",
        width: 150,
        fixed: "left",
        render: (value, row) => (
          <Button
            type="link"
            className="commercial-lot-order-link"
            onClick={() => navigate(`/commercial-purchases/lots/${row.id}`)}
          >
            {value}
          </Button>
        ),
      },
      {
        title: "Ngày đặt",
        dataIndex: "orderDate",
        width: 105,
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Nhà cung cấp",
        dataIndex: "supplier",
        width: 220,
        ellipsis: true,
        render: (supplier) =>
          supplier ? `${supplier.code} - ${supplier.name}` : "-",
      },
      {
        title: "Hợp đồng",
        dataIndex: "contract",
        width: 140,
        render: (contract) => contract?.code ?? "-",
      },
      {
        title: "Đã hóa đơn",
        dataIndex: ["quantities", "invoicedQty"],
        width: 130,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Đã rút",
        dataIndex: ["quantities", "withdrawnQty"],
        width: 125,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Còn phải rút",
        dataIndex: ["quantities", "remainingToWithdraw"],
        width: 130,
        align: "right",
        render: (value) => formatQty(value),
      },
      {
        title: "Tiến độ rút",
        key: "progress",
        width: 150,
        render: (_, row) => {
          const invoiced = row.quantities.invoicedQty;
          const percent = invoiced
            ? Math.min(
                Math.round((row.quantities.withdrawnQty / invoiced) * 100),
                100,
              )
            : 0;
          return (
            <div className="commercial-lot-progress">
              <div className="commercial-lot-progress-label">
                <span>{percent}%</span>
                <span>{formatQty(row.quantities.withdrawnQty)}</span>
              </div>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          );
        },
      },
      {
        title: "Công nợ còn lại",
        dataIndex: ["payment", "outstandingAmount"],
        width: 150,
        align: "right",
        render: (value) => `${formatMoney(value)} đ`,
      },
      {
        title: "Trạng thái",
        dataIndex: "lifecycle",
        width: 140,
        fixed: "right",
        render: (value: CommercialLotLifecycle) => (
          <LifecycleTag value={value} />
        ),
      },
    ],
    [navigate],
  );

  const tabItems = [
    { key: ALL_TAB, label: "Tất cả" },
    ...(
      [
        "PENDING_APPROVAL",
        "PENDING_INVOICE",
        "PENDING_PAYMENT",
        "READY_TO_WITHDRAW",
        "WITHDRAWING",
        "COMPLETED",
        "CANCELLED",
      ] as CommercialLotLifecycle[]
    ).map((key) => ({ key, label: LIFECYCLE_LABELS[key] })),
  ];

  return (
    <div className="commercial-lot-page">
      <div className="commercial-lot-header">
        <div>
          <Typography.Title level={3} className="commercial-lot-title">
            Mua thương mại lô
          </Typography.Title>
          <Typography.Text className="commercial-lot-subtitle">
            Theo dõi từ đơn mua, hóa đơn, công nợ đến từng lần rút lô
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/commercial-purchases/lots/create")}
        >
          Tạo đơn mua lô
        </Button>
      </div>

      <div className="commercial-lot-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Số đơn hoặc nhà cung cấp"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(1);
          }}
        />
        <PartySelect
          partyRole="SUPPLIER"
          placeholder="Nhà cung cấp"
          value={supplierId}
          onChange={(value) => {
            setSupplierId(value ?? undefined);
            setPage(1);
          }}
        />
        <DatePicker.RangePicker
          value={dates}
          format="DD/MM/YYYY"
          onChange={(value) => {
            setDates(value as [dayjs.Dayjs, dayjs.Dayjs] | null);
            setPage(1);
          }}
        />
        <Button
          icon={<ReloadOutlined />}
          loading={query.isFetching}
          onClick={() => query.refetch()}
          title="Tải lại"
        />
      </div>

      <Tabs
        className="commercial-lot-tabs"
        activeKey={lifecycle ?? ALL_TAB}
        items={tabItems}
        onChange={(key) => {
          setLifecycle(
            key === ALL_TAB ? undefined : (key as CommercialLotLifecycle),
          );
          setPage(1);
        }}
      />

      <Table<CommercialLotPurchase>
        className="commercial-lot-table"
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1500 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `${total} đơn mua lô`,
          onChange: setPage,
        }}
        onRow={(row) => ({
          onDoubleClick: () =>
            navigate(`/commercial-purchases/lots/${row.id}`),
        })}
      />
    </div>
  );
}
