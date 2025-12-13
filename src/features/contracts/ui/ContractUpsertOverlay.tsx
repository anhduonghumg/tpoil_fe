// features/contracts/ui/ContractUpsertOverlay.tsx
import React, { useEffect, useState } from "react";
import { Form } from "antd";
import type { FormInstance } from "antd";
import dayjs from "dayjs";
import {
  useContractDetail,
  useCreateContract,
  useUpdateContract,
  useContractsForRenewal,
  useCreateContractAttachment, // <-- NEW
} from "../hooks";
import type { Contract, ContractFormValues } from "../types";
import type { ContractUpsertPayload } from "../types";
import OverlayForm from "../../employees/ui/OverlayForm";
import {
  ContractAttachmentsCreateSection,
  ContractAttachmentsEditSection,
  PendingContractAttachment,
} from "./ContractAttachmentsSection";
import { ContractCompactForm } from "./ContractFormCompact";
// import { createContractAttachment } from "../api";

type Mode = "create" | "edit";

interface ContractUpsertOverlayProps {
  mode: Mode;
  open: boolean;
  contractId?: string;
  defaultCustomerId?: string | null;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

export const ContractUpsertOverlay: React.FC<ContractUpsertOverlayProps> = ({
  mode,
  open,
  contractId,
  defaultCustomerId,
  onClose,
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  const { data: detail, isLoading: detailLoading } = useContractDetail(
    isEdit ? contractId : undefined
  );

  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract(contractId || "");
  const createAttachmentMutation = useCreateContractAttachment();

  const loading =
    detailLoading || createMutation.isPending || updateMutation.isPending;

  const [pendingAttachments, setPendingAttachments] = useState<
    PendingContractAttachment[]
  >([]);

  const title = isEdit ? "Sửa hợp đồng" : "Thêm hợp đồng";

  const handleClose = () => {
    setPendingAttachments([]);
    onClose();
  };

  return (
    <OverlayForm
      title={title}
      open={open}
      onClose={handleClose}
      variant="modal"
      size="xl"
      loading={loading}
      confirmClose={true}
      fullHeight={true}
    >
      {({ form }) => (
        <ContractUpsertFormContent
          form={form}
          mode={mode}
          open={open}
          contractId={contractId}
          detail={detail}
          defaultCustomerId={defaultCustomerId}
          onCreate={async (values, attachments) => {
            const payload = mapFormToPayload(values);

            const created = await createMutation.mutateAsync(payload);
            const contractIdCreated = created?.data?.id;

            // ====== TẠO ATTACHMENTS SAU KHI TẠO HĐ ======
            if (contractIdCreated && attachments.length) {
              await Promise.all(
                attachments.map((att) =>
                  createAttachmentMutation.mutateAsync({
                    contractId: contractIdCreated,
                    fileName: att.fileName,
                    fileUrl: att.fileUrl,
                    category: att.category ?? null,
                    externalUrl: att.externalUrl ?? undefined,
                  })
                )
              );
            }

            setPendingAttachments([]);
            onSuccess?.(contractIdCreated as string);
            handleClose();
          }}
          onUpdate={async (values) => {
            if (!contractId) return;
            const payload = mapFormToPayload(values);
            const updated = await updateMutation.mutateAsync({
              id: contractId,
              body: payload,
            });

            onSuccess?.(updated?.data?.id);
            handleClose();
          }}
          pendingAttachments={pendingAttachments}
          onPendingAttachmentsChange={setPendingAttachments}
        />
      )}
    </OverlayForm>
  );
};

// map từ form values → payload gửi backend
function mapFormToPayload(values: ContractFormValues): ContractUpsertPayload {
  return {
    customerId: values.customerId ?? null,
    contractTypeId: values.contractTypeId,
    code: values.code,
    name: values.name,
    startDate: values.startDate.format("YYYY-MM-DD"),
    endDate: values.endDate.format("YYYY-MM-DD"),
    status: values.status,
    paymentTermDays:
      typeof values.paymentTermDays === "number"
        ? values.paymentTermDays
        : null,
    creditLimitOverride:
      typeof values.creditLimitOverride === "number"
        ? values.creditLimitOverride
        : null,
    riskLevel: values.riskLevel,
    sla: values.sla ?? null,
    deliveryScope: values.deliveryScope ?? null,
    renewalOfId: values.renewalOfId ?? null,
    approvalRequestId: values.approvalRequestId ?? null,
  };
}

interface ContractUpsertFormContentProps {
  form: FormInstance;
  mode: Mode;
  open: boolean;
  contractId?: string;
  detail?: Contract;
  defaultCustomerId?: string | null;
  onCreate: (
    values: ContractFormValues,
    attachments: PendingContractAttachment[]
  ) => void | Promise<void>;
  onUpdate: (
    values: ContractFormValues & { id?: string }
  ) => void | Promise<void>;

  pendingAttachments: PendingContractAttachment[];
  onPendingAttachmentsChange: (next: PendingContractAttachment[]) => void;
}

const ContractUpsertFormContent: React.FC<ContractUpsertFormContentProps> = ({
  form,
  mode,
  open,
  detail,
  defaultCustomerId,
  onCreate,
  onUpdate,
  pendingAttachments,
  onPendingAttachmentsChange,
}) => {
  const isEdit = mode === "edit";

  // ====== WATCH customerId để load HĐ có thể chọn làm HĐ gốc ======
  const watchedCustomerId =
    Form.useWatch("customerId", form) ?? defaultCustomerId ?? null;

  const { data: renewalContracts = [], isLoading: renewalLoading } =
    useContractsForRenewal(watchedCustomerId ?? undefined, detail?.id);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (isEdit && detail) {
      form.setFieldsValue({
        customerId: detail.customerId ?? defaultCustomerId,
        contractTypeId: detail.contractTypeId,
        code: detail.code,
        name: detail.name,
        startDate: dayjs(detail.startDate),
        endDate: dayjs(detail.endDate),
        status: detail.status,
        paymentTermDays: detail.paymentTermDays ?? undefined,
        creditLimitOverride: detail.creditLimitOverride ?? undefined,
        riskLevel: detail.riskLevel,
        sla: detail.sla ?? undefined,
        deliveryScope: detail.deliveryScope ?? undefined,
        renewalOfId: detail.renewalOfId ?? undefined,
        approvalRequestId: detail.approvalRequestId ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: "Active",
        riskLevel: "Low",
        paymentTermDays: 15,
      });
    }
  }, [open, isEdit, detail, defaultCustomerId, form]);

