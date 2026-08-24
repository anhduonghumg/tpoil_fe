import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useConfirmDelivery, useDeliveryFifoSuggestion } from "../hooks";
import type { DeliveryFifoLine, SalesDelivery } from "../types";
import { formatQty } from "./labels";

type AllocationForm = {
  key: string;
  inventoryLotId?: string;
  actualQty?: number;
};

type LineForm = {
  salesDeliveryLineId: string;
  lineNo: number;
  productName: string;
  uom: string;
  plannedActualQty: number;
  actualQty?: number;
  v15Qty?: number;
  temperatureC?: number;
  vcf?: number;
  allocations: AllocationForm[];
};

/** Decimal(24,6) ở DB, nên so khớp ở đúng 6 chữ số thập phân. */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

const allocatedTotal = (line: LineForm) =>
  round6(line.allocations.reduce((sum, allocation) => sum + (allocation.actualQty ?? 0), 0));

function lineFromSuggestion(fifo: DeliveryFifoLine, delivery: SalesDelivery): LineForm {
  const deliveryLine = delivery.lines.find((row) => row.id === fifo.salesDeliveryLineId);
  return {
    salesDeliveryLineId: fifo.salesDeliveryLineId,
    lineNo: fifo.lineNo,
    productName: fifo.productName,
    uom: deliveryLine?.orderLine.product.uom ?? "",
    plannedActualQty: Number(fifo.plannedActualQty),
    actualQty: Number(fifo.plannedActualQty),
    allocations: fifo.suggestion.map((row, index) => ({
      key: `${fifo.salesDeliveryLineId}-${index}`,
      inventoryLotId: row.inventoryLotId,
      actualQty: Number(row.actualQty),
    })),
  };
}

/**
 * Kho xác nhận thực tế đã xuất bao nhiêu và lấy từ lô nào. Lô đã chọn ở đây chính
 * là căn cứ trừ tồn, trừ giữ hàng và trừ giá vốn — không có FIFO chạy ngầm nào khác.
 */
