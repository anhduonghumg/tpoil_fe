import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  message,
  Progress,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CalculatorOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  PrinterOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  useApproveTermPurchaseOrder,
  useCompleteTermPurchaseOrder,
  useConfirmTermLogisticsCost,
  useConfirmTermReceipt,
  useCreateTermBillNormalizePricing,
  useCreateTermBossSheetPricing,
  useCreateTermEstimatePricing,
  useCreateTermFinalPricing,
  useCreateTermLogisticsCost,
  useCreateTermReceipt,
  useCreateTermShipment,
  useTermPurchaseOrderDetail,
  useVoidTermLogisticsCost,
} from "../hooks";
import type {
  TermGoodsReceipt,
  TermLogisticsCost,
  TermPricingStage,
  TermPrintDocument,
  TermPurchaseOrderDetail,
  TermPurchaseOrderLine,
  TermShipment,
  TermWorkflowStep,
} from "../types";
import { TermReceiptModal } from "../ui/TermReceiptModal";
import { TermPricingModal } from "../ui/TermPricingModal";
import TermPricingSheetTable from "../ui/TermPricingSheetTable";
import { TermLogisticsCostModal, TermShipmentModal } from "../ui/TermLogisticsModals";

const { Text, Title } = Typography;

type PricingKind = "ESTIMATE" | "BILL_NORMALIZE" | "FINAL" | "BOSS_SHEET";

function fmt(v?: number | null, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "--";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(Number(v));
}

function date(v?: string | null) {
  return v ? dayjs(v).format("DD/MM/YYYY") : "--";
}

function statusTag(status?: string) {
  const map: Record<string, { color: string; text: string }> = {
    DRAFT: { color: "default", text: "Nháp" },
    APPROVED: { color: "blue", text: "Đã duyệt" },
    IN_PROGRESS: { color: "gold", text: "Đang xử lý" },
    COMPLETED: { color: "green", text: "Hoàn tất" },
    CANCELLED: { color: "red", text: "Đã hủy" },
  };
  const item = map[status || ""] || { color: "default", text: status || "--" };
  return <Tag color={item.color}>{item.text}</Tag>;
}

function stage(data: TermPurchaseOrderDetail, stageType: PricingKind) {
  return data.pricingRuns
    ?.flatMap((run) => run.stages || [])
    .find((item) => item.stageType === stageType);
}

function isAction(action: string | undefined, ...values: string[]) {
  return values.includes(action || "");
}

function stageTitle(kind: PricingKind) {
  const map: Record<PricingKind, string> = {
    ESTIMATE: "Bảng giá tạm tính",
    BILL_NORMALIZE: "Bảng giá theo bill",
    FINAL: "Bảng giá chính thức",
    BOSS_SHEET: "Bảng tổng hợp",
  };
  return map[kind];
}

