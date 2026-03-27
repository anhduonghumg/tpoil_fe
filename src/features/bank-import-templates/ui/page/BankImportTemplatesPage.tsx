import React, { useMemo, useState } from "react";
import { Card, Spin } from "antd";
import {
  BankImportTemplate,
  BankImportTemplateListQuery,
  UpsertBankImportTemplatePayload,
} from "../../types";

import {
  useBankImportTemplates,
  useCreateBankImportTemplate,
  useUpdateBankImportTemplate,
} from "../../hooks";

import BankImportTemplateFilter from "../BankImportTemplateFilter";
import BankImportTemplateTable from "../BankImportTemplateTable";
import BankImportTemplateUpsertModal from "../BankImportTemplateUpsertModal";

export default function BankImportTemplatesPage() {
  const [query, setQuery] = useState<BankImportTemplateListQuery>({});
  const [draftKeyword, setDraftKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankImportTemplate | null>(null);

  const listQuery = useMemo(
    () => ({
      ...query,
      keyword: query.keyword?.trim() || undefined,
      bankCode: query.bankCode?.trim() || undefined,
    }),
    [query],
  );

  const templatesQuery = useBankImportTemplates(listQuery);
  const createMutation = useCreateBankImportTemplate();
  const updateMutation = useUpdateBankImportTemplate();

  const submitting = createMutation.isPending || updateMutation.isPending;

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      keyword: draftKeyword.trim() || undefined,
    }));
  };

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (row: BankImportTemplate) => {
    setEditing(row);
    setOpen(true);
  };

  const handleSubmit = async (payload: UpsertBankImportTemplatePayload) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOpen(false);
    setEditing(null);
  };

  const handleToggleActive = async (row: BankImportTemplate) => {
    await updateMutation.mutateAsync({
      id: row.id,
      payload: {
        bankCode: row.bankCode,
        name: row.name,
        version: row.version,
        columnMap: row.columnMap,
        normalizeRule: row.normalizeRule,
        isActive: !row.isActive,
      },
    });
  };

  return (
    <div className="space-y-4">
      <BankImportTemplateFilter
        value={query}
        draftKeyword={draftKeyword}
        onDraftKeywordChange={setDraftKeyword}
        onSearch={handleSearch}
        onChange={(patch) => setQuery((prev) => ({ ...prev, ...patch }))}
        onCreate={handleCreate}
      />
      <div>
        {templatesQuery.isLoading ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : (
          <BankImportTemplateTable
            data={templatesQuery.data ?? []}
            loading={templatesQuery.isFetching}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      <BankImportTemplateUpsertModal
        open={open}
        initialValue={editing}
        loading={submitting}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
