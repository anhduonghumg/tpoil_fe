import React from "react";
import { Drawer, Descriptions, Spin, Tag } from "antd";
import { useUserDetailRaw } from "../hooks";

export function UserInfoDrawer({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useUserDetailRaw(userId);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      title="Thông tin user"
      destroyOnClose
    >
      {isLoading ? (
        <Spin />
      ) : (
        <Descriptions size="small" bordered column={1}>
          <Descriptions.Item label="Username">
            {data?.username ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {data?.email ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Tên">{data?.name ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            {data?.isActive ? (
              <Tag color="green">Active</Tag>
            ) : (
              <Tag>Inactive</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Nhân viên">
            {data?.employee?.fullName ?? "Chưa gán"}
          </Descriptions.Item>
          <Descriptions.Item label="Quyền">
            {(data?.rolesGlobal ?? []).length
              ? (data.rolesGlobal ?? []).map((r: any) => r.name).join(", ")
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Last login">
            {data?.lastLoginAt ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Created at">
            {data?.createdAt ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}
