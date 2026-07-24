import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { CustomerUpsertOverlay } from "../customers/ui/CustomerUpsertOverlay";
import { notify } from "../../shared/lib/notification";
import { FileUploadField } from "./components";
import { operationsApi } from "./api";
import type {
  PagedResult,
  ShipOwner,
  ShipOwnerRole,
  Vessel,
  VesselDocument,
  VesselDocumentCheckItem,
  VesselDocumentStatus,
  VesselDocumentType,
  VesselReadinessStatus,
} from "./ship-master.types";
import "./ship-master.css";

const OWNER_ROLE_LABELS: Record<ShipOwnerRole, string> = {
  SHIP_OWNER: "Chủ tàu",
  SEA_CARRIER: "Đơn vị vận tải biển",
};

const DOCUMENT_LABELS: Record<VesselDocumentType, string> = {
  VESSEL_REGISTRATION: "Giấy chứng nhận đăng ký tàu",
  VESSEL_INSPECTION: "Giấy chứng nhận đăng kiểm",
  FIRE_SAFETY_CERTIFICATE: "Giấy chứng nhận đủ điều kiện PCCC",
  TANK_CALIBRATION_BAREM: "Barem hợp lệ của phương tiện vận chuyển",
  H_AND_M_INSURANCE: "Bảo hiểm tàu H&M",
  P_AND_I_INSURANCE: "Bảo hiểm trách nhiệm dân sự P&I",
  PIPELINE_SYSTEM_DOCUMENT: "Hồ sơ đường công nghệ",
  OTHER: "Tài liệu khác",
};

