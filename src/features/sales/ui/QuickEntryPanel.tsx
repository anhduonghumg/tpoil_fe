import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ClearOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  InfoCircleOutlined,
  UpOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect, usePriceRegionsSelect } from "../../purchases/hooks";
import { SupplierLocationsApi } from "../../supplierLocations/api";
import {
  decodeWarehouseSource,
  WarehouseSourceSelect,
} from "../../supplierLocations/ui/WarehouseSourceSelect";
import { PurchasesApi } from "../../purchases/api";
import { InternalSalesApi } from "../api";
import { useConfirmQuickEntry, useCurrentDiscountBoard, useParseQuickEntry } from "../hooks";
import type {
  QuickEntryKind,
  QuickEntryLine,
  QuickEntryPreview,
  SalesLotInvoiceMode,
  SalesOrderCreditPreview,
} from "../types";
import {
  CreditLimitWarningModal,
  muteCustomerToday,
  readMutedCustomers,
} from "./CreditLimitWarningModal";
import { notify } from "../../../shared/lib/notification";
import { useIsMobile } from "../../../shared/ui/mobile";
import { RetailMobileEntry } from "./RetailMobileEntry";
import "../sales.css";

/** Sale asked for Vùng I prices by default; the point is not stopping to pick one. */
const DEFAULT_REGION = "VUNG_I";

/** Đơn lẻ gom ba loại lấy một lần; đơn lô là loại lấy nhiều lần. */
export type QuickEntryMode = "RETAIL" | "LOT";

const KIND_OPTIONS: Record<QuickEntryMode, Array<{ value: QuickEntryKind; label: string }>> = {
  RETAIL: [
    { value: "SINGLE", label: "Lấy 1 lần" },
    { value: "WITHDRAWAL", label: "Rút lô" },
    { value: "DAY_TRADE", label: "Đối ứng" },
  ],
  LOT: [{ value: "LOT", label: "Đơn lô" }],
};

/**
 * Mẫu tin nhắn nói được là lấy 1 lần hay rút lô, nhưng không bao giờ nói được đơn đối
 * ứng — loại đó Sale tự đánh dấu. Đơn đọc ra loại của tab kia thì kéo về mặc định.
 */
function kindForMode(mode: QuickEntryMode, parsed: QuickEntryKind | null): QuickEntryKind {
  const allowed = KIND_OPTIONS[mode].map((option) => option.value);
  if (parsed && allowed.includes(parsed)) return parsed;
  return mode === "LOT" ? "LOT" : "SINGLE";
}

export type DraftLine = {
  key: string;
  productId?: string;
  productCode: string | null;
  productUom?: string;
  productRawText: string | null;
  /** Đã có alias sẵn cho cách viết này chưa — nếu chưa thì lúc lưu sẽ hỏi có nhớ không. */
  productAliasKnown: boolean;
  warehouseId?: string;
  /** Đơn lô có thể chỉ chốt khu vực, kho lấy hàng quyết định ở từng lượt rút. */
  warehouseAreaId?: string;
  warehouseCode: string | null;
  warehouseRawText: string | null;
  warehouseAliasKnown: boolean;
  supplySource: "TP" | "NCC";
  quantity?: number;
  unitPrice?: number;
  discountBaseAmount?: number;
  discountAdjustmentAmount?: number;
  transportFeeUnitPrice?: number;
  /** CK gốc tự lấy từ bảng chiết khấu công bố. */
};

/** Một cách viết chưa có trong từ điển, đang chờ Sale quyết định có ghi nhớ hay không. */
type AliasSuggestion = {
  key: string;
  entityType: "PARTY" | "PRODUCT" | "WAREHOUSE";
  rawText: string;
  /** Mã của đối tượng đang được gán, nếu biết. */
  targetCode: string | null;
};

const ALIAS_TYPE_LABELS: Record<AliasSuggestion["entityType"], string> = {
  PARTY: "Khách hàng",
  PRODUCT: "Mặt hàng",
  WAREHOUSE: "Kho",
};

/** Một đợt phải trả theo ngày thực tế và tỷ lệ của tổng đơn. */
type PaymentPlanRow = {
  key: string;
  dueDate: dayjs.Dayjs;
  percent: number;
};

type SaveState =
  | { kind: "PENDING" }
  | { kind: "SAVING" }
  | { kind: "SAVED"; orderNo?: string; orderId: string; violations: string[]; warnings: string[] }
  | { kind: "FAILED"; message: string };

export type DraftOrder = {
  key: string;
  /** Nguyên văn đoạn tin đã đọc ra đơn này. */
  rawText: string;
  usedAi: boolean;
  logId?: string;
  orderKind: QuickEntryKind;
  customerPartyId?: string;
  customerCode: string | null;
  customerRawText: string | null;
  customerAliasKnown: boolean;
  orderDate: dayjs.Dayjs;
  plate: string;
  driver: string;
  /** Số "Đơn 1/2/3…" khách ghi trong tin — giữ để đối chiếu sau khi gộp đơn. */
  customerOrderRef?: string | null;
  lines: DraftLine[];
  save: SaveState;
};
export type QuickEntryDraftCache = Partial<Record<QuickEntryMode, {
  orders: DraftOrder[]; staged: DraftOrder[]; text: string; regionCode: string;
  lotInvoiceMode: SalesLotInvoiceMode; paymentTermType: "SAME_DAY" | "NET_DAYS"; paymentPlans: PaymentPlanRow[];
}>>;

/** One table row per goods line; order-level cells span the group. */
type FlatRow = {
  key: string;
  order: DraftOrder;
  line: DraftLine | null;
  rowSpan: number;
};

const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

/**
 * Older parser responses can contain the tail of the `Lxe:` label (`e: Tên`).
 * The quick-entry table must only show and submit the driver's actual name.
 */
const driverNameOnly = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .replace(/^(?:(?:lái\s*xe|lai\s*xe|lxe|lx|e)\s*:\s*)/i, "")
    .trim();

/** Giá trị cho ô chọn kho dùng chung: "area:<id>" khi mới chốt khu vực, "warehouse:<id>" khi đã có kho. */
const warehouseScopeOf = (line: DraftLine) =>
  line.warehouseAreaId
    ? `area:${line.warehouseAreaId}`
    : line.warehouseId
      ? `warehouse:${line.warehouseId}`
      : undefined;

const emptyLine = (): DraftLine => ({
  key: `line-${Date.now()}-${Math.random()}`,
  productCode: null,
  productRawText: null,
  productAliasKnown: true,
  warehouseCode: null,
  warehouseRawText: null,
  warehouseAliasKnown: true,
  supplySource: "TP",
});

/**
 * `matchedBy === "alias"` nghĩa là từ điển đã có sẵn cách viết này. Mọi kiểu khớp khác
 * (theo mã, theo tên, viết tắt, khớp gần đúng) đều là cơ hội để hỏi Sale có nhớ không.
 */
const aliasKnown = (field: { matchedBy: string | null }) => field.matchedBy === "alias";

function draftFrom(
  preview: QuickEntryPreview,
  mode: QuickEntryMode,
  rawText: string,
  lines: QuickEntryLine[] = preview.lines,
  parsedKind: QuickEntryKind | null = preview.orderKind,
): DraftOrder {
  return {
    key: `draft-${Date.now()}-${Math.random()}`,
    rawText,
    usedAi: preview.usedAi,
    logId: preview.logId,
    orderKind: kindForMode(mode, parsedKind),
    customerPartyId: preview.customer.entityId ?? undefined,
    customerCode: preview.customer.entityCode,
    customerRawText: preview.customer.rawText,
    customerAliasKnown: aliasKnown(preview.customer),
    orderDate: preview.orderDate ? dayjs(preview.orderDate) : dayjs(),
    plate: preview.plate ?? "",
    driver: driverNameOnly(preview.driver),
    lines: lines.map((line, index) => ({
      key: `line-${index}-${Math.random()}`,
      productId: line.product.entityId ?? undefined,
      productCode: line.product.entityCode,
      productRawText: line.product.rawText,
      productAliasKnown: aliasKnown(line.product),
      warehouseId: line.warehouse.entityId ?? undefined,
      warehouseCode: line.warehouse.entityCode,
      warehouseRawText: line.warehouse.rawText,
      warehouseAliasKnown: aliasKnown(line.warehouse),
      supplySource: "TP",
      quantity: line.quantity ?? undefined,
    })),
    save: { kind: "PENDING" },
  };
}

