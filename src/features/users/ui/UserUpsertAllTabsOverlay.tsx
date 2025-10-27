// src/modules/users/ui/UserUpsertAllTabsOverlay.tsx
import { Button, Form, Tabs } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";

import OverlayForm from "./OverlayForm";
import PersonalForm from "../ui/PersonalForm";
import CitizenForm from "../ui/CitizenForm";
import ContactForm from "../ui/ContactForm";
import EmploymentForm from "../ui/EmploymentForm";
import FinanceForm from "../ui/FinanceForm";

import { UsersApi } from "../api";
import type { Employee, User } from "../types";
import {
  collectFormsValues,
  TabFormRef,
  validateFormsSequential,
} from "../../../shared/ui/formUtils";
import { uploadImage } from "../../../shared/api/uploads";
import { notify } from "../../../shared/lib/notification";
import { extractApiError } from "../../../shared/lib/httpError";
import { useUserDetail } from "../hooks";
import { safeJson } from "../../../shared/lib/json";

type Mode = "create" | "edit";
const isBlobUrl = (u?: string) =>
  !!u && (u.startsWith("blob:") || u.startsWith("data:"));

export default function UserUpsertAllTabsOverlay({
  mode,
  id,
  open,
  onClose,
  variant = "modal",
}: {
  mode: Mode;
  id?: string;
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "modal";
}) {
  const [fPersonal] = Form.useForm();
  const [fEmployment] = Form.useForm();
  const [fCitizen] = Form.useForm();
  const [fContact] = Form.useForm();
  const [fFinance] = Form.useForm();

  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [activeKey, setActiveKey] = useState("personal");
  const uploadedUrlsRef = useRef<string[]>([]);
  const qc = useQueryClient();

  const detail = useUserDetail(id, open && mode === "edit");

  // Reset khi đóng
  useEffect(() => {
    if (!open) {
      fPersonal.resetFields();
      fEmployment.resetFields();
      fCitizen.resetFields();
      fContact.resetFields();
      fFinance.resetFields();
      setActiveKey("personal");
      setAvatarBlob(null);
      uploadedUrlsRef.current = [];
    }
  }, [open, fPersonal, fEmployment, fCitizen, fContact, fFinance]);

  useEffect(() => {
    if (!(open && mode === "edit")) return;
    const d: Employee | undefined = (detail.data as any)?.data ?? detail.data;
    if (!d) return;

    // console.log("user:", d);

    fPersonal.setFieldsValue({
      fullName: d.fullName,
      gender: d.gender,
      dob: d.dob ? dayjs(d.dob) : undefined,
      nationality: d.nationality,
      maritalStatus: d.maritalStatus,
      avatarUrl: d.avatarUrl,
    });

    fCitizen.setFieldsValue({
      type: d.citizen?.type,
      number: d.citizen?.number,
      issuedDate: d.citizen?.issuedDate
        ? dayjs(d.citizen?.issuedDate)
        : undefined,
      issuedPlace: d.citizen?.issuedPlace,
      expiryDate: d.citizen?.expiryDate
        ? dayjs(d.citizen?.expiryDate)
        : undefined,
      frontImageUrl: d.citizen?.frontImageUrl,
      backImageUrl: d.citizen?.backImageUrl,
    });

    const addrP =
      typeof d.addressPermanent === "string"
        ? safeJson(d.addressPermanent)
        : d.addressPermanent;

    const ap_codes = addrP
      ? [addrP.province, addrP.district, addrP.ward]
      : undefined;

    fContact.setFieldsValue({
      workEmail: d.workEmail,
      personalEmail: d.personalEmail,
      phone: d.phone,
      ap_codes,
      ap_street: addrP?.street,
      at_province: d.addressTemp?.province,
      at_district: d.addressTemp?.district,
      at_ward: d.addressTemp?.ward,
      at_street: d.addressTemp?.street,
      ec_name: d.emergency?.name,
      ec_relation: d.emergency?.relation,
      ec_phone: d.emergency?.phone,
    });

    fEmployment.setFieldsValue({
      status: d.status,
      joinedAt: d.joinedAt ? dayjs(d.joinedAt) : undefined,
      leftAt: d.leftAt ? dayjs(d.leftAt) : undefined,
      departmentName: d.memberships[0].departmentId
        ? {
            value: d.memberships[0].departmentId,
            label: d.memberships[0].departmentName,
          }
        : undefined,
      title: d.title,
      grade: d.grade,
      code: d.code,
      managerName: d.managerId
        ? { value: d.managerId, label: d.managerName }
        : undefined,
      siteId: d.siteId,
      floor: d.floor,
      area: d.area,
      desk: d.desk,
      accessCard: d.accessCard,
    });

    fFinance.setFieldsValue({
      pitCode: d.tax?.pitCode,
      siNumber: d.tax?.siNumber,
      hiNumber: d.tax?.hiNumber,
      bankName: d.banking?.bankName,
      branch: d.banking?.branch,
      accountNumber: d.banking?.accountNumber,
      accountHolder: d.banking?.accountHolder,
    });
  }, [
    open,
    mode,
    detail.data,
    fPersonal,
    fCitizen,
    fContact,
    fEmployment,
    fFinance,
  ]);

  const tabForms: TabFormRef[] = useMemo(
    () => [
      { key: "personal", form: fPersonal, required: true },
      { key: "citizen", form: fCitizen, required: true },
      { key: "contact", form: fContact, required: true },
      { key: "employment", form: fEmployment, required: true },
      { key: "finance", form: fFinance, required: true },
    ],
    [fPersonal, fCitizen, fContact, fEmployment, fFinance]
  );

  const mutate = useMutation({
    mutationFn: async (payload: Partial<User>) => {
      return mode === "create"
        ? UsersApi.create(payload)
        : UsersApi.update(id!, payload);
    },
    onSuccess: async () => {
      uploadedUrlsRef.current = [];
      qc.invalidateQueries({ queryKey: ["employees", "list"] });
      if (mode === "edit" && id)
        qc.invalidateQueries({ queryKey: ["employees", "detail", id] });
      notify.success(
        mode === "create"
          ? "Tạo nhân viên thành công"
          : "Cập nhật nhân viên thành công"
      );
      onClose();
    },
    onError: async (e) => {
      try {
        await deleteUploaded(uploadedUrlsRef.current);
      } finally {
        uploadedUrlsRef.current = [];
      }
      notify.error(extractApiError(e).message);
    },
  });

  const deleteUploaded = async (urls: string[]) => {
    if (!urls?.length) return;
    await fetch("/api/uploads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ urls }),
    });
  };

  const uploadPendingImages = async (vals: { avatarUrl?: string }) => {
    const out = { ...vals };
    if (avatarBlob && isBlobUrl(out.avatarUrl)) {
      const url = await uploadImage(avatarBlob, "employee/avatar", "avatar");
      out.avatarUrl = url;
      uploadedUrlsRef.current.push(url);
    }
    return out;
  };

  const handleSubmit = async () => {
    const ok = await validateFormsSequential(tabForms, setActiveKey);
    if (!ok) return;

    const all = collectFormsValues(tabForms);
    const p = all.personal;
    const e = all.employment;
    const ctz = all.citizen;
    const cont = all.contact;
    const fin = all.finance;

    const img = await uploadPendingImages({ avatarUrl: p.avatarUrl });
    const [ap_province, ap_district, ap_ward] = cont.ap_codes || [];

    const payload: Partial<User> = {
      // Personal
      fullName: p.fullName?.trim(),
      gender: p.gender,
      dob: p.dob?.format?.("DD-MM-YYYY"),
      nationality: p.nationality,
      maritalStatus: p.maritalStatus,
      avatarUrl: img.avatarUrl,

      // Contact
      workEmail: cont.workEmail,
      personalEmail: cont.personalEmail,
      phone: cont.phone,
      addressPermanent: ap_province
        ? {
            province: ap_province,
            district: ap_district,
            ward: ap_ward,
            street: cont.ap_street,
          }
        : undefined,
      addressTemp: cont.at_province
        ? {
            province: cont.at_province,
            district: cont.at_district,
            ward: cont.at_ward,
            street: cont.at_street,
          }
        : undefined,
      emergency:
        cont.ec_name || cont.ec_phone
          ? {
              name: cont.ec_name,
              relation: cont.ec_relation,
              phone: cont.ec_phone,
            }
          : undefined,

      // Citizen
      citizen: ctz.type
        ? {
            type: ctz.type,
            number: ctz.number,
            issuedDate: ctz.issuedDate?.format?.("DD-MM-YYYY"),
            issuedPlace: ctz.issuedPlace,
            expiryDate: ctz.expiryDate?.format?.("DD-MM-YYYY"),
            frontImageUrl: ctz.frontImageUrl,
            backImageUrl: ctz.backImageUrl,
          }
        : undefined,

      // Employment
      status: e.status || "active",
      joinedAt: e.joinedAt?.format?.("DD-MM-YYYY"),
      leftAt: e.leftAt?.format?.("DD-MM-YYYY"),
      departmentId: e.departmentName?.value,
      departmentName: e.departmentName?.label,
      title: e.title,
      grade: e.grade,
      code: e.code,
      managerId: e.managerName?.value,
      managerName: e.managerName?.label,
      siteId: e.siteId,
      floor: e.floor,
      area: e.area,
      desk: e.desk,
      accessCard: e.accessCard,

      // Finance
      tax:
        fin.pitCode || fin.siNumber || fin.hiNumber
          ? {
              pitCode: fin.pitCode,
              siNumber: fin.siNumber,
              hiNumber: fin.hiNumber,
            }
          : undefined,
      banking:
        fin.bankName || fin.accountNumber
          ? {
              bankName: fin.bankName,
              branch: fin.branch,
              accountNumber: fin.accountNumber,
              accountHolder: fin.accountHolder,
            }
          : undefined,
    };

    // console.log("payload:", payload);

    await mutate.mutateAsync(payload);
  };

  return (
    <OverlayForm
      title={mode === "create" ? "Thêm nhân viên" : "Sửa nhân viên"}
      open={open}
      onClose={onClose}
      variant={variant}
      size="xl"
      loading={
        mode === "edit"
          ? detail.isLoading || mutate.isPending
          : mutate.isPending
      }
      okText={mode === "create" ? "Lưu" : "Lưu thay đổi"}
      footerRender={({ submitting }) => (
        <div style={{ textAlign: "right" }}>
          <Button
            type="default"
            onClick={onClose}
            style={{ marginRight: 8 }}
            disabled={submitting}
            icon={<CloseCircleOutlined />}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            icon={<SaveOutlined />}
          >
            {mode === "create" ? "Lưu" : "Lưu thay đổi"}
          </Button>
        </div>
      )}
    >
      {() => (
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            {
              key: "personal",
              label: "Hồ sơ cá nhân",
              children: (
                <PersonalForm
                  form={fPersonal}
                  hideInlineSubmit
                  onSave={() => {}}
                  onAvatarTemp={({ blob }) => setAvatarBlob(blob)}
                />
              ),
              forceRender: true,
            },
            {
              key: "citizen",
              label: "Giấy tờ công dân",
              children: (
                <CitizenForm
                  form={fCitizen}
                  hideInlineSubmit
                  onSave={() => {}}
                />
              ),
              forceRender: true,
            },
            {
              key: "contact",
              label: "Liên hệ & Địa chỉ",
              children: (
                <ContactForm
                  form={fContact}
                  hideInlineSubmit
                  onSave={() => {}}
                />
              ),
              forceRender: true,
            },
            {
              key: "employment",
              label: "Công việc",
              children: (
                <EmploymentForm
                  form={fEmployment}
                  hideInlineSubmit
                  onSave={() => {}}
                />
              ),
              forceRender: true,
            },
            {
              key: "finance",
              label: "Thuế – BH – Ngân hàng",
              children: (
                <FinanceForm
                  form={fFinance}
                  hideInlineSubmit
                  onSave={() => {}}
                />
              ),
              forceRender: true,
            },
          ]}
        />
      )}
    </OverlayForm>
  );
}