const dateLabel = (value?: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "-";

const numberLabel = (value?: number | string | null) =>
  value === null || value === undefined || value === ""
    ? "-"
    : Number(value).toLocaleString("vi-VN");

const MasterHeader: React.FC<{
  title: string;
  action?: React.ReactNode;
}> = ({ title, action }) => (
  <div className="ship-master-header">
    <Typography.Title level={2}>{title}</Typography.Title>
    {action}
  </div>
);

const ReadinessTag: React.FC<{ status?: VesselReadinessStatus }> = ({
  status,
}) => {
  const config = {
    READY: { color: "green", label: "Đầy đủ" },
    WARNING: { color: "orange", label: "Sắp hết hạn" },
    NOT_READY: { color: "red", label: "Thiếu / hết hạn" },
  } as const;
  const item = status ? config[status] : undefined;
  return item ? <Tag color={item.color}>{item.label}</Tag> : <Tag>Chưa kiểm tra</Tag>;
};

const DocumentStatusTag: React.FC<{ status: VesselDocumentStatus }> = ({
  status,
}) => {
  const config: Record<VesselDocumentStatus, { color: string; label: string }> = {
    MISSING: { color: "red", label: "Thiếu hồ sơ" },
    EXPIRED: { color: "red", label: "Đã hết hạn" },
    EXPIRING_SOON: { color: "orange", label: "Sắp hết hạn" },
    VALID: { color: "green", label: "Còn hiệu lực" },
  };
  return <Tag color={config[status].color}>{config[status].label}</Tag>;
};

const FilterTrigger: React.FC<{
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: React.ReactNode;
}> = ({ count, open, onOpenChange, content }) => (
  <Popover
    trigger="click"
    placement="bottomRight"
    open={open}
    onOpenChange={onOpenChange}
    content={content}
  >
    <Badge dot={count > 0} offset={[-2, 2]}>
      <Button size="small" icon={<FilterOutlined />}>
        Bộ lọc
      </Button>
    </Badge>
  </Popover>
);

const ShipOwnerDetailDrawer: React.FC<{
  ownerId?: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}> = ({ ownerId, onClose, onEdit }) => {
  const navigate = useNavigate();
  const query = useQuery<ShipOwner>({
    queryKey: ["operations", "ship-owner", ownerId],
    queryFn: () => operationsApi.shipOwner(ownerId!),
    enabled: Boolean(ownerId),
  });
  const owner = query.data;

  return (
    <Drawer
      open={Boolean(ownerId)}
      onClose={onClose}
      width={980}
      title="Chi tiết chủ tàu"
      extra={
        owner ? (
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(owner.id)}>
            Sửa
          </Button>
        ) : null
      }
    >
      {query.isLoading ? (
        <Spin size="small" />
      ) : owner ? (
        <Tabs size="small" items={[
          { key: "info", label: "Thông tin chung", children: <Descriptions size="small" bordered column={2}>
            <Descriptions.Item label="Mã đối tác">{owner.code}</Descriptions.Item>
            <Descriptions.Item label="Tên đối tác">{owner.name}</Descriptions.Item>
            <Descriptions.Item label="Mã số thuế">{owner.taxCode || "-"}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{owner.contactPhone || "-"}</Descriptions.Item>
            <Descriptions.Item label="Email">{owner.contactEmail || "-"}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              <Space size={[4, 4]} wrap>
                {owner.partnerRoles
                  .filter((role): role is ShipOwnerRole => role in OWNER_ROLE_LABELS)
                  .map((role) => (
                    <Tag color="blue" key={role}>{OWNER_ROLE_LABELS[role]}</Tag>
                  ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>
              {owner.billingAddress || "-"}
            </Descriptions.Item>
          </Descriptions> },
          { key: "vessels", label: `Danh mục tàu (${owner.ownedVessels?.length ?? 0})`, children: <Table<Vessel>
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={owner.ownedVessels ?? []}
            onRow={(vessel) => ({ onClick: () => navigate(`/operations/vessels/${vessel.id}`) })}
            columns={[
              { title: "Tên tàu", dataIndex: "name" },
              { title: "IMO", dataIndex: "imoNo", render: (value) => value || "-" },
              { title: "Quốc tịch", dataIndex: "nationality", render: (value) => value || "-" },
              {
                title: "Trạng thái",
                render: (_, vessel) => (
                  <Tag color={vessel.isActive ? "green" : "default"}>
                    {vessel.isActive ? "Hoạt động" : "Ngừng"}
                  </Tag>
                ),
              },
            ]}
          /> },
          { key: "contracts", label: `Hợp đồng (${owner.shipCharterContracts?.length ?? 0})`, children: <Table<any> size="small" rowKey="id" pagination={false} dataSource={owner.shipCharterContracts ?? []} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-contracts/${row.id}`) })} columns={[{ title: "Số hợp đồng", dataIndex: "contractNo" }, { title: "Ngày ký", dataIndex: "signedDate", render: dateLabel }, { title: "Hiệu lực đến", dataIndex: "effectiveTo", render: dateLabel }, { title: "Trạng thái", dataIndex: "status", render: (value) => <Tag>{value}</Tag> }]} /> },
          { key: "appendices", label: "Phụ lục hợp đồng", children: <Table<any> size="small" rowKey="id" pagination={{ pageSize: 10 }} dataSource={(owner.shipCharterContracts ?? []).flatMap((contract) => (contract.appendices ?? []).map((appendix: any) => ({ ...appendix, contractNo: contract.contractNo })))} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-appendices/${row.id}`) })} columns={[{ title: "Số phụ lục", dataIndex: "appendixNo" }, { title: "Hợp đồng", dataIndex: "contractNo" }, { title: "Tàu", render: (_, row) => row.vessel?.name || "-" }, { title: "Laycan", render: (_, row) => `${dateLabel(row.laycanFrom)} - ${dateLabel(row.laycanTo)}` }]} /> },
          { key: "rates", label: `Bảng giá (${owner.shipFreightRates?.length ?? 0})`, children: <Table<any> size="small" rowKey="id" pagination={{ pageSize: 10 }} dataSource={owner.shipFreightRates ?? []} columns={[{ title: "Mã giá", dataIndex: "rateCode" }, { title: "Tuyến", render: (_, row) => `${row.loadingPort} → ${row.dischargePort}` }, { title: "Tàu", render: (_, row) => row.vessel?.name || "Áp dụng chung" }, { title: "Giá VND/lít", dataIndex: "freightRateVndPerLiter", align: "right", render: numberLabel }]} /> },
          { key: "orders", label: `Lịch sử đơn (${owner.shipCharterOrders?.length ?? 0})`, children: <Table<any> size="small" rowKey="id" pagination={{ pageSize: 10 }} dataSource={owner.shipCharterOrders ?? []} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-orders/${row.id}`) })} columns={[{ title: "Mã đơn", dataIndex: "charterOrderNo" }, { title: "Tàu", render: (_, row) => row.vessel?.name || "-" }, { title: "Hàng hóa", dataIndex: "cargoName" }, { title: "Laycan", render: (_, row) => `${dateLabel(row.laycanFrom)} - ${dateLabel(row.laycanTo)}` }, { title: "Trạng thái", dataIndex: "status", render: (value) => <Tag>{value}</Tag> }]} /> },
        ]} />
      ) : (
        <Alert type="error" showIcon message="Không tải được thông tin chủ tàu" />
      )}
    </Drawer>
  );
};

export const ShipOwnerListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<ShipOwnerRole>();
  const [isActive, setIsActive] = useState<boolean>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState<string>();
  const [upsert, setUpsert] = useState<{ open: boolean; id?: string }>({ open: false });

  const query = useQuery<PagedResult<ShipOwner>>({
    queryKey: ["operations", "ship-owners", { page, pageSize, keyword, role, isActive }],
    queryFn: () => operationsApi.shipOwners({ page, pageSize, keyword, role, isActive }),
    placeholderData: (previous) => previous,
  });

  const applyFilters = (values: { role?: ShipOwnerRole; isActive?: boolean }) => {
    setRole(values.role);
    setIsActive(values.isActive);
    setPage(1);
    setFilterOpen(false);
  };
  const clearFilters = () => {
    filterForm.resetFields();
    setRole(undefined);
    setIsActive(undefined);
    setPage(1);
  };
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["operations", "ship-owners"] });
  };

  const columns: ColumnsType<ShipOwner> = [
    { title: "Mã", dataIndex: "code", width: 130 },
    { title: "Tên đối tác", dataIndex: "name", ellipsis: true, width: 280 },
    { title: "Mã số thuế", dataIndex: "taxCode", width: 150, render: (value) => value || "-" },
    {
      title: "Vai trò đối tác",
      width: 250,
      render: (_, owner) => (
        <Space size={[4, 4]} wrap>
          {owner.partnerRoles
            .filter((item): item is ShipOwnerRole => item in OWNER_ROLE_LABELS)
            .map((item) => <Tag color="blue" key={item}>{OWNER_ROLE_LABELS[item]}</Tag>)}
        </Space>
      ),
    },
    { title: "Số tàu", dataIndex: "activeVesselCount", width: 90, align: "right", render: (value) => value ?? 0 },
    {
      title: "Trạng thái",
      width: 120,
      render: (_, owner) => (
        <Tag color={owner.status === "Active" ? "green" : "default"}>
          {owner.status === "Active" ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "",
      width: 78,
      fixed: "right",
      render: (_, owner) => (
        <Space size={2}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); setSelectedId(owner.id); }} />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); setUpsert({ open: true, id: owner.id }); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="ship-master-page">
      <MasterHeader
        title="Chủ tàu / Đơn vị vận tải biển"
        action={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setUpsert({ open: true })}>Thêm đối tác</Button>}
      />
      <div className="ship-master-toolbar">
        <Input.Search
          size="small"
          allowClear
          placeholder="Tìm mã, tên, MST, điện thoại"
          style={{ width: 340 }}
          onSearch={(value) => { setKeyword(value.trim()); setPage(1); }}
        />
        <Space size={6}>
          <FilterTrigger
            count={Number(Boolean(role)) + Number(isActive !== undefined)}
            open={filterOpen}
            onOpenChange={(open) => {
              setFilterOpen(open);
              if (open) filterForm.setFieldsValue({ role, isActive });
            }}
            content={
              <Form className="ship-master-filter-panel" form={filterForm} layout="vertical" size="small" onFinish={applyFilters}>
                <Form.Item name="role" label="Vai trò đối tác">
                  <Select allowClear options={Object.entries(OWNER_ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
                </Form.Item>
                <Form.Item name="isActive" label="Trạng thái">
                  <Select allowClear options={[{ value: true, label: "Hoạt động" }, { value: false, label: "Ngừng hoạt động" }]} />
                </Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button size="small" onClick={clearFilters}>Đặt lại</Button>
                  <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
                </Space>
              </Form>
            }
          />
          <Tooltip title="Làm mới">
            <Button size="small" icon={<ReloadOutlined />} onClick={refresh} loading={query.isFetching} />
          </Tooltip>
        </Space>
      </div>
      <div className="ship-master-filter-tags">
        {role ? <Tag closable onClose={() => setRole(undefined)}>Vai trò: {OWNER_ROLE_LABELS[role]}</Tag> : null}
        {isActive !== undefined ? <Tag closable onClose={() => setIsActive(undefined)}>Trạng thái: {isActive ? "Hoạt động" : "Ngừng"}</Tag> : null}
      </div>
      <div className="ship-master-data">
        <Table<ShipOwner>
          size="small"
          rowKey="id"
          loading={query.isLoading || query.isFetching}
          dataSource={query.data?.items ?? []}
          columns={columns}
          scroll={{ x: 1050 }}
          onRow={(owner) => ({ onClick: () => setSelectedId(owner.id) })}
          pagination={{
            current: page,
            pageSize,
            total: query.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} đối tác`,
            onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); },
          }}
        />
      </div>
      <ShipOwnerDetailDrawer ownerId={selectedId} onClose={() => setSelectedId(undefined)} onEdit={(id) => { setSelectedId(undefined); setUpsert({ open: true, id }); }} />
      {upsert.open ? (
        <CustomerUpsertOverlay
          mode={upsert.id ? "edit" : "create"}
          open={upsert.open}
          customerId={upsert.id}
          partnerRoleDefault="SHIP_OWNER"
          onClose={() => setUpsert({ open: false })}
          onSuccess={refresh}
        />
      ) : null}
    </div>
  );
};

