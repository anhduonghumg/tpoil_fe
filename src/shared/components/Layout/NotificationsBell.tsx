import { useMemo, useState } from "react";
import {
  Badge,
  Dropdown,
  Modal,
  Space,
  Table,
  Typography,
  type MenuProps,
} from "antd";
import {
  BellOutlined,
  GiftOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAppSession } from "../../authz/AppSessionProvider";

export default function NotificationsBell({
  extraCount = 0,
}: {
  extraCount?: number;
}) {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const { ready, bootstrap } = useAppSession();

  const birthdays = bootstrap?.data?.notifications?.birthdays;
  const contracts = bootstrap?.data?.notifications?.contracts;

  const bdayCount = birthdays?.count ?? 0;
  const hasBirthday = bdayCount > 0;
  const month = birthdays?.month ?? new Date().getMonth() + 1;

  const expiringCount = contracts?.expiringCount ?? 0;
  const expiredCount = contracts?.expiredCount ?? 0;
  const hasContracts = expiringCount + expiredCount > 0;

  const badgeCount =
    extraCount + (hasBirthday ? 1 : 0) + (hasContracts ? 1 : 0);

  const dropdownItems: MenuProps["items"] = useMemo(() => {
    const items: MenuProps["items"] = [];
    if (!ready)
      return [{ key: "loading", disabled: true, label: "Đang tải..." }];

    if (hasBirthday) {
      items.push({
        key: "birthday",
        icon: <GiftOutlined style={{ color: "#faad14" }} />,
        label: `Có ${bdayCount} sinh nhật trong tháng`,
        onClick: () => setOpenModal(true),
      });
    }
    if (hasContracts) {
      items.push({
        key: "contracts-expiry",
        icon: <FileTextOutlined style={{ color: "#1890ff" }} />,
        label: `Có ${expiringCount} sắp hết hạn, ${expiredCount} quá hạn`,
        onClick: () => navigate("/contracts/expiry-report"),
      });
    }
    if (!items.length)
      items.push({ key: "empty", disabled: true, label: "Không có thông báo" });
    return items;
  }, [
    ready,
    hasBirthday,
    hasContracts,
    bdayCount,
    expiringCount,
    expiredCount,
    navigate,
  ]);

  const today = dayjs().date();
  const rows =
    birthdays?.items?.map((u: any) => {
      const dob = dayjs(u.dob);
      return {
        ...u,
        day: dob.date(),
        dobFmt: dob.format("DD/MM/YYYY"),
        isToday: dob.date() === today,
      };
    }) ?? [];

  return (
    <>
      <Dropdown
        menu={{ items: dropdownItems }}
        trigger={["click"]}
        placement="bottomRight"
        overlayStyle={{ width: 280 }}
      >
        <Badge count={badgeCount} size="small" offset={[-2, 2]}>
          <BellOutlined className="icon-btn" />
        </Badge>
      </Dropdown>

      <Modal
        title={
          <Space style={{ alignItems: "center" }}>
            <GiftOutlined style={{ color: "#faad14", fontSize: 18 }} />
            <Typography.Text strong style={{ fontSize: 16 }}>
              Sinh nhật tháng {month}
            </Typography.Text>
          </Space>
        }
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        width={560}
      >
        <Table
          rowKey="id"
          size="small"
          columns={
            [
              { title: "Nhân viên", dataIndex: "fullName", key: "fullName" },
              {
                title: "Ngày sinh",
                dataIndex: "dobFmt",
                key: "dobFmt",
                align: "center" as const,
              },
            ] as any
          }
          dataSource={rows}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          locale={{ emptyText: "Tháng này chưa có sinh nhật." }}
        />
      </Modal>
    </>
  );
}
