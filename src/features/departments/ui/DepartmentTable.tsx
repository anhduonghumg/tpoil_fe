import { Table, Tag } from "antd";
import { ColumnsType } from "antd/es/table";
import type { Department } from "../types";
import ActionButtons from "../../../shared/ui/ActionButtons";

export default function DepartmentTable({
  data,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
}: {
  data: Department[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number, s: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cols: ColumnsType<Department> = [
    {
      title: "Mã phòng",
      dataIndex: "code",
      ellipsis: true,
      width: 100,
      align: "center",
    },
    { title: "Tên phòng", dataIndex: "name", ellipsis: true, align: "center" },
    {
      title: "Loại phòng",
      dataIndex: "type",
      width: 100,
      align: "center",
      render: (t) => (
        <Tag
          color={
            (
              {
                board: "magenta",
                office: "geekblue",
                group: "cyan",
                branch: "green",
              } as Record<any, string>
            )[t] || "default"
          }
        >
          {t}
        </Tag>
      ),
    },
    {
      title: "Địa điểm",
      dataIndex: "siteName",
      ellipsis: true,
      width: 140,
      align: "center",
    },
    {
      title: "Phòng quản lý",
      dataIndex: "parentName",
      ellipsis: true,
      width: 180,
      align: "center",
    },
    {
      title: "Cập nhập cuối cùng",
      dataIndex: "updatedAt",
      width: 160,
      align: "center",
      render: (d) => new Date(d).toLocaleString(),
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      align: "center",
      width: 100,
      render: (_, record) => (
        <ActionButtons
          onEdit={() => onEdit(record.id)}
          onDelete={() => onDelete(record.id)}
          confirmDelete
          size="small"
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="middle"
      loading={loading}
      columns={cols}
      dataSource={data}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [5, 10, 20, 50, 100],
        onChange: onPageChange,
      }}
      scroll={{ x: 200, y: 340 }}
    />
  );
}