const useShipOwnerOptions = () =>
  useQuery<Array<{ id: string; code: string; name: string }>>({
    queryKey: ["operations", "ship-owner-select"],
    queryFn: () => operationsApi.shipOwnerSelect(),
    staleTime: 60_000,
  });

const VesselFormModal: React.FC<{
  open: boolean;
  vessel?: Vessel;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, vessel, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const owners = useShipOwnerOptions();
  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => operationsApi.saveVessel(values, vessel?.id),
    onSuccess: () => { notify.success("Đã lưu thông tin tàu."); onSaved(); onClose(); },
  });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      vessel
        ? {
          name: vessel.name,
          ownerCustomerId: vessel.ownerCustomerId,
          imoNo: vessel.imoNo,
          mmsiNo: vessel.mmsiNo,
          nationality: vessel.nationality,
          isActive: vessel.isActive,
        }
        : { isActive: true },
    );
  }, [open, vessel, form]);

  return (
    <Modal
      open={open}
      width={940}
      title={vessel ? "Cập nhật tàu" : "Thêm tàu"}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small" onFinish={(values) => mutation.mutate(values)}>
        <div className="ship-master-form-grid three">
          <Form.Item name="name" label="Tên tàu" rules={[{ required: true, message: "Nhập tên tàu" }]}>
            <Input size="small" />
          </Form.Item>
          <Form.Item name="ownerCustomerId" label="Chủ tàu" rules={[{ required: true, message: "Chọn chủ tàu" }]}>
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              loading={owners.isLoading}
              options={(owners.data ?? []).map((owner) => ({ value: owner.id, label: `${owner.code} - ${owner.name}` }))}
            />
          </Form.Item>
          <Form.Item name="imoNo" label="Số IMO"><Input size="small" /></Form.Item>
          <Form.Item name="mmsiNo" label="MMSI"><Input size="small" /></Form.Item>
          <Form.Item name="nationality" label="Quốc tịch"><Input size="small" /></Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked"><Switch size="small" checkedChildren="Hoạt động" unCheckedChildren="Ngừng" /></Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

const VesselCatalogPage: React.FC<{ documentMode?: boolean }> = ({ documentMode = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const owners = useShipOwnerOptions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [ownerCustomerId, setOwnerCustomerId] = useState<string>();
  const [isActive, setIsActive] = useState<boolean>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterForm] = Form.useForm();
  const [editing, setEditing] = useState<Vessel>();
  const [formOpen, setFormOpen] = useState(false);
  const openVessel = (vesselId: string, showDocuments = documentMode) =>
    navigate(`/operations/vessels/${vesselId}${showDocuments ? "?tab=documents" : ""}`);

  const query = useQuery<PagedResult<Vessel>>({
    queryKey: ["operations", "vessels", { page, pageSize, keyword, ownerCustomerId, isActive }],
    queryFn: () => operationsApi.vessels({ page, pageSize, keyword, ownerCustomerId, isActive }),
    placeholderData: (previous) => previous,
  });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["operations", "vessels"] });
  const ownerName = owners.data?.find((owner) => owner.id === ownerCustomerId)?.name;

  const columns: ColumnsType<Vessel> = [
    { title: "Tên tàu", dataIndex: "name", width: 220, fixed: "left" },
    { title: "IMO", dataIndex: "imoNo", width: 130, render: (value) => value || "-" },
    { title: "Chủ tàu", width: 260, ellipsis: true, render: (_, vessel) => vessel.owner?.name || "-" },
    { title: "Quốc tịch", dataIndex: "nationality", width: 130, render: (value) => value || "-" },
    { title: "DWT", dataIndex: "deadweightTonnage", width: 120, align: "right", render: numberLabel },
    { title: "Hồ sơ", width: 140, render: (_, vessel) => <ReadinessTag status={vessel.documentCheck?.readinessStatus} /> },
    {
      title: "Trạng thái",
      width: 110,
      render: (_, vessel) => <Tag color={vessel.isActive ? "green" : "default"}>{vessel.isActive ? "Hoạt động" : "Ngừng"}</Tag>,
    },
    {
      title: "",
      width: 112,
      fixed: "right",
      render: (_, vessel) => (
        <Space size={2}>
          <Tooltip title="Xem chi tiết"><Button size="small" type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); openVessel(vessel.id, false); }} /></Tooltip>
          <Tooltip title="Hồ sơ con tàu"><Button size="small" type="text" icon={<FileTextOutlined />} onClick={(event) => { event.stopPropagation(); openVessel(vessel.id, true); }} /></Tooltip>
          <Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); setEditing(vessel); setFormOpen(true); }} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="ship-master-page">
      <MasterHeader
        title={documentMode ? "Hồ sơ con tàu" : "Danh mục tàu"}
        action={documentMode ? undefined : <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>Thêm tàu</Button>}
      />
      <div className="ship-master-toolbar">
        <Input.Search size="small" allowClear placeholder="Tìm tên tàu hoặc IMO" style={{ width: 340 }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} />
        <Space size={6}>
          <FilterTrigger
            count={Number(Boolean(ownerCustomerId)) + Number(isActive !== undefined)}
            open={filterOpen}
            onOpenChange={(open) => { setFilterOpen(open); if (open) filterForm.setFieldsValue({ ownerCustomerId, isActive }); }}
            content={
              <Form className="ship-master-filter-panel" form={filterForm} layout="vertical" size="small" onFinish={(values) => { setOwnerCustomerId(values.ownerCustomerId); setIsActive(values.isActive); setPage(1); setFilterOpen(false); }}>
                <Form.Item name="ownerCustomerId" label="Chủ tàu">
                  <Select showSearch allowClear optionFilterProp="label" options={(owners.data ?? []).map((owner) => ({ value: owner.id, label: `${owner.code} - ${owner.name}` }))} />
                </Form.Item>
                <Form.Item name="isActive" label="Trạng thái">
                  <Select allowClear options={[{ value: true, label: "Hoạt động" }, { value: false, label: "Ngừng hoạt động" }]} />
                </Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button size="small" onClick={() => { filterForm.resetFields(); setOwnerCustomerId(undefined); setIsActive(undefined); setPage(1); }}>Đặt lại</Button>
                  <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
                </Space>
              </Form>
            }
          />
          <Tooltip title="Làm mới"><Button size="small" icon={<ReloadOutlined />} loading={query.isFetching} onClick={refresh} /></Tooltip>
        </Space>
      </div>
      <div className="ship-master-filter-tags">
        {ownerCustomerId ? <Tag closable onClose={() => setOwnerCustomerId(undefined)}>Chủ tàu: {ownerName || ownerCustomerId}</Tag> : null}
        {isActive !== undefined ? <Tag closable onClose={() => setIsActive(undefined)}>Trạng thái: {isActive ? "Hoạt động" : "Ngừng"}</Tag> : null}
      </div>
      <div className="ship-master-data">
        <Table<Vessel>
          size="small"
          rowKey="id"
          loading={query.isLoading || query.isFetching}
          dataSource={query.data?.items ?? []}
          columns={columns}
          scroll={{ x: 1200 }}
          onRow={(vessel) => ({ onClick: () => openVessel(vessel.id) })}
          pagination={{ current: page, pageSize, total: query.data?.total ?? 0, showSizeChanger: true, showTotal: (total) => `${total} tàu`, onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); } }}
        />
      </div>
      <VesselFormModal open={formOpen} vessel={editing} onClose={() => setFormOpen(false)} onSaved={refresh} />
    </div>
  );
};