export default function TermPurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [pricingKind, setPricingKind] = useState<PricingKind | null>(null);

  const detailQuery = useTermPurchaseOrderDetail(id);
  const data = detailQuery.data;

  const approveMutation = useApproveTermPurchaseOrder();
  const completeMutation = useCompleteTermPurchaseOrder();
  const createReceiptMutation = useCreateTermReceipt(data?.id);
  const confirmReceiptMutation = useConfirmTermReceipt(data?.id);
  const createShipmentMutation = useCreateTermShipment(data?.id);
  const createLogisticsCostMutation = useCreateTermLogisticsCost(data?.id);
  const confirmLogisticsCostMutation = useConfirmTermLogisticsCost(data?.id);
  const voidLogisticsCostMutation = useVoidTermLogisticsCost(data?.id);
  const createEstimatePricing = useCreateTermEstimatePricing(data?.id);
  const createBillPricing = useCreateTermBillNormalizePricing(data?.id);
  const createFinalPricing = useCreateTermFinalPricing(data?.id);
  const createBossSheetPricing = useCreateTermBossSheetPricing(data?.id);

  const pricing = useMemo(() => {
    if (!data) return null;
    const estimate = stage(data, "ESTIMATE");
    const bill = stage(data, "BILL_NORMALIZE");
    const final = stage(data, "FINAL");
    const boss = stage(data, "BOSS_SHEET");
    return { estimate, bill, final, boss, latest: final || bill || estimate || boss };
  }, [data]);

  if (detailQuery.isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!data) {
    return <Empty description="Không tìm thấy hồ sơ TERM" />;
  }

  const workflow = data.workflow;
  const currentAction = workflow?.currentAction || data.nextAction;
  const hasConfirmedReceipt = (data.receipts || []).some((item) => item.status === "CONFIRMED");
  const hasEstimate = !!pricing?.estimate;
  const hasBill = !!pricing?.bill;
  const hasFinal = !!pricing?.final;

  const runCurrentAction = () => {
    if (isAction(currentAction, "APPROVE_ORDER")) approveMutation.mutate(data.id);
    else if (isAction(currentAction, "CREATE_RECEIPT")) setReceiptOpen(true);
    else if (isAction(currentAction, "CALCULATE_ESTIMATE", "CALCULATE_TEMP_PRICE")) setPricingKind("ESTIMATE");
    else if (isAction(currentAction, "CALCULATE_BILL_NORMALIZE", "CALCULATE_INVOICE_PRICE")) setPricingKind("BILL_NORMALIZE");
    else if (isAction(currentAction, "CALCULATE_FINAL", "CALCULATE_OFFICIAL_FX")) setPricingKind("FINAL");
    else if (isAction(currentAction, "COMPLETE_ORDER")) completeMutation.mutate(data.id);
  };

  const currentActionLabel = workflow?.currentActionLabel || "Xem hồ sơ";
  const currentActionDisabled = isAction(currentAction, "VIEW_ONLY") || data.status === "CANCELLED";

  const printDocument = (doc: TermPrintDocument) => {
    if (doc.status !== "READY") {
      message.warning("Chứng từ này chưa đủ dữ liệu để in.");
      return;
    }
    message.info(`Đã sẵn sàng nối mẫu in: ${doc.title}.`);
  };

  return (
    <div style={{ height: "calc(100vh - 96px)", minHeight: 0, background: "#f6f8fb", padding: 8, paddingBottom: 32, overflowY: "auto", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto" }}>
        <Card size="small" style={{ borderRadius: 8, marginBottom: 8 }} styles={{ body: { padding: 8 } }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 280 }}>
              <Space size={6} wrap>
                <Tag color="blue">TERM</Tag>
                <Tag color={data.transportMode === "PIPELINE" ? "purple" : "default"}>
                  {data.transportMode === "PIPELINE" ? "Đường ống" : data.transportMode || "Chưa chọn vận chuyển"}
                </Tag>
                {statusTag(data.status)}
              </Space>
              <Title level={5} style={{ margin: "4px 0 0" }}>
                {data.orderNo} - {data.supplierName || "--"}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hợp đồng {data.contractNo || "--"} · Ngày đơn {date(data.orderDate)} · Dự kiến {date(data.expectedDate)}
              </Text>
            </div>

            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/purchase-terms")}>
                Danh sách
              </Button>
              <Button
                type="primary"
                size="middle"
                disabled={currentActionDisabled}
                loading={approveMutation.isPending || completeMutation.isPending}
                onClick={runCurrentAction}
              >
                {currentActionLabel}
              </Button>
            </Space>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 280px)", gap: 8, alignItems: "start" }}>
          <Space direction="vertical" size={5} style={{ width: "100%" }}>
            <WorkflowCard workflow={workflow} fallbackAction={currentAction} />

            <ActionBoard
              data={data}
              hasConfirmedReceipt={hasConfirmedReceipt}
              hasEstimate={hasEstimate}
              hasBill={hasBill}
              hasFinal={hasFinal}
              onReceive={() => setReceiptOpen(true)}
              onEstimate={() => setPricingKind("ESTIMATE")}
              onBill={() => setPricingKind("BILL_NORMALIZE")}
              onFinal={() => setPricingKind("FINAL")}
              onBoss={() => setPricingKind("BOSS_SHEET")}
              onShipment={() => setShipmentOpen(true)}
              onLogistics={() => setLogisticsOpen(true)}
            />

            <Collapse
              size="small"
              defaultActiveKey={[isAction(currentAction, "CALCULATE_ESTIMATE", "CALCULATE_TEMP_PRICE", "CALCULATE_BILL_NORMALIZE", "CALCULATE_INVOICE_PRICE", "CALCULATE_FINAL", "CALCULATE_OFFICIAL_FX") ? "pricing" : "goods"]}
              style={{ background: "#fff", borderRadius: 8 }}
              items={[
                {
                  key: "goods",
                  label: <PanelLabel title="Hàng hóa & giao nhận" meta={(data.lines?.length || 0) + " dòng / " + (data.receipts?.length || 0) + " phiếu"} />,
                  children: (
                    <GoodsAndReceiptSection
                      data={data}
                      onReceive={() => setReceiptOpen(true)}
                      onConfirm={(receiptId) => confirmReceiptMutation.mutate(receiptId)}
                      confirmingId={confirmReceiptMutation.isPending ? (confirmReceiptMutation.variables as string) : undefined}
                    />
                  ),
                },
                {
                  key: "pricing",
                  label: <PanelLabel title="Bảng giá" meta={hasFinal ? "Đã chốt" : hasBill ? "Đã có bill" : hasEstimate ? "Đã tạm tính" : "Chưa lập"} />,
                  children: (
                    <PricingSection
                      estimate={pricing?.estimate}
                      bill={pricing?.bill}
                      final={pricing?.final}
                      boss={pricing?.boss}
                      latest={pricing?.latest}
                      hasConfirmedReceipt={hasConfirmedReceipt}
                      onCreate={(kind) => setPricingKind(kind)}
                    />
                  ),
                },
                {
                  key: "logistics",
                  label: <PanelLabel title="Vận chuyển & chi phí" meta={(data.shipments?.length || 0) + " chuyến / " + (data.logisticsCosts?.length || 0) + " chi phí"} />,
                  children: (
                    <LogisticsSection
                      shipments={data.shipments || []}
                      costs={data.logisticsCosts || []}
                      onCreateShipment={() => setShipmentOpen(true)}
                      onCreateCost={() => setLogisticsOpen(true)}
                      onConfirmCost={(costId) => confirmLogisticsCostMutation.mutate(costId)}
                      onVoidCost={(costId) => voidLogisticsCostMutation.mutate(costId)}
                    />
                  ),
                },
              ]}
            />
          </Space>

          <div style={{ position: "sticky", top: 8 }}>
            <SideTabs data={data} onPrint={printDocument} />
          </div>
        </div>
      </div>

      <TermReceiptModal
        open={receiptOpen}
        data={data}
        loading={createReceiptMutation.isPending}
        onCancel={() => setReceiptOpen(false)}
        onSubmit={(payload) =>
          createReceiptMutation.mutate(payload, { onSuccess: () => setReceiptOpen(false) })
        }
      />

      {pricingKind ? (
        <TermPricingModal
          open={!!pricingKind}
          kind={pricingKind}
          data={data}
          loading={
            createEstimatePricing.isPending ||
            createBillPricing.isPending ||
            createFinalPricing.isPending ||
            createBossSheetPricing.isPending
          }
          onCancel={() => setPricingKind(null)}
          onSubmit={(payload) => {
            const done = { onSuccess: () => setPricingKind(null) };
            if (pricingKind === "ESTIMATE") createEstimatePricing.mutate(payload, done);
            else if (pricingKind === "BILL_NORMALIZE") createBillPricing.mutate(payload, done);
            else if (pricingKind === "FINAL") createFinalPricing.mutate(payload, done);
            else createBossSheetPricing.mutate(payload, done);
          }}
        />
      ) : null}

      <TermShipmentModal
        open={shipmentOpen}
        loading={createShipmentMutation.isPending}
        onCancel={() => setShipmentOpen(false)}
        onSubmit={(payload) => createShipmentMutation.mutate(payload, { onSuccess: () => setShipmentOpen(false) })}
      />

      <TermLogisticsCostModal
        open={logisticsOpen}
        data={data}
        loading={createLogisticsCostMutation.isPending}
        onCancel={() => setLogisticsOpen(false)}
        onSubmit={(payload) => createLogisticsCostMutation.mutate(payload, { onSuccess: () => setLogisticsOpen(false) })}
      />
    </div>
  );
}

