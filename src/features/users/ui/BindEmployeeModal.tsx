import React, { useEffect, useMemo, useState } from "react";
import { Modal, Select, Space, Tag } from "antd";
import type { UserRow } from "../types";
import { useSetUserEmployee } from "../hooks";
import { apiCall } from "../../../shared/lib/api";

type Props = {
  open: boolean;
  user: UserRow | null;
  onClose: () => void;
  onSuccess: () => void;
};

type EmpOpt = { label: string; value: string };

export function BindEmployeeModal({ open, user, onClose, onSuccess }: Props) {
  const { mutateAsync, isPending } = useSetUserEmployee();
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState<EmpOpt[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(user?.employee?.id ?? null);
    setKeyword("");
    setOptions([]);
  }, [open, user]);

  const fetchEmployees = async (kw: string) => {
    const res: any = await apiCall("employee.select", {
      query: { keyword: kw, limit: 10 },
    });
    // giả định response { items: [...] }
    const items = res?.data?.items ?? res?.data ?? [];
    const opts: EmpOpt[] = items.map((e: any) => ({
      value: e.id,
      label: `${e.code} — ${e.fullName ?? ""}`.trim(),
    }));
    setOptions(opts);
  };

  return (
    <Modal
      open={open}
      title={user ? `Gán nhân viên - ${user.username}` : "Gán nhân viên"}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={isPending}
      onOk={async () => {
        if (!user) return;
        await mutateAsync({ id: user.id, employeeId });
        onSuccess();
      }}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Select
          showSearch
          allowClear
          placeholder="Tìm nhân viên theo mã/tên"
          style={{ width: "100%" }}
          value={employeeId ?? undefined}
          filterOption={false}
          onSearch={(v) => {
            setKeyword(v);
            if (v.trim().length) fetchEmployees(v.trim());
          }}
          onChange={(v) => setEmployeeId(v ?? null)}
          options={options}
          notFoundContent={keyword ? "Không tìm thấy" : "Nhập từ khoá để tìm"}
        />

        {user?.employee ? (
          <Tag>
            Hiện đang gán: <b>{user.employee.code}</b> —{" "}
            {user.employee.fullName ?? "—"}
          </Tag>
        ) : (
          <div style={{ opacity: 0.65 }}>Hiện chưa gán nhân viên</div>
        )}

        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Chọn trống để <b>gỡ liên kết</b>.
        </div>
      </Space>
    </Modal>
  );
}