export const VesselListPage: React.FC = () => <VesselCatalogPage />;

export const VesselDocumentListPage: React.FC = () => <VesselCatalogPage documentMode />;

const VesselDocumentBundleModal: React.FC<{
  vessel: Vessel;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ vessel, open, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const selectedItems = (vessel.documentCheck?.items ?? []).filter(
        (item) => values.documents?.[item.documentType]?.included
      );
      if (!selectedItems.length) throw new Error("Chọn ít nhất một hồ sơ để cập nhật.");

      await operationsApi.saveVessel({ documentFileUrl: values.fileUrl }, vessel.id);
      await Promise.all(
        selectedItems.map((item) => {
          const itemValues = values.documents[item.documentType];
          return operationsApi.saveVesselDocument(vessel.id, {
            documentType: item.documentType,
            documentNo: itemValues.documentNo,
            issuedDate: itemValues.issuedDate?.format("YYYY-MM-DD"),
            expiredDate: item.documentType === "VESSEL_REGISTRATION" ? undefined : itemValues.expiredDate.format("YYYY-MM-DD"),
            fileUrl: itemValues.fileUrl,
          });
        })
      );
    },
    onSuccess: () => { notify.success("Đã thêm phiên bản hồ sơ tàu."); onSaved(); onClose(); },
    onError: (error: Error) => notify.error(error.message || "Không thể cập nhật hồ sơ tàu."),
  });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, form]);

  return (
    <Modal className="ship-master-document-modal" open={open} width={980} title="Cập nhật hồ sơ tàu" onCancel={onClose} onOk={() => form.submit()} okText="Lưu phiên bản mới" confirmLoading={mutation.isPending} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        size="small"
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item name="fileUrl" label="File hồ sơ tổng" rules={[{ required: true, message: "Tải file hồ sơ" }]}>
          <FileUploadField folder={`HO SO TAU/${vessel.name}`} />
        </Form.Item>
        <div className="ship-master-document-editor">
          <div className="ship-master-document-editor-head">
            <span>Chọn</span><span>Hồ sơ bắt buộc</span><span>Số chứng từ</span><span>Ngày cấp</span><span>Hết hạn</span><span>File chi tiết</span>
          </div>
          {(vessel.documentCheck?.items ?? []).map((item) => (
            <div className="ship-master-document-editor-row" key={item.documentType}>
              <Form.Item name={["documents", item.documentType, "included"]} valuePropName="checked" noStyle>
                <Checkbox aria-label={`Cập nhật ${item.label}`} />
              </Form.Item>
              <span>{item.label}</span>
              <Form.Item noStyle shouldUpdate={(previous, current) => previous.documents?.[item.documentType]?.included !== current.documents?.[item.documentType]?.included}>
                {({ getFieldValue }) => {
                  const included = getFieldValue(["documents", item.documentType, "included"]);
                  return <>
                    <Form.Item name={["documents", item.documentType, "documentNo"]} noStyle>
                      <Input size="small" disabled={!included} placeholder="Số chứng từ" />
                    </Form.Item>
                    <Form.Item name={["documents", item.documentType, "issuedDate"]} noStyle>
                      <DatePicker size="small" disabled={!included} format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name={["documents", item.documentType, "expiredDate"]} noStyle rules={included && item.documentType !== "VESSEL_REGISTRATION" ? [{ required: true, message: "Chọn ngày hết hạn" }] : []}>
                      {item.documentType === "VESSEL_REGISTRATION" ? <Typography.Text type="secondary">Không thời hạn</Typography.Text> : <DatePicker size="small" disabled={!included} format="DD/MM/YYYY" style={{ width: "100%" }} />}
                    </Form.Item>
                    <Form.Item name={["documents", item.documentType, "fileUrl"]} noStyle>
                      <FileUploadField compact disabled={!included} folder={`HO SO TAU/${vessel.name}`} />
                    </Form.Item>
                  </>;
                }}
              </Form.Item>
            </div>
          ))}
        </div>
      </Form>
    </Modal>
  );
};