/** "đơn 1", "Đơn 2:", "--- đơn 3 ---" — an explicit divider between pasted orders. */
const ORDER_DIVIDER = /^[\s\-*=#]*đơn\s*\d*\s*[:.\-]?\s*$/i;
/** A second "Khách hàng:" in the same block means the next order already started. */
const CUSTOMER_LABEL = /^\s*(kh[áa]ch\s*h[àa]ng|kh)\s*[:：]/i;

/**
 * Sale usually pastes several orders at once. Each one has its own plate, driver and
 * goods, so they must be split before parsing — otherwise they collapse into a single
 * order carrying the last plate it saw.
 */
export function splitPastedOrders(text: string): string[] {
  return splitPastedOrdersWithRefs(text).map((chunk) => chunk.text);
}

/**
 * Như splitPastedOrders, kèm số "Đơn k" của khách ở dòng ngăn phía trên mỗi đoạn. Khách
 * như Thụy Dương đánh số từng xe là "Đơn 1, 2, 3…" dù thực chất là một đơn — số này đi
 * theo dòng hàng để sau khi Sale gộp vẫn đối chiếu được với tin nhắn của khách.
 */
export function splitPastedOrdersWithRefs(text: string): Array<{ text: string; ref: string | null }> {
  const chunks: Array<{ text: string; ref: string | null }> = [];
  let current: string[] = [];
  let ref: string | null = null;
  /**
   * Phần đầu tin trước "Đơn 1" mà không có khách hàng ("Ngày 22/10/2026", ghi chú chung)
   * là thông tin chung của mọi đơn bên dưới — ghép vào từng đơn, không tách thành đơn trống.
   */
  let header: string[] = [];
  let seenDivider = false;

  const flush = () => {
    if (current.some((line) => line.trim())) {
      chunks.push({ text: [...header, ...current].join("\n").trim(), ref });
    }
    current = [];
  };

  for (const line of text.split(/\r?\n/)) {
    if (ORDER_DIVIDER.test(line)) {
      if (!seenDivider && !current.some((row) => CUSTOMER_LABEL.test(row))) {
        header = current.filter((row) => row.trim());
        current = [];
      } else {
        flush();
      }
      seenDivider = true;
      ref = line.match(/\d+/)?.[0] ?? null;
      continue;
    }
    if (CUSTOMER_LABEL.test(line) && current.some((row) => CUSTOMER_LABEL.test(row))) {
      flush();
      ref = null;
    }
    current.push(line);
  }
  flush();

  return chunks.length ? chunks : [{ text: text.trim(), ref: null }];
}

/** Anything the template could not pin down still needs a human before saving. */
function blockingOf(order: DraftOrder) {
  const problems: string[] = [];
  if (!order.customerPartyId) problems.push("khách hàng");
  if (!order.lines.length) problems.push("dòng hàng");
  if (order.lines.some((line) => !line.productId)) problems.push("mặt hàng");
  if (order.lines.some((line) => !line.warehouseId && !line.warehouseAreaId)) problems.push("kho");
  if (order.lines.some((line) => !line.quantity || line.quantity <= 0)) problems.push("SL");
  if (order.orderKind !== "LOT" && (!order.plate.trim() || !order.driver.trim()))
    problems.push("BKS/lái xe");
  return problems;
}

const aliasKeyOf = (entityType: string, rawText: string, targetId: string) =>
  `${entityType}|${rawText.trim().toLowerCase()}|${targetId}`;

/**
 * Những cách viết trong tin nhắn đã gán được vào dữ liệu gốc nhưng chưa có trong từ
 * điển. Viết y hệt mã có sẵn thì bỏ qua — nhớ thêm cũng không giúp lần sau nhanh hơn.
 */
function aliasSuggestionsOf(order: DraftOrder): AliasSuggestion[] {
  const out: AliasSuggestion[] = [];
  const push = (
    entityType: AliasSuggestion["entityType"],
    rawText: string | null,
    targetId: string | undefined,
    targetCode: string | null,
  ) => {
    const text = rawText?.trim();
    if (!text || !targetId) return;
    if (targetCode && text.toLowerCase() === targetCode.trim().toLowerCase()) return;
    out.push({ key: aliasKeyOf(entityType, text, targetId), entityType, rawText: text, targetCode });
  };

  if (!order.customerAliasKnown) {
    push("PARTY", order.customerRawText, order.customerPartyId, order.customerCode);
  }
  for (const line of order.lines) {
    if (!line.productAliasKnown) {
      push("PRODUCT", line.productRawText, line.productId, line.productCode);
    }
    if (!line.warehouseAliasKnown) {
      push("WAREHOUSE", line.warehouseRawText, line.warehouseId, line.warehouseCode);
    }
  }
  return out;
}

/**
 * Paste a customer message, press Enter, the order lands in the table below. Nothing is
 * written until Sale saves a row, and the heavy checks only run then so typing stays fast.
 */
export function QuickEntryPanel({
  mode,
  onSaved,
  draftCache,
  onDraftChange,
}: {
  mode: QuickEntryMode;
  onSaved?: () => void;
  draftCache?: MutableRefObject<QuickEntryDraftCache>;
  onDraftChange?: (mode: QuickEntryMode, dirty: boolean, busy: boolean) => void;
}) {
  const mobileRetail = useIsMobile() && mode === "RETAIL";
  const restored = draftCache?.current[mode];
  const [text, setText] = useState(restored?.text ?? "");
  const [useAi, setUseAi] = useState(true);
  const [regionCode, setRegionCode] = useState(restored?.regionCode ?? DEFAULT_REGION);
  const [regionKeyword, setRegionKeyword] = useState("");
  const [orders, setOrders] = useState<DraftOrder[]>(restored?.orders ?? []);
  /** Đơn tạm chỉ dùng khi Sale chủ động sửa lại; Enter sẽ đẩy thẳng xuống bảng. */
  const [staged, setStaged] = useState<DraftOrder[]>(restored?.staged ?? []);
  const [draftOpen, setDraftOpen] = useState(true);
  /**
   * Màn đơn lô chủ yếu được nhập tay, ô dán tin nhắn chỉ thỉnh thoảng mới dùng — nên ở
   * chế độ LOT nó thu lại thành một nút, nhường chiều cao cho bảng nhập.
   */
  const [composerOpen, setComposerOpen] = useState(mode !== "LOT");
  // Điều khoản đặt chung cho cả lượt nhập đơn lô.
  const [lotInvoiceMode, setLotInvoiceMode] =
    useState<SalesLotInvoiceMode>(restored?.lotInvoiceMode ?? "ON_WITHDRAWAL");
  const [paymentTermType, setPaymentTermType] = useState<"SAME_DAY" | "NET_DAYS">(restored?.paymentTermType ?? "SAME_DAY");
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanRow[]>(restored?.paymentPlans ?? []);
  const workflowLock = useRef(false);
  const selectedCustomerCodes = useRef(new Map<string, string>());
  const parseLock = useRef(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [lotTermsOpen, setLotTermsOpen] = useState(false);
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");
  /** Hộp hỏi "có nhớ cách viết này không"; `resolve` mở khóa cho lượt lưu đang chờ. */
  const [aliasPrompt, setAliasPrompt] = useState<{
    suggestions: AliasSuggestion[];
    resolve: (approved: Set<string>) => void;
  } | null>(null);
  const [aliasChecked, setAliasChecked] = useState<Set<string>>(new Set());
  /** Hộp cảnh báo vượt hạn mức; cùng kiểu "resolve" như hộp hỏi ghi nhớ cách viết. */
  const [creditPrompt, setCreditPrompt] = useState<{
    preview: SalesOrderCreditPreview;
    customerPartyId: string;
    customerName?: string;
    resolve: (proceed: boolean) => void;
  } | null>(null);
  const [creditMuted, setCreditMuted] = useState(false);

  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const areasQuery = useQuery({
    queryKey: ["supplierLocations", "areas", "active"],
    queryFn: () => SupplierLocationsApi.areas(true),
  });
  // Khu vực chưa có kho nào thì chọn cũng không rút được hàng — ẩn khỏi danh sách.
  const selectableAreas = (areasQuery.data ?? []).filter((area) =>
    (warehousesQuery.data ?? []).some((warehouse) => warehouse.areaId === area.id),
  );
  const regionsQuery = usePriceRegionsSelect(regionKeyword);
  const parseMutation = useParseQuickEntry();
  const confirmMutation = useConfirmQuickEntry();
  const busy = workflowBusy || parsing;
  useEffect(() => {
    if (draftCache) draftCache.current[mode] = { orders, staged, text, regionCode, lotInvoiceMode, paymentTermType, paymentPlans };
    onDraftChange?.(mode, Boolean(text.trim() || orders.some((order) => order.save.kind !== "SAVED")), busy);
  }, [orders, staged, text, regionCode, lotInvoiceMode, paymentTermType, paymentPlans, mode, draftCache, onDraftChange, busy]);
  const discountBoard = useCurrentDiscountBoard();
  const announcedDiscounts = useMemo(
    () =>
      new Map(
        (discountBoard.data?.lines ?? []).map((line) => [
          `${line.warehouseId}:${line.productId}`,
          Number(line.discountPerUnit),
        ]),
      ),
    [discountBoard.data],
  );

  /**
   * Bảng chiết khấu công bố theo từng kho. Dòng mới chốt tới khu vực thì lấy mức của kho
   * đầu tiên trong khu vực có công bố — cùng cách màn tạo đơn thủ công đang làm.
   */
  const announcedDiscountFor = (line: DraftLine) => {
    if (!line.productId) return undefined;
    if (line.warehouseId) return announcedDiscounts.get(`${line.warehouseId}:${line.productId}`);
    if (!line.warehouseAreaId) return undefined;
    for (const warehouse of warehousesQuery.data ?? []) {
      if (warehouse.areaId !== line.warehouseAreaId) continue;
      const announced = announcedDiscounts.get(`${warehouse.id}:${line.productId}`);
      if (announced != null) return announced;
    }
    return undefined;
  };

  // Đổi tab thì trả ô dán về mặc định của tab đó: mở ở đơn lẻ, thu ở đơn lô.
  useEffect(() => {
    setComposerOpen(mode !== "LOT");
  }, [mode]);

  // Có đơn tạm mà ô dán đang thu thì Sale không thấy đơn vừa đọc được — luôn mở lại.
  useEffect(() => {
    if (staged.length) setComposerOpen(true);
  }, [staged.length]);

  /**
   * Tự điền chiết khấu đang công bố sau khi đủ kho + hàng. Nếu Sale đã sửa tay con số
   * được tự điền trước đó thì giữ nguyên lựa chọn của họ khi đổi hàng/kho hoặc bảng giá đổi.
   */
  useEffect(() => {
    if (!announcedDiscounts.size) return;

    setOrders((current) => {
      let changed = false;
      const next = current.map((order) => {
        if (order.orderKind === "WITHDRAWAL" || order.save.kind === "SAVED" || order.save.kind === "SAVING") return order;

        const lines = order.lines.map((line) => {
          if (!line.productId) return line;
          const announced = announcedDiscountFor(line);
          if (announced == null || line.discountBaseAmount === announced) return line;

          changed = true;
          return { ...line, discountBaseAmount: announced };
        });

        return lines === order.lines || !lines.some((line, index) => line !== order.lines[index])
          ? order
          : { ...order, lines };
      });

      return changed ? next : current;
    });
  }, [announcedDiscounts, orders]);

  const patchOrder = (key: string, patch: Partial<DraftOrder>) =>
    setOrders((current) =>
      current.map((order) => (order.key === key ? { ...order, ...patch } : order)),
    );

  const patchLine = (orderKey: string, lineKey: string, patch: Partial<DraftLine>) =>
    setOrders((current) =>
      current.map((order) =>
        order.key === orderKey
          ? {
              ...order,
              lines: order.lines.map((line) =>
                line.key === lineKey ? { ...line, ...patch } : line,
              ),
            }
          : order,
      ),
    );

  const addLine = (orderKey: string) =>
    setOrders((current) =>
      current.map((order) =>
        order.key === orderKey ? { ...order, lines: [...order.lines, emptyLine()] } : order,
      ),
    );

  /**
   * Đơn lô thường được chốt qua trao đổi chứ không có tin nhắn để dán, nên phải mở
   * được một đơn trống mà gõ thẳng. Mọi ô trong bảng đều sửa tại chỗ nên đơn trống là
   * điểm bắt đầu hợp lệ; bước kiểm tra lúc lưu vẫn chặn đơn còn thiếu dữ liệu.
   */
  const addBlankOrder = () =>
    setOrders((current) => [
      ...current,
      {
        key: `draft-${Date.now()}-${Math.random()}`,
        rawText: "",
        usedAi: false,
        orderKind: kindForMode(mode, null),
        customerCode: null,
        customerRawText: null,
        customerAliasKnown: true,
        orderDate: dayjs(),
        plate: "",
        driver: "",
        lines: [emptyLine()],
        save: { kind: "PENDING" },
      },
    ]);

  const removeLine = (orderKey: string, lineKey: string) =>
    setOrders((current) =>
      current.flatMap((order) => {
        if (order.key !== orderKey) return [order];
        const lines = order.lines.filter((line) => line.key !== lineKey);
        // Không để lại một "đơn rỗng" chỉ còn các nút thao tác ở bên phải.
        return lines.length ? [{ ...order, lines }] : [];
      }),
    );

  /** Look up one product's price so manually added lines get filled in too. */
  const fetchPrice = async (productId: string, onDate: string) => {
    try {
      const result: any = await PurchasesApi.quoteBatch({
        productIds: [productId],
        regionCode,
        onDate,
      });
      const price = (result.items ?? []).find((item: any) => item.productId === productId)?.price;
      return price == null ? undefined : Number(price);
    } catch {
      // No published bulletin for that day: leave it blank for Sale to fill.
      return undefined;
    }
  };

  const applyPrices = async (draft: DraftOrder): Promise<DraftOrder> => {
    const productIds = [...new Set(draft.lines.map((line) => line.productId).filter(Boolean))];
    if (!productIds.length) return draft;
    try {
      const result: any = await PurchasesApi.quoteBatch({
        productIds: productIds as string[],
        regionCode,
        onDate: draft.orderDate.format("YYYY-MM-DD"),
      });
      const priceByProduct = new Map<string, number | null>(
        (result.items ?? []).map((item: any) => [
          item.productId,
          item.price == null ? null : Number(item.price),
        ]),
      );
      return {
        ...draft,
        lines: draft.lines.map((line) => {
          const price = line.productId ? priceByProduct.get(line.productId) : null;
          return price == null || !Number.isFinite(price) ? line : { ...line, unitPrice: price };
        }),
      };
    } catch {
      return draft;
    }
  };

  const parseOne = async (chunk: string, customerOrderRef: string | null) => {
    // Template first. AI is a deliberate second attempt, only when something is missing.
    let preview = await parseMutation.mutateAsync({ text: chunk, useAi: false });
    const incomplete =
      !preview.customer.entityId ||
      !preview.lines.length ||
      preview.lines.some((line) => !line.product.entityId || line.quantity == null);
    if (incomplete && useAi) {
      preview = await parseMutation.mutateAsync({ text: chunk, useAi: true });
    }
    // One message can combine "rút tồn" and "mua mới". They must become separate
    // drafts, otherwise the withdrawal type incorrectly locks every goods line.
    const byKind = new Map<QuickEntryKind | null, QuickEntryLine[]>();
    for (const line of preview.lines) {
      const kind = line.orderKind ?? preview.orderKind;
      byKind.set(kind, [...(byKind.get(kind) ?? []), line]);
    }
    const drafts = [...byKind.entries()].map(([kind, lines]) => ({
      ...draftFrom(preview, mode, chunk, lines, kind),
      customerOrderRef,
    }));
    if (!drafts.length) return [{ ...draftFrom(preview, mode, chunk), customerOrderRef, lines: [emptyLine()] }];
    return drafts;
  };

  /** Đọc tin nhắn và đưa thẳng các đơn đã nhận diện xuống bảng. */
  const submitText = async () => {
    const raw = text.trim();
    if (!raw || parseLock.current || workflowLock.current) return;
    parseLock.current = true; setParsing(true);
    try {

    // One paste often holds several orders; each becomes its own draft.
    const chunks = splitPastedOrdersWithRefs(raw);
    const drafts: DraftOrder[] = [];
    for (const chunk of chunks) {
      drafts.push(...(await parseOne(chunk.text, chunk.ref)));
    }

    const priced = await Promise.all(drafts.map((draft) => applyPrices(draft)));
    setOrders((current) => [...current, ...priced]);
    setStaged(priced);
    setText("");
    if (chunks.length > 1) notify.success(`Đã tách ${chunks.length} đơn từ tin nhắn`);
    } catch (error: any) {
      notify.error(error?.response?.data?.message ?? error?.message ?? "Không đọc được tin nhắn. Nội dung vẫn được giữ lại để thử lại.");
    } finally { parseLock.current = false; setParsing(false); }
  };

  /** Trả một đơn tạm về ô nhập để sửa lại nguyên văn. */
  const editStaged = (draft: DraftOrder) => {
    setText(draft.rawText);
    setStaged((current) => current.filter((item) => item.key !== draft.key));
    setOrders((current) => current.filter((item) => item.key !== draft.key));
  };

  /**
   * Hỏi trước khi ghi nhớ. Trả về tập cách viết Sale đồng ý; chỉ những khóa nằm trong
   * tập này mới được gửi kèm rawText, tức là mới được backend học.
   */
  const askAliases = (batch: DraftOrder[]) =>
    new Promise<Set<string>>((resolve) => {
      const seen = new Map<string, AliasSuggestion>();
      for (const order of batch) {
        for (const suggestion of aliasSuggestionsOf(order)) {
          if (!seen.has(suggestion.key)) seen.set(suggestion.key, suggestion);
        }
      }
      const suggestions = [...seen.values()];
      if (!suggestions.length) return resolve(new Set());
      setAliasChecked(new Set(suggestions.map((row) => row.key)));
      setAliasPrompt({ suggestions, resolve });
    });

  const closeAliasPrompt = (approved: Set<string>) => {
    aliasPrompt?.resolve(approved);
    setAliasPrompt(null);
  };

  /** Tổng tiền một đơn — cùng công thức với `salesLineNetAmount` bên backend. */
  const orderTotalOf = (order: DraftOrder) =>
    order.lines.reduce(
      (sum, line) =>
        sum +
        Number(line.quantity ?? 0) *
          (Number(line.unitPrice ?? 0) -
            Number(line.discountBaseAmount ?? 0) -
            Number(line.discountAdjustmentAmount ?? 0) +
            Number(line.transportFeeUnitPrice ?? 0)),
      0,
    );

  /**
   * Hỏi trước khi lưu nếu khách vượt hạn mức. Trả false = người dùng bấm "Quay lại sửa",
   * huỷ cả lượt lưu.
   *
   * Gộp theo KHÁCH chứ không theo từng đơn: lưu cả lượt 5 đơn cho một khách thì hỏi một
   * lần với tổng tiền của cả 5, đúng với thứ sẽ xảy ra trên công nợ.
   */
  const confirmCreditFor = async (batch: DraftOrder[]) => {
    const muted = readMutedCustomers();
    const byCustomer = new Map<string, number>();
    for (const order of batch) {
      const id = order.customerPartyId;
      if (!id || muted.includes(id)) continue;
      byCustomer.set(id, (byCustomer.get(id) ?? 0) + orderTotalOf(order));
    }
    for (const [customerPartyId, orderValue] of byCustomer) {
      let preview: SalesOrderCreditPreview;
      try {
        preview = await InternalSalesApi.creditPreview({ customerPartyId, orderValue });
      } catch {
        // Không tra được thì vẫn cho lưu — đây là cảnh báo, không phải chốt chặn. Nhưng
        // phải nói ra, im lặng là người dùng tưởng khách không vấn đề gì.
        notify.warning("Chưa kiểm được công nợ khách hàng — đơn vẫn được lưu.");
        continue;
      }
      if (!preview.exceeded) continue;
      setCreditMuted(false);
      const proceed = await new Promise<boolean>((resolve) =>
        setCreditPrompt({
          preview,
          customerPartyId,
          customerName: batch.find((order) => order.customerPartyId === customerPartyId)
            ?.customerRawText ?? undefined,
          resolve,
        }),
      );
      if (!proceed) return false;
    }
    return true;
  };

  const saveOrder = async (order: DraftOrder, approvedAliases: Set<string>) => {
    /** rawText chỉ được gửi khi Sale đã đồng ý nhớ — gửi rawText chính là đồng ý. */
    const learn = (entityType: string, rawText: string | null, targetId?: string) =>
      rawText && targetId && approvedAliases.has(aliasKeyOf(entityType, rawText, targetId))
        ? rawText
        : undefined;

    patchOrder(order.key, { save: { kind: "SAVING" } });
    try {
      const result = await confirmMutation.mutateAsync({
        logId: order.logId,
        orderKind: order.orderKind,
        ...(mode === "LOT"
          ? {
              lotInvoiceMode,
              paymentTermType,
              paymentPlans:
                paymentTermType === "NET_DAYS"
                  ? paymentPlans.map((plan) => ({
                      dueDate: plan.dueDate.format("YYYY-MM-DD"),
                      percent: plan.percent,
                    }))
                  : undefined,
              paymentTermDays:
                paymentTermType === "NET_DAYS"
                  ? Math.max(
                      0,
                      ...paymentPlans.map((plan) =>
                        Math.max(0, plan.dueDate.startOf("day").diff(order.orderDate.startOf("day"), "day")),
                      ),
                    )
                  : undefined,
            }
          : {}),
        customerPartyId: order.customerPartyId!,
        orderDate: order.orderDate.format("YYYY-MM-DD"),
        vehiclePlate: mode === "LOT" ? undefined : order.plate.trim() || undefined,
        driverName: mode === "LOT" ? undefined : order.driver.trim() || undefined,
        customerRawText: learn("PARTY", order.customerRawText, order.customerPartyId),
        lines: order.lines.map((line) => ({
          productId: line.productId!,
          warehouseId: line.warehouseId,
          warehouseAreaId: line.warehouseId ? undefined : line.warehouseAreaId,
          quantity: Number(line.quantity),
          unitPrice: line.unitPrice == null ? undefined : Number(line.unitPrice),
          discountBaseAmount:
            line.discountBaseAmount == null ? undefined : Number(line.discountBaseAmount),
          discountAdjustmentAmount:
            line.discountAdjustmentAmount == null ? undefined : Number(line.discountAdjustmentAmount),
          transportFeeUnitPrice:
            line.transportFeeUnitPrice == null ? undefined : Number(line.transportFeeUnitPrice),
          supplySource: line.supplySource,
          productRawText: learn("PRODUCT", line.productRawText, line.productId),
          warehouseRawText: learn("WAREHOUSE", line.warehouseRawText, line.warehouseId),
          customerOrderRef: mode === "LOT" ? undefined : order.customerOrderRef ?? undefined,
        })),
      });

      // The heavy rules (giá sàn, tồn kho, công nợ) only run once the draft exists.
      let violations: string[] = [];
      let warnings: string[] = [];
      if (order.orderKind !== "WITHDRAWAL") {
        try {
          const checks: any = await InternalSalesApi.checks(result.id);
          violations = (checks?.violations ?? []).map((item: any) => item.message);
          warnings = (checks?.warnings ?? []).map((item: any) => item.message);
        } catch {
          warnings = ["Chưa lấy được kết quả kiểm tra điều kiện."];
        }
      }

      patchOrder(order.key, {
        save: {
          kind: "SAVED",
          orderId: result.id,
          orderNo: result.orderNo ?? result.requestNo,
          violations,
          warnings,
        },
      });
      onSaved?.();
    } catch (error: any) {
      patchOrder(order.key, {
        save: {
          kind: "FAILED",
          message: error?.response?.data?.message ?? error?.message ?? "Không lưu được đơn",
        },
      });
    }
  };

  /** Lưu một đơn: hỏi ghi nhớ cách viết trước, rồi mới ghi. */
  const saveOne = async (order: DraftOrder) => {
    if (workflowLock.current || parseLock.current || order.save.kind === "SAVED") return;
    const problems = blockingOf(order);
    if (problems.length) return notify.warning(`Cần bổ sung: ${problems.join(", ")}`);
    if (paymentPlanError) return notify.error(paymentPlanError);
    workflowLock.current = true; setWorkflowBusy(true);
    try {
    if (!(await confirmCreditFor([order]))) return;
    const approved = await askAliases([order]);
    await saveOrder(order, approved);
    } finally { workflowLock.current = false; setWorkflowBusy(false); }
  };

  const saveAll = async () => {
    if (workflowLock.current || parseLock.current) return;
    if (paymentPlanError) return notify.error(paymentPlanError);
    const pending = orders.filter(
      (order) => order.save.kind !== "SAVED" && !blockingOf(order).length,
    );
    if (!pending.length) return notify.warning("Không có đơn nào đủ điều kiện lưu");
    workflowLock.current = true; setWorkflowBusy(true);
    try {
    if (!(await confirmCreditFor(pending))) return;
    // Hỏi một lần cho cả lượt, không hỏi lại từng đơn.
    const approved = await askAliases(pending);
    for (const order of pending) {
      // Sequential on purpose: each order reports its own check result.
      await saveOrder(order, approved);
    }
    } finally { workflowLock.current = false; setWorkflowBusy(false); }
  };

  /** Chỉ một chấm màu cho đỡ chật; nội dung đầy đủ nằm ở tooltip. */
  const renderSaveState = (order: DraftOrder) => {
    const dot = (color: string, title: string) => (
      <Tooltip title={title}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
          }}
        />
      </Tooltip>
    );
    if (order.save.kind === "SAVING") return dot("#1677ff", "Đang lưu...");
    if (order.save.kind === "FAILED") return dot("#cf1322", order.save.message);
    if (order.save.kind === "SAVED") {
      const { violations, warnings, orderNo } = order.save;
      if (violations.length)
        return dot("#cf1322", `${orderNo}: ${violations.join(" · ")}`);
      if (warnings.length) return dot("#d46b08", `${orderNo}: ${warnings.join(" · ")}`);
      // Đơn lẻ lưu xong nằm ở Nháp; Sale gộp (nếu cần) rồi gửi duyệt ở tab Nháp.
      if (order.orderKind === "SINGLE" || order.orderKind === "DAY_TRADE")
        return dot("#389e0d", `${orderNo} · đã lưu vào Nháp — gộp/gửi duyệt ở tab Nháp`);
      return dot("#389e0d", `${orderNo} · đã lưu, không vướng gì`);
    }
    const problems = blockingOf(order);
    if (problems.length) return dot("#d4b106", `Còn thiếu: ${problems.join(", ")}`);
    return dot("#8c8c8c", "Sẵn sàng lưu");
  };


  const rows: FlatRow[] = orders.flatMap((order) => {
    const lines = order.lines.length ? order.lines : [null];
    return lines.map((line, index) => ({
      key: line ? `${order.key}-${line.key}` : `${order.key}-empty`,
      order,
      line,
      rowSpan: index === 0 ? lines.length : 0,
    }));
  });

  /** Order-level cells are merged across the order's goods lines. */
  const groupCell = (row: FlatRow) => ({ rowSpan: row.rowSpan });
  const locked = (row: FlatRow) => busy || row.order.save.kind === "SAVED";

  const columns: ColumnsType<FlatRow> = [
    {
      title: "Khách hàng",
      key: "customer",
      width: 150,
      fixed: "left",
      onCell: groupCell,
      render: (_, row) => (
        <PartySelect
          partyRole="SELLABLE"
          effectiveAt={row.order.orderDate.format("YYYY-MM-DD")}
          displayMode="code"
          optionDisplayMode="code"
          style={{ width: "100%", maxWidth: 180 }}
          styles={{ popup: { root: { width: 280, minWidth: 280, maxWidth: 280 } } }}
          fallbackLabel={row.order.customerCode}
          size="small"
          status={row.order.customerPartyId ? undefined : "error"}
          value={row.order.customerPartyId}
          disabled={locked(row)}
          onChange={(value) =>
            patchOrder(row.order.key, {
              customerPartyId: value ?? undefined,
              customerCode: value ? selectedCustomerCodes.current.get(value) ?? null : null,
              // Sale chọn lại: cách viết trong tin nhắn chắc chắn chưa trỏ về khách này.
              customerAliasKnown: false,
            })
          }
          onSelect={(value, option: any) => {
            const code = option?.raw?.code;
            if (code) {
              selectedCustomerCodes.current.set(value, code);
              patchOrder(row.order.key, { customerCode: code });
            }
          }}
          placeholder={row.order.customerRawText ?? "Chọn khách"}
        />
      ),
    },
    {
      title: "Ngày",
      key: "orderDate",
      width: 130,
      onCell: groupCell,
      render: (_, row) => (
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          style={{ width: "100%" }}
          value={row.order.orderDate}
          disabled={locked(row)}
          onChange={(value) => patchOrder(row.order.key, { orderDate: value ?? dayjs() })}
        />
      ),
    },
    {
      title: "Loại",
      key: "kind",
      hidden: mode === "LOT",
      width: 130,
      onCell: groupCell,
      render: (_, row) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          value={row.order.orderKind}
          disabled={locked(row)}
          onChange={(value) =>
            patchOrder(
              row.order.key,
              value === "WITHDRAWAL"
                ? {
                    orderKind: value,
                    lines: row.order.lines.map((line) => ({
                      ...line,
                      discountBaseAmount: 0,
                      discountAdjustmentAmount: 0,
                    })),
                  }
                : { orderKind: value },
            )
          }
          options={KIND_OPTIONS[mode]}
        />
      ),
    },
    {
      title: "BKS",
      key: "plate",
      hidden: mode === "LOT",
      width: 105,
      onCell: groupCell,
      render: (_, row) => (
        <Input
          size="small"
          value={row.order.plate}
          title={row.order.plate}
          disabled={locked(row)}
          onChange={(event) => patchOrder(row.order.key, { plate: event.target.value })}
        />
      ),
    },
    {
      title: "Lái xe",
      key: "driver",
      hidden: mode === "LOT",
      width: 145,
      onCell: groupCell,
      render: (_, row) => (
        <Input
          size="small"
          value={row.order.driver}
          title={row.order.driver}
          disabled={locked(row)}
          onChange={(event) => patchOrder(row.order.key, { driver: event.target.value })}
        />
      ),
    },
    {
      title: "CPVC/đv",
      key: "transportFeeUnitPrice",
      hidden: mode === "LOT",
      width: 95,
      align: "right",
      render: (_, row) =>
        row.line ? (
          <InputNumber
            size="small"
            min={0}
            controls={false}
            style={{ width: "100%" }}
            value={row.line.transportFeeUnitPrice}
            disabled={locked(row) || row.order.orderKind === "WITHDRAWAL"}
            placeholder="0"
            onChange={(value) =>
              patchLine(row.order.key, row.line!.key, { transportFeeUnitPrice: value ?? undefined })
            }
          />
        ) : null,
    },
    {
      title: "Mặt hàng",
      key: "product",
      width: 115,
      render: (_, row) =>
        row.line ? (
          <Select
            size="small"
            showSearch
            filterOption={false}
            style={{ width: "100%" }}
            status={row.line.productId ? undefined : "error"}
            value={row.line.productId}
            disabled={locked(row)}
            placeholder={row.line.productRawText ?? "Mặt hàng"}
            loading={productsQuery.isFetching}
            onSearch={setProductKeyword}
            onChange={async (value) => {
              const product = productsQuery.data?.find((item) => item.id === value);
              patchLine(row.order.key, row.line!.key, {
                productId: value,
                productCode: product?.code ?? null,
                productUom: product?.uom,
                unitPrice: undefined,
                productAliasKnown: false,
              });
              // A line added by hand has no price yet; fetch it the moment we know the product.
              const price = await fetchPrice(value, row.order.orderDate.format("YYYY-MM-DD"));
              if (price != null) setOrders((current) => current.map((order) => order.key !== row.order.key || !order.orderDate.isSame(row.order.orderDate, "day") || order.save.kind === "SAVED" || order.save.kind === "SAVING" ? order : {
                ...order, lines: order.lines.map((line) => line.key === row.line!.key && line.productId === value && line.unitPrice == null ? { ...line, unitPrice: price } : line),
              }));
            }}
            options={[...(row.line.productId && !(productsQuery.data ?? []).some((product) => product.id === row.line!.productId) ? [{ value: row.line.productId, label: row.line.productCode ?? row.line.productRawText ?? "Mặt hàng đã chọn" }] : []), ...(productsQuery.data ?? []).map((product) => ({
              value: product.id,
              label: mobileRetail ? `${product.code} — ${product.name}` : product.code,
            }))]}
          />
        ) : null,
    },
    {
      title: "Kho nhận",
      key: "warehouse",
      width: 150,
      render: (_, row) =>
        row.line ? (
          <WarehouseSourceSelect
            size="small"
            filterOption={false}
            // Đơn lô được phép dừng ở khu vực; đơn lẻ xuất ngay nên bắt buộc kho cụ thể.
            warehouseOnly={mode !== "LOT"}
            value={warehouseScopeOf(row.line)}
            disabled={locked(row)}
            placeholder={row.line.warehouseRawText ?? "Kho nhận"}
            loading={warehousesQuery.isFetching}
            onSearch={setWarehouseKeyword}
            onChange={(value) => {
              const scope = value
                ? decodeWarehouseSource(value, (warehousesQuery.data ?? []) as any)
                : undefined;
              patchLine(row.order.key, row.line!.key, {
                warehouseId: scope?.warehouseId,
                warehouseAreaId: scope?.warehouseId ? undefined : scope?.areaId,
                warehouseCode: null,
                warehouseAliasKnown: false,
              });
            }}
            areas={selectableAreas}
            warehouses={warehousesQuery.data ?? []}
          />
        ) : null,
    },
    {
      title: "Mã NCC",
      key: "supplierCode",
      width: 105,
      render: (_, row) =>
        row.line ? (
          <Tooltip title="Hệ thống tự chọn theo FIFO; quản lý kho có thể đổi trước khi xuất">
            <span className="sales-grid-clip">Tự động FIFO</span>
          </Tooltip>
        ) : null,
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 85,
      align: "right",
      render: (_, row) =>
        row.line ? (
          <InputNumber
            size="small"
            min={0.001}
            inputMode="decimal"
            addonAfter={mobileRetail ? row.line.productUom ?? productsQuery.data?.find((item) => item.id === row.line!.productId)?.uom : undefined}
            precision={3}
            controls={false}
            style={{ width: "100%" }}
            status={row.line.quantity ? undefined : "error"}
            value={row.line.quantity}
            disabled={locked(row)}
            onChange={(value) =>
              patchLine(row.order.key, row.line!.key, { quantity: value ?? undefined })
            }
          />
        ) : null,
    },
    {
      title: "Đơn giá",
      key: "unitPrice",
      width: 90,
      align: "right",
      render: (_, row) =>
        row.line ? (
          <InputNumber
            size="small"
            min={0}
            controls={false}
            style={{ width: "100%" }}
            value={row.line.unitPrice}
            disabled={locked(row)}
            placeholder="Chưa có giá"
            onChange={(value) =>
              patchLine(row.order.key, row.line!.key, { unitPrice: value ?? undefined })
            }
          />
        ) : null,
    },
    {
      title: "CK",
      key: "discountBaseAmount",
      // Chỉ ẩn khỏi nhập nhanh; dữ liệu CK công bố vẫn được tự tính và gửi xuống backend.
      hidden: true,
      width: 85,
      align: "right",
      render: (_, row) =>
        row.line ? (
          <InputNumber
            size="small"
            min={0}
            controls={false}
            style={{ width: "100%" }}
            value={row.order.orderKind === "WITHDRAWAL" ? 0 : row.line.discountBaseAmount}
            disabled
            placeholder="0"
            onChange={(value) =>
              patchLine(row.order.key, row.line!.key, { discountBaseAmount: value ?? undefined })
            }
          />
        ) : null,
    },
    {
      title: "CKDC",
      key: "discountAdjustmentAmount",
      // Chỉ ẩn giao diện, không bỏ trường và không thay đổi cách lưu CK cuối.
      hidden: true,
      width: 85,
      align: "right",
      render: (_, row) =>
        row.line ? (
          <InputNumber
            size="small"
            controls={false}
            style={{ width: "100%" }}
            value={
              row.order.orderKind === "WITHDRAWAL" ? 0 : row.line.discountAdjustmentAmount
            }
            disabled={locked(row) || row.order.orderKind === "WITHDRAWAL"}
            placeholder="0"
            onChange={(value) =>
              patchLine(row.order.key, row.line!.key, {
                discountAdjustmentAmount: value ?? undefined,
              })
            }
          />
        ) : null,
    },
    {
      title: "Nguồn",
      key: "supplySource",
      width: 80,
      fixed: "right",
      render: (_, row) =>
        row.line ? (
          <Select
            size="small"
            style={{ width: "100%" }}
            value={row.line.supplySource}
            disabled={locked(row)}
            onChange={(value) =>
              patchLine(row.order.key, row.line!.key, { supplySource: value as "TP" | "NCC" })
            }
            options={[
              { value: "TP", label: "TP" },
              { value: "NCC", label: "NCC" },
            ]}
          />
        ) : null,
    },
    {
      title:
        mode === "LOT" ? (
          <div className="quick-entry-action-title">
            <Tooltip title="Thêm một đơn trống để tự nhập">
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addBlankOrder}
              />
            </Tooltip>
          </div>
        ) : (
          ""
        ),
      key: "action",
      width: 95,
      fixed: "right",
      render: (_, row) => (
        <Space size={2}>
          {row.line && !locked(row) ? (
            <Tooltip title="Bỏ dòng hàng">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeLine(row.order.key, row.line!.key)}
              />
            </Tooltip>
          ) : null}
          {row.rowSpan > 0 && !locked(row) ? (
            <>
              <Tooltip title="Thêm dòng hàng">
                <Button
                  size="small"
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => addLine(row.order.key)}
                />
              </Tooltip>
              <Tooltip title="Lưu đơn này">
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  disabled={blockingOf(row.order).length > 0}
                  loading={row.order.save.kind === "SAVING"}
                  onClick={() => saveOne(row.order)}
                />
              </Tooltip>
            </>
          ) : null}
          {row.rowSpan > 0 && locked(row) ? (
            <Tooltip title="Bỏ khỏi bảng">
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() =>
                  setOrders((current) =>
                    current.filter((item) => item.key !== row.order.key),
                  )
                }
              />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ];

  const grandTotal = orders.reduce(
    (sum, order) =>
      sum +
      order.lines.reduce(
        (lineSum, line) =>
          lineSum +
          Number(line.quantity ?? 0) *
            (Number(line.unitPrice ?? 0) -
              Number(line.discountBaseAmount ?? 0) -
              Number(line.discountAdjustmentAmount ?? 0) +
              Number(line.transportFeeUnitPrice ?? 0)),
        0,
      ),
    0,
  );

  const patchPlan = (key: string, patch: Partial<PaymentPlanRow>) =>
    setPaymentPlans((current) =>
      current.map((plan) => (plan.key === key ? { ...plan, ...patch } : plan)),
    );

  const paymentBaseDate = [...orders, ...staged].reduce(
    (latest, order) => (order.orderDate.isAfter(latest, "day") ? order.orderDate : latest),
    orders[0]?.orderDate ?? staged[0]?.orderDate ?? dayjs(),
  );

  const applyPreset = (preset: "FULL" | "HALF") => {
    const stamp = Date.now();
    setPaymentPlans(
      preset === "FULL"
        ? [{ key: `plan-${stamp}`, dueDate: paymentBaseDate, percent: 100 }]
        : [
            { key: `plan-${stamp}-1`, dueDate: paymentBaseDate, percent: 50 },
            { key: `plan-${stamp}-2`, dueDate: paymentBaseDate.add(3, "day"), percent: 50 },
          ],
    );
    setLotTermsOpen(true);
  };

  const addPlanRow = () =>
    setPaymentPlans((current) => {
      const used = current.reduce((sum, plan) => sum + Number(plan.percent || 0), 0);
      const latest = current.reduce(
        (date, plan) => (plan.dueDate.isAfter(date, "day") ? plan.dueDate : date),
        paymentBaseDate,
      );
      return [
        ...current,
        {
          key: `plan-${Date.now()}-${Math.random()}`,
          dueDate: current.length ? latest.add(1, "day") : paymentBaseDate,
          percent: Math.max(0, 100 - used),
        },
      ];
    });

  const planPercentTotal = paymentPlans.reduce(
    (sum, plan) => sum + Number(plan.percent ?? 0),
    0,
  );
  const paymentPlanError =
    mode !== "LOT" || paymentTermType !== "NET_DAYS"
      ? null
      : !paymentPlans.length
        ? "Hãy thêm ít nhất một đợt thanh toán."
        : paymentPlans.some((plan) => !plan.dueDate || plan.dueDate.isBefore(paymentBaseDate, "day"))
          ? "Ngày thanh toán không được trước ngày đặt hàng."
          : Math.abs(planPercentTotal - 100) > 0.001
            ? `Tổng tỷ lệ phải bằng 100% (hiện tại ${planPercentTotal}%).`
            : null;
  const paymentPlanSummary = paymentPlans
    .map((plan) => `${plan.percent}% ngày ${plan.dueDate.format("DD/MM")}`)
    .join(" · ");

  const savedCount = orders.filter((order) => order.save.kind === "SAVED").length;
  const unsavedCount = orders.length - savedCount;

  return (
    <div className={mobileRetail ? "retail-mobile-panel" : "quick-entry"}>
      {mobileRetail ? <RetailMobileEntry orders={orders} busy={busy} parsing={parsing} text={text}
        onTextChange={setText} onParse={() => { void submitText(); }} useAi={useAi} onUseAiChange={setUseAi}
        regionControl={<Select size="small" showSearch filterOption={false} aria-label="Vùng giá" value={regionCode} disabled={busy}
          loading={regionsQuery.isFetching} onSearch={setRegionKeyword} onChange={setRegionCode}
          options={(regionsQuery.data ?? []).map((region) => ({ value: region.code, label: `${region.name} (${region.code})` }))} />}
        renderField={(key, order, line) => {
          const column = columns.find((item) => item.key === key);
          return column && "render" in column && column.render ? column.render(undefined, { key: line?.key ?? order.key, order, line: line ?? null, rowSpan: 1 }, 0) as ReactNode : null;
        }}
        totalOf={orderTotalOf} onAdd={addBlankOrder} onAddLine={addLine}
        onRemoveLine={(orderKey, lineKey) => Modal.confirm({ title: "Xóa dòng hàng?", content: orders.find((order) => order.key === orderKey)?.lines.length === 1 ? "Đây là dòng cuối; đơn đang nhập sẽ được bỏ." : "Các dòng hàng khác được giữ nguyên.",
          okText: "Xóa", cancelText: "Giữ lại", okButtonProps: { danger: true, size: "small" }, cancelButtonProps: { size: "small" }, onOk: () => removeLine(orderKey, lineKey) })}
        onRemove={(key) => Modal.confirm({ title: "Bỏ đơn khỏi lượt nhập?", content: "Đơn chưa lưu sẽ mất nội dung. Đơn đã lưu vẫn còn trong danh sách theo dõi.",
          okText: "Bỏ đơn", cancelText: "Giữ lại", okButtonProps: { danger: true, size: "small" }, cancelButtonProps: { size: "small" },
          onOk: () => { setOrders((current) => current.filter((order) => order.key !== key)); setStaged((current) => current.filter((order) => order.key !== key)); } })}
        onSave={(order) => { void saveOne(order); }}
      /> : <>
      {/* Thanh gọn thay cho ô dán khi đang thu: vẫn giữ vùng giá (nó quyết định giá tự
          điền cho cả dòng nhập tay) và đưa "Thêm đơn" lên làm việc chính. */}
      {composerOpen ? null : (
        <div className="quick-entry-compact-bar">
          <span className="quick-entry-control-label">Vùng giá:</span>
          <Select
            size="small"
            showSearch
            filterOption={false}
            className="quick-entry-region-select"
            value={regionCode}
            loading={regionsQuery.isFetching}
            onSearch={setRegionKeyword}
            onChange={setRegionCode}
            options={(regionsQuery.data ?? []).map((region) => ({
              value: region.code,
              label: `${region.name} (${region.code})`,
            }))}
          />
          <span className="quick-entry-compact-spacer" />
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => setComposerOpen(true)}
          >
            Dán tin nhắn
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addBlankOrder}>
            Thêm đơn
          </Button>
        </div>
      )}

      <div
        className={`quick-entry-composer${composerOpen ? "" : " is-hidden"}`}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 300px",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div className="quick-entry-message">
          <div className="quick-entry-hotkey">Ctrl + Enter</div>
          <Input.TextArea
            size="small"
            autoSize={{ minRows: 2, maxRows: 5 }}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Ctrl/Shift+Enter is how you get a new line.
              if (event.key !== "Enter") return;
              if (event.ctrlKey || event.shiftKey || event.metaKey) return;
              event.preventDefault();
              void submitText();
            }}
            placeholder={
              mode === "LOT"
                ? "Dán đơn đặt lô rồi bấm Enter. Ctrl+Enter để xuống dòng.\n\n" +
                  "18/8\nKhách hàng: HFC\nE10: 300.000 L - Kho Hoàng Huy"
                : "Dán tin nhắn khách rồi bấm Enter. Ctrl+Enter để xuống dòng.\n\n" +
                  "14/7\nKhách hàng: Chí Linh HD\nXe: 34C-118.23\nLái xe: Nguyễn Đình Cường\n" +
                  "DO 05: 9.593 L - Kho HLHP"
            }
          />
          <div className="quick-entry-controls" >
            <span className="quick-entry-control-label">Vùng giá:</span>
            <Select
              size="small"
              showSearch
              filterOption={false}
              className="quick-entry-region-select"
              value={regionCode}
              loading={regionsQuery.isFetching}
              onSearch={setRegionKeyword}
              onChange={setRegionCode}
              options={(regionsQuery.data ?? []).map((region) => ({
                value: region.code,
                label: `${region.name} (${region.code})`,
              }))}
            />
            <Switch size="small" checked={useAi} onChange={setUseAi} />
            <span className="quick-entry-ai-label">Gọi AI khi đọc theo mẫu bị thiếu</span>
            <Tooltip title="Đọc theo mẫu trước; chỉ khi thiếu khách, mặt hàng hay số lượng mới gọi AI.">
              <InfoCircleOutlined className="quick-entry-ai-hint" />
            </Tooltip>
            <Button
              size="small"
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={parseMutation.isPending}
              disabled={!text.trim()}
              onClick={submitText}
            >
              Thêm vào bảng (Enter)
            </Button>
            {mode === "LOT" ? (
              <Button
                size="small"
                type="text"
                icon={<UpOutlined />}
                disabled={staged.length > 0}
                onClick={() => setComposerOpen(false)}
              >
                {staged.length ? "Còn đơn tạm chờ xử lý" : "Thu gọn ô dán"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="quick-entry-draft-card">
          <div className="quick-entry-draft-heading">
            <Space size={8}>
              <Typography.Text strong>Đơn tạm ({staged.length})</Typography.Text>
              {staged.some((draft) => draft.usedAi) ? <Tag color="blue">AI đã hỗ trợ đọc</Tag> : null}
            </Space>
            <Space size={2}>
              {staged.length ? (
                <Button size="small" type="text" danger onClick={() => setStaged([])}>
                  Bỏ hết
                </Button>
              ) : null}
              <Tooltip title={draftOpen ? "Thu gọn" : "Mở ra"}>
                <Button
                  size="small"
                  type="text"
                  icon={draftOpen ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setDraftOpen((open) => !open)}
                />
              </Tooltip>
            </Space>
          </div>

          {!draftOpen ? null : staged.length ? (
            <>
              {staged.map((draft) => {
                const products = draft.lines
                  .map((line) => line.productCode ?? line.productRawText)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div key={draft.key} className="quick-entry-draft-summary">
                    <div className="quick-entry-draft-date">{draft.orderDate.format("DD/MM")}</div>
                    <div className="quick-entry-draft-fields">
                      <div>
                        <span>Khách hàng</span>
                        <strong>{draft.customerCode ?? draft.customerRawText ?? "Chưa rõ"}</strong>
                      </div>
                      {mode !== "LOT" ? (
                        <>
                          <div>
                            <span>BKS</span>
                            <strong>{draft.plate || "-"}</strong>
                          </div>
                          <div>
                            <span>Lái xe</span>
                            <strong>{draft.driver || "-"}</strong>
                          </div>
                        </>
                      ) : null}
                      <div>
                        <span>Mặt hàng</span>
                        <strong>{products || "-"}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="quick-entry-draft-actions">
                <Tooltip
                  title={
                    staged.length === 1
                      ? "Trả tin nhắn về ô nhập để sửa lại"
                      : "Chỉ sửa lại được khi đang có đúng một đơn tạm"
                  }
                >
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    disabled={staged.length !== 1}
                    onClick={() => editStaged(staged[0])}
                  >
                    Sửa
                  </Button>
                </Tooltip>
              </div>
            </>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Dán tin nhắn rồi bấm Enter — đơn đọc được sẽ hiện ở đây để bạn kiểm tra trước khi
              đưa xuống bảng.
            </Typography.Text>
          )}
        </div>
      </div>

      <div
        className={`quick-entry-table-toolbar${orders.length ? "" : " is-empty"}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Typography.Text type="secondary" style={{ display: "none" }}>
            {orders.length} đơn trong bảng · đã lưu {savedCount}
          </Typography.Text>
          <Space style={{ visibility: orders.length ? "visible" : "hidden" }}>
            <Button
              size="small"
              onClick={() =>
                setOrders((current) => current.filter((order) => order.save.kind !== "SAVED"))
              }
            >
              Dọn đơn đã lưu
            </Button>
            <Popconfirm
              title="Xóa hết bảng?"
              description={
                unsavedCount
                  ? `Còn ${unsavedCount} đơn chưa lưu sẽ mất.`
                  : "Bảng sẽ trống lại từ đầu."
              }
              okText="Xóa hết"
              okButtonProps={{ danger: true }}
              cancelText="Đóng"
              onConfirm={() => {
                setOrders([]);
                setStaged([]);
                setText("");
              }}
            >
              <Button size="small" danger icon={<ClearOutlined />}>
                Xóa hết
              </Button>
            </Popconfirm>
            <Button
              size="small"
              type="primary"
              loading={confirmMutation.isPending}
              onClick={saveAll}
            >
              Lưu tất cả
            </Button>
          </Space>
      </div>

      <Table<FlatRow>
        className="sales-order-lines"
        rowKey="key"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        scroll={{ x: mode === "LOT" ? 890 : 1270 }}
        footer={
          orders.length
            ? () => (
                <div className="quick-entry-table-footer">
                  <span>
                    <Typography.Text type="secondary">Tổng tiền: </Typography.Text>
                    <Typography.Text strong>{formatMoney(grandTotal)} đ</Typography.Text>
                  </span>
                </div>
              )
            : undefined
        }
        bordered
        rowClassName={(row) =>
          row.order.save.kind === "SAVED" && row.order.save.violations.length
            ? "sales-row-attention"
            : ""
        }
        locale={{
          emptyText: (
            <div className="quick-entry-empty">
              <FileTextOutlined />
              <Typography.Text strong>Chưa có đơn nào</Typography.Text>
              <Typography.Text type="secondary">
                {mode === "LOT"
                  ? "Bấm “Thêm đơn” để nhập tay, hoặc mở ô dán tin nhắn nếu khách gửi sẵn đơn."
                  : "Bấm “Thêm nhanh” rồi dán tin nhắn khách, hoặc nhấn Enter để thêm đơn."}
              </Typography.Text>
            </div>
          ),
        }}
      />

      {mode === "LOT" ? (
        <div className="quick-entry-terms">
          <div className="quick-entry-terms-heading">
            <Typography.Text strong>Điều khoản đơn lô</Typography.Text>
            <Typography.Text type="secondary">
              Áp dụng cho mọi đơn trong lượt nhập này
            </Typography.Text>
          </div>

          <div className="quick-entry-terms-grid">
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Thời gian xuất hóa đơn
              </Typography.Text>
              <Radio.Group
                style={{ display: "block", marginTop: 4 }}
                value={lotInvoiceMode}
                onChange={(event) => setLotInvoiceMode(event.target.value)}
              >
                <Radio value="ON_CONFIRMATION" style={{ display: "block" }}>
                  Ngay sau khi xác nhận đơn hàng
                  <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                    (một hóa đơn cho cả lô)
                  </Typography.Text>
                </Radio>
                <Radio value="ON_WITHDRAWAL" style={{ display: "block" }}>
                  Theo tiến độ rút hàng
                  <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                    (xuất hóa đơn nhiều lần)
                  </Typography.Text>
                </Radio>
              </Radio.Group>
            </div>

            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Thời hạn thanh toán
              </Typography.Text>
              <Radio.Group
                style={{ display: "block", marginTop: 4 }}
                value={paymentTermType}
                onChange={(event) => {
                  const next = event.target.value;
                  setPaymentTermType(next);
                  setLotTermsOpen(next === "NET_DAYS");
                  // Mặc định một đợt 100% vào ngày đặt hàng; người dùng có thể chọn nhanh 50/50.
                  if (next === "NET_DAYS" && !paymentPlans.length) {
                    setPaymentPlans([
                      { key: `plan-${Date.now()}`, dueDate: paymentBaseDate, percent: 100 },
                    ]);
                  }
                }}
              >
                <Radio value="SAME_DAY">Trong ngày</Radio>
                <Radio value="NET_DAYS">Theo lịch thanh toán</Radio>
              </Radio.Group>

              {paymentTermType === "NET_DAYS" ? (
                <Button
                  className="quick-entry-terms-detail-toggle"
                  type="link"
                  size="small"
                  icon={lotTermsOpen ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setLotTermsOpen((open) => !open)}
                >
                  {lotTermsOpen ? "Thu gọn" : paymentPlanSummary || "Thiết lập lịch thanh toán"}
                </Button>
              ) : null}

              {paymentTermType === "NET_DAYS" && lotTermsOpen ? (
                <div style={{ marginTop: 8 }}>
                  <Space size={6} wrap style={{ marginBottom: 8 }}>
                    <Button size="small" onClick={() => applyPreset("FULL")}>
                      100% một lần
                    </Button>
                    <Button size="small" onClick={() => applyPreset("HALF")}>
                      50% - 50%
                    </Button>
                    <Button size="small" icon={<PlusOutlined />} onClick={addPlanRow}>
                      Thêm đợt
                    </Button>
                  </Space>

                  {paymentPlans.length ? (
                    <Table<PaymentPlanRow>
                      className="sales-order-lines"
                      rowKey="key"
                      size="small"
                      pagination={false}
                      dataSource={paymentPlans}
                      columns={[
                        {
                          title: "Ngày thanh toán",
                          width: 145,
                          render: (_, plan) => (
                            <DatePicker
                              size="small"
                              format="DD/MM/YYYY"
                              style={{ width: "100%" }}
                              value={plan.dueDate}
                              disabledDate={(date) => date.isBefore(paymentBaseDate, "day")}
                              onChange={(value) =>
                                value && patchPlan(plan.key, { dueDate: value })
                              }
                            />
                          ),
                        },
                        {
                          title: "Tỷ lệ %",
                          width: 110,
                          align: "right",
                          render: (_, plan) => (
                            <InputNumber
                              size="small"
                              min={0}
                              max={100}
                              controls={false}
                              placeholder="—"
                              style={{ width: "100%" }}
                              value={plan.percent}
                              onChange={(value) =>
                                patchPlan(plan.key, {
                                  percent: Number(value ?? 0),
                                })
                              }
                            />
                          ),
                        },
                        {
                          title: "Số tiền dự kiến",
                          width: 150,
                          align: "right",
                          render: (_, plan) => (
                            <Typography.Text strong>
                              {formatMoney((grandTotal * Number(plan.percent || 0)) / 100)} đ
                            </Typography.Text>
                          ),
                        },
                        {
                          title: "",
                          width: 40,
                          render: (_, plan) => (
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setPaymentPlans((current) =>
                                  current.filter((row) => row.key !== plan.key),
                                )
                              }
                            />
                          ),
                        },
                      ]}
                      summary={() => (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} align="right">
                            <Typography.Text strong>Tổng</Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Typography.Text strong>{planPercentTotal}%</Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Typography.Text strong>{formatMoney(grandTotal)} đ</Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} />
                        </Table.Summary.Row>
                      )}
                    />
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Chưa có đợt nào — chọn mẫu nhanh hoặc bấm “Thêm đợt”.
                    </Typography.Text>
                  )}

                  {paymentPlanError ? (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginTop: 8 }}
                      message={paymentPlanError}
                    />
                  ) : paymentPlans.length ? (
                    <Alert
                      type="success"
                      showIcon
                      style={{ marginTop: 8 }}
                      message="Lịch thanh toán đã đủ 100%."
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      </>}
      <CreditLimitWarningModal
        preview={creditPrompt?.preview ?? null}
        customerName={creditPrompt?.customerName}
        muted={creditMuted}
        onMutedChange={setCreditMuted}
        onCancel={() => {
          creditPrompt?.resolve(false);
          setCreditPrompt(null);
        }}
        onConfirm={() => {
          if (creditMuted && creditPrompt) muteCustomerToday(creditPrompt.customerPartyId);
          creditPrompt?.resolve(true);
          setCreditPrompt(null);
        }}
      />

      <Modal
        open={Boolean(aliasPrompt)}
        title="Ghi nhớ cách viết này?"
        okText="Nhớ mục đã chọn"
        cancelText="Không nhớ, cứ lưu đơn"
        onOk={() => closeAliasPrompt(new Set(aliasChecked))}
        onCancel={() => closeAliasPrompt(new Set())}
        width={520}
        okButtonProps={{ size: "small" }} cancelButtonProps={{ size: "small" }}
        maskClosable={false}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 10 }}>
          Những cách viết dưới đây chưa có trong từ điển. Nhớ lại thì lần sau hệ thống
          nhận ra ngay, không phải chọn tay nữa.
        </Typography.Paragraph>
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          {(aliasPrompt?.suggestions ?? []).map((suggestion) => (
            <Checkbox
              key={suggestion.key}
              checked={aliasChecked.has(suggestion.key)}
              onChange={(e) =>
                setAliasChecked((current) => {
                  const next = new Set(current);
                  if (e.target.checked) next.add(suggestion.key);
                  else next.delete(suggestion.key);
                  return next;
                })
              }
            >
              <Tag color="blue" style={{ marginInlineEnd: 6 }}>
                {ALIAS_TYPE_LABELS[suggestion.entityType]}
              </Tag>
              <Typography.Text strong>“{suggestion.rawText}”</Typography.Text>
              <Typography.Text type="secondary">
                {suggestion.targetCode ? ` → ${suggestion.targetCode}` : " → mục đang chọn"}
              </Typography.Text>
            </Checkbox>
          ))}
        </Space>
      </Modal>
    </div>
  );
}
