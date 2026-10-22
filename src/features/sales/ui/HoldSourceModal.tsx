import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, InputNumber, Modal, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { useHoldDonors, useSetHoldPlans } from "../holdReallocation";
import type { HoldDonorOption, HoldPlan } from "../holdReallocation";
import type { ApprovalOrderLine } from "../types";
import { formatMoney, formatQty } from "./labels";
import "../../../shared/ui/data-grid.css";

/** Gợi ý: lấy lần lượt từ các đơn lô lâu chưa rút nhất (đã sắp sẵn) cho tới đủ phần thiếu. */
function suggest(donors: HoldDonorOption[], shortageQty: number) {
  const draft: Record<string, number> = {};
  let remaining = shortageQty;
  for (const donor of donors) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(donor.heldQty));
    if (take <= 0) continue;
    draft[donor.donorSalesOrderLineId] = take;
    remaining -= take;
  }
  return draft;
}

/**
 * Ô nguồn hàng trên hàng đợi duyệt khi dòng đơn thiếu tồn bán được. Không có quyền "Cho phép
 * bán vượt" thì chỉ báo thiếu; có quyền thì bấm để lấy hàng đơn lô khách chưa rút. Đã chọn rồi
 * thì ô hiện tóm tắt lựa chọn và bấm lại để sửa.
 */
