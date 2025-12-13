import { Space } from "antd";
import { useState } from "react";
import { RoleFilters } from "../ui/RoleFilters";
import { RoleTable } from "../ui/RoleTable";
import { RoleUpsertOverlay } from "../ui/RoleUpsertOverlay";
import { useDeleteRole, useRolesList } from "../hooks";
import type { RoleSummary, RolesListQuery } from "../types";
import { RoleDetailDrawer } from "../ui/RoleDetailDrawer";
import { notify } from "../../../../shared/lib/notification";

export default function RolesPage() {
  const [query, setQuery] = useState<RolesListQuery>({ page: 1, pageSize: 20 });
  const [draftKeyword, setDraftKeyword] = useState(query.keyword ?? "");
  const { data, isLoading } = useRolesList(query);

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<RoleSummary | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleSummary | null>(null);
  const [roleDetailOpen, setRoleDetailOpen] = useState(false);

  const deleteMut = useDeleteRole();

  const handleDeleteRole = async (role: RoleSummary) => {
    if (role.userCount > 0) {
      notify.info(
        `Role đang được gán cho ${role.userCount} user, không thể xoá`
      );
      return;
    }

    try {
      await deleteMut.mutateAsync(role.id);
      notify.success("Đã xoá role");
    } catch (e: any) {
      notify.error(e?.message || "Xoá role thất bại");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setUpsertMode("create");
    setUpsertOpen(true);
  };

  const openEdit = (role: RoleSummary) => {
    setEditing(role);
    setUpsertMode("edit");
    setUpsertOpen(true);
  };

  const closeUpsert = () => {
    setUpsertOpen(false);
    setEditing(null);
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <RoleFilters
        draftKeyword={draftKeyword}
        onDraftKeywordChange={setDraftKeyword}
        onSearch={() =>
          setQuery((q) => ({
            ...q,
            page: 1,
            keyword: draftKeyword || undefined,
          }))
        }
        onReset={() => {
          setDraftKeyword("");
          setQuery((q) => ({ ...q, page: 1, keyword: undefined }));
        }}
        onCreate={openCreate}
      />
      <RoleTable
        loading={isLoading}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? query.page ?? 1}
        pageSize={data?.pageSize ?? query.pageSize ?? 20}
        onChangePage={(page, pageSize) =>
          setQuery((p) => ({ ...p, page, pageSize }))
        }
        onEdit={openEdit}
        onDelete={handleDeleteRole}
        onOpenPermissions={(role) => {
          setSelectedRole(role);
          setRoleDetailOpen(true);
        }}
      />

      <RoleUpsertOverlay
        open={upsertOpen}
        mode={upsertMode}
        role={editing}
        onClose={closeUpsert}
        onDone={closeUpsert}
      />

      <RoleDetailDrawer
        open={roleDetailOpen}
        role={selectedRole}
        onClose={() => setRoleDetailOpen(false)}
      />
    </Space>
  );
}
