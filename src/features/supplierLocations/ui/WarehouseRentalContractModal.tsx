import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Form, Input, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { CustomerSelect } from "../../../shared/ui/CustomerSelect";
import { useContractTypeOptions } from "../../../shared/hook/seContractTypeOptions";
import { ContractsApi } from "../../contracts/api";
import { uploadFile } from "../../../shared/api/uploads";
import { notify } from "../../../shared/lib/notification";
import type { SupplierLocation, WarehouseRentalContract } from "../types";

type FormValues = {
  code: string;
  warehouseId?: string;
  customerId?: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

type Props = {
  open: boolean;
  warehouse?: SupplierLocation | null;
  availableWarehouses?: SupplierLocation[];
  contract?: WarehouseRentalContract | null;
  mode?: "create" | "renew" | "edit";
  onClose: () => void;
  onSaved: () => void;
};

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const EMPTY_WAREHOUSES: SupplierLocation[] = [];

export const WarehouseRentalContractModal: React.FC<Props> = ({
  open,
  warehouse,
  availableWarehouses = EMPTY_WAREHOUSES,
  contract,
  mode = contract ? "renew" : "create",
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm<FormValues>();
  const { data: contractTypes } = useContractTypeOptions(true);
  const [pdf, setPdf] = useState<File | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const warehouseRentalType = useMemo(
    () => (contractTypes as any)?.data?.find((item: any) => item.code === "WAREHOUSE_RENTAL"),
    [contractTypes]
  );
  const selectedWarehouse = warehouse ?? availableWarehouses.find((item) => item.id === selectedWarehouseId);
  const isEditing = mode === "edit" && !!contract;

  useEffect(() => {
    if (!open) {
      setSelectedWarehouseId(warehouse?.id);
      setPdf(null);
      return;
    }
    const targetWarehouse = warehouse ?? availableWarehouses.find((item) => item.id === selectedWarehouseId);
    if (!targetWarehouse) {
      form.resetFields();
      setPdf(null);
      return;
    }
    const startDate = isEditing && contract
      ? dayjs(contract.startDate)
      : contract
        ? dayjs(contract.endDate).add(1, "day")
        : dayjs();
    form.setFieldsValue({
      code: isEditing && contract ? contract.code : contract ? `${contract.code}-GH` : `HDK-${targetWarehouse.code}-${startDate.year()}`,
      warehouseId: targetWarehouse.id,
      customerId: contract?.customerId ?? targetWarehouse.parties?.[0]?.partyId,
      startDate,
      endDate: isEditing && contract ? dayjs(contract.endDate) : startDate.add(1, "year").subtract(1, "day"),
    });
    setPdf(null);
  }, [availableWarehouses, contract, form, isEditing, open, selectedWarehouseId, warehouse]);

  const close = () => {
    if (!saving) onClose();
  };

  const save = async (values: FormValues) => {
    if (!selectedWarehouse || !warehouseRentalType) {
      notify.error("Chưa có loại hợp đồng Thuê kho. Vui lòng tải lại dữ liệu.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: values.code.trim(),
        name: `Thuê kho ${selectedWarehouse.name}`,
        customerId: values.customerId || null,
        contractTypeId: warehouseRentalType.id,
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
        status: "Active",
        riskLevel: "Low",
      };
      const created: any = isEditing && contract
        ? await ContractsApi.update(contract.id, { ...payload, renewalOfId: contract.renewalOfId ?? null })
        : await ContractsApi.create({
          ...payload,
          renewalOfId: contract?.id ?? null,
          warehouseIds: [selectedWarehouse.id],
        });
      const contractId = isEditing ? contract?.id : created?.data?.id;
      if (!contractId) throw new Error("Không nhận được mã hợp đồng sau khi lưu.");

      if (pdf) {
        const warehouseFolder = `${selectedWarehouse.code || selectedWarehouse.id} - ${selectedWarehouse.name}`;
        const fileUrl = await uploadFile(pdf, `warehouse-rental-contracts/${warehouseFolder}`, pdf.name);
        await ContractsApi.createAttachment({
          contractId,
          fileName: pdf.name,
          fileUrl,
          category: "ScanSigned",
        });
        if (isEditing && contract) {
          const previousPdfs = (contract.attachments ?? []).filter((item) => item.category === "ScanSigned");
          await Promise.all(previousPdfs.map((item) => ContractsApi.deleteAttachment(item.id)));
        }
      }
      notify.success(isEditing ? "Đã cập nhật hợp đồng kho." : contract ? "Đã gia hạn hợp đồng kho." : "Đã lưu hợp đồng kho.");
      onSaved();
      onClose();
    } catch (error: any) {
      notify.error(error?.message || "Không thể lưu hợp đồng kho.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? "Sửa hợp đồng kho" : contract ? "Gia hạn hợp đồng kho" : "Thêm hợp đồng thuê kho"}
      width={760}
      destroyOnHidden
      onCancel={close}
      footer={[
        <Button key="cancel" onClick={close}>Hủy</Button>,
        <Button key="save" type="primary" loading={saving} onClick={() => form.submit()}>Lưu</Button>,
      ]}
    >
      <Form form={form} layout="vertical" size="small" onFinish={save} style={{ paddingTop: 4 }}>
        {!warehouse ? (
          <Form.Item label="Kho thuê" name="warehouseId" rules={[{ required: true, message: "Chọn kho thuê" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn kho thuê / đối tác"
              options={availableWarehouses.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))}
              onChange={setSelectedWarehouseId}
            />
          </Form.Item>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0 12px" }}>
          <Form.Item label="Mã hợp đồng" name="code" rules={[{ required: true, message: "Nhập mã hợp đồng" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Từ ngày" name="startDate" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Đến ngày" name="endDate" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0 12px" }}>
          <Form.Item label="Bên cho thuê" name="customerId">
            <CustomerSelect size="small" customerRole="SUPPLIER" placeholder="Chọn NCC / bên cho thuê" />
          </Form.Item>
          <Form.Item label="Bản PDF đã ký" extra={isEditing ? "Chọn file mới để thay PDF hiện tại" : "Chỉ nhận PDF, tối đa 10 MB"}>
            <Upload
              accept="application/pdf,.pdf"
              maxCount={1}
              beforeUpload={(file) => {
                const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                if (!isPdf) {
                  notify.error("Chỉ nhận file PDF.");
                  return Upload.LIST_IGNORE;
                }
                if (file.size > MAX_PDF_SIZE) {
                  notify.error("File PDF không được vượt quá 10 MB.");
                  return Upload.LIST_IGNORE;
                }
                setPdf(file as File);
                return false;
              }}
              onRemove={() => setPdf(null)}
              fileList={pdf ? [{ uid: "pdf", name: pdf.name, status: "done" }] : []}
            >
              <Button icon={<UploadOutlined />}>Chọn PDF</Button>
            </Upload>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