export function HoldSourceCell({
  line,
  shortageQty,
  plans,
}: {
  line: ApprovalOrderLine;
  shortageQty: number;
  plans: HoldPlan[];
}) {
  const { can } = useCan();
  const [open, setOpen] = useState(false);
  const allowed = can(PERMS.SALES_OVERSELL);
  const plannedQty = plans.reduce((sum, plan) => sum + Number(plan.plannedQty), 0);

  if (!allowed) {
    return (
      <Tooltip
        title={
          plans.length
            ? `Đã cho phép bán vượt ${formatQty(plannedQty)} từ ${plans.map((plan) => plan.donorOrderNo).join(", ")}`
            : `Kho thiếu ${formatQty(shortageQty)}. Cần người có quyền "Cho phép bán vượt" để lấy hàng đơn lô khách chưa rút.`
        }
      >
        <Tag color={plans.length ? "geekblue" : "red"} style={{ marginInlineEnd: 0 }}>
          {plans.length ? `Bán vượt ${formatQty(plannedQty)}` : `Thiếu ${formatQty(shortageQty)}`}
        </Tag>
      </Tooltip>
    );
  }

  const owedQty = Number(line.supplierPreview?.owedQty ?? 0);
  const hint = plans.length
    ? plans.map((plan) => `${plan.donorOrderNo} · ${plan.donorCustomerName}: ${formatQty(plan.plannedQty)}`).join(" | ")
    : `Kho thiếu ${formatQty(shortageQty)}${
        owedQty > 0 ? ` (đã trừ ${formatQty(owedQty)} đang chờ bù cho phiếu bán vượt khác)` : ""
      }. Bấm để cho phép bán vượt bằng hàng đơn lô khách chưa rút.`;
  return (
    <>
      <Tooltip title={hint}>
        <Button
          size="small"
          block
          type={plans.length ? "default" : "dashed"}
          danger={!plans.length}
          style={{ overflow: "hidden", textOverflow: "ellipsis", paddingInline: 4 }}
          onClick={() => setOpen(true)}
        >
          {plans.length ? `Bán vượt ${formatQty(plannedQty)}` : `Thiếu ${formatQty(shortageQty)} · Bán vượt`}
        </Button>
      </Tooltip>
      {open ? (
        <HoldSourceModal line={line} shortageQty={shortageQty} plans={plans} open onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

/**
 * Cho phép bán vượt: chọn một hoặc nhiều đơn lô khách chưa rút (kể cả lô đã xuất hóa đơn) và
 * lượng lấy của từng đơn. Hệ thống gợi ý sẵn theo đơn lâu chưa rút nhất; người duyệt sửa được.
 * Chỉ lưu lựa chọn — hàng chuyển sang đơn này khi đơn được duyệt xong, rồi được bù khi hàng
 * mua về hoặc hàng chuyển kho tới.
 */
export function HoldSourceModal({
  line,
  shortageQty,
  plans,
  open,
  onClose,
}: {
  line: ApprovalOrderLine;
  shortageQty: number;
  plans: HoldPlan[];
  open: boolean;
  onClose: () => void;
}) {
  const donorsQuery = useHoldDonors(line.id, open);
  const setPlans = useSetHoldPlans();
  const donors = useMemo(() => donorsQuery.data?.donors ?? [], [donorsQuery.data]);
  const incoming = donorsQuery.data?.incoming;
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  // Mở hộp: nạp lựa chọn đã lưu; chưa có thì điền sẵn theo gợi ý.
  useEffect(() => {
    if (!open) return;
    setDraft(
      plans.length
        ? Object.fromEntries(plans.map((plan) => [plan.donorSalesOrderLineId, Number(plan.plannedQty)]))
        : suggest(donors, shortageQty),
    );
  }, [open, plans, donors, shortageQty]);

  const selected = donors.filter((donor) => (draft[donor.donorSalesOrderLineId] ?? 0) > 0);
  const total = selected.reduce((sum, donor) => sum + (draft[donor.donorSalesOrderLineId] ?? 0), 0);
  const overHeld = selected.some((donor) => draft[donor.donorSalesOrderLineId] > Number(donor.heldQty));
  const overOrdered = total > Number(line.orderedActualQty);
  const anyInvoiced = selected.some((donor) => donor.invoiced);
  const incomingQty = incoming
    ? Number(incoming.awaitingInvoiceQty) + Number(incoming.expectedQty) - Number(incoming.alreadyOwedQty)
    : null;

  const save = async (next: Array<{ donorSalesOrderLineId: string; qty: number }>) => {
    try {
      await setPlans.mutateAsync({ lineId: line.id, plans: next, note: note.trim() || undefined });
      onClose();
    } catch {
      // Lỗi đã được báo ở hook; giữ hộp mở để chọn lại.
    }
  };

  const columns: ColumnsType<HoldDonorOption> = [
    {
      title: "Đơn lô khách chưa rút",
      key: "order",
      render: (_, donor) => (
        <div className="data-grid-stack">
          <Space size={4}>
            <span className="data-grid-strong">{donor.orderNo}</span>
            {donor.invoiced ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>Đã xuất HĐ</Tag> : null}
          </Space>
          <span className="data-grid-sub data-grid-clip">{donor.customer.name}</span>
        </div>
      ),
    },
    {
      title: "Còn chưa rút",
      key: "held",
      width: 112,
      align: "right",
      render: (_, donor) => (
        <div className="data-grid-stack">
          <span className="data-grid-num">{formatQty(donor.heldQty)}</span>
          <span className="data-grid-sub data-grid-clip">{donor.lots.map((lot) => lot.lotNo).join(", ")}</span>
        </div>
      ),
    },
    {
      title: "Lần rút gần nhất",
      key: "lastWithdrawal",
      width: 118,
      render: (_, donor) => (
        <div className="data-grid-stack">
          <span>{donor.lastWithdrawalAt ? dayjs(donor.lastWithdrawalAt).format("DD/MM/YYYY") : "Chưa rút"}</span>
          <span className="data-grid-sub">đơn ngày {dayjs(donor.orderDate).format("DD/MM/YYYY")}</span>
        </div>
      ),
    },
    {
      title: "Giá vốn",
      key: "cost",
      width: 92,
      align: "right",
      render: (_, donor) => (
        <span className="data-grid-num">
          {formatMoney(donor.unitCost)}
          {donor.costIsProvisional ? " *" : ""}
        </span>
      ),
    },
    {
      title: "Lượng lấy",
      key: "qty",
      width: 120,
      align: "right",
      render: (_, donor) => (
        <InputNumber
          size="small"
          min={0}
          max={Number(donor.heldQty)}
          controls={false}
          style={{ width: "100%" }}
          value={draft[donor.donorSalesOrderLineId] ?? null}
          placeholder="0"
          formatter={(value) =>
            value === undefined || value === null ? "" : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          }
          parser={(value) => Number((value ?? "").replace(/\./g, "")) || 0}
          onChange={(value) =>
            setDraft((current) => ({ ...current, [donor.donorSalesOrderLineId]: Number(value ?? 0) }))
          }
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      title={`Cho phép bán vượt — ${line.product.name}`}
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Typography.Text type={total < shortageQty ? "warning" : undefined}>
            Đã chọn {formatQty(total)} / thiếu {formatQty(shortageQty)}
          </Typography.Text>
          <Space wrap>
            {plans.length ? (
              <Button danger disabled={setPlans.isPending} onClick={() => save([])}>
                Bỏ bán vượt
              </Button>
            ) : null}
            <Button onClick={() => setDraft(suggest(donors, shortageQty))} disabled={!donors.length}>
              Gợi ý tự động
            </Button>
            <Button onClick={onClose}>Đóng</Button>
            <Button
              type="primary"
              loading={setPlans.isPending}
              disabled={!selected.length || overHeld || overOrdered}
              onClick={() =>
                save(
                  selected.map((donor) => ({
                    donorSalesOrderLineId: donor.donorSalesOrderLineId,
                    qty: draft[donor.donorSalesOrderLineId],
                  })),
                )
              }
            >
              Cho phép bán vượt
            </Button>
          </Space>
        </Space>
      }
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Chọn một hoặc nhiều đơn lô và lượng lấy của từng đơn. Gợi ý sẵn theo đơn lâu chưa rút nhất. Hàng chuyển sang
          đơn này khi đơn được duyệt xong; các đơn lô bị lấy được bù khi hàng mua về hoặc hàng chuyển kho tới.
        </Typography.Text>
        <Table<HoldDonorOption>
          rowKey="donorSalesOrderLineId"
          size="small"
          className="data-grid"
          pagination={false}
          loading={donorsQuery.isLoading}
          columns={columns}
          dataSource={donors}
          scroll={{ x: 640, y: 280 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có đơn lô nào còn hàng khách chưa rút cho mặt hàng này tại kho của dòng đơn"
              />
            ),
          }}
        />
        {overHeld ? <Alert type="error" showIcon message="Lượng lấy vượt lượng khách đơn lô đó còn chưa rút." /> : null}
        {overOrdered ? (
          <Alert type="error" showIcon message={`Tổng lượng lấy vượt lượng đặt ${formatQty(line.orderedActualQty)} của dòng đơn.`} />
        ) : null}
        {anyInvoiced ? (
          <Alert
            type="info"
            showIcon
            message="Có lô đã xuất hóa đơn: tồn kho kế toán sẽ thấp hơn tồn trong bồn cho tới khi hóa đơn mua hàng bù được ghi sổ."
          />
        ) : null}
        {selected.length > 0 && incoming && incomingQty !== null && incomingQty < total ? (
          <Alert
            type="warning"
            showIcon
            message={
              incomingQty <= 0
                ? "Chưa thấy hàng bù: không có hàng chờ hóa đơn NCC hay hàng dự kiến về tại kho này."
                : `Hàng bù nhìn thấy chỉ ${formatQty(incomingQty)}, ít hơn lượng bán vượt ${formatQty(total)}.`
            }
          />
        ) : null}
        <Input.TextArea
          id="oversell-note"
          rows={2}
          maxLength={500}
          placeholder="Ghi chú (không bắt buộc): lý do bán vượt, kế hoạch bù…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {donors.some((donor) => donor.costIsProvisional) ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            * Giá vốn tạm tính, còn đổi khi chốt giá mua.
          </Typography.Text>
        ) : null}
      </Space>
    </Modal>
  );
}
