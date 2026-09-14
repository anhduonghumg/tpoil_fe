// features/price-bulletins/ui/PriceBulletinUpsertModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type {
  CreatePriceBulletinPayload,
  PriceBulletinDetail,
  ProductOption,
  RegionOption,
  UpdatePriceBulletinPayload,
} from "../types";
import { PriceBulletinsApi } from "../api";
import "../price-bulletins.css";

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

/** Một ô của lưới: khóa "sản phẩm|vùng" → giá. */
const cellKey = (productId: string, regionId: string) => `${productId}|${regionId}`;

type GridRow = { productId: string; label: string };

/**
 * Nhập bảng giá bằng tay.
 *
 * Lưới thay cho kiểu nhập từng dòng "chọn sản phẩm + chọn vùng + nhập giá": một kỳ điều
 * chỉnh luôn là TOÀN BỘ mặt hàng × TOÀN BỘ vùng, nên bắt người dùng chọn lại sản phẩm và
 * vùng cho từng dòng chỉ tạo cơ hội nhập thiếu hoặc nhập trùng. Dàn sẵn thành lưới thì
 * nhìn phát biết ô nào chưa điền, và đúng hình dạng của tờ thông báo in ra.
 *
 * Cùng nhịp thao tác với màn Chiết khấu: chọn thời điểm áp dụng rồi điền giá.
 */
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
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [cells, setCells] = useState<Record<string, number | null>>({});
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingRefs(true);
    void (async () => {
      try {
        const [productResult, regionResult] = await Promise.all([
          PriceBulletinsApi.productsSelect(),
          PriceBulletinsApi.regionsSelect(""),
        ]);
        setProducts(productResult ?? []);
        setRegions(regionResult ?? []);
      } finally {
        setLoadingRefs(false);
      }
    })();
  }, [open]);

  // Nạp lại giá trị mỗi lần mở: tạo mới thì trống, sửa thì đổ từ bản ghi ra lưới.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      form.setFieldsValue({
        effectiveFrom: dayjs(initial.effectiveFrom),
        effectiveTo: initial.effectiveTo ? dayjs(initial.effectiveTo) : undefined,
        decisionNo: initial.decisionNo ?? undefined,
        basisDocNo: initial.basisDocNo ?? undefined,
        basisDocDate: initial.basisDocDate ? dayjs(initial.basisDocDate) : undefined,
        note: initial.note ?? undefined,
      });
      const next: Record<string, number | null> = {};
      for (const item of initial.items ?? []) {
        next[cellKey(item.productId, item.regionId)] = Number(item.price);
      }
      setCells(next);
      setProductFilter([]);
      return;
    }
    form.resetFields();
    // Giá xăng dầu điều chỉnh vào 15h00 theo kỳ của Bộ Công Thương — điền sẵn cho đỡ gõ.
    form.setFieldsValue({ effectiveFrom: dayjs().hour(15).minute(0).second(0) });
    setCells({});
    setProductFilter([]);
  }, [open, mode, initial, form]);

  const setCell = (productId: string, regionId: string, value: number | null) =>
    setCells((prev) => ({ ...prev, [cellKey(productId, regionId)]: value }));

  const visibleProducts = useMemo(
    () =>
      productFilter.length
        ? products.filter((product) => productFilter.includes(product.id))
        : products,
    [products, productFilter],
  );

  const filled = useMemo(
    () =>
      visibleProducts.flatMap((product) =>
        regions
          .map((region) => ({
            productId: product.id,
            regionId: region.id,
            price: cells[cellKey(product.id, region.id)],
          }))
          .filter((cell) => cell.price != null && Number(cell.price) > 0),
      ),
    [visibleProducts, regions, cells],
  );

  const emptyCount = visibleProducts.length * regions.length - filled.length;

  const submit = async () => {
    const values = await form.validateFields();
    if (!filled.length) {
      throw new Error("Cần nhập ít nhất một mức giá");
    }

    const payload = {
      effectiveFrom: values.effectiveFrom.toISOString(),
      effectiveTo: values.effectiveTo
        ? dayjs(values.effectiveTo).endOf("day").toISOString()
        : undefined,
      decisionNo: values.decisionNo?.trim() || undefined,
      basisDocNo: values.basisDocNo?.trim() || undefined,
      basisDocDate: values.basisDocDate
        ? dayjs(values.basisDocDate).format("YYYY-MM-DD")
        : undefined,
      note: values.note?.trim() || undefined,
      items: filled.map((cell) => ({
        productId: cell.productId,
        regionId: cell.regionId,
        price: Number(cell.price),
      })),
    };

    if (mode === "create") {
      await onCreate(payload as CreatePriceBulletinPayload);
      return;
    }
    if (!initial) return;
    await onUpdate({ id: initial.id, data: payload as UpdatePriceBulletinPayload });
  };

  // Nhãn do backend dựng sẵn, đúng tên in trên văn bản — lưới nhập và tờ thông báo
  // gọi mặt hàng giống hệt nhau.
  const gridRows: GridRow[] = visibleProducts.map((product) => ({
    productId: product.id,
    label: product.label,
  }));

  const columns: ColumnsType<GridRow> = [
    {
      title: "Mặt hàng",
      dataIndex: "label",
      width: 260,
      fixed: "left",
      ellipsis: true,
      render: (value: string) => <strong>{value}</strong>,
    },
    ...regions.map((region) => ({
      title: region.name,
      key: region.id,
      align: "center" as const,
      width: 160,
      render: (_: unknown, row: GridRow) => (
        <InputNumber
          size="small"
          min={0}
          step={10}
          controls={false}
          placeholder="—"
          style={{ width: "100%", textAlign: "right" }}
          value={cells[cellKey(row.productId, region.id)]}
          formatter={(value) =>
            value == null ? "" : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          }
          parser={(value) => Number((value ?? "").replace(/\./g, "")) || 0}
          onChange={(value) => setCell(row.productId, region.id, value as number | null)}
        />
      ),
    })),
  ];

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nhập bảng giá bán lẻ" : "Cập nhật bảng giá"}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={saving}
      okText="Lưu bản nháp"
      cancelText="Đóng"
      destroyOnClose
      maskClosable={false}
      width={980}
      centered
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
    >
      <Form form={form} layout="vertical" size="small" className="price-bulletin-form">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Form.Item
            label="Áp dụng từ"
            name="effectiveFrom"
            rules={[{ required: true, message: "Chọn thời điểm áp dụng" }]}
            tooltip="Cả giờ lẫn ngày — quyết định in ra ghi đúng giờ này."
          >
            <DatePicker
              style={{ width: "100%" }}
              format="HH:mm DD/MM/YYYY"
              showTime={{ format: "HH:mm", minuteStep: 5 }}
            />
          </Form.Item>

          <Form.Item label="Số quyết định" name="decisionNo" tooltip="Ví dụ: 03.09.2026/TP">
            <Input placeholder="03.09.2026/TP" />
          </Form.Item>

          <Form.Item label="Đến (không bắt buộc)" name="effectiveTo">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Form.Item
            label="Căn cứ công văn số"
            name="basisDocNo"
            tooltip="Công văn của Bộ Công Thương cho kỳ điều chỉnh này. Bỏ trống thì quyết định không in dòng căn cứ đó."
          >
            <Input placeholder="7010/BCT-TTTN" />
          </Form.Item>

          <Form.Item label="Ngày công văn" name="basisDocDate">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Ghi chú" name="note">
            <Input placeholder="(Không bắt buộc)" />
          </Form.Item>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            margin: "4px 0 8px",
          }}
        >
          <Typography.Text strong>Giá theo mặt hàng và vùng</Typography.Text>
          <Select
            mode="multiple"
            allowClear
            size="small"
            style={{ minWidth: 280 }}
            placeholder="Lọc bớt mặt hàng (mặc định hiện tất cả)"
            value={productFilter}
            onChange={setProductFilter}
            optionFilterProp="label"
            options={products.map((product) => ({
              value: product.id,
              label: product.label,
            }))}
          />
        </div>

        {!loadingRefs && !regions.length && (
          <Alert
            showIcon
            type="warning"
            style={{ marginBottom: 10 }}
            message="Chưa khai báo vùng giá nào"
            description="Phải có ít nhất một vùng thì mới nhập được bảng giá."
          />
        )}

        <Table<GridRow>
          className="sales-grid price-bulletin-grid"
          rowKey="productId"
          size="small"
          bordered
          loading={loadingRefs}
          columns={columns}
          dataSource={gridRows}
          pagination={false}
          scroll={{ x: 260 + regions.length * 160 }}
        />

        <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
          Đã nhập <strong>{filled.length}</strong> mức giá
          {emptyCount > 0 ? ` · ${emptyCount} ô trống sẽ không được lưu` : ""} · lưu xong là bản
          nháp, phát hành rồi mới tải được thông báo và quyết định.
        </div>
      </Form>
    </Modal>
  );
};
