import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RoleSummary } from "../types";
import ActionButtons from "../../../../shared/ui/ActionButtons";
import { KeyOutlined } from "@ant-design/icons";

const { Text } = Typography;

export function RoleTable(props: {
  loading: boolean;
  data: RoleSummary[];
  total: number;
  page: number;
  pageSize: number;
  onChangePage: (page: number, pageSize: number) => void;
  onEdit: (role: RoleSummary) => void;
  onDelete?: (role: RoleSummary) => void;
  onOpenPermissions?: (role: RoleSummary) => void;
}) {
  const {
    loading,
    data,
    total,
    page,
    pageSize,
    onChangePage,
    onEdit,
    onDelete,
    onOpenPermissions,
  } = props;

  const columns: ColumnsType<RoleSummary> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 200,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: "Tên vai trò",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Mô tả",
      dataIndex: "desc",
      key: "desc",
      ellipsis: true,
      render: (v?: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "User",
      dataIndex: "userCount",
      key: "userCount",
      width: 90,
      align: "center",
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Hành động",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_: any, row) => (
        <Space>
          {onOpenPermissions && (
            <Tooltip title="Quyền">
              <Button
                type="text"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => onOpenPermissions(row)}
              ></Button>
            </Tooltip>
          )}
          <ActionButtons
            onEdit={() => onEdit(row)}
            onDelete={onDelete ? () => onDelete(row) : undefined}
            confirmDelete
            size="small"
          />
        </Space>
      ),
    },
  ];

  return (
    <Table<RoleSummary>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={data}
      columns={columns}
      scroll={{ x: 1000 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
        onChange: (nextPage, nextPageSize) => {
          onChangePage(nextPage, nextPageSize);
        },
      }}
    />
  );
}