function PanelLabel({ title, meta }: { title: string; meta?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, width: "100%", alignItems: "center" }}>
      <b>{title}</b>
      {meta ? <Text type="secondary" style={{ fontSize: 12 }}>{meta}</Text> : null}
    </div>
  );
}

function WorkflowCard({ workflow, fallbackAction }: { workflow?: TermPurchaseOrderDetail["workflow"]; fallbackAction?: string }) {
  const steps = workflow?.steps?.length
    ? workflow.steps
    : [
        { key: "ORDER", title: "Đơn hàng", status: "CURRENT", description: fallbackAction || "Đang xử lý" } as TermWorkflowStep,
      ];

  return (
    <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 8 } }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Luồng xử lý hồ sơ</div>
          <Text type="secondary">Chỉ hiển thị những mốc người dùng cần quan tâm.</Text>
        </div>
        <div style={{ width: 220 }}>
          <Progress percent={workflow?.progress ?? 0} size="small" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 6 }}>
        {steps.map((step, index) => (
          <StepCard key={step.key} step={step} index={index + 1} />
        ))}
      </div>
      {workflow?.missing?.length ? (
        <div style={{ marginTop: 6, padding: 8, borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <b>Còn thiếu: </b>
          <Text>{workflow.missing.join(", ")}</Text>
        </div>
      ) : null}
    </Card>
  );
}

