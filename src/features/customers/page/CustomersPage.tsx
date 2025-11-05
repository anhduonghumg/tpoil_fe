import React from "react";
import { Button, Card, Flex, Space, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { CustomerToolbar } from "../ui/CustomerToolbar";
import { CustomerTablePro } from "../ui/CustomerTablePro";
import CustomerUpsertOverlay from "../ui/CustomerUpsertOverlay";
import type { CustListQuery } from "../types";
import { CustomersApi } from "../api";
import { confirmDialog } from "../../../shared/lib/confirm";
import { notify } from "../../../shared/lib/notification";
import { useDeleteCustomer } from "../hooks";

export default function CustomersPage() {
  const [query, setQuery] = React.useState<CustListQuery>({
    page: 1,
    pageSize: 20,
  });
  (window as any).setCustQuery = setQuery;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const del = useDeleteCustomer();

  const handleExport = async () => {
    const blob = new Blob([JSON.stringify({ query }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    confirmDialog.confirm(
      "Xóa khách hàng?",
      "Khách hàng sẽ bị xóa khỏi danh sách. Tiếp tục?",
      async () => {
        try {
          const result = await del.mutateAsync(id);
          if (result.success) {
            notify.success("Đã xóa");
          } else {
            notify.error("Lỗi xóa khách hàng");
          }
        } catch (e: any) {
          notify.error(e?.message || "Lỗi xóa khách hàng");
        }
      }
    );
  };

  const batchDelete = async () => {
    if (!selected.length) return;
    await CustomersApi.deleteMultiple(selected);
    setSelected([]);
    setQuery({ ...query });
  };

  return (
    // <Card title="Khách hàng">
    <>
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
          <CustomerToolbar
            value={query}
            onChange={setQuery}
            onExport={handleExport}
          />

          <Space>
            {selected.length > 0 && (
              <Tooltip title={`Xoá ${selected.length} dòng đã chọn`}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={batchDelete}
                >
                  Xoá đã chọn
                </Button>
              </Tooltip>
            )}
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Thêm mới
            </Button>
          </Space>
        </Flex>

        {/* Bảng danh sách */}
        <CustomerTablePro
          query={query}
          onEdit={(id) => setEditId(id)}
          onDelete={(id) => handleDelete(id)}
          onSelectRows={setSelected}
        />
      </Flex>

      <CustomerUpsertOverlay
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {editId && (
        <CustomerUpsertOverlay
          mode="edit"
          id={editId}
          open={!!editId}
          onClose={() => setEditId(null)}
        />
      )}
      {/* </Card> */}
    </>
  );
}
