import { useMemo, useState } from "react";
import { Button, Space, Table, Tag, Typography, Popconfirm, App } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useUsers, useDeleteUser } from "../hooks";
import type { User } from "../types";
import UserCreateAllTabsOverlay from "../ui/UserCreateAllTabsOverlay";
import { useAllDepts } from "../../departments/hooks";
import EmployeesFilters, { EmployeesFilterValues } from "../ui/EmployeeFilter";
import ActionButtons from "../../../shared/ui/ActionButtons";
import { notify } from "../../../shared/lib/notification";
import UserUpsertAllTabsOverlay from "../ui/UserUpsertAllTabsOverlay";

const compactObj = <T extends Record<string, any>>(o: T): T =>
  Object.entries(o).reduce((acc, [k, v]) => {
    if (v !== undefined && v !== null && v !== "") (acc as any)[k] = v;
    return acc;
  }, {} as T);

const statusColor: Record<string, any> = {
  active: "green",
  probation: "blue",
  inactive: "default",
  quit: "red",
  on_leave: "orange",
};

const statusText: Record<string, string> = {
  active: "Đang làm",
  probation: "Thử việc",
  inactive: "Tạm dừng",
  quit: "Nghỉ việc",
  on_leave: "Nghỉ phép",
};

export default function UsersList() {
  const [params, setParams] = useSearchParams();
  const createOpen = params.get("new") === "1";
  const editId = params.get("edit");
  const nav = useNavigate();

  // filters & paging
  const [filters, setFilters] = useState<EmployeesFilterValues>({});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  const handleSearch = (vals: EmployeesFilterValues) => {
    setFilters(compactObj(vals));
    setPage(1);
  };
  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  const handleEditOne = (id: string) => {
    params.set("edit", id);
    setParams(params);
  };

  const query = useMemo(
    () => compactObj({ ...filters, page, size }),
    [filters, page, size]
  );

  const { data, isLoading } = useUsers(query);
  const depts = useAllDepts();

  // unwrap response: hỗ trợ cả {items,...} và {data:{items,...}}
  const items = useMemo(() => {
    const d: any = data;
    return d?.items ?? d?.data?.items ?? [];
  }, [data]);

  const total = useMemo(() => {
    const d: any = data;
    return d?.total ?? d?.data?.total ?? 0;
  }, [data]);

  const getDeptName = (r: any) =>
    r?.memberships?.[0]?.department?.name ?? r?.departmentName ?? "";

  const fmt = (d?: string | Date) => (d ? dayjs(d).format("DD-MM-YYYY") : "");

  // selection + delete
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const del = useDeleteUser();

  const handleDeleteOne = async (id: string) => {
    try {
      await del.mutateAsync(id);
      notify.success("Đã xóa nhân viên");
    } catch {
      notify.error("Xóa nhân viên thất bại");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await Promise.allSettled(
        selectedRowKeys.map((id) => del.mutateAsync(String(id)))
      );
      setSelectedRowKeys([]);
      notify.success("Đã xóa các nhân viên đã chọn");
    } catch {
      notify.error("Xóa nhân viên thất bại");
    }
  };

  // columns
  const columns = [
    {
      title: "Nhân viên",
      dataIndex: "fullName",
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => nav(`/users/${r.id}`)}>{r.fullName ?? r.name}</a>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.workEmail ?? r.personalEmail}
          </Typography.Text>
        </Space>
      ),
    },
    { title: "Điện thoại", dataIndex: "phone", width: 140 },
    {
      title: "Phòng ban",
      dataIndex: "memberships",
      width: 160,
      render: (_: any, r: any) => getDeptName(r),
    },
    { title: "Chức danh", dataIndex: "title", width: 160 },
    {
      title: "Mốc thời gian",
      key: "milestones",
      width: 200,
      render: (_: any, r: any) => (
        <Typography.Text>
          {fmt(r.joinedAt)} → {r.leftAt ? fmt(r.leftAt) : "nay"}
        </Typography.Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (v: string) => {
        const color = statusColor[v] ?? "default";
        const text = statusText[v] ?? v;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right" as const,
      width: 140,
      render: (_: any, r: User) => (
        <Space>
          {/* <Button size="small" onClick={() => nav(`/users/${r.id}`)}>
            Xem
          </Button>
          <Popconfirm
            title="Xóa nhân viên này?"
            okText="Xóa"
            okButtonProps={{ danger: true, loading: del.isPending }}
            cancelText="Hủy"
            onConfirm={() => handleDeleteOne(r.id)}
          >
            <Button size="small" danger loading={del.isPending}>
              Xóa
            </Button>
          </Popconfirm> */}

          <ActionButtons
            onEdit={() => handleEditOne(r.id)}
            onDelete={() => handleDeleteOne(r.id)}
            confirmDelete
            size="small"
          />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* Filters + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <EmployeesFilters
          loadingDepts={depts.isLoading}
          deptOptions={(depts.data || []).map((d) => ({
            value: d.id,
            label: d.name,
          }))}
          initial={filters}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        <Space>
          <Button
            danger
            size="small"
            disabled={!selectedRowKeys.length}
            onClick={() => handleBulkDelete}
            loading={del.isPending}
          >
            Xóa đã chọn ({selectedRowKeys.length})
          </Button>
          <Button
            icon={<PlusOutlined />}
            size="small"
            type="primary"
            onClick={() => {
              params.set("new", "1");
              setParams(params);
            }}
          >
            Thêm mới
          </Button>
        </Space>
      </div>

      <Table
        rowKey={(r: any) => r.id ?? r._id ?? r.code}
        loading={isLoading}
        dataSource={items}
        columns={columns as any}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
        }}
        pagination={{
          current: page,
          pageSize: size,
          total,
          onChange: (p, s) => {
            setPage(p);
            setSize(s);
          },
          showSizeChanger: true,
        }}
        size="middle"
        scroll={{ x: 900 }}
      />

      {/* <UserCreateAllTabsOverlay
        open={open}
        onClose={() => {
          params.delete("new");
          setParams(params, { replace: true });
        }}
        variant="modal"
      /> */}
      <UserUpsertAllTabsOverlay
        mode={editId ? "edit" : "create"}
        id={editId ?? undefined}
        open={!!editId || createOpen}
        onClose={() => {
          // ưu tiên đóng edit, nếu không thì đóng new
          if (editId) params.delete("edit");
          else params.delete("new");
          setParams(params, { replace: true });
        }}
        variant="modal"
      />
    </Space>
  );
}