function StepCard({ step, index }: { step: TermWorkflowStep; index: number }) {
  const done = step.status === "DONE";
  const current = step.status === "CURRENT";
  return (
    <div style={{ border: `1px solid ${current ? "#1677ff" : "#e2e8f0"}`, borderRadius: 8, padding: 6, background: done ? "#f0fdf4" : current ? "#eff6ff" : "#fff" }}>
      <Space size={8} align="start">
        {done ? <CheckCircleFilled style={{ color: "#16a34a", marginTop: 2 }} /> : <ClockCircleOutlined style={{ color: current ? "#1677ff" : "#94a3b8", marginTop: 2 }} />}
        <div>
          <div style={{ fontWeight: 800, fontSize: 12 }}>{index}. {step.title}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{step.description}</Text>
        </div>
      </Space>
    </div>
  );
}

function ActionBoard({
  hasConfirmedReceipt,
  hasEstimate,
  hasBill,
  hasFinal,
  onReceive,
  onEstimate,
  onBill,
  onFinal,
  onBoss,
  onShipment,
  onLogistics,
}: {
  data: TermPurchaseOrderDetail;
  hasConfirmedReceipt: boolean;
  hasEstimate: boolean;
  hasBill: boolean;
  hasFinal: boolean;
  onReceive: () => void;
  onEstimate: () => void;
  onBill: () => void;
  onFinal: () => void;
  onBoss: () => void;
  onShipment: () => void;
  onLogistics: () => void;
}) {
  return (
    <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 8 } }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>Thao tác chính</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))", gap: 5 }}>
        <ActionButton icon={<FileDoneOutlined />} title="Nhận hàng" desc="Số lượng, V15, tỷ trọng" onClick={onReceive} />
        <ActionButton icon={<CalculatorOutlined />} title="Giá tạm tính" desc="MOPS, premium, tỷ giá" disabled={!hasConfirmedReceipt} onClick={onEstimate} done={hasEstimate} />
        <ActionButton icon={<CalculatorOutlined />} title="Giá theo bill" desc="Sau giao nhận/bill bồn" disabled={!hasEstimate} onClick={onBill} done={hasBill} />
        <ActionButton icon={<CalculatorOutlined />} title="Giá chính thức" desc="Chốt tỷ giá và quyết toán" disabled={!hasBill} onClick={onFinal} done={hasFinal} />
        <ActionButton icon={<TruckOutlined />} title="Vận chuyển" desc="Đường ống/logistics" onClick={onShipment} />
        <ActionButton icon={<FileTextOutlined />} title="Chi phí" desc="Kiểm định, vận chuyển, khác" onClick={onLogistics} />
        <ActionButton icon={<PrinterOutlined />} title="Bảng tổng hợp" desc="Phục vụ quyết toán" disabled={!hasFinal} onClick={onBoss} />
      </div>
    </Card>
  );
}

