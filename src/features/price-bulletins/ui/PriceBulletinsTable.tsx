import React, { useMemo } from "react";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PriceBulletinListItem, PriceBulletinStatus } from "../types";
import {
  ActionKey,
  CommonActionMenu,
} from "../../../shared/ui/CommonActionMenu";
import {
  CheckOutlined,
  CopyOutlined,
  EditOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  StopOutlined,
} from "@ant-design/icons";

const statusTag = (s: PriceBulletinStatus) => {
  if (s === "PUBLISHED") return <Tag color="green">Đã phát hành</Tag>;
  if (s === "VOID") return <Tag color="red">Hủy bỏ</Tag>;
  return <Tag color="gold">Nháp</Tag>;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const fmtMoney = (n?: number | null) => {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("vi-VN");
};

/** Mỗi dòng là một mức giá (sản phẩm × vùng) của một bảng giá. */
type PriceRow = {
  key: string;
  bulletinId: string;
  status: PriceBulletinStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  productName: string;
  regionName: string;
  price: number | null;
};

export const PriceBulletinsTable: React.FC<{
  loading?: boolean;
  items: PriceBulletinListItem[];
  onAction: (id: string, action: ActionKey) => void;
}> = ({ loading, items, onAction }) => {
  // Dàn phẳng thành một dòng một mức giá — cùng nhịp với các lưới khác của bán hàng,
  // không gộp ô nên không còn mảng trắng to giữa bảng.
  const data = useMemo<PriceRow[]>(() => {
    const rows: PriceRow[] = [];

    for (const b of items) {
      const lines = (b as any).items ?? [];
      const base = {
        bulletinId: b.id,
        status: b.status,
        effectiveFrom: b.effectiveFrom,
        effectiveTo: b.effectiveTo ?? null,
      };

      if (!lines.length) {
        rows.push({
          ...base,
          key: `${b.id}__empty`,
          productName: "—",
          regionName: "—",
          price: null,
        });
        continue;
      }

      lines.forEach((it: any, idx: number) => {
        rows.push({
          ...base,
          key: `${b.id}__${it.id ?? idx}`,
          productName: it.product?.name ?? "—",
          regionName: it.region?.name ?? "—",
          price: it.price == null ? null : Number(it.price),
        });
      });
    }

    return rows;
  }, [items]);

  const cols: ColumnsType<PriceRow> = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      width: 240,
      fixed: "left",
      ellipsis: true,
    },
    { title: "Vùng", dataIndex: "regionName", width: 100 },
    {
      title: "Giá",
      dataIndex: "price",
      width: 120,
      align: "right",
      render: (v) => <strong>{fmtMoney(v)}</strong>,
    },
    {
      title: "Áp dụng từ",
      dataIndex: "effectiveFrom",
      width: 110,
      align: "center",
      render: (v) => fmtDate(v),
    },
    {
      title: "Đến",
      dataIndex: "effectiveTo",
      width: 110,
      align: "center",
      render: (v) => fmtDate(v),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      align: "center",
      render: (v) => statusTag(v),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      align: "center",
      fixed: "right",
      render: (_, row) => (
        <CommonActionMenu
          items={[
            {
              key: "edit",
              label: "Sửa thông tin",
              icon: <EditOutlined />,
              disabled: row.status !== "DRAFT",
            },
            {
              key: "public",
              label: "Phát hành",
              icon: <CheckOutlined />,
              disabled: row.status !== "DRAFT",
            },
            {
              key: "void",
              label: "Hủy bỏ",
              icon: <StopOutlined />,
              disabled: row.status === "VOID",
            },
            // Hai mẫu chỉ dựng cho bảng đã phát hành: bản nháp còn sửa được, in ra rồi
            // gửi khách mà giá còn đổi thì rất phiền.
            //
            // Sao chép đứng trước tải về: việc thật là dán thẳng ảnh vào Zalo gửi đại lý,
            // tải file rồi mở thư mục kéo vào chỉ là đường vòng.
            {
              key: "copyNotice",
              label: "Sao chép ảnh thông báo",
              icon: <CopyOutlined />,
              disabled: row.status !== "PUBLISHED",
            },
            {
              key: "printNotice",
              label: "Tải ảnh thông báo (PNG)",
              icon: <FileImageOutlined />,
              disabled: row.status !== "PUBLISHED",
            },
            {
              key: "printDecision",
              label: "Tải quyết định (PDF)",
              icon: <FilePdfOutlined />,
              disabled: row.status !== "PUBLISHED",
            },
          ]}
          onAction={(act) => onAction(row.bulletinId, act)}
        />
      ),
    },
  ];

  return (
    <Table<PriceRow>
      className="sales-grid"
      rowKey="key"
      size="small"
      bordered
      loading={loading}
      columns={cols}
      dataSource={data}
      // Không đặt scroll.y: để cả trang chỉ có một thanh cuộn dọc duy nhất.
      scroll={{ x: 900 }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: [20, 50, 100],
        showTotal: (total) => `${total} mức giá`,
      }}
    />
  );
};
