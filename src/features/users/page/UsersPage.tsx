import React, { useMemo, useState } from "react";
import { Button, Row, Col, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { UsersFilters, UsersFilterValue } from "../ui/UsersFilters";
import { UsersTable } from "../ui/UsersTable";
import { UserUpsertOverlay } from "../ui/UserUpsertOverlay";
import { useUsersList } from "../hooks";
import { ActionKey } from "../../../shared/ui/CommonActionMenu";

type ActionModal =
  | { type: "view"; userId: string }
  | { type: "resetPassword"; userId: string }
  | { type: "assignEmployee"; userId: string }
  | { type: "assignRoles"; userId: string }
  | null;

export default function UsersPage() {
  const [filter, setFilter] = useState<UsersFilterValue>({
    draftKeyword: "",
    keyword: undefined,
  });

  const [paging, setPaging] = useState({
    page: 1,
    pageSize: 20,
  });

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [actionModal, setActionModal] = useState<ActionModal>(null);

  const queryParams = useMemo(
    () => ({
      page: paging.page,
      pageSize: paging.pageSize,
      keyword: filter.keyword,
    }),
    [paging, filter]
  );

  const { data, isFetching } = useUsersList(queryParams);

  const onSearch = () => {
    setFilter((f) => ({ ...f, keyword: f.draftKeyword?.trim() || undefined }));
    setPaging((p) => ({ ...p, page: 1 }));
  };

  const onCreate = () => {
    setMode("create");
    setSelectedUserId(undefined);
    setUpsertOpen(true);
  };

  const onEdit = (id: string) => {
    setMode("edit");
    setSelectedUserId(id);
    setUpsertOpen(true);
  };

  const onDelete = (id: string) => {};

  const onAction = (id: string, action: ActionKey) => {
    if (action === "edit") return onEdit(id);
    if (action === "view") return setActionModal({ type: "view", userId: id });
    if (action === "resetPassword")
      return setActionModal({ type: "resetPassword", userId: id });
    if (action === "assignEmployee")
      return setActionModal({ type: "assignEmployee", userId: id });
    if (action === "assignRoles")
      return setActionModal({ type: "assignRoles", userId: id });
    if (action === "delete") return onDelete(id);
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      {/* Filter bar */}
      <Row gutter={8} align="middle">
        <Col flex="auto">
          <UsersFilters
            value={filter}
            onChange={setFilter}
            onSearch={onSearch}
          />
        </Col>
        <Col>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            Tạo user
          </Button>
        </Col>
      </Row>

      {/* Table */}
      <UsersTable
        loading={isFetching}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? paging.page}
        pageSize={data?.pageSize ?? paging.pageSize}
        onChangePage={(page, pageSize) => setPaging({ page, pageSize })}
        onEdit={onEdit}
        onAction={onAction}
      />

      {/* Upsert */}
      <UserUpsertOverlay
        mode={mode}
        open={upsertOpen}
        userId={selectedUserId}
        onClose={() => setUpsertOpen(false)}
        onSuccess={() => setUpsertOpen(false)}
      />
    </Space>
  );
}
