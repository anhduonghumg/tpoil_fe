import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  useApproveTermPurchaseOrder,
  useConfirmTermReceipt,
  useCreateTermBillNormalizePricing,
  useCreateTermEstimatePricing,
  useCreateTermFinalPricing,
  useCreateTermReceipt,
  useTermPurchaseOrderDetail,
} from "../hooks";
import type {
  TermGoodsReceipt,
  TermPricingStage,
  TermPurchaseOrderDetail,
  TermPurchaseOrderLine,
} from "../types";
import { TermReceiptModal } from "../ui/TermReceiptModal";
import { TermPricingModal } from "../ui/TermPricingModal";

const { Title, Text } = Typography;

type SectionKey =
  | "overview"
  | "receipt"
  | "tempPrice"
  | "invoicePrice"
  | "officialFx"
  | "costs"
  | "bossSheet"
  | "accounting";

const SECTIONS: Array<{ key: SectionKey; label: string; desc: string }> = [
  { key: "overview", label: "Tổng quan", desc: "Đơn & hàng hóa" },
  { key: "receipt", label: "Nhận hàng", desc: "Phiếu nhận" },
  { key: "tempPrice", label: "Bảng giá tạm", desc: "Estimate" },
  { key: "invoicePrice", label: "Bảng xuất hóa đơn", desc: "Bill" },
  { key: "officialFx", label: "Tỷ giá chính thức", desc: "Final" },
  { key: "costs", label: "Chi phí", desc: "Theo stage" },
  { key: "bossSheet", label: "Bảng sếp", desc: "Tổng hợp" },
  { key: "accounting", label: "Kế toán", desc: "Xử lý sau" },
];

function fmt(v?: number | null, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "--";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
  }).format(Number(v));
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

function nextActionText(action?: string) {
  const map: Record<string, string> = {
    APPROVE_ORDER: "Duyệt đơn",
    CREATE_RECEIPT: "Nhận hàng",
    CALCULATE_TEMP_PRICE: "Tạo bảng giá tạm",
    CALCULATE_INVOICE_PRICE: "Tạo bảng xuất hóa đơn",
    CALCULATE_OFFICIAL_FX: "Nhập tỷ giá chính thức",
    COMPLETE_ORDER: "Hoàn tất đơn",
    VIEW_ONLY: "Chỉ xem",
  };

  return map[action || ""] || action || "--";
}

function getStage(data: TermPurchaseOrderDetail, stageType: string) {
  return data.pricingRuns
    ?.flatMap((run) => run.stages || [])
    .find((s) => s.stageType === stageType);
}

