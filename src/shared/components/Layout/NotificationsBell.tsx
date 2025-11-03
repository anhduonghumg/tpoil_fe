// layout/NotificationsBell.tsx
import { useMemo, useState } from "react";
import { Badge, Dropdown, Modal, Space, Table, Typography } from "antd";
import { BellOutlined, GiftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useBirthday } from "../../../features/users/hooks";

export default function NotificationsBell({
  extraCount = 0,
}: {
  extraCount?: number;
}) {
  const [openModal, setOpenModal] = useState(false);

  const month = new Date().getMonth() + 1;
  const { data } = useBirthday(month);

  const bdayCount = data?.count ?? 0;
  const hasBirthday = bdayCount > 0;
  const badgeCount = extraCount + (hasBirthday ? 1 : 0);

  const dropdownItems = useMemo(() => {
    const items: any[] = [];
    if (hasBirthday) {
      items.push({
        key: "birthday",
        icon: <GiftOutlined style={{ color: "#faad14" }} />,
        label: `Có ${bdayCount} sinh nhật trong tháng`,
        onClick: () => setOpenModal(true),
      });
    }
    if (!items.length) {
      items.push({ key: "empty", disabled: true, label: "Không có thông báo" });
    }
    return items;
  }, [hasBirthday, bdayCount]);

  const today = dayjs().date();
  const rows = (data?.items ?? []).map((u) => ({
    ...u,
    day: dayjs(u.dob).date(),
    month: dayjs(u.dob).month() + 1,
    isToday: dayjs(u.dob).date() === today,
    dobFmt: dayjs(u.dob).format("DD/MM/YYYY"),
  }));

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
      >
        <Table
          rowKey="id"
          size="small"
          columns={columns as any}
          dataSource={rows}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          locale={{ emptyText: "Tháng này chưa có sinh nhật." }}
          //   scroll={{ y: 360 }}
        />
      </Modal>
    </>
  );
}
