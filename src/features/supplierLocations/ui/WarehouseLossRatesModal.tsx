import React, { useEffect, useState } from "react";
import { InputNumber, Modal, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useSaveWarehouseLossRates, useWarehouseLossRates } from "../hooks";
import type { SaveWarehouseLossRateItem, WarehouseLossRateRow } from "../types";
import { notify } from "../../../shared/lib/notification";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Draft = Record<string, { diesel: number | null; gasoline: number | null }>;

/**
 * Tỷ lệ hao hụt khi rút hàng của từng kho, dầu và xăng riêng. Bảng sếp dùng để tính
 * "Số lượng hàng được bán tại kho" = lên bồn x (1 - tỷ lệ).
 */
export function WarehouseLossRatesModal({ open, onClose }: Props) {
  const query = useWarehouseLossRates(open);
  const saveMutation = useSaveWarehouseLossRates();
  const [draft, setDraft] = useState<Draft>({});

  useEffect(() => {
    if (!open || !query.data) return;
    setDraft(
      Object.fromEntries(
        query.data.map((row) => [row.warehouseId, { diesel: row.dieselLossRatePercent, gasoline: row.gasolineLossRatePercent }]),
      ),
    );
  }, [open, query.data]);

  const setRate = (warehouseId: string, key: "diesel" | "gasoline", value: number | null) =>
    setDraft((current) => ({ ...current, [warehouseId]: { ...current[warehouseId], [key]: value } }));

  const save = async () => {
    const original = new Map((query.data ?? []).map((row) => [row.warehouseId, row]));
    const items: SaveWarehouseLossRateItem[] = [];
    for (const [warehouseId, rates] of Object.entries(draft)) {
      const before = original.get(warehouseId);
      if (rates.diesel !== (before?.dieselLossRatePercent ?? null)) {
        items.push({ warehouseId, productGroup: "DIESEL", withdrawLossRatePercent: rates.diesel });
      }
      if (rates.gasoline !== (before?.gasolineLossRatePercent ?? null)) {
        items.push({ warehouseId, productGroup: "GASOLINE", withdrawLossRatePercent: rates.gasoline });
      }
    }
    if (!items.length) {
      onClose();
      return;
    }
    try {
      await saveMutation.mutateAsync(items);
      notify.success("Đã lưu tỷ lệ hao hụt kho");
      onClose();
    } catch (error: any) {
      notify.error(error?.message || "Lưu tỷ lệ hao hụt thất bại");
    }
  };

  const rateInput = (row: WarehouseLossRateRow, key: "diesel" | "gasoline") => (
    <InputNumber
      size="small"
      min={0}
      max={100}
      step={0.001}
      precision={4}
      style={{ width: "100%" }}
      addonAfter="%"
      placeholder="Chưa có"
      value={draft[row.warehouseId]?.[key] ?? null}
      onChange={(value) => setRate(row.warehouseId, key, value === null ? null : Number(value))}
    />
  );

  const columns: ColumnsType<WarehouseLossRateRow> = [
    { title: "Kho", dataIndex: "warehouseName", render: (value, row) => <span title={row.warehouseCode}>{value}</span> },
    { title: "Dầu", width: 150, render: (_, row) => rateInput(row, "diesel") },
    { title: "Xăng", width: 150, render: (_, row) => rateInput(row, "gasoline") },
  ];

  return (
    <Modal
      open={open}
      title="Tỷ lệ hao hụt kho"
      width={560}
      onCancel={onClose}
      onOk={save}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={saveMutation.isPending}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        Hao hụt khi rút hàng khỏi kho. Bảng sếp tính số lượng bán tại kho = lượng lên bồn × (1 − tỷ lệ). Để trống nếu kho
        không áp dụng.
      </Typography.Paragraph>
      <Table
        size="small"
        bordered
        rowKey="warehouseId"
        loading={query.isFetching}
        columns={columns}
        dataSource={query.data ?? []}
        pagination={false}
        scroll={{ y: 420 }}
      />
    </Modal>
  );
}