export function DeliveryConfirmModal({
  open,
  delivery,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  delivery?: SalesDelivery;
  onClose: () => void;
  onConfirmed?: () => void;
}) {
  const [issueDocNo, setIssueDocNo] = useState("");
  const [issuedAt, setIssuedAt] = useState<dayjs.Dayjs>(dayjs());
  const [lines, setLines] = useState<LineForm[]>([]);

  const fifoQuery = useDeliveryFifoSuggestion(delivery?.id, open);
  const confirmMutation = useConfirmDelivery(delivery?.id);

  useEffect(() => {
    if (!open || !fifoQuery.data || !delivery) return;
    setLines(fifoQuery.data.lines.map((fifo) => lineFromSuggestion(fifo, delivery)));
    setIssueDocNo(delivery.issueDocNo ?? "");
    setIssuedAt(dayjs());
  }, [open, fifoQuery.data, delivery]);

  const lotOptionsByLine = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string; availableQty: number }>>();
    for (const fifo of fifoQuery.data?.lines ?? []) {
      map.set(
        fifo.salesDeliveryLineId,
        (fifo.availableLots ?? []).map((lot) => ({
          value: lot.inventoryLotId,
          label: `${lot.supplierCode} · ${lot.lotNo} (còn ${formatQty(lot.availableQty)})`,
          availableQty: Number(lot.availableQty),
        })),
      );
    }
    return map;
  }, [fifoQuery.data]);

  const patchLine = (id: string, patch: Partial<LineForm>) =>
    setLines((current) =>
      current.map((line) => (line.salesDeliveryLineId === id ? { ...line, ...patch } : line)),
    );

  const patchAllocation = (lineId: string, key: string, patch: Partial<AllocationForm>) =>
    setLines((current) =>
      current.map((line) =>
        line.salesDeliveryLineId === lineId
          ? {
              ...line,
              allocations: line.allocations.map((allocation) =>
                allocation.key === key ? { ...allocation, ...patch } : allocation,
              ),
            }
          : line,
      ),
    );

  const addAllocation = (lineId: string) =>
    setLines((current) =>
      current.map((line) =>
        line.salesDeliveryLineId === lineId
          ? {
              ...line,
              allocations: [
                ...line.allocations,
                { key: `${lineId}-${Date.now()}-${Math.random()}` },
              ],
            }
          : line,
      ),
    );

  const removeAllocation = (lineId: string, key: string) =>
    setLines((current) =>
      current.map((line) =>
        line.salesDeliveryLineId === lineId
          ? { ...line, allocations: line.allocations.filter((row) => row.key !== key) }
          : line,
      ),
    );

  /** Rải lại số thực xuất theo thứ tự lô hiện có, không vượt tồn từng lô. */
  const redistribute = (lineId: string) =>
    setLines((current) =>
      current.map((line) => {
        if (line.salesDeliveryLineId !== lineId) return line;
        const options = lotOptionsByLine.get(lineId) ?? [];
        let remaining = round6(line.actualQty ?? 0);
        return {
          ...line,
          allocations: line.allocations.map((allocation) => {
            const available =
              options.find((option) => option.value === allocation.inventoryLotId)?.availableQty ??
              Number.POSITIVE_INFINITY;
            const take = round6(Math.min(remaining, available));
            remaining = round6(remaining - take);
            return { ...allocation, actualQty: take > 0 ? take : undefined };
          }),
        };
      }),
    );

  const problems = useMemo(() => {
    const found: string[] = [];
    for (const line of lines) {
      const actual = round6(line.actualQty ?? 0);
      if (!(actual > 0)) {
        found.push(`Dòng ${line.lineNo}: số thực xuất phải lớn hơn 0`);
        continue;
      }
      if (line.allocations.some((allocation) => !allocation.inventoryLotId)) {
        found.push(`Dòng ${line.lineNo}: còn phân bổ chưa chọn lô`);
      }
      if (line.allocations.some((allocation) => !((allocation.actualQty ?? 0) > 0))) {
        found.push(`Dòng ${line.lineNo}: số lượng theo lô phải lớn hơn 0`);
      }
      const ids = line.allocations.map((allocation) => allocation.inventoryLotId).filter(Boolean);
      if (new Set(ids).size !== ids.length) {
        found.push(`Dòng ${line.lineNo}: một lô bị chọn hai lần`);
      }
      const allocated = allocatedTotal(line);
      if (allocated !== actual) {
        found.push(
          `Dòng ${line.lineNo}: tổng theo lô ${formatQty(allocated)} khác số thực xuất ${formatQty(actual)}`,
        );
      }
      for (const allocation of line.allocations) {
        const option = (lotOptionsByLine.get(line.salesDeliveryLineId) ?? []).find(
          (row) => row.value === allocation.inventoryLotId,
        );
        if (option && (allocation.actualQty ?? 0) > option.availableQty) {
          found.push(`Dòng ${line.lineNo}: lô ${option.label} không đủ tồn`);
        }
      }
    }
    return found;
  }, [lines, lotOptionsByLine]);

  const submit = async () => {
    if (!delivery) return;
    await confirmMutation.mutateAsync({
      deliveryId: delivery.id,
      payload: {
        issueDocNo: issueDocNo.trim() || undefined,
        issuedAt: issuedAt.toISOString(),
        lines: lines.map((line) => ({
          salesDeliveryLineId: line.salesDeliveryLineId,
          actualQty: Number(line.actualQty),
          v15Qty: line.v15Qty == null ? undefined : Number(line.v15Qty),
          temperatureC: line.temperatureC == null ? undefined : Number(line.temperatureC),
          vcf: line.vcf == null ? undefined : Number(line.vcf),
          allocations: line.allocations.map((allocation) => ({
            inventoryLotId: allocation.inventoryLotId!,
            actualQty: Number(allocation.actualQty),
          })),
        })),
      },
    });
    onConfirmed?.();
    onClose();
  };

  const allocationColumns = (line: LineForm): ColumnsType<AllocationForm> => [
    {
      title: "Mã NCC / Lô hàng",
      dataIndex: "inventoryLotId",
      render: (_, allocation) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          placeholder="Chọn mã NCC / lô"
          status={allocation.inventoryLotId ? undefined : "error"}
          value={allocation.inventoryLotId}
          options={lotOptionsByLine.get(line.salesDeliveryLineId) ?? []}
          onChange={(value) =>
            patchAllocation(line.salesDeliveryLineId, allocation.key, { inventoryLotId: value })
          }
        />
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "actualQty",
      width: 130,
      align: "right",
      render: (_, allocation) => (
        <InputNumber
          size="small"
          min={0}
          precision={3}
          controls={false}
          style={{ width: "100%" }}
          value={allocation.actualQty}
          onChange={(value) =>
            patchAllocation(line.salesDeliveryLineId, allocation.key, {
              actualQty: value ?? undefined,
            })
          }
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 34,
      render: (_, allocation) => (
        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          disabled={line.allocations.length === 1}
          onClick={() => removeAllocation(line.salesDeliveryLineId, allocation.key)}
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={`Xác nhận xuất hàng — ${delivery?.deliveryNo ?? ""}`}
      width={900}
      okText="Xác nhận đã xuất"
      cancelText="Đóng"
      okButtonProps={{ disabled: problems.length > 0 || lines.length === 0 }}
      confirmLoading={confirmMutation.isPending}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
    >
      {fifoQuery.isLoading ? (
        <Skeleton active />
      ) : (
        <>
          <Space wrap style={{ marginBottom: 12 }}>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Số phiếu xuất kho
              </Typography.Text>
              <Input
                size="small"
                style={{ width: 200, display: "block" }}
                value={issueDocNo}
                onChange={(e) => setIssueDocNo(e.target.value)}
                placeholder="Số chứng từ của kho"
              />
            </div>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Thời điểm xuất
              </Typography.Text>
              <DatePicker
                size="small"
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: 190, display: "block" }}
                value={issuedAt}
                onChange={(value) => setIssuedAt(value ?? dayjs())}
              />
            </div>
          </Space>

          {lines.map((line) => {
            const allocated = allocatedTotal(line);
            const actual = round6(line.actualQty ?? 0);
            const diff = round6(actual - allocated);
            return (
              <Card
                key={line.salesDeliveryLineId}
                size="small"
                style={{ marginBottom: 12 }}
                title={`Dòng ${line.lineNo} — ${line.productName}`}
                extra={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Kế hoạch: {formatQty(line.plannedActualQty)} {line.uom}
                  </Typography.Text>
                }
              >
                <Space wrap style={{ marginBottom: 8 }}>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Thực xuất
                    </Typography.Text>
                    <InputNumber
                      size="small"
                      min={0.001}
                      precision={3}
                      controls={false}
                      style={{ width: 130, display: "block" }}
                      value={line.actualQty}
                      onChange={(value) =>
                        patchLine(line.salesDeliveryLineId, { actualQty: value ?? undefined })
                      }
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      V15
                    </Typography.Text>
                    <InputNumber
                      size="small"
                      min={0}
                      precision={3}
                      controls={false}
                      style={{ width: 120, display: "block" }}
                      value={line.v15Qty}
                      onChange={(value) =>
                        patchLine(line.salesDeliveryLineId, { v15Qty: value ?? undefined })
                      }
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Nhiệt độ (°C)
                    </Typography.Text>
                    <InputNumber
                      size="small"
                      controls={false}
                      style={{ width: 110, display: "block" }}
                      value={line.temperatureC}
                      onChange={(value) =>
                        patchLine(line.salesDeliveryLineId, { temperatureC: value ?? undefined })
                      }
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      VCF
                    </Typography.Text>
                    <InputNumber
                      size="small"
                      controls={false}
                      style={{ width: 120, display: "block" }}
                      value={line.vcf}
                      onChange={(value) =>
                        patchLine(line.salesDeliveryLineId, { vcf: value ?? undefined })
                      }
                    />
                  </div>
                </Space>

                <Table<AllocationForm>
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={allocationColumns(line)}
                  dataSource={line.allocations}
                  footer={() => (
                    <Space
                      style={{ width: "100%", justifyContent: "space-between" }}
                      align="center"
                    >
                      <Space size={4}>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => addAllocation(line.salesDeliveryLineId)}
                        >
                          Thêm lô
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => redistribute(line.salesDeliveryLineId)}
                        >
                          Rải lại theo số thực xuất
                        </Button>
                      </Space>
                      <Typography.Text type={diff === 0 ? "success" : "danger"}>
                        Tổng theo lô: {formatQty(allocated)}
                        {diff !== 0 && ` (lệch ${formatQty(diff)})`}
                      </Typography.Text>
                    </Space>
                  )}
                />
              </Card>
            );
          })}

          {problems.length > 0 && (
            <Alert
              type="error"
              showIcon
              message="Chưa xác nhận được"
              description={
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              }
            />
          )}
        </>
      )}
    </Modal>
  );
}
