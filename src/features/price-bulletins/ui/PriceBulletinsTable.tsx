import React, { useMemo } from "react";
import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PriceBulletinListItem, PriceBulletinStatus } from "../types";
import {
  ActionKey,
  CommonActionMenu,
} from "../../../shared/ui/CommonActionMenu";
import { CheckOutlined, EditOutlined, StopOutlined } from "@ant-design/icons";

const statusTag = (s: PriceBulletinStatus) => {
  if (s === "PUBLISHED") return <Tag color="green">Phát hành</Tag>;
  if (s === "VOID") return <Tag color="red">Hủy bỏ</Tag>;
  return <Tag>Nháp</Tag>;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const fmtMoney = (n?: number | null) => {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("vi-VN");
};

type FlatRow = {
  key: string;
  bulletinId: string;
  status: PriceBulletinStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  productName: string;
  regionName: string;
  price: number;
  _rowSpan: number;
  _isFirst: boolean;
  _raw: PriceBulletinListItem;
};

export const PriceBulletinsTable: React.FC<{
  loading?: boolean;
  items: PriceBulletinListItem[];
  onAction: (id: string, action: ActionKey) => void;
}> = ({ loading, items, onAction }) => {
  const data = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];

    for (const b of items) {
      const lines = (b as any).items ?? [];
      const count = Math.max(1, lines.length);

      if (!lines.length) {
        rows.push({
          key: `${b.id}__empty`,
          bulletinId: b.id,
          status: b.status,
          effectiveFrom: b.effectiveFrom,
          effectiveTo: b.effectiveTo ?? null,
          productName: "-",
          regionName: "-",
          price: null as any,
          _rowSpan: 1,
          _isFirst: true,
          _raw: b,
        });
        continue;
      }

      lines.forEach((it: any, idx: number) => {
        rows.push({
          key: `${b.id}__${it.id ?? idx}`,
          bulletinId: b.id,
          status: b.status,
          effectiveFrom: b.effectiveFrom,
          effectiveTo: b.effectiveTo ?? null,
          productName: it.product?.name ?? "-",
          regionName: it.region?.name ?? "-",
          price: it.price,
          _rowSpan: idx === 0 ? count : 0,
          _isFirst: idx === 0,
          _raw: b,
        });
      });
    }

    return rows;
  }, [items]);

  const cols: ColumnsType<FlatRow> = [
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center",
      width: 120,
      render: (v) => statusTag(v),
      onCell: (r) => ({ rowSpan: r._rowSpan }),
    },
    {
      title: "Áp dụng từ",
      dataIndex: "effectiveFrom",
      align: "center",
      width: 140,
      render: (v) => fmtDate(v),
      onCell: (r) => ({ rowSpan: r._rowSpan }),
    },
    {
      title: "Đến",
      dataIndex: "effectiveTo",
      align: "center",
      width: 140,
      render: (v) => fmtDate(v),
      onCell: (r) => ({ rowSpan: r._rowSpan }),
    },
    {
      title: "Giá sản phẩm",
      align: "center",
      children: [
        {
          title: "Sản phẩm",
          align: "left",
          dataIndex: "productName",
          width: 260,
          render: (v) => <span>{v}</span>,
        },
        {
          title: "Vùng",
          align: "left",
          dataIndex: "regionName",
          width: 140,
        },
        {
          title: "Giá",
          dataIndex: "price",
          width: 140,
          align: "center",
          render: (v) => <span>{fmtMoney(v)}</span>,
        },
      ],
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, row) => (
        <CommonActionMenu
          items={[
            {
              key: "edit",
              label: "Sửa thông tin",
              icon: <EditOutlined />,
              disabled: row.status !== "DRAFT",
              // need: PERMS.PRICE_BULLETINS_UPDATE,
            },
            // {
            //   key: "draft",
            //   label: "Nháp",
            //   icon: <CopyOutlined />,
            //   disabled: row.status !== "DRAFT",
            //   // need: PERMS.PRICE_BULLETINS_DRAFT,
            // },
            {
              key: "public",
              label: "Phát hành",
              icon: <CheckOutlined />,
              disabled: row.status === "VOID",
              // need: PERMS.PRICE_BULLETINS_PUBLISHED,
            },
            {
              key: "void",
              label: "hủy bỏ",
              icon: <StopOutlined />,
              disabled: row.status === "VOID",
              // need: PERMS.USERS_ASSIGN_ROLES,
            },
            // {
            //   key: "delete",
            //   label: "Xóa",
            //   icon: <DeleteOutlined />,
            //   danger: true,
            //   need: PERMS.USERS_DELETE,
            // },
          ]}
          onAction={(act) => onAction(row?.bulletinId, act)}
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="key"
      loading={loading}
      columns={cols}
      dataSource={data}
      pagination={false}
      size="small"
      scroll={{ x: 1100, y: 580}}
    />
  );
};
