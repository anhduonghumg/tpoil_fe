import React from "react";
import { Button, Card, Flex, Space, Tooltip, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { ContractTypeToolbar } from "../ui/ContractTypeToolbar";
import { ContractTypeTable } from "../ui/ContractTypeTable";
import ContractTypeUpsertOverlay from "../ui/ContractTypeUpsertOverlay";
import type { ContractTypeListQuery } from "../types";
import { ContractTypesApi } from "../api";
import { notify } from "../../../shared/lib/notification";
import { confirmDialog } from "../../../shared/lib/confirm";
import { useDeleteContractType } from "../hooks";

export default function ContractTypesPage() {
  const [query, setQuery] = React.useState<ContractTypeListQuery>({
    page: 1,
    pageSize: 20,
  });
  (window as any).setContractTypeQuery = setQuery;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const qc = useQueryClient();
  const del = useDeleteContractType();

  const batchDelete = async () => {
    try {
      if (!selected.length) return;
      await ContractTypesApi.deleteMultiple(selected);
      await qc.invalidateQueries({ queryKey: ["contractTypes", "list"] });
      setSelected([]);
      notify.success("Đã xoá các loại hợp đồng đã chọn");
    } catch (e) {
      notify.error("Xóa loại hợp đồng thất bại!");
    }
  };

  const handleDelete = async (id: string) => {
    confirmDialog.confirm(
      "Xóa loại hợp đồng?",
      "Loại hợp đồng sẽ bị xóa khỏi danh sách. Tiếp tục?",
      async () => {
        try {
          const result = await del.mutateAsync(id);
          if (result.success) {
            notify.success("Đã xóa");
          } else {
            notify.error("Lỗi xóa loại hợp đồng");
          }
        } catch (e: any) {
          notify.error(e?.message || "Lỗi xóa loại hợp đồng");
        }
      }
    );
  };

  return (
    <>
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
          <ContractTypeToolbar value={query} onChange={setQuery} />
          <Space>
            {selected.length > 0 && (
              <Tooltip title={`Xoá ${selected.length} loại đã chọn`}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={batchDelete}
                >
                  Xoá đã chọn ({selected.length})
                </Button>
              </Tooltip>
            )}
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Thêm loại
            </Button>
          </Space>
        </Flex>

        <ContractTypeTable
          query={query}
          onEdit={(id) => setEditId(id)}
          onDelete={(id) => handleDelete(id)}
          onSelectRows={setSelected}
        />
      </Flex>

      <ContractTypeUpsertOverlay
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {editId && (
        <ContractTypeUpsertOverlay
          mode="edit"
          id={editId}
          open={!!editId}
          onClose={() => setEditId(null)}
        />
      )}
    </>
  );
}