function ActionButton({ icon, title, desc, disabled, done, onClick }: { icon: React.ReactNode; title: string; desc: string; disabled?: boolean; done?: boolean; onClick: () => void }) {
  return (
    <Button disabled={disabled} onClick={onClick} size="small" style={{ height: 34, textAlign: "left", justifyContent: "flex-start", borderRadius: 6, paddingInline: 8 }}>
      <Space size={6} align="center">
        <span style={{ color: done ? "#16a34a" : "#1677ff", fontSize: 13 }}>{done ? <CheckCircleFilled /> : icon}</span>
        <span style={{ display: "block", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={desc}>{title}</span>
      </Space>
    </Button>
  );
}

function GoodsAndReceiptSection({ data, onReceive, onConfirm, confirmingId }: { data: TermPurchaseOrderDetail; onReceive: () => void; onConfirm: (id: string) => void; confirmingId?: string }) {
  const receiptByLine = useMemo(() => {
    const map = new Map<string, number>();
    (data.receipts || []).forEach((receipt) => {
      if (!receipt.purchaseOrderLineId || receipt.status !== "CONFIRMED") return;
      map.set(receipt.purchaseOrderLineId, (map.get(receipt.purchaseOrderLineId) || 0) + Number(receipt.qty || 0));
    });
    return map;
  }, [data.receipts]);

  const lineColumns: ColumnsType<TermPurchaseOrderLine> = [
    { title: "Sản phẩm", dataIndex: "productName", render: (_, r) => <b>{r.productName || r.productCode || "--"}</b> },
    { title: "Kho nhận", dataIndex: "supplierLocationName", render: (v) => v || "--" },
    { title: "Đặt hàng", dataIndex: "orderedQty", align: "right", render: (v) => `${fmt(v)} L` },
    { title: "Đã nhận", align: "right", render: (_, r) => `${fmt(receiptByLine.get(r.id) || 0)} L` },
    { title: "Giá tạm", dataIndex: "unitPrice", align: "right", render: (v) => (v == null ? "--" : `${fmt(v)} đ/L`) },
  ];

  const receiptColumns: ColumnsType<TermGoodsReceipt> = [
    { title: "Phiếu", dataIndex: "receiptNo", width: 130 },
    { title: "Ngày", dataIndex: "receiptDate", width: 110, render: (v) => date(v) },
    { title: "Sản phẩm", dataIndex: "productName", render: (v) => v || "--" },
    { title: "SL thực nhận", dataIndex: "qty", align: "right", width: 130, render: (v) => `${fmt(v)} L` },
    { title: "V15", dataIndex: "standardQtyV15", align: "right", width: 120, render: (v) => (v == null ? "--" : `${fmt(v)} L`) },
    { title: "Trạng thái", dataIndex: "status", width: 115, render: (v) => <Tag color={v === "CONFIRMED" ? "green" : "default"}>{v}</Tag> },
    {
      title: "",
      width: 110,
      render: (_, r) => (
        <Button size="small" type="link" disabled={r.status !== "DRAFT"} loading={confirmingId === r.id} onClick={() => onConfirm(r.id)}>
          Xác nhận
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Header title="Hàng hóa & giao nhận" desc="Phần này là nơi nhập số lượng thực nhận, không tách sang màn riêng." action={<Button type="primary" onClick={onReceive}>Tạo phiếu nhận</Button>} />
      <Table size="small" bordered rowKey="id" columns={lineColumns} dataSource={data.lines || []} pagination={false} scroll={{ x: 820 }} />
      <div style={{ height: 10 }} />
      <Table size="small" rowKey="id" columns={receiptColumns} dataSource={data.receipts || []} pagination={false} scroll={{ x: 900 }} locale={{ emptyText: "Chưa có phiếu nhận hàng" }} />
    </div>
  );
}

function PricingSection({ estimate, bill, final, boss, latest, hasConfirmedReceipt, onCreate }: { estimate?: TermPricingStage; bill?: TermPricingStage; final?: TermPricingStage; boss?: TermPricingStage; latest?: TermPricingStage; hasConfirmedReceipt: boolean; onCreate: (kind: PricingKind) => void }) {
  return (
    <div>
      <Header title="Bảng giá" desc="Hiển thị theo đúng thứ tự lập giá, không cần mở nhiều tab." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: latest ? 12 : 0 }}>
        <PriceCard title="Tạm tính" stage={estimate} disabled={!hasConfirmedReceipt} onClick={() => onCreate("ESTIMATE")} />
        <PriceCard title="Theo bill" stage={bill} disabled={!estimate} onClick={() => onCreate("BILL_NORMALIZE")} />
        <PriceCard title="Chính thức" stage={final} disabled={!bill} onClick={() => onCreate("FINAL")} />
        <PriceCard title="Tổng hợp" stage={boss} disabled={!final} onClick={() => onCreate("BOSS_SHEET")} />
      </div>
      {latest ? (
        <div>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Bảng giá mới nhất: {stageTitle(latest.stageType as PricingKind)}</div>
          <TermPricingSheetTable rows={latest.sheetRows || []} />
        </div>
      ) : null}
    </div>
  );
}

function PriceCard({ title, stage, disabled, onClick }: { title: string; stage?: TermPricingStage; disabled?: boolean; onClick: () => void }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 6, background: stage ? "#f8fafc" : "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <b>{title}</b>
        {stage ? <Tag color="green">Đã có</Tag> : <Tag>Chưa có</Tag>}
      </div>
      <div style={{ margin: "8px 0", color: "#475569" }}>
        <div>Đơn giá: <b>{stage?.unitVndPerLiter == null ? "--" : `${fmt(stage.unitVndPerLiter, 2)} đ/L`}</b></div>
        <div>Tổng tiền: <b>{stage?.totalAmountVnd == null ? "--" : `${fmt(stage.totalAmountVnd)} đ`}</b></div>
      </div>
      <Button block size="small" disabled={disabled} onClick={onClick}>{stage ? "Tính lại" : "Tạo"}</Button>
    </div>
  );
}

function LogisticsSection({ shipments, costs, onCreateShipment, onCreateCost, onConfirmCost, onVoidCost }: { shipments: TermShipment[]; costs: TermLogisticsCost[]; onCreateShipment: () => void; onCreateCost: () => void; onConfirmCost: (id: string) => void; onVoidCost: (id: string) => void }) {
  const shipmentColumns: ColumnsType<TermShipment> = [
    { title: "Vận chuyển", dataIndex: "transportMode", width: 120, render: (v) => (v === "PIPELINE" ? "Đường ống" : v || "--") },
    { title: "B/L", dataIndex: "blNo", width: 140, render: (v) => v || "--" },
    { title: "Nơi đi", dataIndex: "loadingPort", render: (v) => v || "--" },
    { title: "Nơi nhận", dataIndex: "dischargePort", render: (v) => v || "--" },
    { title: "ETA", dataIndex: "eta", width: 110, render: (v) => date(v) },
  ];

  const costColumns: ColumnsType<TermLogisticsCost> = [
    { title: "Chứng từ", dataIndex: "documentNo", render: (v) => v || "--" },
    { title: "Ngày", dataIndex: "documentDate", width: 110, render: (v) => date(v) },
    { title: "NCC dịch vụ", dataIndex: "vendorName", render: (v) => v || "--" },
    { title: "Sau VAT", dataIndex: "totalAfterVat", align: "right", width: 130, render: (v) => fmt(v) },
    { title: "Trạng thái", dataIndex: "status", width: 120, render: (v) => <Tag>{v}</Tag> },
    {
      title: "",
      width: 135,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" disabled={r.status !== "DRAFT"} onClick={() => onConfirmCost(r.id)}>Duyệt</Button>
          <Button size="small" danger type="link" disabled={r.status === "POSTED" || r.status === "VOID"} onClick={() => onVoidCost(r.id)}>Hủy</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Header title="Vận chuyển & chi phí" desc="Chỉ giữ các thông tin cần cho giá vốn và chứng từ hồ sơ." action={<Space><Button onClick={onCreateShipment}>Thêm vận chuyển</Button><Button type="primary" onClick={onCreateCost}>Thêm chi phí</Button></Space>} />
      <Table size="small" rowKey="id" columns={shipmentColumns} dataSource={shipments} pagination={false} locale={{ emptyText: "Chưa có thông tin vận chuyển" }} scroll={{ x: 760 }} />
      <div style={{ height: 10 }} />
      <Table size="small" rowKey="id" columns={costColumns} dataSource={costs} pagination={false} locale={{ emptyText: "Chưa có chi phí logistics" }} scroll={{ x: 860 }} />
    </div>
  );
}

function SideTabs({ data, onPrint }: { data: TermPurchaseOrderDetail; onPrint: (doc: TermPrintDocument) => void }) {
  return (
    <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 8 } }}>
      <Tabs
        size="small"
        defaultActiveKey="documents"
        items={[
          {
            key: "documents",
            label: "Chứng từ",
            children: <PrintPanel documents={data.printDocuments || fallbackDocuments(data)} onPrint={onPrint} />,
          },
          {
            key: "summary",
            label: "Tóm tắt",
            children: <SummaryPanel data={data} />,
          },
        ]}
      />
    </Card>
  );
}

