import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CopyOutlined,
  EditOutlined,
  MailOutlined,
  PlusOutlined,
  RollbackOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { RefreshButton } from "../../../shared/ui/TableFilter";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { confirmDialog } from "../../../shared/lib/confirm";
import { notify } from "../../../shared/lib/notification";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import {
  useCancelDiscountBoard,
  useCreateDiscountBoard,
  useDiscountBoard,
  useDiscountBoards,
  useDiscountRecipientCandidates,
  useDiscountAffectedOrders,
  usePublishDiscountBoard,
  useSendDiscountBoard,
  useUnpublishDiscountBoard,
  useUpdateDiscountBoard,
} from "../hooks";
import type { DiscountBoard, DiscountBoardStatus } from "../types";
import { formatMoney } from "../ui/labels";
import "../sales.css";

/** Khóa ô trong lưới: "warehouseId:productId". */
type DiscountCells = Record<string, number | undefined>;

const cellKey = (warehouseId: string, productId: string) => `${warehouseId}:${productId}`;

const STATUS_LABELS: Record<DiscountBoardStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã phát hành",
  CANCELLED: "Đã hủy",
};

function StatusTag({ board }: { board: DiscountBoard }) {
  if (board.isCurrent) return <Tag color="green">Đang áp dụng</Tag>;
  if (board.status === "PUBLISHED") {
    const future = dayjs(board.effectiveFrom).isAfter(dayjs());
    return <Tag color={future ? "blue" : "default"}>{future ? "Chờ tới giờ" : "Đã hết vai trò"}</Tag>;
  }
  return <Tag color={board.status === "DRAFT" ? "gold" : "default"}>{STATUS_LABELS[board.status]}</Tag>;
}

type DiscountBoardPageProps = {
  /** Bật khi nhúng vào tab "Giá bán & chiết khấu" — bỏ tiêu đề và padding riêng. */
  embedded?: boolean;
};

/**
 * Bảng thông báo chiết khấu theo kho × mặt hàng.
 *
 * Mỗi bản là ảnh chụp trọn vẹn tại một mốc giờ. Tạo bản mới thì hệ thống chép bản đang
 * chạy, vận hành chỉ sửa ô nào đổi — vì một ngày có thể đổi vài lần.
 */
