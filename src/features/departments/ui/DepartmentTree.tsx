import { Badge, Dropdown, Input, Spin, Tree } from "antd";
import { useMemo, useState } from "react";
import { useDeptTree } from "../hooks";
import type { DataNode } from "antd/es/tree";

const TYPE_BADGE: Record<string, "magenta" | "geekblue" | "cyan" | "green"> = {
  board: "magenta",
  office: "geekblue",
  group: "cyan",
  branch: "green",
};

export default function DepartmentTree({
  onAddChild,
  onEdit,
  onDelete,
}: {
  onAddChild: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { data, isLoading } = useDeptTree();
  const [q, setQ] = useState("");
  const nodes: DataNode[] = useMemo(() => {
    const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
    const map = (arr: any[]): DataNode[] =>
      (arr
        ?.map((n) => {
          const titleText = `${n.name} (${n.code})`;
          const title = (
            <Dropdown
              trigger={["contextMenu", "click"]}
              menu={{
                items: [
                  {
                    key: "add",
                    label: "Thêm con",
                    onClick: () => onAddChild(n.id),
                  },
                  {
                    key: "edit",
                    label: "Sửa",
                    onClick: () => onEdit(n.id),
                  },
                  {
                    key: "del",
                    label: "Xóa",
                    onClick: () => onDelete(n.id),
                  },
                ],
              }}
            >
              <span>
                <Badge
                  color={TYPE_BADGE[n.type] || "default"}
                  text={titleText}
                />
                {n.deletedAt && (
                  <span style={{ color: "#ff4d4f", marginLeft: 8 }}>
                    [Deleted]
                  </span>
                )}
              </span>
            </Dropdown>
          );
          const children = n.children ? map(n.children) : undefined;
          // filter bằng cách ẩn node không match và không có con match
          const include =
            match(n.name) || match(n.code) || (children && children.length);
          return include ? { key: n.id, title, children } : null;
        })
        .filter(Boolean) as DataNode[]) || [];
    return map(data ?? []);
  }, [data, q, onAddChild, onEdit, onDelete]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        {isLoading ? (
          <Spin />
        ) : (
          <Tree treeData={nodes} defaultExpandAll showLine />
        )}
      </div>
    </div>
  );
}
