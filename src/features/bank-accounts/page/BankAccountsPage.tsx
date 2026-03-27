import React, { useMemo, useState } from "react";
import { Card, Spin } from "antd";
import BankAccountFilter from "../ui/BankAccountFilter";
import BankAccountTable from "../ui/BankAccountTable";
import BankAccountUpsertModal from "../ui/BankAccountUpsertModal";
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
} from "../hooks";
import type {
  BankAccount,
  BankAccountListQuery,
  UpsertBankAccountPayload,
} from "../types";

export default function BankAccountsPage() {
  const [query, setQuery] = useState<BankAccountListQuery>({});
  const [draftKeyword, setDraftKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const listQuery = useMemo(
    () => ({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    }),
    [query],
  );

  const accountsQuery = useBankAccounts(listQuery);
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();

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

  const handleEdit = (row: BankAccount) => {
    setEditing(row);
    setOpen(true);
  };

  const handleSubmit = async (payload: UpsertBankAccountPayload) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOpen(false);
    setEditing(null);
  };

  const handleToggleActive = async (row: BankAccount) => {
    await updateMutation.mutateAsync({
      id: row.id,
      payload: {
        bankCode: row.bankCode,
        bankName: row.bankName ?? "",
        accountNo: row.accountNo,
        accountName: row.accountName ?? "",
        currency: row.currency,
        isActive: !row.isActive,
      },
    });
  };

  return (
    <div className="space-y-4">
      <BankAccountFilter
        value={query}
        draftKeyword={draftKeyword}
        onDraftKeywordChange={setDraftKeyword}
        onSearch={handleSearch}
        onChange={(patch) => setQuery((prev) => ({ ...prev, ...patch }))}
        onCreate={handleCreate}
      />

      <div>
        {accountsQuery.isLoading ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : (
          <BankAccountTable
            data={accountsQuery.data ?? []}
            loading={accountsQuery.isFetching}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      <BankAccountUpsertModal
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
