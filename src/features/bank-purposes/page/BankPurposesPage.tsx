import { useState } from "react";
import { Button, Card, Input, Space } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useBankPurposeList } from "../hooks";
import { BankPurposesTable } from "../ui/BankPurposesTable";
import { BankPurposeUpsertOverlay } from "../ui/BankPurposeUpsertOverlay";
import type { BankTransactionPurposeItem } from "../types";

export default function BankPurposesPage() {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [openOverlay, setOpenOverlay] = useState(false);
  const [editingRow, setEditingRow] =
    useState<BankTransactionPurposeItem | null>(null);

  const { data, isLoading } = useBankPurposeList({
    keyword,
    page,
    pageSize,
  });

  function handleOpenCreate() {
    setEditingRow(null);
    setOpenOverlay(true);
  }

  function handleOpenEdit(row: BankTransactionPurposeItem) {
    setEditingRow(row);
    setOpenOverlay(true);
  }

  return (
    <Space direction="vertical" size={16} style={{ display: "flex" }}>
      {/* <Card> */}
      <Space wrap>
        <Input
          size="small"
          allowClear
          value={draftKeyword}
          placeholder="Tìm mã, tên, phân hệ..."
          style={{ width: 320 }}
          onChange={(e) => setDraftKeyword(e.target.value)}
          onPressEnter={() => {
            setPage(1);
            setKeyword(draftKeyword.trim());
          }}
        />

        <Button
          size="small"
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => {
            setPage(1);
            setKeyword(draftKeyword.trim());
          }}
        >
          Tìm kiếm
        </Button>

        <Button size="small" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Thêm mục đích
        </Button>
      </Space>
      {/* </Card> */}

      {/* <Card sty={{ padding: 0 }}> */}
      <BankPurposesTable
        loading={isLoading}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onChangePage={(p, ps) => {
          setPage(p);
          setPageSize(ps);
        }}
        onEdit={handleOpenEdit}
      />
      {/* </Card> */}

      <BankPurposeUpsertOverlay
        open={openOverlay}
        initialValues={editingRow}
        onClose={() => setOpenOverlay(false)}
      />
    </Space>
  );
}