  const handleFinish = (values: ContractFormValues) => {
    const payload: ContractFormValues = {
      customerId: values.customerId ?? null,
      contractTypeId: values.contractTypeId,

      code: values.code,
      name: values.name,

      startDate: values.startDate,
      endDate: values.endDate,

      status: values.status,
      paymentTermDays:
        values.paymentTermDays !== undefined
          ? Number(values.paymentTermDays)
          : null,
      creditLimitOverride:
        values.creditLimitOverride !== undefined
          ? Number(values.creditLimitOverride)
          : null,

      riskLevel: values.riskLevel,
      sla: values.sla ?? null,
      deliveryScope: values.deliveryScope ?? null,

      renewalOfId: values.renewalOfId ?? null,
      approvalRequestId: values.approvalRequestId ?? null,
    };
    if (isEdit) {
      onUpdate({ id: detail?.id, ...payload });
    } else {
      onCreate(payload, pendingAttachments);
    }
  };

  return (
    <>
      <ContractCompactForm
        form={form}
        onFinish={handleFinish}
        renewalOptions={renewalContracts}
        renewalLoading={renewalLoading}
      />

      {mode === "create" && (
        <ContractAttachmentsCreateSection
          attachments={pendingAttachments}
          onChange={onPendingAttachmentsChange}
        />
      )}

      {isEdit && detail?.id && (
        <ContractAttachmentsEditSection
          contractId={detail.id}
          initialAttachments={detail.attachments ?? []}
        />
      )}
    </>
  );
};
