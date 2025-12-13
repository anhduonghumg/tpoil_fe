import { useMemo, useState } from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import { useSearchParams } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useUsers, useDeleteManyUsers, useDeleteUser } from "../hooks";
import type { User } from "../types";
import { useAllDepts } from "../../departments/hooks";
import EmployeesFilters, { EmployeesFilterValues } from "../ui/EmployeeFilter";
import ActionButtons from "../../../shared/ui/ActionButtons";
import { notify } from "../../../shared/lib/notification";
import UserUpsertAllTabsOverlay from "../ui/UserUpsertAllTabsOverlay";
import ExportExcelButton from "../../../shared/components/Excel/ExportExcelButton";
import { EMPLOYEE_EXPORT_COLUMNS } from "../export/employeeExportColumns";
import { UsersApi } from "../api";
import { TITLE_LABELS } from "../../../shared/constants/labels";

type SortState = { field?: string; order?: "asc" | "desc" };

const compactObj = <T extends Record<string, any>>(o: T): T =>
  Object.entries(o).reduce((acc, [k, v]) => {
    if (v !== undefined && v !== null && v !== "") (acc as any)[k] = v;
    return acc;
  }, {} as T);

const statusColor: Record<string, any> = {
  active: "green",
  probation: "blue",
  inactive: "default",
  suspended: "orange",
  terminated: "red",
};

const statusText: Record<string, string> = {
  active: "Đang làm",
  probation: "Thử việc",
  inactive: "Ngưng kích hoạt",
  suspended: "Tạm đình chỉ",
  terminated: "Nghỉ việc",
};

export default function UsersList() {
  const [params, setParams] = useSearchParams();
  const createOpen = params.get("new") === "1";
  const editId = params.get("edit");
  const [sort, setSort] = useState<SortState>({});

  // filters & paging
  const [filters, setFilters] = useState<EmployeesFilterValues>({});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  // selection + delete
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const delMany = useDeleteManyUsers();
  const del = useDeleteUser();

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
    () =>
      compactObj({
        ...filters,
        page,
        size,
        sortBy: sort.field,
        sortDir: sort.order,
      }),
    [filters, page, size, sort]
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

  const handleDeleteOne = async (id: string) => {
    try {
      await del.mutateAsync(id);
      notify.success("Đã xóa nhân viên");
    } catch {
      notify.error("Xóa nhân viên thất bại");
    }
  };

  const handleBulkDelete = async () => {
    // console.log("bulk delete", selectedRowKeys);
    // console.log("bulk delete", selectedRowKeys.length);
    if (!selectedRowKeys.length) return;
    try {
      await delMany.mutateAsync(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
      notify.success("Đã xóa các nhân viên đã chọn");
    } catch {
      notify.error("Xóa nhân viên thất bại");
    }
  };

  const handleTableChange = (_pg: any, _f: any, sorter: any) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (!s || !s.order) {
      setSort({});
      return;
    }
    const field = String(s.columnKey || s.field);
    const order: "asc" | "desc" = s.order === "ascend" ? "asc" : "desc";
    setSort({ field, order });
  };

  const so = (f: string) =>
    sort.field === f ? (sort.order === "asc" ? "ascend" : "descend") : null;

  // columns
  const columns = [
    {
      title: "Nhân viên",
      dataIndex: "fullName",
      sorter: true,
      key: "fullName",
      sortOrder: so("fullName"),
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <span>{r.fullName ?? r.name}</span>
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
    {
      title: "Chức danh",
      dataIndex: "title",
      width: 160,
      render: (v: string) => TITLE_LABELS[v] ?? v ?? "",
    },
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
      fixed: "center" as const,
      width: 80,
      render: (_: any, r: User) => (
        <Space>
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
            onClick={handleBulkDelete}
            loading={delMany.isPending}
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
          <ExportExcelButton
            allColumns={EMPLOYEE_EXPORT_COLUMNS}
            fetchAll={async () => {
              const pageSize = 200;
              let page = 1;
              const rows: any[] = [];
              while (true) {
                const rs = await UsersApi.list({
                  ...query,
                  page,
                  size: pageSize,
                });
                const chunk = (rs as any)?.items ?? [];
                rows.push(...chunk);
                if (
                  !chunk.length ||
                  rows.length >= ((rs as any)?.total ?? rows.length)
                )
                  break;
                page++;
              }
              return rows;
            }}
            filename="employees"
          />
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
        showSorterTooltip={false}
        onChange={handleTableChange}
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
        scroll={{ x: 900, y: 400 }}
      />
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
