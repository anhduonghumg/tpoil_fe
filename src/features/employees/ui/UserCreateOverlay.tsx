// src/features/users/ui/UserCreateOverlay.tsx
import { Button, Form } from "antd";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UsersApi } from "../api";
import type { User } from "../types";
import UserCreateForm, { CreateUserInput } from "./UserCreateForm";
import CommonModal from "../../../shared/ui/CommonModal";
import CommonDrawer from "../../../shared/ui/CommonDrawer";
import { notify } from "../../../shared/lib/notification";

type Variant = "modal" | "drawer";

export default function UserCreateOverlay({
  variant = "drawer",
  open,
  onClose,
}: {
  variant?: Variant;
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<CreateUserInput>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: CreateUserInput) =>
      UsersApi.create(payload as Partial<User>),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
      notify.success("Tạo nhân viên thành công");
      onClose();
      nav(`/users/${u.id}`);
    },
    onError: () => notify.error("Tạo nhân viên thất bại"),
  });

  const content = (
    <UserCreateForm
      form={form}
      onSubmit={(p) => create.mutate(p)}
      loading={create.isPending}
    />
  );

  if (variant === "modal") {
    return (
      <CommonModal
        title="Thêm nhân viên"
        open={open}
        onCancel={onClose}
        onOk={() => form.submit()}
        loading={create.isPending}
        size="lg"
      >
        {content}
      </CommonModal>
    );
  }

  return (
    <CommonDrawer
      title="Thêm nhân viên"
      open={open}
      onClose={onClose}
      size="lg"
      confirmClose
      fullHeight
      loading={create.isPending}
      footer={
        <div style={{ textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={create.isPending}
          >
            Tạo mới
          </Button>
        </div>
      }
    >
      {content}
    </CommonDrawer>
  );
}
