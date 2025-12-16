import React from "react";
import { Table, Tag, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ActionKey,
  CommonActionMenu,
} from "../../../shared/ui/CommonActionMenu";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";

interface UserRow {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  employee?: {
    id: string;
    fullName: string;
  } | null;
  rolesGlobal?: { id: string; name: string }[];
}

interface Props {
  loading?: boolean;
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  onChangePage: (page: number, pageSize: number) => void;
  onEdit: (id: string) => void;
  onAction: (id: string, action: ActionKey) => void;
}

export const UsersTable: React.FC<Props> = ({
  loading,
  data,
  total,
  page,
  pageSize,
  onChangePage,
  onEdit,
  onAction,
}) => {
  const columns: ColumnsType<UserRow> = [
    {
      title: "Username",
      dataIndex: "username",
      width: 140,
      fixed: "left",
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 220,
    },
    {
      title: "Tên",
      dataIndex: "name",
      width: 180,
      render: (v) => v || "—",
    },
    {
      title: "Nhân viên",
      dataIndex: "employee",
      width: 220,
      render: (emp) => emp?.fullName || <Tag>Chưa gán</Tag>,
    },
    {
      title: "Quyền",
      dataIndex: "rolesGlobal",
      width: 240,
      render: (roles = []) =>
        roles.length ? (
          <Space wrap size={4}>
            {roles.map((r: any) => (
              <Tag key={r.id}>{r.name}</Tag>
            ))}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 120,
      render: (v) =>
        v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, row) => (
        <CommonActionMenu
          items={[
            { key: "view", label: "Xem thông tin", icon: <EyeOutlined /> },
            { key: "edit", label: "Sửa thông tin", icon: <EditOutlined /> },
            {
              key: "resetPassword",
              label: "Cấp mật khẩu mới",
              icon: <KeyOutlined />,
            },
            {
              key: "assignEmployee",
              label: "Gán nhân viên",
              icon: <UserSwitchOutlined />,
            },
            {
              key: "assignRoles",
              label: "Gán quyền",
              icon: <SafetyCertificateOutlined />,
            },
            {
              key: "delete",
              label: "Xóa",
              icon: <DeleteOutlined />,
              danger: true,
            },
          ]}
          onAction={(act) => onAction(row.id, act)}
        />
      ),
    },
  ];

  return (
    <Table<UserRow>
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1100 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onChangePage,
      }}
    />
  );
};
