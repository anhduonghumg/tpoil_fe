// src/features/users/pages/UserDetail.tsx
import { useEffect } from "react";
import { Card, Tabs, Space, Typography, Tag, Skeleton, App } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useUserDetail, useUpsertUser } from "../hooks";
import type { User } from "../types";
import PersonalForm from "../ui/PersonalForm";
import CitizenForm from "../ui/CitizenForm";
import ContactForm from "../ui/ContactForm";
import EmploymentForm from "../ui/EmploymentForm";
import FinanceForm from "../ui/FinanceForm";

export default function UserDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const nav = useNavigate();
  const { message } = App.useApp();
  const detail = useUserDetail(!isNew ? id : undefined);
  const upsert = useUpsertUser(!isNew ? id : undefined);

  const data = detail.data as User | undefined;

  useEffect(() => {
    if (!isNew && detail.isError) {
      message.error("Không tải được dữ liệu người dùng");
      nav("/users", { replace: true });
    }
  }, [detail.isError]);

  const header = (
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      <Space align="center" size={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {data?.name || "Người dùng mới"}
        </Typography.Title>
        {data?.status && (
          <Tag
            color={
              {
                active: "green",
                probation: "blue",
                inactive: "default",
                quit: "red",
              }[data.status] || "default"
            }
          >
            {{
              active: "Đang làm",
              probation: "Thử việc",
              inactive: "Tạm dừng",
              quit: "Nghỉ việc",
            }[data.status] || data.status}
          </Tag>
        )}
      </Space>
      {data && (
        <Typography.Text type="secondary">
          {data.joinedAt} → {data.leftAt || "nay"} •{" "}
          {data.departmentName || "—"} • {data.title || "—"}
        </Typography.Text>
      )}
    </Space>
  );

  const onSave = async (patch: Partial<User>) => {
    try {
      const res = await upsert.mutateAsync(patch);
      message.success("Lưu thay đổi thành công");
      if (isNew) nav(`/users/${res.id}`, { replace: true });
    } catch {
      message.error("Lưu thất bại");
    }
  };

  if (!isNew && detail.isLoading) return <Skeleton active />;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>{header}</Card>
      <Card>
        <Tabs
          defaultActiveKey="personal"
          items={[
            {
              key: "personal",
              label: "Hồ sơ cá nhân",
              children: <PersonalForm data={data} onSave={onSave} />,
            },
            {
              key: "citizen",
              label: "Giấy tờ công dân",
              children: <CitizenForm data={data} onSave={onSave} />,
            },
            {
              key: "contact",
              label: "Liên hệ & Địa chỉ",
              children: <ContactForm data={data} onSave={onSave} />,
            },
            {
              key: "employment",
              label: "Công việc",
              children: <EmploymentForm data={data} onSave={onSave} />,
            },
            {
              key: "finance",
              label: "Thuế – BH – Ngân hàng",
              children: <FinanceForm data={data} onSave={onSave} />,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
