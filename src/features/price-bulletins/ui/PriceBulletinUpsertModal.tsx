// features/price-bulletins/ui/PriceBulletinUpsertModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
} from "antd";
import dayjs from "dayjs";
import type {
  CreatePriceBulletinPayload,
  PriceBulletinDetail,
  ProductOption,
  RegionOption,
  UpdatePriceBulletinPayload,
} from "../types";
import { PriceBulletinsApi } from "../api";
import { ProductsApi } from "../../products/api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: PriceBulletinDetail | null;
  onCancel: () => void;
  onCreate: (data: CreatePriceBulletinPayload) => Promise<void> | void;
  onUpdate: (args: {
    id: string;
    data: UpdatePriceBulletinPayload;
  }) => Promise<void> | void;
  saving?: boolean;
};

type Row = {
  key: string;
  productId?: string;
  regionId?: string;
  price?: number;
  note?: string;
};

export const PriceBulletinUpsertModal: React.FC<Props> = ({
  open,
  mode,
  initial,
  onCancel,
  onCreate,
  onUpdate,
  saving,
}) => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const productMap = useMemo(
    () => new Map(products.map((x) => [x.id, x])),
    [products]
  );
  const regionMap = useMemo(
    () => new Map(regions.map((x) => [x.id, x])),
    [regions]
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [p, r] = await Promise.all([
        ProductsApi.select(""),
        PriceBulletinsApi.regionsSelect(""),
      ]);
      setProducts((p as any) || []);
      setRegions(r || []);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initial) {
      form.setFieldsValue({
        effectiveFrom: initial.effectiveFrom
          ? dayjs(initial.effectiveFrom)
          : undefined,
        effectiveTo: initial.effectiveTo
          ? dayjs(initial.effectiveTo)
          : undefined,
        note: initial.note ?? "",
      });

      setRows(
        (initial.items || []).map((it, idx) => ({
          key: it.id || String(idx),
          productId: it?.productId,
          regionId: it?.regionId,
          price:
            typeof it?.price === "string"
              ? Number(it.price)
              : (it.price as any),
          note: it?.note ?? "",
        }))
      );
    } else {
      form.resetFields();
      form.setFieldsValue({
        effectiveFrom: dayjs(),
        effectiveTo: undefined,
        note: "",
      });
      setRows([{ key: "0" }]);
    }
  }, [open, mode, initial, form]);

  const addRow = () =>
    setRows((prev) => [...prev, { key: String(Date.now()) }]);
  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((x) => x.key !== key));

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((x) => (x.key === key ? { ...x, ...patch } : x))
    );

  const validateRows = () => {
    const cleaned = rows
      .map((x) => ({
        productId: x.productId,
        regionId: x.regionId,
        price: x.price,
        note: x.note?.trim() || undefined,
      }))
      .filter((x) => x.productId || x.regionId || x.price !== undefined);

    if (!cleaned.length) throw new Error("Cần ít nhất 1 dòng giá");

    for (const [i, x] of cleaned.entries()) {
      if (!x.productId) throw new Error(`Dòng ${i + 1}: Chọn sản phẩm`);
      if (!x.regionId) throw new Error(`Dòng ${i + 1}: Chọn vùng`);
      if (x.price === undefined || x.price === null)
        throw new Error(`Dòng ${i + 1}: Nhập giá`);
    }

    const seen = new Set<string>();
    for (const x of cleaned) {
      const k = `${x.productId}__${x.regionId}`;
      if (seen.has(k))
        throw new Error(
          "Không được trùng Sản phẩm + Vùng trong cùng một bảng giá"
        );
      seen.add(k);
    }

    return cleaned as any[];
  };

  const onOk = async () => {
    const v = await form.validateFields();

    const items = validateRows();

    const payloadBase = {
      effectiveFrom: dayjs(v.effectiveFrom).format("YYYY-MM-DD"),
      effectiveTo: v.effectiveTo
        ? dayjs(v.effectiveTo).format("YYYY-MM-DD")
        : undefined,
      note: v.note?.trim() || undefined,
      items,
    };

    if (mode === "create") {
      await onCreate(payloadBase as CreatePriceBulletinPayload);
      return;
    }

    if (!initial) return;
    await onUpdate({
      id: initial.id,
      data: payloadBase as UpdatePriceBulletinPayload,
    });
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Thêm bảng giá" : "Cập nhật bảng giá"}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={saving}
      okText="Lưu"
      destroyOnClose
      maskClosable={false}
      width={1100}
      style={{ top: 24 }}
    >
      <Form form={form} layout="vertical">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 2fr",
            gap: 12,
          }}
        >
          <Form.Item
            label="Áp dụng từ"
            name="effectiveFrom"
            rules={[{ required: true, message: "Chọn ngày áp dụng từ" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Đến (không bắt buộc)" name="effectiveTo">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Ghi chú" name="note">
            <Input placeholder="(Không bắt buộc)" />
          </Form.Item>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "8px 0",
          }}
        >
          <div style={{ fontWeight: 600 }}>Giá theo sản phẩm & vùng</div>
          <Button onClick={addRow}>+ Thêm dòng</Button>
        </div>

        <Table
          rowKey="key"
          dataSource={rows}
          pagination={false}
          size="small"
          columns={[
            {
              title: "Sản phẩm",
              dataIndex: "productId",
              width: 250,
              render: (_: any, r: Row) => (
                <Select
                  showSearch
                  style={{ width: "100%" }}
                  placeholder="Chọn sản phẩm"
                  value={r.productId}
                  optionFilterProp="label"
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.label || "",
                  }))}
                  onChange={(val) => updateRow(r.key, { productId: val })}
                />
              ),
            },
            {
              title: "Vùng",
              dataIndex: "regionId",
              width: 220,
              render: (_: any, r: Row) => (
                <Select
                  showSearch
                  style={{ width: "100%" }}
                  placeholder="Chọn vùng"
                  value={r.regionId}
                  optionFilterProp="label"
                  options={regions.map((x) => ({
                    value: x.id,
                    label: x.name,
                  }))}
                  onChange={(val) => updateRow(r.key, { regionId: val })}
                />
              ),
            },
            {
              title: "Giá",
              dataIndex: "price",
              width: 180,
              render: (_: any, r: Row) => (
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="VD: 20500"
                  min={0}
                  value={r.price}
                  onChange={(val) => updateRow(r.key, { price: val as any })}
                />
              ),
            },
            {
              title: "Ghi chú",
              dataIndex: "note",
              render: (_: any, r: Row) => (
                <Input
                  value={r.note}
                  placeholder="(Không bắt buộc)"
                  onChange={(e) => updateRow(r.key, { note: e.target.value })}
                />
              ),
            },
            {
              title: "",
              width: 70,
              render: (_: any, r: Row) => (
                <Button danger size="small" onClick={() => removeRow(r.key)}>
                  Xóa
                </Button>
              ),
            },
          ]}
        />

        <div style={{ marginTop: 10, color: "#888", fontSize: 12 }}>
          Lưu ý: Không được trùng “Sản phẩm + Vùng” trong cùng một bảng giá.
        </div>
      </Form>
    </Modal>
  );
};