function PrintPanel({ documents, onPrint }: { documents: TermPrintDocument[]; onPrint: (doc: TermPrintDocument) => void }) {
  return (
    <div>
      <Space direction="vertical" size={5} style={{ width: "100%" }}>
        {documents.map((doc) => (
          <Button key={doc.key} block icon={<PrinterOutlined />} disabled={doc.status !== "READY"} onClick={() => onPrint(doc)} size="small" style={{ height: 36, textAlign: "left", justifyContent: "flex-start", paddingInline: 8 }}>
            <span>
              <span style={{ display: "block", fontWeight: 800 }}>{doc.title}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{doc.status === "READY" ? "Sẵn sàng in" : "Chưa đủ dữ liệu"}</span>
            </span>
          </Button>
        ))}
      </Space>
    </div>
  );
}

function SummaryPanel({ data }: { data: TermPurchaseOrderDetail }) {
  return (
    <div>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Nhà cung cấp">{data.supplierName || "--"}</Descriptions.Item>
        <Descriptions.Item label="Mã NCC">{data.supplierCode || "--"}</Descriptions.Item>
        <Descriptions.Item label="Kho nhận">{data.supplierLocationName || data.deliveryLocation || "--"}</Descriptions.Item>
        <Descriptions.Item label="Tổng lượng">{fmt(data.totalQty)} L</Descriptions.Item>
        <Descriptions.Item label="Tạm tính">{fmt(data.totalAmount)} đ</Descriptions.Item>
        <Descriptions.Item label="Premium">{data.termPremiumUsdPerBbl == null ? "--" : fmt(data.termPremiumUsdPerBbl, 6) + " USD/bbl"}</Descriptions.Item>
        <Descriptions.Item label="Ghi chú">{data.note || "--"}</Descriptions.Item>
      </Descriptions>
    </div>
  );
}
function Header({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
        {desc ? <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text> : null}
      </div>
      {action}
    </div>
  );
}

