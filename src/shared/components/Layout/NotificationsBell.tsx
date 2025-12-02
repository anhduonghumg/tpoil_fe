// layout/NotificationsBell.tsx
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
import { useAppBootstrap } from "../../../features/app/hooks";

export default function NotificationsBell({
  extraCount = 0,
}: {
  extraCount?: number;
}) {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);

  // === Lấy dữ liệu notifications từ /app/bootstrap ===
  const { data, isLoading } = useAppBootstrap();

  const birthdays = data?.notifications?.birthdays;
  const contracts = data?.notifications?.contracts;

  // console.log("NotificationsBell data", { birthdays, contracts });

  // --- Sinh nhật ---
  const bdayCount = birthdays?.count ?? 0;
  const hasBirthday = bdayCount > 0;
  const month = birthdays?.month ?? new Date().getMonth() + 1;

  // --- Hợp đồng ---
  const expiringCount = contracts?.expiringCount ?? 0;
  const expiredCount = contracts?.expiredCount ?? 0;
  const hasContracts = expiringCount + expiredCount > 0;

  // Tổng badge: mỗi loại thông báo +1, cộng thêm extraCount nếu bạn muốn
  const badgeCount =
    extraCount + (hasBirthday ? 1 : 0) + (hasContracts ? 1 : 0);

  // Menu dropdown
  const dropdownItems: MenuProps["items"] = useMemo(() => {
    const items: MenuProps["items"] = [];

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
        label: `Có ${expiringCount} hợp đồng sắp hết hạn, ${expiredCount} hợp đồng đã quá hạn`,
        onClick: () => {
          navigate("/contracts/expiry-report");
        },
      });
    }

    if (!items.length) {
      items.push({
        key: "empty",
        disabled: true,
        label: "Không có thông báo",
      });
    }

    return items;
  }, [
    hasBirthday,
    hasContracts,
    bdayCount,
    expiringCount,
    expiredCount,
    navigate,
  ]);

  // Dữ liệu bảng sinh nhật lấy từ bootstrap.notifications.birthdays.items
  const today = dayjs().date();
  const rows =
    birthdays?.items?.map((u) => {
      const dob = dayjs(u.dob);
      return {
        ...u,
        day: dob.date(),
        month: dob.month() + 1,
        isToday: dob.date() === today,
        dobFmt: dob.format("DD/MM/YYYY"),
      };
    }) ?? [];

  const columns = [
    {
      title: "Nhân viên",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Ngày sinh",
      dataIndex: "dobFmt",
      key: "dobFmt",
      width: "auto",
      sorter: (a: any, b: any) => a.day - b.day,
      defaultSortOrder: "ascend" as const,
      align: "center" as const,
    },
  ];

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

      {/* Modal danh sách sinh nhật */}
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
        confirmLoading={isLoading}
      >
        <Table
          rowKey="id"
          size="small"
          columns={columns as any}
          dataSource={rows}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          locale={{ emptyText: "Tháng này chưa có sinh nhật." }}
        />
      </Modal>
    </>
  );
}
