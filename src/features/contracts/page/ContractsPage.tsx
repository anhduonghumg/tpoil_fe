import React from "react";
import { Button, Flex, Space, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { ContractToolbar } from "../ui/ContractToolbar";
import { ContractTablePro } from "../ui/ContractTablePro";
import ContractUpsertOverlay from "../ui/ContractUpsertOverlay";
import type { ContractListQuery } from "../types";
import { ContractsApi } from "../api";
import { notify } from "../../../shared/lib/notification";

export default function ContractsPage() {
  const [query, setQuery] = React.useState<ContractListQuery>({
    page: 1,
    pageSize: 20,
  });
  (window as any).setContractQuery = setQuery;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const qc = useQueryClient();

  const handleExport = async () => {
    const blob = new Blob([JSON.stringify({ query }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contracts-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const batchDelete = async () => {
    if (!selected.length) return;
    await ContractsApi.deleteMultiple(selected);
    await qc.invalidateQueries({ queryKey: ["contracts", "list"] });
    setSelected([]);
    notify.success("Đã xoá các hợp đồng đã chọn");
  };

  return (
    // <Card title="Hợp đồng">
    <>
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
          <ContractToolbar
            value={query}
            onChange={setQuery}
            onExport={handleExport}
          />
          <Space>
            {selected.length > 0 && (
              <Tooltip title={`Xoá ${selected.length} HĐ đã chọn`}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={batchDelete}
                >
                  Xoá đã chọn {selected.length}
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

        <ContractTablePro
          query={query}
          onEdit={(id) => setEditId(id)}
          onSelectRows={setSelected}
        />
      </Flex>

      <ContractUpsertOverlay
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {editId && (
        <ContractUpsertOverlay
          mode="edit"
          id={editId}
          open={!!editId}
          onClose={() => setEditId(null)}
        />
      )}
    </>
    // </Card>
  );
}
