import React, { useEffect } from "react";
import type { FormInstance } from "antd";
import { message } from "antd";
import OverlayForm from "../../employees/ui/OverlayForm";
import { useCreateUser, useUpdateUser, useUserDetail } from "../hooks";
import UserCompactForm from "./UserCompactForm";
import { UsersApi } from "../api";
import { notify } from "../../../shared/lib/notification";

type Mode = "create" | "edit";

interface UserUpsertOverlayProps {
  mode: Mode;
  open: boolean;
  userId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserUpsertOverlay: React.FC<UserUpsertOverlayProps> = ({
  mode,
  open,
  userId,
  onClose,
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  const { data: detailRes, isLoading: detailLoading } = useUserDetail(
    isEdit ? userId : undefined
  );

  const detail =
    detailRes?.data ?? detailRes?.data?.data ?? detailRes?.data?.data?.data;

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const loading =
    createMutation.isPending || updateMutation.isPending || detailLoading;

  const title = isEdit ? "Sửa user" : "Thêm user";

  return (
    <OverlayForm
      title={title}
      open={open}
      onClose={onClose}
      variant="modal"
      size="lg"
      loading={loading}
      confirmClose={true}
      fullHeight={false}
    >
      {({ form }) => (
        <UserUpsertFormContent
          form={form}
          mode={mode}
          open={open}
          userId={userId}
          detail={detail}
          onCreate={async (payload) => {
            const res: any = await createMutation.mutateAsync(payload.user);
            const newId =
              res?.data?.id ??
              res?.data?.data?.id ??
              res?.id ??
              res?.data?.data?.data?.id;

            if (!newId) {
              notify.error("Không lấy được userId sau khi tạo");
              return;
            }

            // 2) set employee + roles
            await Promise.all([
              UsersApi.setEmployee(newId, payload.employeeId ?? null),
              UsersApi.setRoles(newId, payload.roleIds ?? []),
            ]);

            onSuccess?.();
            onClose();
          }}
          onUpdate={async (payload) => {
            if (!userId) return;

            await updateMutation.mutateAsync({ id: userId, ...payload.user });

            await Promise.all([
              UsersApi.setEmployee(userId, payload.employeeId ?? null),
              UsersApi.setRoles(userId, payload.roleIds ?? []),
            ]);

            onSuccess?.();
            onClose();
          }}
        />
      )}
    </OverlayForm>
  );
};

interface UserUpsertFormContentProps {
  form: FormInstance;
  mode: Mode;
  open: boolean;
  userId?: string;
  detail?: any;

  onCreate: (payload: {
    user: any;
    employeeId?: string | null;
    roleIds?: string[];
  }) => void;

  onUpdate: (payload: {
    user: any;
    employeeId?: string | null;
    roleIds?: string[];
  }) => void;
}

const UserUpsertFormContent: React.FC<UserUpsertFormContentProps> = ({
  form,
  mode,
  open,
  userId,
  detail,
  onCreate,
  onUpdate,
}) => {
  const isEdit = mode === "edit";

  const handleFinish = (values: any) => {
    const userPayload: any = {
      username: values.username,
      email: values.email,
      name: values.name || null,
      isActive: !!values.isActive,
    };

    if (values.passwordNew) userPayload.password = values.passwordNew;

    const payload = {
      user: userPayload,
      employeeId: values.employeeId ?? null,
      roleIds: values.roleIds ?? [],
    };

    if (isEdit && userId) onUpdate(payload);
    else onCreate(payload);
  };

  useEffect(() => {
    if (!open) return;
    form.resetFields();

    if (isEdit) {
      form.setFieldsValue({
        username: detail.username,
        email: detail.email,
        name: detail.name ?? "",
        isActive: !!detail.isActive,
        employeeId: detail?.employee?.id ?? null,
        roleIds: (detail?.rolesGlobal ?? []).map((r: any) => r.id),
      });
    } else {
      form.setFieldsValue({
        isActive: true,
        employeeId: null,
        roleIds: [],
      });
    }
  }, [open, isEdit, detail, form]);

  return <UserCompactForm form={form} mode={mode} onFinish={handleFinish} />;
};
