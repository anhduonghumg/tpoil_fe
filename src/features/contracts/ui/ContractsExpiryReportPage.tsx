// features/contracts/ui/ContractsExpiryReportPage.tsx
import { useMemo, useState } from "react";
import {
  Card,
  DatePicker,
  Segmented,
  Space,
  Table,
  Typography,
  Button,
  Modal,
  Input,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { ContractExpiryListItem, ContractExpiryReportQuery } from "../types";
import { useContractsExpiryReport } from "../hooks";
import { notify } from "../../../shared/lib/notification";
import { excel } from "../../../shared/api/excel";

const { Title, Text } = Typography;

export const ContractsExpiryReportPage = () => {
  const [referenceDate, setReferenceDate] = useState<Dayjs | null>(dayjs());
  const [status, setStatus] = useState<"all" | "expiring" | "expired">("all");
  const [exporting, setExporting] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailList, setEmailList] = useState("duongna@tpoil.vn");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters: ContractExpiryReportQuery = useMemo(
    () => ({
      referenceDate: referenceDate?.format("YYYY-MM-DD"),
      status,
      page,
      pageSize,
    }),
    [referenceDate, status, page, pageSize]
  );

  const { data, isLoading } = useContractsExpiryReport(filters);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns: ColumnsType<ContractExpiryListItem> = [
    {
      title: "Mã HĐ",
      dataIndex: "contractCode",
      key: "contractCode",
      width: 130,
      fixed: "left",
    },
    {
      title: "Tên hợp đồng",
      dataIndex: "contractName",
      key: "contractName",
      width: 220,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 220,
    },
    {
      title: "Loại HĐ",
      dataIndex: "contractTypeName",
      key: "contractTypeName",
      width: 160,
    },
    {
      title: "Ngày hiệu lực",
      dataIndex: "startDate",
      key: "startDate",
      width: 130,
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Ngày hết hạn",
      dataIndex: "endDate",
      key: "endDate",
      width: 130,
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Trạng thái hạn",
      dataIndex: "derivedStatus",
      key: "derivedStatus",
      width: 150,
      render: (value, record) => {
        if (value === "expiring") {
          return (
            <Text type="warning">
              Sắp hết hạn
              {record.daysToEnd != null
                ? ` (${record.daysToEnd} ngày nữa)`
                : ""}
            </Text>
          );
        }
        return (
          <Text type="danger">
            Đã quá hạn
            {record.daysSinceEnd != null
              ? ` (${record.daysSinceEnd} ngày)`
              : ""}
          </Text>
        );
      },
    },
    {
      title: "Sales phụ trách",
      dataIndex: "salesOwnerName",
      key: "salesOwnerName",
      width: 180,
    },
    {
      title: "Kế toán phụ trách",
      dataIndex: "accountingOwnerName",
      key: "accountingOwnerName",
      width: 180,
    },
  ];

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      await excel({
        url: "/api/contracts/expiry-report/export",
        baseFileName: "Bao_cao_hop_dong_het_han",
        query: {
          referenceDate: filters.referenceDate,
          status: filters.status === "all" ? undefined : filters.status,
        },
      });
    } catch (err) {
      // console.error(err);
      notify.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = async () => {
    const to = emailList
      .split(/[,;\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (!to.length) {
      notify.warning("Vui lòng nhập ít nhất một email.");
      return;
    }

    try {
      setSendingEmail(true);

      const resp = await fetch("/api/contracts/expiry-report/resend-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          referenceDate: filters.referenceDate,
          status: filters.status,
          to,
        }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      notify.success("Đã gửi email báo cáo.");
      setEmailModalOpen(false);
    } catch (err) {
      // console.error(err);
      notify.error("Gửi email thất bại.");
    } finally {
      setSendingEmail(false);
    }
  };

  const summaryText = useMemo(() => {
    if (!data) return "";
    return `Ngày ${dayjs(data?.referenceDate).format("DD/MM/YYYY")}: Có ${
      data?.expiringCount
    } hợp đồng sắp hết hạn, ${data?.expiredCount} hợp đồng đã quá hạn.`;
  }, [data]);

  return (
    <>
      <Space
        align="center"
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Title level={5} style={{ margin: 0 }}>
          Báo cáo hợp đồng sắp/đã hết hạn
        </Title>

        <Space>
          <DatePicker
            size="small"
            allowClear={false}
            value={referenceDate}
            onChange={(d) => {
              setReferenceDate(d ?? dayjs());
              setPage(1);
            }}
            format="DD/MM/YYYY"
          />
          <Segmented
            size="small"
            value={status}
            onChange={(val) => {
              setStatus(val as any);
              setPage(1);
            }}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Sắp hết hạn", value: "expiring" },
              { label: "Đã quá hạn", value: "expired" },
            ]}
          />
          <Button
            size="small"
            type="default"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            Xuất Excel
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => setEmailModalOpen(true)}
          >
            Gửi email
          </Button>
        </Space>
      </Space>

      {summaryText && <Text type="secondary">{summaryText}</Text>}
      <Table<ContractExpiryListItem>
        rowKey="contractId"
        loading={isLoading}
        columns={columns}
        dataSource={items}
        size="small"
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
      />
      <Modal
        title="Gửi lại email báo cáo hợp đồng hết hạn"
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        onOk={handleSendEmail}
        confirmLoading={sendingEmail}
      >
        <Typography.Paragraph>
          Nhập danh sách email người nhận (ngăn cách bằng dấu phẩy, dấu chấm
          phẩy hoặc xuống dòng):
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={emailList}
          onChange={(e) => setEmailList(e.target.value)}
        />
      </Modal>
    </>
  );
};
