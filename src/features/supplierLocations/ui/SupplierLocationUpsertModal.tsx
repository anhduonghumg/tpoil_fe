import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type {
  CreateSupplierLocationPayload,
  SupplierLocation,
  SupplierOption,
  UpdateSupplierLocationPayload,
  WarehouseArea,
} from "../types";
import { SupplierLocationsApi } from "../api";
import { notify } from "../../../shared/lib/notification";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: SupplierLocation | null;
  onCancel: () => void;
  onCreate: (data: CreateSupplierLocationPayload) => Promise<void> | void;
  onUpdate: (args: {
    id: string;
    supplierCustomerIds: string[];
    data: UpdateSupplierLocationPayload;
  }) => Promise<void> | void;
  saving?: boolean;
};

const WAREHOUSE_TYPES = [
  { value: "OWNED", label: "Kho nội bộ" },
  { value: "THIRD_PARTY", label: "Kho thuê / đối tác" },
  { value: "TRANSIT", label: "Kho trung chuyển" },
];

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

const OperatorSupplierPicker: React.FC = () => {
  const form = Form.useFormInstance();
  const selected: string[] = Form.useWatch("supplierCustomerIds", form) || [];
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounced(keyword);
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    SupplierLocationsApi.suppliersSelect(debouncedKeyword.trim())
      .then((result) => {
        if (active) setOptions(result.items ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedKeyword]);

  const visibleIds = useMemo(() => options.map((item) => item.id), [options]);

  const selectAllVisible = () => {
    form.setFieldValue(
      "supplierCustomerIds",
      Array.from(new Set([...selected, ...visibleIds])),
    );
  };

  const clearVisible = () => {
    const visible = new Set(visibleIds);
    form.setFieldValue(
      "supplierCustomerIds",
      selected.filter((id) => !visible.has(id)),
    );
  };

  return (
    <div>
      <Input
        size="small"
        allowClear
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        prefix={<SearchOutlined />}
        placeholder="Tìm NCC"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <a onClick={selectAllVisible}>Chọn tất cả</a>
        <Divider type="vertical" />
        <a onClick={clearVisible}>Bỏ chọn</a>
        <span style={{ marginLeft: "auto", color: "#666" }}>Đã chọn: {selected.length}</span>
      </div>
      <div
        style={{
          marginTop: 8,
          border: "1px solid #f0f0f0",
          borderRadius: 6,
          padding: 8,
          maxHeight: 126,
          overflowY: "auto",
          overflowX: "hidden",
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Checkbox.Group
          style={{ width: "100%" }}
          value={selected}
          onChange={(values) => form.setFieldValue("supplierCustomerIds", values)}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px 12px" }}>
            {options.map((item) => (
              <Checkbox key={item.id} value={item.id} style={{ marginInlineStart: 0, minWidth: 0 }}>
                <Tooltip title={item.name} placement="topLeft">
                  <span style={{ display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
                    {item.code || item.name}
                  </span>
                </Tooltip>
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
        {!loading && !options.length ? <div style={{ color: "#999", marginTop: 8 }}>Không có NCC phù hợp.</div> : null}
      </div>
    </div>
  );
};

export const SupplierLocationUpsertModal: React.FC<Props> = ({
  open,
  mode,
  initial,
  onCancel,
  onCreate,
  onUpdate,
  saving,
}) => {
  const [form] = Form.useForm();
  const [areaForm] = Form.useForm();
  const [areas, setAreas] = useState<WarehouseArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaSaving, setAreaSaving] = useState(false);

  const loadAreas = async () => {
    setAreasLoading(true);
    try {
      setAreas((await SupplierLocationsApi.areas(true)) ?? []);
    } finally {
      setAreasLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadAreas();

    if (mode === "edit" && initial) {
      form.setFieldsValue({
        supplierCustomerIds:
          initial.supplierCustomerIds ??
          initial.parties?.map((assignment) => assignment.partyId) ??
          (initial.supplierCustomerId ? [initial.supplierCustomerId] : []),
        areaId: initial.areaId,
        code: initial.code,
        name: initial.name,
        nameInvoice: initial.nameInvoice,
        address: initial.address,
        warehouseType: initial.warehouseType,
        isOperationalWarehouse: initial.isOperationalWarehouse ?? true,
        note: initial.note,
        isActive: initial.isActive,
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      supplierCustomerIds: [],
      isOperationalWarehouse: true,
      isActive: true,
    });
  }, [open, mode, initial, form]);

  const createArea = async () => {
    const values = await areaForm.validateFields();
    setAreaSaving(true);
    try {
      const area = await SupplierLocationsApi.createArea({
        code: values.code.trim(),
        name: values.name.trim(),
      });
      setAreas((current) => [...current, { ...area, isActive: true }]);
      form.setFieldValue("areaId", area.id);
      setAreaModalOpen(false);
      areaForm.resetFields();
      notify.success("Đã thêm khu vực kho.");
    } finally {
      setAreaSaving(false);
    }
  };

  const onOk = async () => {
    const values = await form.validateFields();
    const common = {
      areaId: values.areaId,
      name: values.name.trim(),
      nameInvoice: values.nameInvoice?.trim() || undefined,
      address: values.address?.trim() || undefined,
      warehouseType: values.warehouseType || undefined,
      isOperationalWarehouse: values.isOperationalWarehouse !== false,
      note: values.note?.trim() || undefined,
      isActive: !!values.isActive,
    };

    if (mode === "create") {
      await onCreate({
        ...common,
        code: values.code.trim(),
        supplierCustomerIds: values.supplierCustomerIds || [],
      });
      return;
    }

    if (!initial) return;
    await onUpdate({
      id: initial.id,
      supplierCustomerIds: values.supplierCustomerIds || [],
      data: common,
    });
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Thêm kho" : "Cập nhật kho"}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={saving}
      okText="Lưu"
      cancelText="Hủy"
      destroyOnClose
      maskClosable={false}
      centered
      width={960}
      styles={{ body: { paddingTop: 6, maxHeight: "76vh", overflowY: "auto", overflowX: "hidden" } }}
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item label="Mã kho" name="code" style={{ marginBottom: 10 }} rules={[{ required: true, message: "Nhập mã kho" }]}>
              <Input placeholder="VD: K1" disabled={mode === "edit"} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Tên kho" name="name" style={{ marginBottom: 10 }} rules={[{ required: true, message: "Nhập tên kho" }]}>
              <Input placeholder="VD: Nghi Sơn" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Khu vực" required style={{ marginBottom: 10 }}>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="areaId" noStyle rules={[{ required: true, message: "Chọn khu vực kho" }]}>
                  <Select
                    showSearch
                    loading={areasLoading}
                    optionFilterProp="label"
                    placeholder="Chọn khu vực"
                    options={areas.map((area) => ({
                      value: area.id,
                      label: area.name || area.code,
                    }))}
                  />
                </Form.Item>
                <Tooltip title="Thêm khu vực">
                  <Button
                    icon={<PlusOutlined />}
                    aria-label="Thêm khu vực kho"
                    onClick={() => setAreaModalOpen(true)}
                  />
                </Tooltip>
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Tên trên hóa đơn" name="nameInvoice" style={{ marginBottom: 10 }}>
              <Input placeholder="Tên hóa đơn" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Loại kho" name="warehouseType" style={{ marginBottom: 10 }}>
              <Select allowClear placeholder="Chọn loại kho" options={WAREHOUSE_TYPES} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Địa chỉ" name="address" style={{ marginBottom: 10 }}>
              <Input placeholder="Địa chỉ kho" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Dùng cho nghiệp vụ nhập/xuất" name="isOperationalWarehouse" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Đang hoạt động" name="isActive" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Ghi chú" name="note" style={{ marginBottom: 8 }}>
              <Input placeholder="Ghi chú" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ margin: "8px 0" }}>NCC vận hành kho</Divider>
        <Form.Item name="supplierCustomerIds" noStyle>
          <OperatorSupplierPicker />
        </Form.Item>
      </Form>
      <Modal
        open={areaModalOpen}
        title="Thêm khu vực kho"
        width={420}
        okText="Thêm"
        cancelText="Hủy"
        confirmLoading={areaSaving}
        onOk={createArea}
        onCancel={() => setAreaModalOpen(false)}
        destroyOnClose
      >
        <Form form={areaForm} layout="vertical" size="small">
          <Row gutter={10}>
            <Col span={9}>
              <Form.Item name="code" label="Mã khu vực" rules={[{ required: true, message: "Nhập mã" }]} style={{ marginBottom: 8 }}>
                <Input placeholder="VD: TH" />
              </Form.Item>
            </Col>
            <Col span={15}>
              <Form.Item name="name" label="Tên khu vực" rules={[{ required: true, message: "Nhập tên" }]} style={{ marginBottom: 8 }}>
                <Input placeholder="VD: Thanh Hóa" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Modal>
  );
};
