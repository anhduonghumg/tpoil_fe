import React, { useEffect } from "react";
import type { FormInstance } from "antd";
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

  // console.log(detailRes);

  const detail = detailRes ?? [];

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
            await createMutation.mutateAsync({
              ...payload.user,
              employeeId: payload.employeeId ?? null,
              roleIds: payload.roleIds ?? [],
            });

            onSuccess?.();
            onClose();
          }}
          onUpdate={async (payload) => {
            if (!userId) return;

            await updateMutation.mutateAsync({
              id: userId,
              ...payload.user,
              employeeId: payload.employeeId ?? null,
              roleIds: payload.roleIds ?? [],
            });

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
    const isEditMode = mode === "edit";

    const userPayload: any = {
      email: values?.email?.trim(),
      name: values?.name?.trim() || null,
      isActive: !!values?.isActive,
    };

    if (!isEditMode) {
      userPayload.username = values?.username?.trim();
      userPayload.password = values?.password;
    }

    if (isEditMode && values?.passwordNew) {
      userPayload.password = values.passwordNew;
    }

    const payload = {
      user: userPayload,
      employeeId: values.employeeId ?? null,
      roleIds: values.roleIds ?? [],
    };

    if (isEditMode && userId) onUpdate(payload);
    else onCreate(payload);
  };

  useEffect(() => {
    if (!open) return;
    form.resetFields();

    if (isEdit) {
      form.setFieldsValue({
        username: detail?.username,
        email: detail?.email,
        name: detail?.name ?? "",
        isActive: !!detail?.isActive,
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