export default function DiscountBoardPage({ embedded = false }: DiscountBoardPageProps) {
  const { can } = useCan();
  const canManage = can(PERMS.SALES_DISCOUNT_MANAGE);

  const [status, setStatus] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string>();
  const [cells, setCells] = useState<DiscountCells>({});
  const [effectiveFrom, setEffectiveFrom] = useState<dayjs.Dayjs>();
  const [announcerName, setAnnouncerName] = useState("");
  /** Lọc bớt cột cho gọn khi chỉ đổi vài mặt hàng. */
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEffectiveFrom, setNewEffectiveFrom] = useState<dayjs.Dayjs>();
  /** Hộp thoại "ra bản sửa lại" cho bản đã tới giờ hiệu lực. */
  const [fixOpen, setFixOpen] = useState(false);
  const [fixEffectiveFrom, setFixEffectiveFrom] = useState<dayjs.Dayjs>();
  const [sendOpen, setSendOpen] = useState(false);
  const [pickedCustomers, setPickedCustomers] = useState<string[]>([]);
  const [resend, setResend] = useState(false);

  const listQuery = useDiscountBoards({
    status: status === "ALL" ? undefined : (status as DiscountBoardStatus),
    limit: 50,
  });
  const boards = listQuery.data?.items ?? [];
  const detailQuery = useDiscountBoard(selectedId);
  const board = detailQuery.data;

  // Lấy trọn danh mục để dựng lưới sẵn — người dùng không phải bấm thêm từng dòng.
  const productsQuery = useProductSelect("");
  const warehousesQuery = useWarehouseSelect("");
  const recipientsQuery = useDiscountRecipientCandidates(sendOpen);
  const affectedQuery = useDiscountAffectedOrders(selectedId, fixOpen);

  const createMutation = useCreateDiscountBoard();
  const updateMutation = useUpdateDiscountBoard();
  const publishMutation = usePublishDiscountBoard();
  const unpublishMutation = useUnpublishDiscountBoard();
  const sendMutation = useSendDiscountBoard();
  const cancelMutation = useCancelDiscountBoard();

  // Chọn sẵn bản đang áp dụng để mở màn là thấy ngay chiết khấu hiện hành.
  useEffect(() => {
    if (selectedId || !boards.length) return;
    setSelectedId(listQuery.data?.currentBoardId ?? boards[0].id);
  }, [boards, listQuery.data?.currentBoardId, selectedId]);

  useEffect(() => {
    if (!board) return;
    const next: DiscountCells = {};
    for (const line of board.lines) {
      next[cellKey(line.warehouseId, line.productId)] = Number(line.discountPerUnit);
    }
    setCells(next);
    setEffectiveFrom(dayjs(board.effectiveFrom));
    setAnnouncerName(board.announcerName ?? "");
  }, [board]);

  const isDraft = board?.status === "DRAFT";
  /** Đã tới giờ hiệu lực — từ đây trở đi không sửa được nữa, chỉ ra bản mới. */
  const isEffective =
    board?.status === "PUBLISHED" && !dayjs(board.effectiveFrom).isAfter(dayjs());

  /**
   * Trục của lưới. Bản đã phát hành chỉ hiện đúng kho/mặt hàng có trong bản đó — nhìn
   * lại lịch sử mà thấy cả kho mới mở sau này thì sai.
   */
  const warehouses = useMemo(() => {
    if (isDraft) return warehousesQuery.data ?? [];
    const seen = new Map<string, { id: string; label: string }>();
    for (const line of board?.lines ?? []) {
      seen.set(line.warehouseId, { id: line.warehouseId, label: line.warehouse.name });
    }
    return [...seen.values()];
  }, [isDraft, warehousesQuery.data, board]);

  const products = useMemo(() => {
    if (isDraft) return productsQuery.data ?? [];
    const seen = new Map<string, { id: string; code: string; name: string }>();
    for (const line of board?.lines ?? []) {
      seen.set(line.productId, {
        id: line.productId,
        code: line.product.code ?? "",
        name: line.product.name,
      });
    }
    return [...seen.values()];
  }, [isDraft, productsQuery.data, board]);

  /**
   * Hỏi giờ hiệu lực ngay khi tạo. Trước đây tự lấy đầu giờ kế tiếp — đúng trong đa số
   * trường hợp nhưng người dùng không biết mình vừa bị chọn hộ, nên phải hỏi.
   */
  const createBoard = async () => {
    if (!newEffectiveFrom) return;
    const next = await createMutation.mutateAsync({
      effectiveFrom: newEffectiveFrom.toISOString(),
    });
    setSelectedId(next.id);
    setCreateOpen(false);
  };

  const openCreate = () => {
    setNewEffectiveFrom(dayjs().add(1, "hour").startOf("hour"));
    setCreateOpen(true);
  };

  /**
   * Bản đã tới giờ thì không sửa được nữa — quá khứ đã có đơn dùng nó. Chép nội dung
   * sang bản mới để vận hành sửa con số sai rồi phát hành đè từ mốc mới.
   */
  const createFixBoard = async () => {
    if (!board || !fixEffectiveFrom) return;
    const next = await createMutation.mutateAsync({
      effectiveFrom: fixEffectiveFrom.toISOString(),
      cloneFromBoardId: board.id,
      announcerName: board.announcerName ?? undefined,
    });
    setSelectedId(next.id);
    setFixOpen(false);
  };

  const setCell = (warehouseId: string, productId: string, value: number | null) =>
    setCells((current) => {
      const next = { ...current };
      const key = cellKey(warehouseId, productId);
      // Xóa trắng = không công bố cho cặp này, khác hẳn với công bố mức 0.
      if (value == null) delete next[key];
      else next[key] = value;
      return next;
    });

  /** Điền cả cột: cùng một mặt hàng thường cùng mức chiết khấu ở nhiều kho. */
  /** Số đang gõ ở ô "điền cả cột" của từng mặt hàng, trước khi bấm áp dụng. */
  const [fillDrafts, setFillDrafts] = useState<Record<string, number | null>>({});

  const fillColumn = (productId: string, value: number | null) =>
    setCells((current) => {
      const next = { ...current };
      for (const warehouse of warehouses) {
        const key = cellKey(warehouse.id, productId);
        if (value == null) delete next[key];
        else next[key] = value;
      }
      return next;
    });

  /**
   * Áp mức vừa gõ cho mọi kho của mặt hàng đó, rồi xóa ô nhập để thấy rõ là đã ăn.
   *
   * Nhận cả khi Enter lẫn khi rời ô: bản cũ chỉ bắt Enter và đọc thẳng giá trị từ thẻ
   * input, nên gõ xong bấm ra ngoài là mất trắng — nhìn y như ô nhập bị hỏng.
   */
  const applyFill = (productId: string) => {
    const value = fillDrafts[productId];
    if (value == null) return;
    fillColumn(productId, value);
    setFillDrafts((prev) => ({ ...prev, [productId]: null }));
  };

  /** Chỉ những ô đã điền mới thành dòng công bố. */
  const filledLines = useMemo(
    () =>
      Object.entries(cells)
        .filter(([, value]) => value != null)
        .map(([key, value]) => {
          const [warehouseId, productId] = key.split(":");
          return { warehouseId, productId, discountPerUnit: Number(value) };
        }),
    [cells],
  );

  const problems = useMemo(
    () => (filledLines.length ? [] : ["Chưa điền chiết khấu cho kho × mặt hàng nào"]),
    [filledLines],
  );

  const saveDraft = async () => {
    if (!board) return;
    await updateMutation.mutateAsync({
      id: board.id,
      payload: {
        effectiveFrom: effectiveFrom?.toISOString(),
        announcerName: announcerName.trim() || undefined,
        lines: filledLines,
      },
    });
  };

  const copyText = async () => {
    if (!board?.announcementText) return;
    await navigator.clipboard.writeText(board.announcementText);
    notify.success("Đã copy nội dung thông báo");
  };

  const visibleProducts = useMemo(
    () => (productFilter.length ? products.filter((p) => productFilter.includes(p.id)) : products),
    [products, productFilter],
  );

  const filledCount = filledLines.length;
  const emptyCount = Math.max(warehouses.length * visibleProducts.length - filledCount, 0);

  type GridRow = { id: string; label: string };
  const gridRows: GridRow[] = warehouses.map((w) => ({ id: w.id, label: w.label }));

  const gridColumns: ColumnsType<GridRow> = [
    {
      title: "Kho",
      dataIndex: "label",
      width: 190,
      fixed: "left",
      render: (value: string) => <strong>{value}</strong>,
    },
    ...visibleProducts.map((product) => ({
      title: (
        <div style={{ lineHeight: 1.25 }}>
          <div>{product.code}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}>{product.name}</div>
          {isDraft && canManage && (
            <Tooltip title="Điền mức này cho tất cả các kho">
              <InputNumber
                size="small"
                min={0}
                controls={false}
                placeholder="điền cả cột"
                style={{ width: "100%", marginTop: 4 }}
                value={fillDrafts[product.id] ?? null}
                onChange={(value) =>
                  setFillDrafts((prev) => ({
                    ...prev,
                    [product.id]: value as number | null,
                  }))
                }
                onPressEnter={() => applyFill(product.id)}
                onBlur={() => applyFill(product.id)}
              />
            </Tooltip>
          )}
        </div>
      ),
      key: product.id,
      align: "center" as const,
      width: 150,
      render: (_: unknown, row: GridRow) => {
        const value = cells[cellKey(row.id, product.id)];
        if (!isDraft || !canManage) {
          return value == null ? (
            <div className="discount-cell empty">—</div>
          ) : (
            <div className="discount-cell has-value">{formatMoney(value)}</div>
          );
        }
        return (
          <InputNumber
            size="small"
            min={0}
            controls={false}
            placeholder="—"
            className={value == null ? "discount-input empty" : "discount-input has-value"}
            style={{ width: "100%" }}
            value={value}
            onChange={(next) => setCell(row.id, product.id, next)}
          />
        );
      },
    })),
  ];

  return (
    <div style={embedded ? undefined : { padding: 16 }}>
      {!embedded && (
        <div style={{ marginBottom: 12 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Thông báo chiết khấu
          </Typography.Title>
        </div>
      )}

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Mỗi bản là bảng chiết khấu đầy đủ tại một mốc giờ. Tạo bản mới sẽ chép nguyên bản đang chạy — bạn chỉ sửa ô nào đổi rồi đặt giờ hiệu lực."
      />

      <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0, 1fr)", gap: 12 }}>
        <Card
          size="small"
          title="Các bản thông báo"
          bodyStyle={{ padding: 8 }}
          extra={
            <Space size={4}>
              {canManage && (
                <Tooltip title="Tạo thông báo chiết khấu mới">
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    Tạo mới
                  </Button>
                </Tooltip>
              )}
              <RefreshButton
                loading={listQuery.isFetching}
                onClick={() => listQuery.refetch()}
              />
            </Space>
          }
        >
          <Segmented
            size="small"
            block
            value={status}
            style={{ marginBottom: 8 }}
            options={[
              { value: "ALL", label: "Tất cả" },
              { value: "PUBLISHED", label: "Đã phát hành" },
              { value: "DRAFT", label: "Nháp" },
            ]}
            onChange={(value) => setStatus(value as string)}
          />
          {listQuery.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              {boards.map((row) => (
                <Card
                  key={row.id}
                  size="small"
                  hoverable
                  className={row.id === selectedId ? "sales-row-current" : ""}
                  bodyStyle={{ padding: 8 }}
                  onClick={() => setSelectedId(row.id)}
                >
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                    align="start"
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {dayjs(row.effectiveFrom).format("HH:mm DD/MM/YYYY")}
                      </div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {row.lines.length} dòng
                        {row.recipients.length > 0
                          ? ` · đã gửi ${row.recipients.filter((r) => r.sentAt).length}`
                          : ""}
                      </Typography.Text>
                    </div>
                    <StatusTag board={row} />
                  </Space>
                </Card>
              ))}
              {!boards.length && (
                <Typography.Text type="secondary">Chưa có bản thông báo nào</Typography.Text>
              )}
            </Space>
          )}
        </Card>

        <Card
          size="small"
          title={
            board ? (
              <Space>
                Hiệu lực từ {dayjs(board.effectiveFrom).format("HH:mm DD/MM/YYYY")}
                <StatusTag board={board} />
              </Space>
            ) : (
              "Chi tiết"
            )
          }
          extra={
            board && (
              <Space>
                <Tooltip title="Copy đúng mẫu chữ để dán vào Zalo/email">
                  <Button size="small" icon={<CopyOutlined />} onClick={copyText}>
                    Copy thông báo
                  </Button>
                </Tooltip>
                {canManage && board.status === "PUBLISHED" && (
                  <Button
                    size="small"
                    icon={<MailOutlined />}
                    onClick={() => {
                      setPickedCustomers([]);
                      setResend(false);
                      setSendOpen(true);
                    }}
                  >
                    Gửi email khách
                  </Button>
                )}
                {/*
                  Phát hành rồi mới thấy sai: chưa tới giờ thì thu hồi về nháp sửa thẳng;
                  đã tới giờ thì không xóa được quá khứ, chỉ ra bản sửa lại.
                */}
                {canManage && board.status === "PUBLISHED" && !isEffective && (
                  <Button
                    size="small"
                    icon={<RollbackOutlined />}
                    loading={unpublishMutation.isPending}
                    onClick={() =>
                      confirmDialog.confirm(
                        "Thu hồi về nháp",
                        board.recipients.some((r) => r.sentAt)
                          ? `Bản này đã gửi cho ${board.recipients.filter((r) => r.sentAt).length} khách. Sửa xong bạn cần gửi lại để họ nhận số đúng. Tiếp tục?`
                          : "Bản chưa tới giờ hiệu lực nên chưa đơn nào dùng tới. Thu hồi về nháp để sửa?",
                        () => unpublishMutation.mutate(board.id),
                      )
                    }
                  >
                    Thu hồi để sửa
                  </Button>
                )}
                {canManage && board.status === "PUBLISHED" && isEffective && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setFixEffectiveFrom(dayjs());
                      setFixOpen(true);
                    }}
                  >
                    Ra bản sửa lại
                  </Button>
                )}
                {canManage && isDraft && (
                  <>
                    <Button
                      size="small"
                      loading={updateMutation.isPending}
                      disabled={problems.length > 0}
                      onClick={saveDraft}
                    >
                      Lưu nháp
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SendOutlined />}
                      disabled={problems.length > 0 || !filledLines.length}
                      loading={publishMutation.isPending}
                      onClick={() =>
                        confirmDialog.confirm(
                          "Phát hành bảng chiết khấu",
                          `Từ ${effectiveFrom?.format("HH:mm DD/MM/YYYY")} trở đi, đơn bán sẽ lấy chiết khấu theo bảng này. Tiếp tục?`,
                          async () => {
                            await saveDraft();
                            await publishMutation.mutateAsync(board.id);
                          },
                        )
                      }
                    >
                      Phát hành
                    </Button>
                    <Button
                      danger
                      size="small"
                      loading={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(board.id)}
                    >
                      Hủy nháp
                    </Button>
                  </>
                )}
              </Space>
            )
          }
        >
          {!selectedId ? (
            // Chưa có bản nào để xem. Trước đây chỗ này rơi vào skeleton và quay mãi vì
            // query bị disabled nên không bao giờ "load xong".
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                boards.length
                  ? "Chọn một bản thông báo ở cột bên trái"
                  : "Chưa có bản thông báo chiết khấu nào"
              }
            >
              {!boards.length && canManage && (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Tạo bản đầu tiên
                </Button>
              )}
            </Empty>
          ) : detailQuery.isLoading || !board ? (
            <Skeleton active />
          ) : (
            <>
              {isDraft && canManage && (
                <Space wrap style={{ marginBottom: 12 }}>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Hiệu lực từ
                    </Typography.Text>
                    <DatePicker
                      size="small"
                      showTime={{ format: "HH:mm" }}
                      format="HH:mm DD/MM/YYYY"
                      style={{ width: 190, display: "block" }}
                      value={effectiveFrom}
                      onChange={(value) => setEffectiveFrom(value ?? dayjs())}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Đơn vị thông báo (in ở đầu bản copy)
                    </Typography.Text>
                    <Input
                      size="small"
                      style={{ width: 300, display: "block" }}
                      value={announcerName}
                      onChange={(e) => setAnnouncerName(e.target.value)}
                      placeholder="Công ty XD Thiên Phúc"
                    />
                  </div>
                  <div style={{ minWidth: 260 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Mặt hàng hiển thị
                    </Typography.Text>
                    <Select
                      mode="multiple"
                      size="small"
                      allowClear
                      maxTagCount="responsive"
                      placeholder="Tất cả mặt hàng"
                      style={{ width: "100%", display: "block" }}
                      value={productFilter}
                      onChange={setProductFilter}
                      options={products.map((p) => ({ value: p.id, label: p.code || p.name }))}
                    />
                  </div>
                  <div className="discount-stat filled">
                    <div className="discount-stat-label">Đã nhập</div>
                    <b>{filledCount}</b>
                  </div>
                  <div className="discount-stat empty">
                    <div className="discount-stat-label">Còn trống</div>
                    <b>{emptyCount}</b>
                  </div>
                </Space>
              )}

              <div className="discount-grid">
                <Table<GridRow>
                  rowKey="id"
                  size="small"
                  bordered={false}
                  pagination={false}
                  columns={gridColumns}
                  dataSource={gridRows}
                  scroll={{ x: 190 + visibleProducts.length * 150 }}
                  locale={{ emptyText: "Chưa có kho nào" }}
                />
              </div>

              {isDraft && canManage && (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                  Ô để trống nghĩa là chưa công bố chiết khấu — kho đó không bán được mặt hàng đó.
                </Typography.Text>
              )}

              {problems.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginTop: 12 }}
                  message="Chưa lưu được"
                  description={
                    <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                      {problems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  }
                />
              )}

              <div style={{ marginTop: 16 }}>
                <Typography.Text strong>Nội dung gửi khách</Typography.Text>
                <Input.TextArea
                  readOnly
                  rows={Math.min(14, (board.announcementText?.split("\n").length ?? 3) + 1)}
                  style={{ marginTop: 8, fontFamily: "inherit" }}
                  value={board.announcementText ?? ""}
                />
              </div>

              {board.recipients.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Typography.Text strong>Đã gửi cho</Typography.Text>
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    style={{ marginTop: 8 }}
                    dataSource={board.recipients}
                    columns={[
                      { title: "Khách hàng", key: "c", render: (_, r) => r.customer.name },
                      { title: "Email", dataIndex: "email", width: 240 },
                      {
                        title: "Kết quả",
                        key: "result",
                        width: 200,
                        render: (_, r) =>
                          r.sentAt ? (
                            <Tag color="green">
                              {dayjs(r.sentAt).format("HH:mm DD/MM")}
                            </Tag>
                          ) : (
                            <Tooltip title={r.errorMessage ?? ""}>
                              <Tag color="red">Lỗi</Tag>
                            </Tooltip>
                          ),
                      },
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <Modal
        open={fixOpen}
        title="Ra bản sửa lại chiết khấu"
        width={640}
        okText="Tạo bản sửa lại"
        cancelText="Đóng"
        okButtonProps={{ disabled: !fixEffectiveFrom }}
        confirmLoading={createMutation.isPending}
        onCancel={() => setFixOpen(false)}
        onOk={createFixBoard}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Alert
            type="warning"
            showIcon
            message="Bản này đã có hiệu lực nên không sửa trực tiếp được"
            description="Đơn bán tạo trong lúc nó chạy đã lấy chiết khấu theo nó. Bản sửa lại chỉ áp dụng từ mốc mới trở đi — những đơn đã lỡ tạo phải sửa thủ công."
          />
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chiết khấu đúng áp dụng từ
            </Typography.Text>
            <DatePicker
              showTime={{ format: "HH:mm", minuteStep: 5 }}
              format="HH:mm DD/MM/YYYY"
              style={{ width: "100%" }}
              value={fixEffectiveFrom}
              onChange={(value) => setFixEffectiveFrom(value ?? undefined)}
            />
          </div>
          <Space size={4} wrap>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Nhanh:
            </Typography.Text>
            <Button size="small" onClick={() => setFixEffectiveFrom(dayjs())}>
              Ngay bây giờ
            </Button>
            <Button
              size="small"
              onClick={() => setFixEffectiveFrom(dayjs().add(1, "hour").startOf("hour"))}
            >
              Đầu giờ sau
            </Button>
          </Space>

          <div>
            <Typography.Text strong>
              Đơn đã gửi duyệt trong lúc bản sai đang chạy
            </Typography.Text>
            {affectedQuery.isLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (affectedQuery.data?.items.length ?? 0) === 0 ? (
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                Chưa có đơn nào — sửa xong là xong, không phải xử lý gì thêm.
              </Typography.Paragraph>
            ) : (
              <Table
                rowKey="id"
                size="small"
                style={{ marginTop: 8 }}
                pagination={{ pageSize: 5, showSizeChanger: false }}
                dataSource={affectedQuery.data?.items ?? []}
                columns={[
                  { title: "Số đơn", dataIndex: "orderNo", width: 150 },
                  { title: "Khách hàng", key: "c", render: (_, r) => r.customer.name },
                  {
                    title: "Gửi duyệt lúc",
                    dataIndex: "submittedAt",
                    width: 150,
                    render: (v: string | null) =>
                      v ? dayjs(v).format("HH:mm DD/MM/YYYY") : "—",
                  },
                ]}
              />
            )}
          </div>
        </Space>
      </Modal>

      <Modal
        open={createOpen}
        title="Tạo thông báo chiết khấu mới"
        okText="Tạo bản nháp"
        cancelText="Đóng"
        okButtonProps={{ disabled: !newEffectiveFrom }}
        confirmLoading={createMutation.isPending}
        onCancel={() => setCreateOpen(false)}
        onOk={createBoard}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chiết khấu áp dụng từ
            </Typography.Text>
            <DatePicker
              showTime={{ format: "HH:mm", minuteStep: 5 }}
              format="HH:mm DD/MM/YYYY"
              style={{ width: "100%" }}
              value={newEffectiveFrom}
              onChange={(value) => setNewEffectiveFrom(value ?? undefined)}
            />
          </div>
          <Space size={4} wrap>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Nhanh:
            </Typography.Text>
            <Button size="small" onClick={() => setNewEffectiveFrom(dayjs())}>
              Ngay bây giờ
            </Button>
            <Button
              size="small"
              onClick={() => setNewEffectiveFrom(dayjs().add(1, "hour").startOf("hour"))}
            >
              Đầu giờ sau
            </Button>
            <Button
              size="small"
              onClick={() => setNewEffectiveFrom(dayjs().add(1, "day").startOf("day"))}
            >
              0h ngày mai
            </Button>
          </Space>
          <Alert
            type="info"
            showIcon
            message="Bản mới sẽ chép nguyên bảng đang chạy. Bạn sửa ô nào đổi rồi mới phát hành — giờ hiệu lực vẫn đổi được trước khi phát hành."
          />
        </Space>
      </Modal>

      <Modal
        open={sendOpen}
        title="Gửi thông báo chiết khấu cho khách"
        width={640}
        okText={`Gửi cho ${pickedCustomers.length} khách`}
        cancelText="Đóng"
        okButtonProps={{ disabled: !pickedCustomers.length }}
        confirmLoading={sendMutation.isPending}
        onCancel={() => setSendOpen(false)}
        onOk={async () => {
          if (!board) return;
          await sendMutation.mutateAsync({
            id: board.id,
            customerPartyIds: pickedCustomers,
            resend,
          });
          setSendOpen(false);
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space>
            <Button
              size="small"
              onClick={() =>
                setPickedCustomers((recipientsQuery.data ?? []).map((row) => row.id))
              }
            >
              Chọn tất cả
            </Button>
            <Button size="small" onClick={() => setPickedCustomers([])}>
              Bỏ chọn
            </Button>
            <Checkbox checked={resend} onChange={(e) => setResend(e.target.checked)}>
              Gửi lại cho cả người đã nhận
            </Checkbox>
          </Space>

          {recipientsQuery.isLoading ? (
            <Skeleton active />
          ) : (
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: false }}
              dataSource={recipientsQuery.data ?? []}
              rowSelection={{
                selectedRowKeys: pickedCustomers,
                onChange: (keys) => setPickedCustomers(keys as string[]),
              }}
              columns={[
                { title: "Khách hàng", dataIndex: "name" },
                { title: "Email", dataIndex: "contactEmail", width: 240 },
              ]}
              locale={{ emptyText: "Không có khách hàng nào có email" }}
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
