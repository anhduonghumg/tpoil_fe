// src/features/rbac/roles/ui/RoleDetailDrawer.tsx
import {
  Drawer,
  Tabs,
  Descriptions,
  Space,
  Tag,
  Table,
  Switch,
  Button,
  Select,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useRoleDetail, useUpdateRolePermissions } from "../hooks";
import type { RoleDetailPermission, RoleSummary } from "../types";
import { notify } from "../../../../shared/lib/notification";

const { Text } = Typography;

interface RoleDetailDrawerProps {
  open: boolean;
  role?: RoleSummary | null;
  onClose: () => void;
}

export const RoleDetailDrawer: React.FC<RoleDetailDrawerProps> = ({
  open,
  role,
  onClose,
}) => {
  const roleId = role?.id;
  const { data, isLoading } = useRoleDetail(roleId);
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(
    undefined
  );

  const [localPerms, setLocalPerms] = useState<RoleDetailPermission[] | null>(
    null
  );

  const permissions = useMemo(() => {
    if (!data) return [];
    if (!localPerms) return data.permissions;
    return localPerms;
  }, [data, localPerms]);

  const moduleOptions = useMemo(() => {
    const set = new Map<string, string>();
    permissions.forEach((p) => {
      if (!set.has(p.moduleCode)) {
        set.set(p.moduleCode, p.moduleName);
      }
    });
    return Array.from(set.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    if (!moduleFilter) return permissions;
    return permissions.filter((p) => p.moduleCode === moduleFilter);
  }, [permissions, moduleFilter]);

  const mutation = useUpdateRolePermissions(roleId);

  const columns: ColumnsType<RoleDetailPermission> = [
    {
      title: "Module",
      dataIndex: "moduleName",
      key: "moduleName",
      width: 160,
    },
    {
      title: "Tên quyền",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Mã code",
      dataIndex: "code",
      key: "code",
      width: 220,
      render: (code: string) => <Text code>{code}</Text>,
    },
    {
      title: "Bật",
      dataIndex: "assigned",
      key: "assigned",
      width: 80,
      render: (_: any, record) => (
        <Switch
          size="small"
          checked={record.assigned}
          onChange={(checked) => {
            setLocalPerms((prev) => {
              const base = prev ?? permissions;
              return base.map((p) =>
                p.id === record.id ? { ...p, assigned: checked } : p
              );
            });
          }}
        />
      ),
    },
  ];

  // 👉 Chọn / bỏ chọn tất cả permission theo module
  const handleToggleAllInModule = (value: boolean) => {
    if (!moduleFilter) {
      notify.info("Vui lòng chọn module trước khi thao tác hàng loạt");
      return;
    }

    setLocalPerms((prev) => {
      const base = prev ?? permissions;
      return base.map((p) =>
        p.moduleCode === moduleFilter ? { ...p, assigned: value } : p
      );
    });
  };

  const handleSave = async () => {
    if (!roleId) return;
    const perms = localPerms ?? permissions;
    const selectedIds = perms.filter((p) => p.assigned).map((p) => p.id);
    await mutation.mutateAsync(selectedIds);
    setLocalPerms(null);
    notify.success("Đã cập nhật quyền cho vai trò");
  };

  const onCloseInternal = () => {
    setLocalPerms(null);
    setModuleFilter(undefined);
    onClose();
  };

  useEffect(() => {
    if (open && data?.permissions) {
      setLocalPerms(data.permissions);
    }
  }, [open, data?.role?.id]);


  // console.log(roleId);

  return (
    <Drawer
      title={role ? `Vai trò: ${role.name}` : "Chi tiết vai trò"}
      open={open}
      width={900}
      onClose={onCloseInternal}
      maskClosable={!mutation.isPending}
      extra={
        <Space>
          <Button onClick={onCloseInternal} disabled={mutation.isPending}>
            Đóng
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={!roleId || isLoading}
          >
            Lưu quyền
          </Button>
        </Space>
      }
    >
      <Tabs
        defaultActiveKey="general"
        items={[
          {
            key: "general",
            label: "Thông tin chung",
            children: (
              <Descriptions
                column={1}
                size="small"
                bordered
                style={{ marginBottom: 16 }}
              >
                <Descriptions.Item label="Mã vai trò">
                  <Text code>{role?.code}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tên vai trò">
                  {role?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  {role?.desc || <Text type="secondary">Không có</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Số user đang dùng">
                  <Tag color="blue">{role?.userCount ?? 0}</Tag>
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: "permissions",
            label: "Quyền (Permissions)",
            children: (
              <>
                <Space
                  style={{ marginBottom: 12, width: "100%" }}
                  align="center"
                  wrap
                >
                  <Select
                    allowClear
                    placeholder="Lọc theo module"
                    style={{ minWidth: 220 }}
                    options={moduleOptions}
                    value={moduleFilter}
                    onChange={setModuleFilter}
                    size="small"
                  />
                  <Text type="secondary">
                    Đang bật: {permissions.filter((p) => p.assigned).length}{" "}
                    quyền
                  </Text>

                  <Space size={4} style={{ marginLeft: "auto" }}>
                    <Button
                      size="small"
                      disabled={!moduleFilter}
                      onClick={() => handleToggleAllInModule(true)}
                    >
                      Chọn tất cả module này
                    </Button>
                    <Button
                      size="small"
                      disabled={!moduleFilter}
                      onClick={() => handleToggleAllInModule(false)}
                    >
                      Bỏ chọn module này
                    </Button>
                  </Space>
                </Space>

                <Table<RoleDetailPermission>
                  rowKey="id"
                  size="small"
                  loading={isLoading}
                  dataSource={filteredPermissions}
                  columns={columns}
                  pagination={false}
                  scroll={{ y: 520 }}
                />
              </>
            ),
          },
        ]}
      />
    </Drawer>
  );
};