export default function TermPurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [section, setSection] = useState<SectionKey>("overview");
  const [receiptOpen, setReceiptOpen] = useState(false);

  const detailQuery = useTermPurchaseOrderDetail(id);
  const approveMutation = useApproveTermPurchaseOrder();

  const data = detailQuery?.data?.data;
  const createReceiptMutation = useCreateTermReceipt(data?.id);
  const confirmReceiptMutation = useConfirmTermReceipt(data?.id);

  const [pricingKind, setPricingKind] = useState<
    "ESTIMATE" | "BILL_NORMALIZE" | "FINAL" | null
  >(null);
  const createEstimatePricing = useCreateTermEstimatePricing(data?.id);
  const createBillPricing = useCreateTermBillNormalizePricing(data?.id);
  const createFinalPricing = useCreateTermFinalPricing(data?.id);

  const main = useMemo(() => {
    if (!data) return null;

    switch (section) {
      case "overview":
        return <OverviewSection data={data} />;
      case "receipt":
        return (
          <ReceiptSection
            data={data}
            onCreate={() => setReceiptOpen(true)}
            onConfirm={(receiptId) => confirmReceiptMutation.mutate(receiptId)}
            confirmingId={
              confirmReceiptMutation.isPending
                ? (confirmReceiptMutation.variables as string)
                : undefined
            }
          />
        );
      case "tempPrice":
        return <PricingStageSection data={data} stageType="ESTIMATE" />;
      case "invoicePrice":
        return <PricingStageSection data={data} stageType="BILL_NORMALIZE" />;
      case "officialFx":
        return <PricingStageSection data={data} stageType="FINAL" />;
      case "costs":
        return <CostsSection data={data} />;
      case "bossSheet":
        return <BossSheetSection data={data} />;
      case "accounting":
        return <AccountingSection />;
      default:
        return null;
    }
  }, [data, section]);

  if (detailQuery.isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!data) {
    return <Empty description="Không tìm thấy đơn TERM" />;
  }

  return (
    <div style={{ height: "calc(100vh - 96px)", overflow: "auto" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <Card
          size="small"
          style={{ borderRadius: 16, marginBottom: 10 }}
          styles={{ body: { padding: 10 } }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <Space size={6} wrap>
                <Tag color="blue">TERM</Tag>
                {statusTag(data.status)}
                <Tag color="gold">{nextActionText(data.nextAction)}</Tag>
              </Space>

              <Title level={4} style={{ margin: "6px 0 0" }}>
                {data.orderNo} · {data.supplierName || "--"}
              </Title>

              <Text type="secondary" style={{ fontSize: 12 }}>
                TERM lấy 1 lần, xử lý theo bảng giá tạm → bảng xuất hóa đơn → tỷ
                giá chính thức → bảng sếp.
              </Text>
            </div>

            <Space wrap>
              <Button onClick={() => navigate("/purchase-terms")}>
                Danh sách
              </Button>

              <Button
                type="primary"
                disabled={data.nextAction !== "APPROVE_ORDER"}
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate(data.id)}
              >
                Duyệt đơn
              </Button>

              <Button
                disabled={data.nextAction !== "CREATE_RECEIPT"}
                onClick={() => setReceiptOpen(true)}
              >
                Nhận hàng
              </Button>

              <Button
                disabled={data.nextAction !== "CALCULATE_TEMP_PRICE"}
                onClick={() => setPricingKind("ESTIMATE")}
              >
                Bảng giá tạm
              </Button>

              <Button
                disabled={data.nextAction !== "CALCULATE_INVOICE_PRICE"}
                onClick={() => setPricingKind("BILL_NORMALIZE")}
              >
                Bảng xuất hóa đơn
              </Button>

              <Button
                disabled={data.nextAction !== "CALCULATE_OFFICIAL_FX"}
                onClick={() => setPricingKind("FINAL")}
              >
                Tỷ giá chính thức
              </Button>

              <Button disabled={data.nextAction !== "COMPLETE_ORDER"}>
                Hoàn tất
              </Button>
            </Space>
          </div>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "210px minmax(0, 1fr) 300px",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div style={{ position: "sticky", top: 10 }}>
            <Card
              size="small"
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: 8 } }}
            >
              <div style={{ fontWeight: 900, margin: "4px 6px 8px" }}>
                Màn TERM
              </div>

              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                {SECTIONS.map((x) => {
                  const active = x.key === section;

                  return (
                    <Button
                      key={x.key}
                      block
                      type={active ? "primary" : "text"}
                      onClick={() => setSection(x.key)}
                      style={{
                        height: 44,
                        textAlign: "left",
                        justifyContent: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{x.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.75 }}>
                          {x.desc}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </Space>
            </Card>
          </div>

          <div style={{ minWidth: 0 }}>{main}</div>

          <SummaryPanel data={data} />
          <TermReceiptModal
            open={receiptOpen}
            data={data}
            loading={createReceiptMutation.isPending}
            onCancel={() => setReceiptOpen(false)}
            onSubmit={(payload) =>
              createReceiptMutation.mutate(payload, {
                onSuccess: () => setReceiptOpen(false),
              })
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
                createFinalPricing.isPending
              }
              onCancel={() => setPricingKind(null)}
              onSubmit={(payload) => {
                const done = {
                  onSuccess: () => setPricingKind(null),
                };

                if (pricingKind === "ESTIMATE") {
                  createEstimatePricing.mutate(payload, done);
                } else if (pricingKind === "BILL_NORMALIZE") {
                  createBillPricing.mutate(payload, done);
                } else {
                  createFinalPricing.mutate(payload, done);
                }
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OverviewSection({ data }: { data: TermPurchaseOrderDetail }) {
  const columns: ColumnsType<TermPurchaseOrderLine> = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      width: 220,
      render: (_, r) => (
        <div>
          <b>{r.productName || "--"}</b>
          {r.productCode ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {r.productCode}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Kho nhận",
      dataIndex: "supplierLocationName",
      width: 220,
      render: (v) => v || "--",
    },
    {
      title: "SL đặt",
      dataIndex: "orderedQty",
      align: "right",
      width: 120,
      render: (v) => `${fmt(v)} L`,
    },
    {
      title: "Giá tạm",
      dataIndex: "unitPrice",
      align: "right",
      width: 130,
      render: (v) => (v == null ? "--" : `${fmt(v)} đ/L`),
    },
    {
      title: "VAT",
      dataIndex: "taxRate",
      align: "right",
      width: 90,
      render: (v) => (v == null ? "--" : `${fmt(v, 2)}%`),
    },
    {
      title: "Giảm trừ",
      dataIndex: "discountAmount",
      align: "right",
      width: 130,
      render: (v) => fmt(v),
    },
  ];

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Card size="small" style={{ borderRadius: 16 }}>
        <Descriptions size="small" column={4}>
          <Descriptions.Item label="Nhà cung cấp">
            {data.supplierCode || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="Kho mặc định">
            {data.supplierLocationName || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày đơn">
            {date(data.orderDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày dự kiến">
            {date(data.expectedDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Premium">
            {data.termPremiumUsdPerBbl == null
              ? "--"
              : `${fmt(data.termPremiumUsdPerBbl, 6)} USD/bbl`}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng lượng">
            {fmt(data.totalQty)} L
          </Descriptions.Item>
          <Descriptions.Item label="Tạm tính">
            {fmt(data.totalAmount)} đ
          </Descriptions.Item>
          <Descriptions.Item label="Số dòng">
            {data.lineCount || data.lines?.length || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Hợp đồng" span={2}>
            {data.contractNo || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="Địa điểm giao hàng" span={2}>
            {data.deliveryLocation || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="Điều khoản thanh toán" span={2}>
            {data.paymentNote || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>
            {data.note || "--"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" style={{ borderRadius: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Hàng hóa</div>
        <Table
          size="small"
          bordered
          rowKey="id"
          columns={columns}
          dataSource={data.lines || []}
          pagination={false}
          scroll={{ x: 920 }}
        />
      </Card>
    </Space>
  );
}

function ReceiptSection({
  data,
  onCreate,
  onConfirm,
  confirmingId,
}: {
  data: TermPurchaseOrderDetail;
  onCreate: () => void;
  onConfirm: (id: string) => void;
  confirmingId?: string;
}) {
  const columns: ColumnsType<TermGoodsReceipt> = [
    { title: "Số phiếu", dataIndex: "receiptNo", width: 150 },
    {
      title: "Ngày nhận",
      dataIndex: "receiptDate",
      width: 120,
      render: (v) => date(v),
    },
    { title: "Sản phẩm", dataIndex: "productName", width: 180 },
    {
      title: "Kho",
      dataIndex: "supplierLocationName",
      width: 180,
      render: (v) => v || "--",
    },
    {
      title: "SL thực nhận",
      dataIndex: "qty",
      align: "right",
      width: 130,
      render: (v) => `${fmt(v)} L`,
    },
    {
      title: "V15",
      dataIndex: "standardQtyV15",
      align: "right",
      width: 130,
      render: (v) => (v == null ? "--" : `${fmt(v)} L`),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Thao tác",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Button
          size="small"
          type="link"
          disabled={record.status !== "DRAFT"}
          loading={confirmingId === record.id}
          onClick={() => onConfirm(record.id)}
        >
          Xác nhận
        </Button>
      ),
    },
  ];

  return (
    <Card size="small" style={{ borderRadius: 16 }}>
      <HeaderBlock
        title="Nhận hàng"
        desc="Ghi nhận số lượng thực nhận, V15, nhiệt độ, tỷ trọng theo từng dòng hàng."
        action={
          <Button
            type="primary"
            disabled={data.nextAction !== "CREATE_RECEIPT"}
            onClick={onCreate}
          >
            Tạo phiếu nhận
          </Button>
        }
      />

      <Table
        size="small"
        bordered
        rowKey="id"
        columns={columns}
        dataSource={data.receipts || []}
        pagination={false}
        scroll={{ x: 1000 }}
        locale={{ emptyText: "Chưa có phiếu nhận hàng" }}
      />
    </Card>
  );
}

function PricingStageSection({
  data,
  stageType,
}: {
  data: TermPurchaseOrderDetail;
  stageType: "ESTIMATE" | "BILL_NORMALIZE" | "FINAL";
}) {
  const stage = getStage(data, stageType);
  const hasReceipt = (data.receipts || []).some(
    (x) => x.status === "CONFIRMED",
  );

  const titleMap = {
    ESTIMATE: "Bảng giá tạm",
    BILL_NORMALIZE: "Bảng xuất hóa đơn",
    FINAL: "Tỷ giá chính thức",
  };

  const descMap = {
    ESTIMATE: "Tính giá tạm sau khi đã có nhận hàng.",
    BILL_NORMALIZE: "Cập nhật theo bill, biên bản giao nhận và số liệu bồn.",
    FINAL: "Chốt theo tỷ giá chính thức và số cuối.",
  };

  const actionMap = {
    ESTIMATE: "CALCULATE_TEMP_PRICE",
    BILL_NORMALIZE: "CALCULATE_INVOICE_PRICE",
    FINAL: "CALCULATE_OFFICIAL_FX",
  };

  if (!hasReceipt) {
    return (
      <Card size="small" style={{ borderRadius: 16 }}>
        <HeaderBlock title={titleMap[stageType]} desc={descMap[stageType]} />
        <Empty description="Chưa thể tạo bảng giá vì chưa có phiếu nhận hàng xác nhận." />
      </Card>
    );
  }

  if (!stage) {
    return (
      <Card size="small" style={{ borderRadius: 16 }}>
        <HeaderBlock
          title={titleMap[stageType]}
          desc={descMap[stageType]}
          action={
            <Button
              type="primary"
              disabled={data.nextAction !== actionMap[stageType]}
            >
              {titleMap[stageType]}
            </Button>
          }
        />
        <Empty description={`Chưa có ${titleMap[stageType].toLowerCase()}`} />
      </Card>
    );
  }

  return (
    <StageView
      title={titleMap[stageType]}
      desc={descMap[stageType]}
      stage={stage}
    />
  );
}

function StageView({
  title,
  desc,
  stage,
}: {
  title: string;
  desc: string;
  stage: TermPricingStage;
}) {
  const lineColumns: ColumnsType<any> = [
    { title: "Sản phẩm", dataIndex: "productName", width: 180 },
    { title: "Kho", dataIndex: "supplierLocationName", width: 180 },
    {
      title: "Qty",
      dataIndex: "qtyActual",
      align: "right",
      width: 120,
      render: (v, r) => `${fmt(v ?? r.qtyV15)} L`,
    },
    {
      title: "Platts TB",
      dataIndex: "mopsAvgUsdPerBbl",
      align: "right",
      width: 120,
      render: (v) => fmt(v, 6),
    },
    {
      title: "Premium",
      dataIndex: "premiumUsdPerBbl",
      align: "right",
      width: 120,
      render: (v) => fmt(v, 6),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitVndPerLiter",
      align: "right",
      width: 140,
      render: (v) => (v == null ? "--" : `${fmt(v, 2)} đ/L`),
    },
    {
      title: "Thành tiền",
      dataIndex: "amountVnd",
      align: "right",
      width: 150,
      render: (v) => fmt(v),
    },
  ];

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Card size="small" style={{ borderRadius: 16 }}>
        <HeaderBlock title={title} desc={desc} />

        <Descriptions size="small" column={4}>
          <Descriptions.Item label="Platts TB">
            {fmt(stage.mopsAvgUsdPerBbl, 6)}
          </Descriptions.Item>
          <Descriptions.Item label="Premium">
            {fmt(stage.premiumUsdPerBbl, 6)}
          </Descriptions.Item>
          <Descriptions.Item label="FX">
            {fmt(stage.fxRate, 2)}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">
            {fmt(stage.totalAmountVnd)} đ
          </Descriptions.Item>
          <Descriptions.Item label="Đơn giá">
            {fmt(stage.unitVndPerLiter, 2)} đ/L
          </Descriptions.Item>
          <Descriptions.Item label="Stage">
            <Tag color="blue">{stage.stageType}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" style={{ borderRadius: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          Chi tiết dòng hàng
        </div>
        <Table
          size="small"
          bordered
          rowKey="id"
          columns={lineColumns}
          dataSource={stage.lines || []}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      </Card>
    </Space>
  );
}

function CostsSection({ data }: { data: TermPurchaseOrderDetail }) {
  const stages = data.pricingRuns?.flatMap((r) => r.stages || []) || [];
  const rows = stages.flatMap((stage) =>
    (stage.costs || []).map((c) => ({
      ...c,
      stageType: stage.stageType,
    })),
  );

  return (
    <Card size="small" style={{ borderRadius: 16 }}>
      <HeaderBlock
        title="Chi phí"
        desc="Chi phí được lưu theo từng bảng giá: tạm, bill hoặc chốt."
      />

      <Table
        size="small"
        bordered
        rowKey="id"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: "Chưa có chi phí" }}
        columns={[
          { title: "Stage", dataIndex: "stageType", width: 150 },
          { title: "Loại phí", dataIndex: "costType", width: 180 },
          {
            title: "Số tiền",
            dataIndex: "amountVnd",
            align: "right",
            render: (v) => fmt(v),
          },
          { title: "Chứng từ", dataIndex: "sourceDocNo", width: 180 },
          { title: "Ghi chú", dataIndex: "note" },
        ]}
      />
    </Card>
  );
}

function BossSheetSection({ data }: { data: TermPurchaseOrderDetail }) {
  const finalStage = getStage(data, "FINAL");

  return (
    <Card size="small" style={{ borderRadius: 16 }}>
      <HeaderBlock
        title="Bảng sếp"
        desc="Bảng tổng hợp cuối cùng phục vụ xem nhanh hiệu quả lô hàng."
        action={<Button disabled={!finalStage}>Xuất Excel</Button>}
      />

      {!finalStage ? (
        <Empty description="Chưa có bảng FINAL nên chưa lập được bảng sếp." />
      ) : (
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Tổng lượng">
            {fmt(data.totalQty)} L
          </Descriptions.Item>
          <Descriptions.Item label="Giá vốn">
            {fmt(finalStage.unitVndPerLiter, 2)} đ/L
          </Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">
            {fmt(finalStage.totalAmountVnd)} đ
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}

function AccountingSection() {
  return (
    <Card size="small" style={{ borderRadius: 16 }}>
      <HeaderBlock
        title="Kế toán xử lý sau"
        desc="Supplier Invoice, Settlement, Bank Allocation không chặn vận hành TERM."
      />

      <Space wrap>
        <Tag color="blue">Order-first</Tag>
        <Tag color="green">Không chặn vận hành</Tag>
        <Tag color="gold">Optional</Tag>
      </Space>
    </Card>
  );
}

function SummaryPanel({ data }: { data: TermPurchaseOrderDetail }) {
  const estimate = getStage(data, "ESTIMATE");
  const bill = getStage(data, "BILL_NORMALIZE");
  const final = getStage(data, "FINAL");

  return (
    <div style={{ position: "sticky", top: 10 }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Card
          size="small"
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 12 } }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Tóm tắt</div>
          <Info label="Tổng lượng" value={`${fmt(data.totalQty)} L`} />
          <Info
            label="Số dòng"
            value={data.lineCount || data.lines?.length || 0}
          />
          <Info
            label="Premium"
            value={
              data.termPremiumUsdPerBbl == null
                ? "--"
                : `${fmt(data.termPremiumUsdPerBbl, 6)}`
            }
          />
          <Info label="Tạm tính" value={fmt(data.totalAmount)} />
          <Info label="Trạng thái" value={statusTag(data.status)} />
        </Card>

        <Card
          size="small"
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 12 } }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Tiến độ</div>
          <ProgressLine
            label="Nhận hàng"
            done={(data.receipts || []).length > 0}
          />
          <ProgressLine label="Giá tạm" done={!!estimate} />
          <ProgressLine label="Bill" done={!!bill} />
          <ProgressLine label="Tỷ giá" done={!!final} />
        </Card>

        <Card
          size="small"
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 12 } }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Next action</div>
          <div
            style={{
              borderRadius: 14,
              background: "#0f172a",
              color: "#fff",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>Gợi ý</div>
            <div style={{ fontSize: 15, fontWeight: 900, marginTop: 2 }}>
              {nextActionText(data.nextAction)}
            </div>
          </div>
        </Card>
      </Space>
    </div>
  );
}

function HeaderBlock({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
        {desc ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {desc}
          </Text>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "6px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>
      <b style={{ textAlign: "right" }}>{value}</b>
    </div>
  );
}

function ProgressLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
      }}
    >
      <span>{label}</span>
      {done ? <Tag color="green">Xong</Tag> : <Tag>Chưa</Tag>}
    </div>
  );
}
