import { useMemo, useState } from "react";
import { Badge, Modal, Space, Table, Tooltip, Typography } from "antd";
import { GiftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppSession } from "../../authz/AppSessionProvider";
import "../../../features/notifications/notification-center.css";

/**
 * Sinh nhật trong tháng tách khỏi trung tâm thông báo: đây là lời nhắc lặp lại
 * theo tháng chứ không phải việc cần xử lý, nên có nút riêng cạnh chuông.
 */
export default function BirthdaysButton() {
  const { bootstrap } = useAppSession();
  const [open, setOpen] = useState(false);

  const birthdays = bootstrap?.data?.notifications?.birthdays;
  const birthdayCount = birthdays?.count ?? 0;

  const rows = useMemo(() => {
    const today = dayjs().date();
    return (
      birthdays?.items?.map((employee: any) => {
        const dob = dayjs(employee.dob);
        return {
          ...employee,
          dobFmt: dob.format("DD/MM/YYYY"),
          isToday: dob.date() === today,
        };
      }) ?? []
    );
  }, [birthdays?.items]);

  if (!birthdayCount) return null;

  return (
    <>
      <Tooltip title={`Sinh nhật trong tháng: ${birthdayCount} nhân viên`}>
        <Badge count={birthdayCount} size="small" offset={[-2, 3]} color="#faad14">
          <button
            type="button"
            className="notification-bell-button is-birthday"
            aria-label={`Sinh nhật trong tháng, ${birthdayCount} nhân viên`}
            onClick={() => setOpen(true)}
          >
            <GiftOutlined />
          </button>
        </Badge>
      </Tooltip>

      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: "#faad14" }} />
            <span>Sinh nhật tháng {birthdays?.month ?? dayjs().month() + 1}</span>
          </Space>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
      >
        <Typography.Text type="secondary">
          Có {birthdayCount} nhân viên có sinh nhật trong tháng này.
        </Typography.Text>
        <Table
          rowKey="id"
          size="small"
          style={{ marginTop: 12 }}
          columns={[
            { title: "Nhân viên", dataIndex: "fullName", key: "fullName" },
            {
              title: "Ngày sinh",
              dataIndex: "dobFmt",
              key: "dobFmt",
              align: "center",
            },
          ]}
          dataSource={rows}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
        />
      </Modal>
    </>
  );
}
