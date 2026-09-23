import React, { useMemo, useState } from "react";
import { Button, Card, Col, Row, Space, Spin, Tag, Typography } from "antd";
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
import {
  BANK_IMPORT_TEMPLATE_PRESETS,
  type BankImportPresetKey,
} from "../../presets";

export default function BankImportTemplatesPage() {
  const [query, setQuery] = useState<BankImportTemplateListQuery>({});
  const [draftKeyword, setDraftKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankImportTemplate | null>(null);
  const [defaultPresetKey, setDefaultPresetKey] =
    useState<BankImportPresetKey>();

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
    setDefaultPresetKey(undefined);
    setOpen(true);
  };

  const handleCreateFromPreset = (key: BankImportPresetKey) => {
    setEditing(null);
    setDefaultPresetKey(key);
    setOpen(true);
  };

  const handleEdit = (row: BankImportTemplate) => {
    setEditing(row);
    setDefaultPresetKey(undefined);
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
      <Card
        size="small"
        title="Mẫu chuẩn theo file ngân hàng"
        extra={
          <Typography.Text type="secondary">
            Đã đối chiếu với các file sao kê thực tế
          </Typography.Text>
        }
      >
        <Row gutter={[12, 12]}>
          {BANK_IMPORT_TEMPLATE_PRESETS.map((preset) => (
            <Col xs={24} md={12} xl={6} key={preset.key}>
              <Card size="small" styles={{ body: { minHeight: 142 } }}>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Typography.Text strong>{preset.bankName}</Typography.Text>
                    <Tag color={preset.normalizeRule.fileFormat === "HTML_XLS" ? "orange" : "blue"}>
                      {preset.normalizeRule.fileFormat === "HTML_XLS" ? ".xls HTML" : ".xlsx"}
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {preset.fileLabel}
                  </Typography.Text>
                  <Typography.Text ellipsis={{ tooltip: preset.note }}>
                    {preset.note}
                  </Typography.Text>
                  <Button size="small" onClick={() => handleCreateFromPreset(preset.key)}>
                    Dùng mẫu này
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

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
        defaultPresetKey={defaultPresetKey}
        loading={submitting}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setDefaultPresetKey(undefined);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
