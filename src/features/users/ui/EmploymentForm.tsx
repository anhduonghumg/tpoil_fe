import {
  Button,
  Col,
  DatePicker,
  Form,
  FormInstance,
  Input,
  Row,
  Select,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import type { User } from "../types";

export default function EmploymentForm({
  data,
  onSave,
  form: externalForm,
  hideInlineSubmit = false,
}: {
  data?: User;
  form?: FormInstance;
  hideInlineSubmit?: boolean;
  onSave: (p: Partial<User>) => void;
}) {
  const [internal] = Form.useForm();
  const form = externalForm ?? internal;
  const init = {
    departmentId: data?.departmentId,
    departmentName: data?.departmentName,
    title: data?.title,
    grade: data?.grade,
    status: data?.status || "active",
    code: data?.code,
    managerName: data?.managerName,
    joinedAt: data?.joinedAt ? dayjs(data.joinedAt, "DD-MM-YYYY") : undefined,
    leftAt: data?.leftAt ? dayjs(data.leftAt, "DD-MM-YYYY") : undefined,

    site: data?.site,
    floor: data?.floor,
    area: data?.area,
    desk: data?.desk,
    accessCard: data?.accessCard,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={init}
      scrollToFirstError={true}
      onFinish={(v) => {
        onSave({
          departmentId: v.departmentId,
          departmentName: v.departmentName,
          title: v.title,
          grade: v.grade,
          status: v.status,
          code: v.code,
          managerName: v.managerName,
          joinedAt: v.joinedAt?.format("DD-MM-YYYY"),
          leftAt: v.leftAt?.format("DD-MM-YYYY"),
          site: v.site,
          floor: v.floor,
          area: v.area,
          desk: v.desk,
          accessCard: v.accessCard,
        });
      }}
    >
      <Row gutter={[16, 16]} style={{ rowGap: 0 }}>
        <Col xs={12} md={6}>
          <Form.Item
            label="Mã nhân viên"
            name="code"
            rules={[{ required: true, message: "Mã nhân viên là bắt buộc" }]}
          >
            <Input placeholder="VD: NV001" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Phòng ban"
            name="departmentName"
            rules={[{ required: true, message: "Phòng ban là bắt buộc" }]}
          >
            {/* <Input placeholder="VD: Sales" /> */}
            <Select
              placeholder="Chọn phòng ban"
              allowClear
              options={[
                { value: "it", label: "IT" },
                { value: "hr", label: "Nhân sự" },
                { value: "sales", label: "Kinh doanh" },
                { value: "marketing", label: "Marketing" },
                { value: "finance", label: "Tài chính" },
                { value: "operations", label: "Vận hành" },
                { value: "other", label: "Khác" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Chức danh"
            name="title"
            rules={[{ required: true, message: "Chức danh là bắt buộc" }]}
          >
            <Select
              placeholder="Chọn chức danh"
              allowClear
              options={[
                { value: "intern", label: "Thực tập sinh" },
                { value: "junior", label: "Nhân viên" },
                { value: "senior", label: "Chuyên viên" },
                { value: "lead", label: "Trưởng nhóm" },
                { value: "manager", label: "Quản lý" },
                { value: "director", label: "Giám đốc" },
                { value: "vp", label: "Phó giám đốc" },
                { value: "c-level", label: "Cấp cao" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Cấp bậc" name="grade">
           <Select
              placeholder="Chọn cấp bậc"
              allowClear
              options={[
                { value: "1", label: "Cấp 1" },
                { value: "2", label: "Cấp 2" },
                { value: "3", label: "Cấp 3" },
                { value: "4", label: "Cấp 4" },
                { value: "5", label: "Cấp 5" },
              ]}
            />
          </Form.Item>
        </Col>

        <Col xs={12} md={6}>
          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: "Trạng thái là bắt buộc" }]}
          >
            <Select
              placeholder="Chọn trạng thái"
              options={[
                { value: "active", label: "Đang làm" },
                { value: "probation", label: "Thử việc" },
                { value: "inactive", label: "Tạm dừng" },
                { value: "quit", label: "Nghỉ việc" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Quản lý trực tiếp" name="managerName">
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
        </Col>

        <Col xs={12} md={6}>
          <Form.Item
            label="Ngày bắt đầu"
            name="joinedAt"
            rules={[{ required: true, message: "Ngày bắt đầu là bắt buộc" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              placeholder="Chọn ngày bắt đầu"
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Ngày kết thúc"
            name="leftAt"
            dependencies={["joinedAt", "status"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, val?: Dayjs) {
                  const status = getFieldValue("status");
                  const joined = getFieldValue("joinedAt") as Dayjs | undefined;

                  if (status === "quit" && !val) {
                    return Promise.reject(new Error("Bắt buộc khi nghỉ việc"));
                  }

                  if (val && joined && val.isBefore(joined, "day")) {
                    return Promise.reject(
                      new Error("Không thể trước ngày bắt đầu")
                    );
                  }

                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              placeholder="Chọn ngày kết thúc"
            />
          </Form.Item>
        </Col>

        <Col span={24} style={{ borderBottom: "1px solid #eee" }}>
          <h4 style={{ margin: "16px 0 8px 0", color: "#666" }}>
            Vị trí chỗ ngồi
          </h4>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Cơ sở/Toà nhà" name="site">
            <Input placeholder="VD: Tòa A" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Tầng" name="floor">
            <Input placeholder="VD: Tầng 5" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Khu" name="area">
            <Input placeholder="VD: Khu A" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Bàn" name="desk">
            <Input placeholder="VD: A-05-01" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Mã thẻ ra/vào" name="accessCard">
            <Input placeholder="VD: AC001234" />
          </Form.Item>
        </Col>
      </Row>

      {!hideInlineSubmit && (
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Lưu
          </Button>
        </Form.Item>
      )}
    </Form>
  );
}
