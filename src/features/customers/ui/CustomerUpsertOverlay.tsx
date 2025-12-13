import React, { useEffect } from "react";
import type { FormInstance } from "antd";
import {
  useCreateCustomer,
  useCustomerDetail,
  useUpdateCustomer,
} from "../hooks";
import type { Customer, CustomerRole, CustomerType } from "../types";
import CustomerCompactForm from "./CustomerCompactForm";
import OverlayForm from "../../employees/ui/OverlayForm";

type Mode = "create" | "edit";

interface CustomerUpsertOverlayProps {
  mode: Mode;
  open: boolean;
  customerId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CustomerUpsertOverlay: React.FC<CustomerUpsertOverlayProps> = ({
  mode,
  open,
  customerId,
  onClose,
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  const { data: detail, isLoading: detailLoading } = useCustomerDetail(
    isEdit ? customerId : undefined
  );
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const loading =
    createMutation.isPending || updateMutation.isPending || detailLoading;

  const title = isEdit ? "Sửa khách hàng" : "Thêm khách hàng";

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
        <CustomerUpsertFormContent
          form={form}
          mode={mode}
          open={open}
          customerId={customerId}
          detail={detail?.data}
          onCreate={(values) =>
            createMutation.mutate(values, {
              onSuccess: () => {
                onSuccess?.();
                onClose();
              },
            })
          }
          onUpdate={(values) =>
            updateMutation.mutate(values, {
              onSuccess: () => {
                onSuccess?.();
                onClose();
              },
            })
          }
        />
      )}
    </OverlayForm>
  );
};

interface CustomerUpsertFormContentProps {
  form: FormInstance;
  mode: Mode;
  open: boolean;
  customerId?: string;
  detail?: Customer;
  onCreate: (values: Partial<Customer>) => void;
  onUpdate: (values: Partial<Customer> & { id: string }) => void;
}

const CustomerUpsertFormContent: React.FC<CustomerUpsertFormContentProps> = ({
  form,
  mode,
  open,
  customerId,
  detail,
  onCreate,
  onUpdate,
}) => {
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (isEdit && detail) {
      form.setFieldsValue({
        code: detail.code,
        taxCode: detail.taxCode,
        name: detail.name,
        billingAddress: detail.billingAddress,
        shippingAddress: detail.shippingAddress,
        contactEmail: detail.contactEmail,
        contactPhone: detail.contactPhone,
        roles: detail.roles,
        type: detail.type,
        creditLimit: detail.creditLimit,
        paymentTermDays: detail.paymentTermDays,
        taxVerified: detail.taxVerified,
        taxSource: detail.taxSource,
        salesOwnerEmpId: detail?.salesOwnerEmpId ?? undefined,
        accountingOwnerEmpId: detail?.accountingOwnerEmpId ?? undefined,
        legalOwnerEmpId: detail?.legalOwnerEmpId ?? undefined,
        note: detail?.note ?? "",
      });
    }
  }, [open, isEdit, detail, form]);

  const handleFinish = (values: any) => {
    const payload: Partial<Customer> = {
      code: values.code || undefined,
      name: values.name,
      type: values.type as CustomerType,
      roles: values.roles as CustomerRole[] | undefined,
      taxCode: values.taxCode || undefined,
      billingAddress: values.billingAddress || undefined,
      shippingAddress: values.shippingAddress || undefined,
      contactEmail: values.contactEmail || undefined,
      contactPhone: values.contactPhone || undefined,
      creditLimit:
        values.creditLimit !== undefined
          ? Number(values.creditLimit)
          : undefined,
      paymentTermDays:
        values.paymentTermDays !== undefined
          ? Number(values.paymentTermDays)
          : undefined,
      taxVerified: !!values.taxVerified,
      taxSource: values.taxSource || undefined,
      salesOwnerEmpId: values?.salesOwnerEmpId ?? undefined,
      accountingOwnerEmpId: values?.accountingOwnerEmpId ?? undefined,
      legalOwnerEmpId: values?.legalOwnerEmpId ?? undefined,
      note: values?.note ?? "",
    };

    if (isEdit && customerId) {
      onUpdate({ id: customerId, ...payload });
    } else {
      onCreate(payload);
    }
  };

  return <CustomerCompactForm form={form} onFinish={handleFinish} />;
};
