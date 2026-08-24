import React, { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ImportOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { FilterButton, FilterTags, FilterToolbar } from "../../../shared/ui/TableFilter";
import { PermissionGate } from "../../../shared/authz/PermissionGate";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { confirmDialog } from "../../../shared/lib/confirm";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import {
  useCreateAlias,
  useImportAliases,
  useRetireAlias,
  useSalesAliases,
  useUnmatchedAliases,
  useUpdateAlias,
} from "../hooks";
import type {
  ImportAliasResult,
  SalesAliasEntityType,
  SalesEntityAlias,
  UnmatchedAlias,
} from "../types";

const ENTITY_TYPES: Array<{ value: SalesAliasEntityType; label: string }> = [
  { value: "PARTY", label: "Khách hàng" },
  { value: "WAREHOUSE", label: "Kho" },
  { value: "PRODUCT", label: "Mặt hàng" },
];

const SOURCE_LABELS: Record<string, string> = {
  IMPORTED: "Nhập từ bảng",
  MANUAL: "Thêm tay",
  LEARNED: "Máy học được",
};

const IMPORT_PLACEHOLDER = `Dán trực tiếp từ Excel — mỗi dòng: tên đơn vị <tab> các cách viết cách nhau bởi dấu phẩy

Ví dụ:
Công ty TNHH Hải Linh\tHải Linh, HL, Hai Linh HP
Kho Nhà Bè\tNhà Bè, NB, kho NB`;

/**
 * Alias là dữ liệu của kinh doanh, không phải của kỹ thuật: khách viết tên rất
 * nhiều kiểu, và chính người bán mới biết kiểu nào là của ai.
 */
export default function SalesAliasesPage() {
  const { can } = useCan();
  const [tab, setTab] = useState("list");
  const [entityType, setEntityType] = useState<SalesAliasEntityType>("PARTY");
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [includeRetired, setIncludeRetired] = useState(false);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addEntityId, setAddEntityId] = useState<string>();
  const [addAliases, setAddAliases] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<ImportAliasResult>();

  const [editTarget, setEditTarget] = useState<SalesEntityAlias>();
  const [editName, setEditName] = useState("");

  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const listQuery = useSalesAliases({
    entityType,
    keyword: keyword.trim() || undefined,
    includeRetired,
    page,
    limit: 50,
  });
  const unmatchedQuery = useUnmatchedAliases(50, tab === "unmatched");
  const unmatchedCountQuery = useUnmatchedAliases(50, true);

  const createMutation = useCreateAlias();
  const importMutation = useImportAliases();
  const updateMutation = useUpdateAlias();
  const retireMutation = useRetireAlias();

  const ownerOf = (alias: SalesEntityAlias) =>
    alias.party ?? alias.warehouse ?? alias.product ?? null;

  const openAddFor = (type: SalesAliasEntityType, text?: string) => {
    setEntityType(type);
    setAddEntityId(undefined);
    setAddAliases(text ?? "");
    setAddOpen(true);
  };

  const columns: ColumnsType<SalesEntityAlias> = [
    {
      title: "Cách viết",
      dataIndex: "externalName",
      render: (value: string, alias) => (
        <Space size={6}>
          <span>{value}</span>
          {alias.validTo && <Tag>Đã ngừng</Tag>}
        </Space>
      ),
    },
    {
      title: "Trỏ về",
      key: "owner",
      render: (_, alias) => {
        const owner = ownerOf(alias);
        return owner ? (
          <div>
            <div>{owner.name}</div>
            {owner.code && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {owner.code}
              </Typography.Text>
            )}
          </div>
        ) : (
          "—"
        );
      },
    },
    {
      title: "Nguồn",
      dataIndex: "source",
      width: 130,
      render: (value: string) => <Tag>{SOURCE_LABELS[value] ?? value}</Tag>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      width: 180,
      render: (value) => value ?? "—",
    },
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, alias) =>
        can(PERMS.SALES_ALIAS_MANAGE) && !alias.validTo ? (
          <Space>
            <Button
              size="small"
              onClick={() => {
                setEditTarget(alias);
                setEditName(alias.externalName);
              }}
            >
              Sửa
            </Button>
            <Button
              size="small"
              danger
              onClick={() =>
                confirmDialog.confirm(
                  "Ngừng dùng cách viết",
                  `"${alias.externalName}" sẽ không còn được dùng để nhận dạng, nhưng lịch sử vẫn giữ. Tiếp tục?`,
                  () => retireMutation.mutate(alias.id),
                )
              }
            >
              Ngừng
            </Button>
          </Space>
        ) : null,
    },
  ];

  const unmatchedColumns: ColumnsType<UnmatchedAlias> = [
    { title: "Cách viết chưa nhận ra", dataIndex: "text" },
    {
      title: "Loại",
      dataIndex: "entityType",
      width: 130,
      render: (value: SalesAliasEntityType) =>
        ENTITY_TYPES.find((row) => row.value === value)?.label ?? value,
    },
    {
      title: "Số lần gặp",
      dataIndex: "count",
      width: 110,
      align: "right",
      render: (value: number) => <strong>{value}</strong>,
    },
    {
      title: "Gần nhất",
      dataIndex: "lastSeenAt",
      width: 150,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "",
      key: "actions",
      width: 130,
      render: (_, row) =>
        can(PERMS.SALES_ALIAS_MANAGE) ? (
          <Button size="small" type="primary" onClick={() => openAddFor(row.entityType, row.text)}>
            Gán cho đơn vị
          </Button>
        ) : null,
    },
  ];

  const entityPicker = () => {
    if (entityType === "PARTY") {
      return (
        <PartySelect
          partyRole="ALL"
          style={{ width: "100%" }}
          placeholder="Chọn khách hàng"
          value={addEntityId}
          onChange={(value) => setAddEntityId(value ?? undefined)}
        />
      );
    }
    if (entityType === "WAREHOUSE") {
      return (
        <Select
          showSearch
          filterOption={false}
          style={{ width: "100%" }}
          placeholder="Chọn kho"
          value={addEntityId}
          loading={warehousesQuery.isFetching}
          onSearch={setWarehouseKeyword}
          onChange={setAddEntityId}
          options={(warehousesQuery.data ?? []).map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.label,
          }))}
        />
      );
    }
    return (
      <Select
        showSearch
        filterOption={false}
        style={{ width: "100%" }}
        placeholder="Chọn mặt hàng"
        value={addEntityId}
        loading={productsQuery.isFetching}
        onSearch={setProductKeyword}
        onChange={setAddEntityId}
        options={(productsQuery.data ?? []).map((product) => ({
          value: product.id,
          label: `${product.code} - ${product.name}`,
        }))}
      />
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Cách khách viết tên
        </Typography.Title>
        <Space>
          <PermissionGate need={PERMS.SALES_ALIAS_MANAGE}>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
              Dán từ Excel
            </Button>
          </PermissionGate>
          <PermissionGate need={PERMS.SALES_ALIAS_MANAGE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddFor(entityType)}>
              Thêm cách viết
            </Button>
          </PermissionGate>
          <Button
            icon={<ReloadOutlined />}
            loading={listQuery.isFetching}
            onClick={() => listQuery.refetch()}
          >
            Tải lại
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Kinh doanh tự thêm được. Mỗi khi bạn sửa tay một dòng ở nhập nhanh, hệ thống cũng tự nhớ cách viết đó."
      />

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "list",
            label: "Danh sách",
            children: (
              <>
                <FilterToolbar
                  left={
                    <>
                      <Segmented
                        size="small"
                        value={entityType}
                        options={ENTITY_TYPES}
                        onChange={(value) => {
                          setEntityType(value as SalesAliasEntityType);
                          setPage(1);
                        }}
                      />
                      <Input
                        allowClear
                        size="small"
                        style={{ width: 280 }}
                        prefix={<SearchOutlined />}
                        placeholder="Tìm cách viết"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onPressEnter={() => {
                          setKeyword(searchText);
                          setPage(1);
                        }}
                      />
                    </>
                  }
                  right={
                    <FilterButton
                      count={Number(includeRetired)}
                      open={filterOpen}
                      onOpenChange={setFilterOpen}
                      content={
                        <div className="table-filter-panel">
                          <Checkbox
                            checked={includeRetired}
                            onChange={(e) => {
                              setIncludeRetired(e.target.checked);
                              setPage(1);
                            }}
                          >
                            Hiện cả cách viết đã ngừng
                          </Checkbox>
                        </div>
                      }
                    />
                  }
                />

                <FilterTags
                  items={
                    includeRetired
                      ? [
                          {
                            key: "retired",
                            label: "Gồm cả cách viết đã ngừng",
                            onClear: () => {
                              setIncludeRetired(false);
                              setPage(1);
                            },
                          },
                        ]
                      : []
                  }
                />

                <Table<SalesEntityAlias>
                  rowKey="id"
                  size="small"
                  loading={listQuery.isLoading}
                  columns={columns}
                  dataSource={listQuery.data?.items ?? []}
                  scroll={{ x: 900 }}
                  pagination={{
                    current: page,
                    pageSize: 50,
                    total: listQuery.data?.total ?? 0,
                    showSizeChanger: false,
                    onChange: setPage,
                  }}
                />
              </>
            ),
          },
          {
            key: "unmatched",
            label: (
              <Space size={6}>
                Chưa nhận ra
                {(unmatchedCountQuery.data?.length ?? 0) > 0 && (
                  <Badge
                    count={unmatchedCountQuery.data?.length}
                    style={{ backgroundColor: "#faad14" }}
                  />
                )}
              </Space>
            ),
            children: (
              <Card size="small">
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                  Những cách viết mà nhập nhanh liên tục không hiểu. Gán chúng cho đúng đơn vị thì
                  lần sau máy tự khớp.
                </Typography.Paragraph>
                <Table<UnmatchedAlias>
                  rowKey={(row) => `${row.entityType}-${row.text}`}
                  size="small"
                  loading={unmatchedQuery.isLoading}
                  columns={unmatchedColumns}
                  dataSource={unmatchedQuery.data ?? []}
                  scroll={{ x: 800 }}
                  locale={{ emptyText: "Không còn cách viết nào chưa nhận ra" }}
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={addOpen}
        title="Thêm cách viết"
        okText="Thêm"
        cancelText="Đóng"
        okButtonProps={{ disabled: !addEntityId || !addAliases.trim() }}
        confirmLoading={createMutation.isPending}
        onCancel={() => setAddOpen(false)}
        onOk={async () => {
          await createMutation.mutateAsync({
            entityType,
            entityId: addEntityId!,
            aliases: addAliases
              .split(/[\n,]/)
              .map((value) => value.trim())
              .filter(Boolean),
          });
          setAddOpen(false);
          setAddAliases("");
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Segmented
            value={entityType}
            options={ENTITY_TYPES}
            onChange={(value) => {
              setEntityType(value as SalesAliasEntityType);
              setAddEntityId(undefined);
            }}
          />
          {entityPicker()}
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Các cách viết, mỗi dòng hoặc cách nhau bởi dấu phẩy
            </Typography.Text>
            <Input.TextArea
              rows={4}
              value={addAliases}
              onChange={(e) => setAddAliases(e.target.value)}
              placeholder="Hải Linh, HL, Hai Linh HP"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        open={importOpen}
        title="Dán danh sách từ Excel"
        width={760}
        okText="Nhập"
        cancelText="Đóng"
        okButtonProps={{ disabled: !importText.trim() }}
        confirmLoading={importMutation.isPending}
        onCancel={() => {
          setImportOpen(false);
          setImportResult(undefined);
        }}
        onOk={async () => {
          const result = await importMutation.mutateAsync({ entityType, text: importText });
          setImportResult(result);
          setImportText("");
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Segmented
            value={entityType}
            options={ENTITY_TYPES}
            onChange={(value) => setEntityType(value as SalesAliasEntityType)}
          />
          <Input.TextArea rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={IMPORT_PLACEHOLDER} />

          {importResult && (
            <>
              <Alert
                type="success"
                showIcon
                message={`Đọc ${importResult.rows} dòng, khớp ${importResult.matchedEntities} đơn vị, thêm ${importResult.addedAliases} cách viết`}
              />
              {importResult.unknownEntities.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message="Không tìm được đơn vị cho các dòng sau"
                  description={
                    <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                      {importResult.unknownEntities.slice(0, 20).map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  }
                />
              )}
              {importResult.conflicts.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  message="Cách viết đang thuộc đơn vị khác — hệ thống không tự chuyển chủ"
                  description={
                    <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                      {importResult.conflicts.slice(0, 20).map((conflict) => (
                        <li key={`${conflict.alias}-${conflict.wanted}`}>
                          “{conflict.alias}” muốn gán cho {conflict.wanted}, hiện đang trỏ về{" "}
                          {conflict.currentlyPointsTo}
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
            </>
          )}
        </Space>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        title="Sửa cách viết"
        okText="Lưu"
        cancelText="Đóng"
        okButtonProps={{ disabled: !editName.trim() }}
        confirmLoading={updateMutation.isPending}
        onCancel={() => setEditTarget(undefined)}
        onOk={async () => {
          if (!editTarget) return;
          await updateMutation.mutateAsync({ id: editTarget.id, externalName: editName.trim() });
          setEditTarget(undefined);
        }}
      >
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
      </Modal>
    </div>
  );
}