export const VesselDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const query = useQuery<Vessel>({ queryKey: ["operations", "vessel", id], queryFn: () => operationsApi.vessel(id!), enabled: Boolean(id) });
  const vessel = query.data;
  const check = vessel?.documentCheck;
  const isDocumentTab = searchParams.get("tab") === "documents";
  const documents = useMemo(() => [...(vessel?.documents ?? [])]
    .filter((document) => document.documentType !== "PIPELINE_SYSTEM_DOCUMENT")
    .sort((a, b) => dayjs(b.issuedDate ?? b.createdAt).valueOf() - dayjs(a.issuedDate ?? a.createdAt).valueOf()), [vessel?.documents]);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["operations", "vessel", id] });
    await queryClient.invalidateQueries({ queryKey: ["operations", "vessels"] });
  };

  if (query.isLoading) return <div className="ship-master-page"><Spin size="small" /></div>;
  if (!vessel) return <div className="ship-master-page"><Alert type="error" showIcon message="Không tìm thấy tàu" /></div>;

  const checklistColumns: ColumnsType<VesselDocumentCheckItem> = [
    { title: "Hồ sơ bắt buộc", dataIndex: "label", width: 300 },
    { title: "Số chứng từ", width: 150, render: (_, item) => item.latestDocument?.documentNo || "-" },
    { title: "Ngày cấp", width: 120, render: (_, item) => dateLabel(item.latestDocument?.issuedDate) },
    { title: "Hết hạn", width: 120, render: (_, item) => dateLabel(item.latestDocument?.expiredDate) },
    { title: "Trạng thái", width: 140, render: (_, item) => <DocumentStatusTag status={item.status} /> },
  ];

  return (
    <div className="ship-master-page">
      <MasterHeader
        title={vessel.name}
        action={<Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(isDocumentTab ? "/operations/vessel-documents" : "/operations/vessels")}>{isDocumentTab ? "Danh sách hồ sơ" : "Danh sách tàu"}</Button>}
      />
      <div className="ship-master-summary">
        <div className="ship-master-summary-item"><div className="ship-master-summary-label">Tình trạng hồ sơ</div><div className="ship-master-summary-value"><ReadinessTag status={check?.readinessStatus} /></div></div>
        <div className="ship-master-summary-item"><div className="ship-master-summary-label">Thiếu / hết hạn</div><div className="ship-master-summary-value">{(check?.missingCount ?? 0) + (check?.expiredCount ?? 0)}</div></div>
        <div className="ship-master-summary-item"><div className="ship-master-summary-label">Sắp hết hạn</div><div className="ship-master-summary-value">{check?.expiringSoonCount ?? 0}</div></div>
      </div>
      <Tabs
        size="small"
        activeKey={isDocumentTab ? "documents" : "info"}
        onChange={(key) => {
          const nextParams = new URLSearchParams(searchParams);
          if (key === "documents") nextParams.set("tab", "documents");
          else nextParams.delete("tab");
          setSearchParams(nextParams, { replace: true });
        }}
        items={[
          {
            key: "info",
            label: "Thông tin tàu",
            children: (
              <div className="ship-master-detail-section">
                <Descriptions size="small" bordered column={{ xs: 1, sm: 2, lg: 3 }}>
                  <Descriptions.Item label="Tên tàu">{vessel.name}</Descriptions.Item>
                  <Descriptions.Item label="Chủ tàu">{vessel.owner?.name || "-"}</Descriptions.Item>
                  <Descriptions.Item label="IMO">{vessel.imoNo || "-"}</Descriptions.Item>
                  <Descriptions.Item label="MMSI">{vessel.mmsiNo || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Quốc tịch">{vessel.nationality || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái"><Tag color={vessel.isActive ? "green" : "default"}>{vessel.isActive ? "Hoạt động" : "Ngừng"}</Tag></Descriptions.Item>
                </Descriptions>
              </div>
            ),
          },
          {
            key: "documents",
            label: `Hồ sơ tàu (${check?.items.length ?? 0})`,
            children: (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <div className="ship-master-header" style={{ marginBottom: 0 }}>
                  <Typography.Title level={5}>Hồ sơ bắt buộc</Typography.Title>
                  <Space size={8}>
                    {vessel.documentFileUrl ? <Typography.Link href={vessel.documentFileUrl} target="_blank">Xem file tổng</Typography.Link> : null}
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setDocumentModalOpen(true)}>Cập nhật hồ sơ</Button>
                  </Space>
                </div>
                <div className="ship-master-data">
                  <Table<VesselDocumentCheckItem> size="small" rowKey="documentType" pagination={false} dataSource={check?.items ?? []} columns={checklistColumns} scroll={{ x: 920 }} />
                </div>
                <div className="ship-master-header" style={{ marginBottom: 0 }}><Typography.Title level={5}>Lịch sử hồ sơ</Typography.Title></div>
                <div className="ship-master-data">
                  <Table<VesselDocument>
                    size="small"
                    rowKey="id"
                    dataSource={documents}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    columns={[
                      { title: "Loại hồ sơ", dataIndex: "documentType", width: 280, render: (value: VesselDocumentType) => DOCUMENT_LABELS[value] },
                      { title: "Số chứng từ", dataIndex: "documentNo", width: 150, render: (value) => value || "-" },
                      { title: "Ngày cấp", dataIndex: "issuedDate", width: 120, render: dateLabel },
                      { title: "Hết hạn", dataIndex: "expiredDate", width: 120, render: dateLabel },
                      { title: "File chi tiết", width: 110, render: (_, document) => document.fileUrl ? <Typography.Link href={document.fileUrl} target="_blank">Xem</Typography.Link> : "-" },
                    ]}
                  />
                </div>
              </Space>
            ),
          },
          {
            key: "orders",
            label: `Lịch sử đơn thuê tàu (${vessel.charterOrders?.length ?? 0})`,
            children: (
              <div className="ship-master-data">
                <Table<any>
                  size="small"
                  rowKey="id"
                  dataSource={vessel.charterOrders ?? []}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  onRow={(order) => ({ onClick: () => navigate(`/operations/charter-orders/${order.id}`) })}
                  columns={[
                    { title: "Mã đơn", dataIndex: "charterOrderNo", width: 170 },
                    { title: "Hàng hóa", dataIndex: "cargoName", render: (value) => value || "-" },
                    { title: "Tuyến", render: (_, order) => `${order.loadingPort || "-"} → ${order.dischargePort || "-"}` },
                    { title: "Laycan", render: (_, order) => `${dateLabel(order.laycanFrom)} - ${dateLabel(order.laycanTo)}` },
                    { title: "Hợp đồng", render: (_, order) => order.contract?.contractNo || "-" },
                    { title: "Trạng thái", dataIndex: "status", render: (value) => <Tag>{value}</Tag> },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
      <VesselDocumentBundleModal
        vessel={vessel}
        open={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
};
