import React, { useEffect } from "react";
import { type FormInstance } from "antd";
import {
  useCreateCustomer,
  useCustomerDetail,
  useUpdateCustomer,
} from "../hooks";
import type { Customer, CustomerRole, CustomerType, PartnerRole, PartyType } from "../types";
import CustomerCompactForm from "./CustomerCompactForm";
import OverlayForm from "../../employees/ui/OverlayForm";

type Mode = "create" | "edit";

interface CustomerUpsertOverlayProps {
  mode: Mode;
  open: boolean;
  customerId?: string;
  onClose: () => void;
  onSuccess?: () => void;
  partyTypeDefault?: PartyType;
  partnerRoleDefault?: PartnerRole;
}

export const CustomerUpsertOverlay: React.FC<CustomerUpsertOverlayProps> = ({
  mode,
  open,
  customerId,
  onClose,
  onSuccess,
  partyTypeDefault,
  partnerRoleDefault,
}) => {
  const isEdit = mode === "edit";

  const { data: detail, isLoading: detailLoading } = useCustomerDetail(
    isEdit ? customerId : undefined
  );
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const loading =
    createMutation.isPending || updateMutation.isPending || detailLoading;

  const title = isEdit
    ? partnerRoleDefault === "SHIP_OWNER" || partnerRoleDefault === "SEA_CARRIER"
      ? "Cập nhật chủ tàu / đơn vị vận tải biển"
      : partyTypeDefault === "SUPPLIER"
      ? "Cập nhật nhà cung cấp"
      : "Cập nhật khách hàng"
    : partnerRoleDefault === "SHIP_OWNER" || partnerRoleDefault === "SEA_CARRIER"
    ? "Thêm chủ tàu / đơn vị vận tải biển"
    : partyTypeDefault === "SUPPLIER"
    ? "Thêm nhà cung cấp"
    : "Thêm khách hàng";

  return (
    <OverlayForm
      title={title}
      open={open}
      onClose={onClose}
      variant="modal"
      size="xtra"
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
          partyTypeDefault={partyTypeDefault ?? "CUSTOMER"}
          partnerRoleDefault={partnerRoleDefault}
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
  partyTypeDefault: PartyType;
  partnerRoleDefault?: PartnerRole;
}

const CustomerUpsertFormContent: React.FC<CustomerUpsertFormContentProps> = ({
  form,
  mode,
  open,
  customerId,
  detail,
  onCreate,
  onUpdate,
  partyTypeDefault,
  partnerRoleDefault,
}) => {
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (isEdit && detail) {
      // ✅ Build partnerRoles từ flags; fallback từ partyType
      const partnerRoles: PartnerRole[] = [];

      const flagCustomer =
        detail.isCustomer ?? (detail.partyType === "CUSTOMER" ? true : false);
      const flagSupplier =
        detail.isSupplier ?? (detail.partyType === "SUPPLIER" ? true : false);
      const flagInternal =
        detail.isInternal ?? (detail.partyType === "INTERNAL" ? true : false);

      if (flagCustomer) partnerRoles.push("CUSTOMER");
      if (flagSupplier) partnerRoles.push("SUPPLIER");
      if (flagInternal) partnerRoles.push("INTERNAL");
      partnerRoles.push(...(detail.partnerRoles ?? []));

      // nếu data cũ thiếu hết flags thì default theo partyTypeDefault
      if (partnerRoles.length === 0) {
        partnerRoles.push(
          partnerRoleDefault
            ? partnerRoleDefault
            : partyTypeDefault === "SUPPLIER"
            ? "SUPPLIER"
            : partyTypeDefault === "INTERNAL"
            ? "INTERNAL"
            : "CUSTOMER"
        );
      }

      form.setFieldsValue({
        code: detail.code,
        taxCode: detail.taxCode,
        name: detail.name,
        billingAddress: detail.billingAddress,
        shippingAddress: detail.shippingAddress,
        contactEmail: detail.contactEmail,
        contactPhone: detail.contactPhone,
        bankAccountNo: detail.bankAccountNo,
        roles: detail.roles,
        merchantRole: detail.merchantRole ?? undefined,
        type: detail.type,
        partnerRoles,
        creditLimit: detail.creditLimit,
        paymentTermDays: detail.paymentTermDays,
        taxVerified: detail.taxVerified,
        taxSource: detail.taxSource,
        salesOwnerEmpId: detail?.salesOwnerEmpId ?? undefined,
        accountingOwnerEmpId: detail?.accountingOwnerEmpId ?? undefined,
        legalOwnerEmpId: detail?.legalOwnerEmpId ?? undefined,
        documentOwnerEmpId: (detail as any)?.documentOwnerEmpId ?? undefined,
        groupId: (detail as any)?.groupId ?? undefined,
        note: detail?.note ?? "",
      });
    }
  }, [open, isEdit, detail, form, partyTypeDefault, partnerRoleDefault]);

  const handleFinish = (values: any) => {
    const partnerRoles: PartnerRole[] = Array.isArray(values.partnerRoles)
      ? values.partnerRoles
      : [];

    const isCustomer = partnerRoles.includes("CUSTOMER");
    const isSupplier = partnerRoles.includes("SUPPLIER");
    const isInternal = partnerRoles.includes("INTERNAL");
    const specializedRoles = partnerRoles.filter(
      (role) => !["CUSTOMER", "SUPPLIER", "INTERNAL"].includes(role),
    ) as Customer["partnerRoles"];

    // ✅ partyType để tương thích data cũ / query cũ
    const partyType: PartyType = (() => {
      if (isInternal) return "INTERNAL";
      if (isSupplier && !isCustomer) return "SUPPLIER";
      return "CUSTOMER";
    })();

    const payload: Partial<Customer> = {
      code: values.code || undefined,
      name: values.name,
      type: values.type as CustomerType,
      roles: values.roles as CustomerRole[] | undefined,
      merchantRole: values.merchantRole ?? null,
      // flags + partyType
      isCustomer,
      isSupplier,
      isInternal,
      partnerRoles: specializedRoles,
      partyType,

      taxCode: values.taxCode || undefined,
      billingAddress: values.billingAddress || undefined,
      shippingAddress: values.shippingAddress || undefined,
      contactEmail: values.contactEmail || undefined,
      contactPhone: values.contactPhone || undefined,
      bankAccountNo: values.bankAccountNo || undefined,

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
      documentOwnerEmpId: values?.documentOwnerEmpId ?? undefined,
      groupId: values?.groupId ?? undefined,

      note: values?.note ?? "",
    };

    if (isEdit && customerId) {
      onUpdate({ id: customerId, ...payload });
    } else {
      onCreate(payload);
    }
  };

  return (
    <CustomerCompactForm
      form={form}
      onFinish={handleFinish}
      partyTypeDefault={partyTypeDefault}
      partnerRoleDefault={partnerRoleDefault}
    />
  );
};
