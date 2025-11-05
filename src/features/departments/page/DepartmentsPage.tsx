import { Card, Tabs } from "antd";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDeptList, useSiteList, useSoftDeleteDept } from "../hooks";
import DepartmentFilters from "../ui/DepartmentFilters";
import DepartmentTable from "../ui/DepartmentTable";
import DeptCreateOverlay from "../ui/DeptCreateOverlay";
import DeptEditOverlay from "../ui/DeptEditOverlay";
import DepartmentTree from "../ui/DepartmentTree";
import { confirmDialog } from "../../../shared/lib/confirm";
import { notify } from "../../../shared/lib/notification";

export default function DepartmentsPage() {
  const [params, setParams] = useSearchParams();
  const [editId, setEditId] = useState<string | null>(null);

  const f = useMemo(
    () => ({
      q: params.get("q") || undefined,
      type: (params.get("type") || undefined) as any,
      siteId: params.get("siteId") || undefined,
      page: Number(params.get("page") || 1),
      pageSize: Number(params.get("pageSize") || 20),
      sortBy: (params.get("sortBy") || "updatedAt") as any,
      sortDir: (params.get("sortDir") || "desc") as any,
    }),
    [params]
  );

  const list = useDeptList(f);
  const sites = useSiteList();

  const softDelete = useSoftDeleteDept();

  const setQuery = useCallback(
    (patch: Record<string, string | number | boolean | undefined>) => {
      const p = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === "") p.delete(k);
        else p.set(k, String(v));
      });
      setParams(p, { replace: true });
    },
    [params, setParams]
  );

  const handleApply = useCallback(
    (v: any) => {
      setQuery({
        q: v?.q,
        type: v?.type,
        siteId: v?.siteId,
        page: 1,
      });
    },
    [setQuery]
  );

  const onDelete = (id: string) => {
    confirmDialog.confirm(
      "Xóa phòng ban?",
      "Phòng ban sẽ bị xóa khỏi danh sách. Tiếp tục?",
      async () => {
        try {
          const result = await softDelete.mutateAsync({ id });
          // console.log("Soft delete result", result);
          notify.success("Đã xóa");
        } catch (e: any) {
          if (e.code === "HAS_CHILDREN")
            notify.error("Không thể xóa: vẫn còn phòng ban con");
          else notify.error("Xóa thất bại");
        }
      }
    );
  };

  const handleAdd = useCallback(() => {
    setQuery({ create: "1" });
  }, [setQuery]);

  return (
    <div style={{ display: "grid" }}>
      <Tabs
        defaultActiveKey={params.get("tab") || "list"}
        items={[
          {
            key: "list",
            label: "Danh sách",
            children: (
              <>
                <DepartmentFilters
                  value={{
                    q: f.q,
                    type: f.type,
                    siteId: f.siteId,
                  }}
                  siteValue={sites}
                  onApply={handleApply}
                  onAdd={handleAdd}
                />
                <DepartmentTable
                  data={list.data?.items || []}
                  total={list.data?.total || 0}
                  loading={list.isLoading}
                  page={f.page!}
                  pageSize={f.pageSize!}
                  onPageChange={(p, s) => setQuery({ page: p, pageSize: s })}
                  onEdit={(id) => setEditId(id)}
                  onDelete={onDelete}
                />
              </>
            ),
          },
          {
            key: "tree",
            label: "Cây phòng ban",
            children: (
              <Card bordered={false} style={{ padding: 0 }}>
                <DepartmentTree
                  onAddChild={(parentId) => setQuery({ create: "1", parentId })}
                  onEdit={(id) => setEditId(id)}
                  onDelete={onDelete}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Create */}
      <DeptCreateOverlay
        open={params.get("create") === "1"}
        onClose={() => setQuery({ create: undefined, parentId: undefined })}
        variant="modal"
        sites={Array.isArray(sites?.data) ? sites.data : []}
      />

      {/* Edit */}
      {editId && (
        <DeptEditOverlay
          id={editId}
          open={!!editId}
          onClose={() => setEditId(null)}
          variant="drawer"
          sites={Array.isArray(sites?.data) ? sites.data : []}
        />
      )}
    </div>
  );
}