function fallbackDocuments(data: TermPurchaseOrderDetail): TermPrintDocument[] {
  const hasEstimate = !!stage(data, "ESTIMATE");
  const hasBill = !!stage(data, "BILL_NORMALIZE");
  const hasFinal = !!stage(data, "FINAL");
  const hasReceipt = (data.receipts || []).some((x) => x.status === "CONFIRMED");
  return [
    { key: "APPENDIX", title: "Phụ lục hợp đồng", status: data.contractNo ? "READY" : "WAITING" },
    { key: "PURCHASE_ORDER", title: "Đơn đặt hàng", status: data.orderNo ? "READY" : "WAITING" },
    { key: "ESTIMATE_PRICE", title: "Bảng giá tạm tính", status: hasEstimate ? "READY" : "WAITING" },
    { key: "BILL_PRICE", title: "Bảng giá theo bill", status: hasBill ? "READY" : "WAITING" },
    { key: "OFFICIAL_PRICE", title: "Bảng giá chính thức", status: hasFinal ? "READY" : "WAITING" },
    { key: "PAYMENT_REQUEST", title: "Phiếu đề nghị thanh toán", status: hasEstimate || hasFinal ? "READY" : "WAITING" },
    { key: "DELIVERY_MINUTES", title: "Biên bản giao nhận", status: hasReceipt ? "READY" : "WAITING" },
  ];
}
