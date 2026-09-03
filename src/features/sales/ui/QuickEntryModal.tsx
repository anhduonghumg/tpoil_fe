import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { BulbOutlined, ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import { useConfirmQuickEntry, useParseQuickEntry } from "../hooks";
import type { QuickEntryField, QuickEntryKind, QuickEntryPreview } from "../types";
import { ConfidenceTag } from "./labels";

type EditableLine = {
  key: string;
  productId?: string;
  productRawText: string | null;
  productName: string | null;
  productConfidence: number;
  warehouseId?: string;
  warehouseRawText: string | null;
  warehouseName: string | null;
  warehouseConfidence: number;
  quantity?: number;
  quantityText: string;
  unitPrice?: number;
  discountAmount?: number;
};

function lineFrom(preview: QuickEntryPreview, index: number): EditableLine {
  const line = preview.lines[index];
  return {
    key: `line-${index}`,
    productId: line.product.entityId ?? undefined,
    productRawText: line.product.rawText,
    productName: line.product.entityName,
    productConfidence: line.product.confidence,
    warehouseId: line.warehouse.entityId ?? undefined,
    warehouseRawText: line.warehouse.rawText,
    warehouseName: line.warehouse.entityName,
    warehouseConfidence: line.warehouse.confidence,
    quantity: line.quantity ?? undefined,
    quantityText: line.quantityText,
  };
}

/** Gợi ý của máy hiển thị kèm nguồn khớp để Sale biết vì sao ra kết quả đó. */
function MatchHint({ field }: { field: QuickEntryField }) {
  if (!field.rawText) return null;
  return (
    <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
      <Space size={4} wrap>
        <span>“{field.rawText}”</span>
        <ConfidenceTag value={field.confidence} />
        {field.matchedBy && <Tag style={{ marginInlineEnd: 0 }}>{field.matchedBy}</Tag>}
      </Space>
    </div>
  );
}

/**
 * Sale dán tin nhắn khách vào đây. Máy chỉ đề xuất — không có gì được tạo cho
 * tới khi Sale xác nhận, và mọi chỗ máy sửa tay đều được nhớ lại thành alias.
 */
export function QuickEntryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (result: { id: string; orderNo?: string; requestNo?: string }) => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<QuickEntryPreview | null>(null);
  const [orderKind, setOrderKind] = useState<QuickEntryKind>("SINGLE");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [orderDate, setOrderDate] = useState<dayjs.Dayjs>(dayjs());
  const [plate, setPlate] = useState("");
  const [driver, setDriver] = useState("");
  const [customerName, setCustomerName] = useState<string>();
  /** Những cách viết mới Sale đồng ý ghi nhớ; mặc định tick hết. */
  const [learnKeys, setLearnKeys] = useState<Set<string>>(new Set());
  /** Mục nào Sale đã tự bấm thì không tick lại đè lên lựa chọn của họ. */
  const touchedLearnKeys = useRef<Set<string>>(new Set());
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");

  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const parseMutation = useParseQuickEntry();
  const confirmMutation = useConfirmQuickEntry();

  useEffect(() => {
    if (open) return;
    setText("");
    setPreview(null);
    setLines([]);
    setCustomerPartyId(undefined);
    setPlate("");
    setDriver("");
    setOrderDate(dayjs());
    setOrderKind("SINGLE");
  }, [open]);

  const runParse = async () => {
    const result = await parseMutation.mutateAsync({ text, useAi: true });
    setPreview(result);
    setOrderKind(result.orderKind ?? "SINGLE");
    setCustomerPartyId(result.customer.entityId ?? undefined);
    setOrderDate(result.orderDate ? dayjs(result.orderDate) : dayjs());
    setPlate(result.plate ?? "");
    setDriver(result.driver ?? "");
    setLines(result.lines.map((_, index) => lineFrom(result, index)));
  };

  const patchLine = (key: string, patch: Partial<EditableLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  /**
   * confidence === 1 nghĩa là đã có alias đúng cho cách viết này. Mọi trường hợp còn
   * lại — không khớp gì, hay chỉ khớp nhờ trùng tên/mã — đều là "chưa có alias", nên
   * đáng hỏi Sale có muốn nhớ lại không.
   *
   * Riêng khi alias đã tồn tại nhưng Sale chọn sang đơn vị khác thì không hỏi: backend
   * không bao giờ ghi đè mapping cũ, việc đó phải xử lý ở màn quản lý cách viết.
   */
  const { newAliasCandidates, aliasConflicts } = useMemo(() => {
    const items: Array<{ key: string; kind: string; rawText: string; entityName: string }> = [];
    const conflicts: Array<{ rawText: string; pointsTo: string }> = [];
    if (!preview) return { newAliasCandidates: items, aliasConflicts: conflicts };

    const consider = (
      key: string,
      kind: string,
      field: QuickEntryField,
      chosenId: string | undefined,
      chosenName: string,
    ) => {
      if (!field.rawText || !chosenId) return;
      if (field.confidence >= 1) {
        if (field.entityId && field.entityId !== chosenId) {
          conflicts.push({ rawText: field.rawText, pointsTo: field.entityName ?? "đơn vị khác" });
        }
        return;
      }
      items.push({ key, kind, rawText: field.rawText, entityName: chosenName });
    };

    consider(
      "customer",
      "Khách hàng",
      preview.customer,
      customerPartyId,
      customerName ?? preview.customer.entityName ?? "khách đã chọn",
    );
    lines.forEach((line, index) => {
      const parsed = preview.lines[index];
      if (!parsed) return;
      consider(
        `${line.key}:product`,
        "Mặt hàng",
        parsed.product,
        line.productId,
        (productsQuery.data ?? []).find((row) => row.id === line.productId)?.name ??
          "mặt hàng đã chọn",
      );
      consider(
        `${line.key}:warehouse`,
        "Kho",
        parsed.warehouse,
        line.warehouseId,
        (warehousesQuery.data ?? []).find((row) => row.id === line.warehouseId)?.label ??
          "kho đã chọn",
      );
    });
    return { newAliasCandidates: items, aliasConflicts: conflicts };
  }, [preview, lines, customerPartyId, customerName, productsQuery.data, warehousesQuery.data]);

  // Cái nào mới xuất hiện thì tick sẵn; Sale bỏ tick thì tôn trọng lựa chọn đó.
  useEffect(() => {
    setLearnKeys((current) => {
      const next = new Set(current);
      for (const item of newAliasCandidates) {
        if (!touchedLearnKeys.current.has(item.key)) next.add(item.key);
      }
      return next;
    });
  }, [newAliasCandidates]);

  const toggleLearn = (key: string, checked: boolean) => {
    touchedLearnKeys.current.add(key);
    setLearnKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const blocking = useMemo(() => {
    const problems: string[] = [];
    if (!customerPartyId) problems.push("Chưa xác định được khách hàng");
    if (!lines.length) problems.push("Chưa đọc được dòng hàng nào");
    if (lines.some((line) => !line.productId)) problems.push("Còn dòng chưa chọn mặt hàng");
    if (lines.some((line) => !line.warehouseId)) problems.push("Còn dòng chưa chọn kho");
    if (lines.some((line) => !line.quantity || line.quantity <= 0))
      problems.push("Còn dòng chưa có số lượng");
    if (orderKind !== "LOT" && (!plate.trim() || !driver.trim()))
      problems.push("Đơn lấy 1 lần / rút lô phải có BKS và lái xe");
    return problems;
  }, [customerPartyId, lines, orderKind, plate, driver]);

  const confirm = async () => {
    // Chỉ gửi rawText của những mục Sale đồng ý ghi nhớ — gửi rawText chính là đồng ý.
    const rawTextIf = (id: string, rawText: string | null | undefined) =>
      learnKeys.has(id) ? (rawText ?? undefined) : undefined;

    const result = await confirmMutation.mutateAsync({
      logId: preview?.logId,
      orderKind,
      customerPartyId: customerPartyId!,
      orderDate: orderDate.format("YYYY-MM-DD"),
      vehiclePlate: plate.trim() || undefined,
      driverName: driver.trim() || undefined,
      customerRawText: rawTextIf("customer", preview?.customer.rawText),
      lines: lines.map((line) => ({
        productId: line.productId!,
        warehouseId: line.warehouseId!,
        quantity: Number(line.quantity),
        unitPrice: line.unitPrice == null ? undefined : Number(line.unitPrice),
        discountAmount: line.discountAmount == null ? undefined : Number(line.discountAmount),
        productRawText: rawTextIf(`${line.key}:product`, line.productRawText),
        warehouseRawText: rawTextIf(`${line.key}:warehouse`, line.warehouseRawText),
      })),
    });
    onCreated?.(result);
    onClose();
  };

  /**
   * Khi máy không khớp được, nó vẫn trả về vài ứng viên gần đúng — đưa lên đầu
   * danh sách để Sale chọn ngay thay vì phải gõ lại tên.
   */
  const withCandidates = (
    field: QuickEntryField | undefined,
    options: Array<{ value: string; label: string }>,
  ) => {
    const candidates = field?.candidates ?? [];
    if (!candidates.length) return options;
    const seen = new Set(candidates.map((candidate) => candidate.id));
    return [
      ...candidates.map((candidate) => ({
        value: candidate.id,
        label: `⭐ ${candidate.code ? `${candidate.code} - ` : ""}${candidate.name}`,
      })),
      ...options.filter((option) => !seen.has(option.value)),
    ];
  };

  const columns: ColumnsType<EditableLine> = [
    {
      title: "Mặt hàng",
      dataIndex: "productId",
      width: 230,
      render: (_, line, index) => (
        <div>
          <Select
            size="small"
            showSearch
            filterOption={false}
            status={line.productId ? undefined : "error"}
            placeholder="Chọn mặt hàng"
            style={{ width: "100%" }}
            value={line.productId}
            loading={productsQuery.isFetching}
            onSearch={setProductKeyword}
            onChange={(value) => patchLine(line.key, { productId: value })}
            options={withCandidates(
              preview?.lines[index].product,
              (productsQuery.data ?? []).map((product) => ({
                value: product.id,
                label: `${product.code} - ${product.name}`,
              })),
            )}
          />
          {preview && <MatchHint field={preview.lines[index].product} />}
        </div>
      ),
    },
    {
      title: "Kho nhận",
      dataIndex: "warehouseId",
      width: 230,
      render: (_, line, index) => (
        <div>
          <Select
            size="small"
            showSearch
            filterOption={false}
            status={line.warehouseId ? undefined : "error"}
            placeholder="Chọn kho nhận"
            style={{ width: "100%" }}
            value={line.warehouseId}
            loading={warehousesQuery.isFetching}
            onSearch={setWarehouseKeyword}
            onChange={(value) => patchLine(line.key, { warehouseId: value })}
            options={withCandidates(
              preview?.lines[index].warehouse,
              (warehousesQuery.data ?? []).map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.label,
              })),
            )}
          />
          {preview && <MatchHint field={preview.lines[index].warehouse} />}
        </div>
      ),
    },
    {
      title: "Mã NCC",
      key: "supplierCode",
      width: 120,
      render: () => <span style={{ color: "#8c8c8c" }}>Tự động FIFO</span>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      width: 120,
      align: "right",
      render: (_, line) => (
        <div>
          <InputNumber
            size="small"
            min={0.001}
            precision={3}
            controls={false}
            status={line.quantity ? undefined : "error"}
            style={{ width: "100%" }}
            value={line.quantity}
            onChange={(value) => patchLine(line.key, { quantity: value ?? undefined })}
          />
          {line.quantityText && (
            <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
              “{line.quantityText}”
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 120,
      align: "right",
      render: (_, line) => (
        <InputNumber
          size="small"
          min={0}
          controls={false}
          placeholder="Điền sau"
          style={{ width: "100%" }}
          value={line.unitPrice}
          onChange={(value) => patchLine(line.key, { unitPrice: value ?? undefined })}
        />
      ),
    },
    {
      title: "CK / đơn vị",
      dataIndex: "discountAmount",
      // Modal nhập nhanh cũ vẫn giữ giá trị trong payload, chỉ không cho hiển thị cột.
      hidden: true,
      width: 130,
      align: "right",
      render: (_, line) => (
        <InputNumber
          size="small"
          min={0}
          controls={false}
          placeholder="0"
          style={{ width: "100%" }}
          value={line.discountAmount}
          onChange={(value) => patchLine(line.key, { discountAmount: value ?? undefined })}
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ThunderboltOutlined />
          Nhập nhanh từ tin nhắn khách
        </Space>
      }
      width={1080}
      onCancel={onClose}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button
            type="primary"
            disabled={!preview || blocking.length > 0}
            loading={confirmMutation.isPending}
            onClick={confirm}
          >
            {orderKind === "WITHDRAWAL" ? "Tạo phiếu rút lô" : "Tạo đơn nháp"}
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        Dán nguyên tin nhắn khách gửi. Hệ thống chỉ đề xuất — bạn kiểm tra rồi mới tạo đơn.
      </Typography.Paragraph>

      <Input.TextArea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"VD:\nA gửi e 10 khối do kho Nhà Bè\nxe 51C-123.45 a Hùng"}
      />
      <div style={{ textAlign: "right", marginTop: 8 }}>
        <Button
          type="primary"
          ghost
          loading={parseMutation.isPending}
          disabled={!text.trim()}
          onClick={runParse}
        >
          Đọc nội dung
        </Button>
      </div>

      {preview && (
        <div style={{ marginTop: 12 }}>
          {preview.usedAi && (
            <Tag color="purple" style={{ marginBottom: 8 }}>
              Có dùng AI để đọc
            </Tag>
          )}
          {preview.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 12 }}
              message="Cần kiểm tra lại"
              description={
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              }
            />
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 210px 140px 150px 160px",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Khách hàng
              </Typography.Text>
              <PartySelect
                partyRole="SELLABLE"
                effectiveAt={orderDate.format("YYYY-MM-DD")}
                value={customerPartyId}
                onChange={(value) => {
                  setCustomerPartyId(value ?? undefined);
                  if (!value) setCustomerName(undefined);
                }}
                // Giữ lại tên để khối "ghi nhớ cách viết" nói rõ đang gán cho ai.
                onSelect={(_value: unknown, option: unknown) =>
                  setCustomerName((option as { raw?: { name?: string } })?.raw?.name)
                }
                placeholder="Chọn khách hàng"
              />
              <MatchHint field={preview.customer} />
            </div>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Loại
              </Typography.Text>
              <Radio.Group
                size="small"
                optionType="button"
                buttonStyle="solid"
                style={{ display: "block" }}
                value={orderKind}
                onChange={(e) => setOrderKind(e.target.value)}
              >
                <Radio.Button value="SINGLE">1 lần</Radio.Button>
                <Radio.Button value="LOT">Đơn lô</Radio.Button>
                <Radio.Button value="WITHDRAWAL">Rút lô</Radio.Button>
              </Radio.Group>
            </div>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Ngày
              </Typography.Text>
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                value={orderDate}
                onChange={(value) => setOrderDate(value ?? dayjs())}
              />
            </div>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                BKS
              </Typography.Text>
              <Input
                size="small"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="51C-123.45"
              />
            </div>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Lái xe
              </Typography.Text>
              <Input
                size="small"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder="Tên lái xe"
              />
            </div>
          </div>

          {orderKind === "WITHDRAWAL" && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Rút lô gắn vào đơn lô đã có, không tạo đơn bán mới. Nếu khách có nhiều đơn lô phù hợp, bạn sẽ chọn lô nguồn ở bước sau."
            />
          )}

          <Table<EditableLine>
            rowKey="key"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={lines}
            scroll={{ x: 820 }}
          />

          {newAliasCandidates.length > 0 && (
            <Alert
              type="success"
              showIcon
              icon={<BulbOutlined />}
              style={{ marginTop: 12 }}
              message="Có cách viết mới — ghi nhớ để lần sau máy tự hiểu?"
              description={
                <Space direction="vertical" size={4} style={{ marginTop: 4 }}>
                  {newAliasCandidates.map((item) => (
                    <Checkbox
                      key={item.key}
                      checked={learnKeys.has(item.key)}
                      onChange={(e) => toggleLearn(item.key, e.target.checked)}
                    >
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {item.kind}:
                      </Typography.Text>{" "}
                      <Typography.Text strong>“{item.rawText}”</Typography.Text> →{" "}
                      {item.entityName}
                    </Checkbox>
                  ))}
                </Space>
              }
            />
          )}

          {aliasConflicts.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message="Cách viết đang trỏ về đơn vị khác"
              description={
                <>
                  <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                    {aliasConflicts.map((conflict) => (
                      <li key={conflict.rawText}>
                        “{conflict.rawText}” đang được hiểu là {conflict.pointsTo}
                      </li>
                    ))}
                  </ul>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Đơn vẫn tạo theo lựa chọn của bạn. Muốn đổi hẳn thì sửa ở màn “Cách khách viết
                    tên”.
                  </Typography.Text>
                </>
              }
            />
          )}

          {blocking.length > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12 }}
              message="Còn thiếu thông tin"
              description={
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {blocking.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              }
            />
          )}
        </div>
      )}
    </Modal>
  );
}
