import { Button, Form, Tabs } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UsersApi } from "../api";
import type { User } from "../types";

import PersonalForm from "../ui/PersonalForm";
import CitizenForm from "../ui/CitizenForm";
import ContactForm from "../ui/ContactForm";
import EmploymentForm from "../ui/EmploymentForm";
import FinanceForm from "../ui/FinanceForm";
import OverlayForm from "./OverlayForm";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  collectFormsValues,
  TabFormRef,
  validateFormsSequential,
} from "../../../shared/ui/formUtils";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { notify } from "../../../shared/lib/notification";
import { uploadImage } from "../../../shared/api/uploads";
import { extractApiError } from "../../../shared/lib/httpError";

const isBlobUrl = (u?: string) =>
  !!u && (u.startsWith("blob:") || u.startsWith("data:"));

export default function UserCreateAllTabsOverlay({
  open,
  onClose,
  variant = "drawer",
}: {
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
  const [ctzFrontBlob, setCtzFrontBlob] = useState<Blob | null>(null);
  const [ctzBackBlob, setCtzBackBlob] = useState<Blob | null>(null);
  const [activeKey, setActiveKey] = useState("personal");

  const qc = useQueryClient();
  // const depts = useAllDepts();
  const uploadedUrlsRef = useRef<string[]>([]);

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

  const create = useMutation({
    mutationFn: (payload: Partial<User>) => UsersApi.create(payload),
    onSuccess: () => {
      uploadedUrlsRef.current = [];
      qc.invalidateQueries({ queryKey: ["employees", "list"] });
      notify.success("Tạo nhân viên thành công");
      onClose();
    },
    onError: async (e) => {
      try {
        // console.log("avc", uploadedUrlsRef.current);
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
    // const tasks: Array<Promise<void>> = [];
    // if (avatarBlob && isBlobUrl(vals.avatarUrl)) {
    //   tasks.push(
    //     uploadImage(avatarBlob, "employee/avatar", "avatar").then((url) => {
    //       vals.avatarUrl = url;
    //     })
    //   );
    // }
    // await Promise.all(tasks);
    // return vals;

    const out = { ...vals };
    if (avatarBlob && isBlobUrl(out.avatarUrl)) {
      const url = await uploadImage(avatarBlob, "employee/avatar", "avatar");
      out.avatarUrl = url;
      uploadedUrlsRef.current.push(url);
    }
    return out;
  };

  const handleCreate = async () => {
    const isValid = await validateFormsSequential(tabForms, setActiveKey);

    if (!isValid) {
      return;
    }

    const all = collectFormsValues(tabForms);
    const pVals = all.personal;
    const eVals = all.employment;
    const ctz = all.citizen;
    const cont = all.contact;
    const fin = all.finance;

    const imageVals = await uploadPendingImages({
      avatarUrl: pVals.avatarUrl,
    });

    const [ap_province, ap_district, ap_ward] = cont.ap_codes || [];

    // Chuẩn hoá về payload BE (đúng contract bạn đang dùng)
    const payload: Partial<User> = {
      // Personal
      fullName: pVals.fullName?.trim(),
      gender: pVals.gender,
      dob: pVals.dob?.format?.("DD-MM-YYYY"),
      nationality: pVals.nationality,
      maritalStatus: pVals.maritalStatus,
      avatarUrl: imageVals.avatarUrl,

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

      // Employment (bắt buộc)
      status: eVals.status || "active",
      joinedAt: eVals.joinedAt?.format?.("DD-MM-YYYY"),
      leftAt: eVals.leftAt?.format?.("DD-MM-YYYY"),
      departmentId: eVals.departmentName.value,
      departmentName: eVals.departmentName.label,
      title: eVals.title,
      grade: eVals.grade,
      code: eVals.code,
      managerId: eVals.managerName?.value,
      managerName: eVals.managerName?.label,
      siteId: eVals.siteId,
      floor: eVals.floor,
      area: eVals.area,
      desk: eVals.desk,
      accessCard: eVals.accessCard,

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

    // console.log("test", de)
    // console.log("Creating user with payload", payload);
    const rs = await create.mutateAsync(payload);
  };

  return (
    <OverlayForm
      title="Thêm nhân viên"
      open={open}
      onClose={onClose}
      variant={variant}
      size="xl"
      loading={create.isPending}
      okText="Tạo & mở chi tiết"
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
            onClick={handleCreate}
            loading={submitting}
            icon={<SaveOutlined />}
          >
            Lưu
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
