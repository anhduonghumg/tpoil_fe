import { useEffect, useMemo, useState } from "react";
import { Alert, Button, DatePicker, Descriptions, Drawer, Input, InputNumber, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useBankAccountsOptions, useBankTransactions, usePaymentPlanAction, usePlanDisbursementLink, useSavePaymentPlan } from "../hooks";
import type { BankAccountOption, BankTransactionItem, PaymentPlanLine, PaymentPlanMethod, PaymentPlanRequest, SavePaymentPlanPayload } from "../types";
import { notify } from "../../../shared/lib/notification";
import "../../../shared/ui/data-grid.css";
import { COMMERCIAL_REQUEST_STATUS, dateText, formatMoney, statusTag } from "../lib/format";
import "../banking.css";

/* edit: ngân hàng lập / sửa kế hoạch; review: giám đốc duyệt đề nghị kèm kế hoạch; view: chỉ xem. */
export type PaymentPlanDrawerMode = "edit" | "review" | "view";

type Row = {
  key: string;
  id?: string;
  plannedDate: Dayjs | null;
  amountVnd: number | null;
  method: PaymentPlanMethod;
  senderBank?: string;
  bankAccountId?: string;
  receiverBank?: string;
  beneficiaryBankAccountId?: string;
  lenderBankName?: string;
  creditFacilityRef?: string;
  paidAmount: number;
  /** Đơn TE: đợt đã vào bảng kê này, nên chỉ còn đổi được ngày dự kiến. */
  batchNo?: string;
  disbursement?: PaymentPlanLine["disbursementTransaction"];
};

/* Đợt đã có lần chi hoặc đã vào bảng kê thì khóa kiểu và tài khoản. */
const isLocked = (row: Row) => row.paidAmount > 0 || Boolean(row.batchNo);

const METHOD_OPTIONS: Array<{ value: PaymentPlanMethod; label: string }> = [
  { value: "TRANSFER", label: "Chuyển khoản" },
  { value: "DISBURSEMENT", label: "Giải ngân" },
];
const PLAN_STATUS: Record<string, { label: string; color?: string }> = {
  DRAFT: { label: "Nháp" },
  PENDING_APPROVAL: { label: "Chờ duyệt", color: "gold" },
  APPROVED: { label: "Đã duyệt", color: "green" },
  REJECTED: { label: "Bị từ chối", color: "red" },
};

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;
const parseMoney = (value?: string) => Number(String(value || "").replace(/[^\d.-]/g, ""));

export function PaymentPlanDrawer({ request, mode, onClose }: { request: PaymentPlanRequest | null; mode: PaymentPlanDrawerMode; onClose: () => void }) {
  const bankAccountsQuery = useBankAccountsOptions();
  const savePlan = useSavePaymentPlan();
  const planAction = usePaymentPlanAction();
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [linking, setLinking] = useState<Row | null>(null);
  const disbursementLink = usePlanDisbursementLink();

  const companyAccounts = useMemo<BankAccountOption[]>(
    () => (bankAccountsQuery.data ?? []).filter((account: BankAccountOption) => account.isActive !== false),
    [bankAccountsQuery.data],
  );
  const supplierAccounts = request?.purchaseOrder.supplier.bankAccounts ?? [];
  const editable = mode === "edit";
  const total = Number(request?.amountVnd ?? 0);

  /* Gắn / gỡ dòng giải ngân không đổi phiên bản kế hoạch, nên theo dõi riêng để bảng cập nhật. */
  const disbursementSignature = (request?.plan?.lines ?? []).map((line) => line.disbursementTransaction?.id ?? "").join("|");

  /* Mở drawer: nạp kế hoạch đang có; chưa có thì gợi ý một đợt trả đủ về tài khoản mặc định của NCC. */
  useEffect(() => {
    if (!request) return;
    // Khi duyệt, ô ghi chú là ghi chú của người duyệt chứ không phải ghi chú kế hoạch.
    setNote(mode === "edit" ? request.plan?.note ?? "" : "");
    setRejecting(false);
    setRejectReason("");
    const accounts = request.purchaseOrder.supplier.bankAccounts;
    if (request.plan?.lines.length) {
      setRows(
        request.plan.lines.map((line) => ({
          key: line.id,
          id: line.id,
          plannedDate: dayjs(line.plannedDate),
          amountVnd: Number(line.amountVnd),
          method: line.method,
          senderBank: line.bankAccount?.bankCode,
          bankAccountId: line.bankAccountId,
          receiverBank: accounts.find((account) => account.id === line.beneficiaryBankAccountId)?.bankName ?? line.beneficiaryBankName ?? undefined,
          beneficiaryBankAccountId: line.beneficiaryBankAccountId ?? undefined,
          lenderBankName: line.lenderBankName ?? undefined,
          creditFacilityRef: line.creditFacilityRef ?? undefined,
          paidAmount: Number(line.paidAmount ?? 0),
          batchNo: line.batchItems?.[0]?.batch.batchNo,
          disbursement: line.disbursementTransaction,
        })),
      );
      return;
    }
    const receiver = accounts.find((account) => account.id === request.beneficiaryBankAccountId) ?? accounts[0];
    setRows([
      {
        key: newKey(),
        plannedDate: request.paymentDeadline ? dayjs(request.paymentDeadline) : dayjs(),
        amountVnd: Number(request.amountVnd),
        method: "TRANSFER",
        receiverBank: receiver?.bankName,
        beneficiaryBankAccountId: receiver?.id,
        paidAmount: 0,
      },
    ]);
    // Chỉ nạp lại khi đổi đề nghị hoặc kế hoạch đổi phiên bản / trạng thái — danh sách tự tải lại
    // giữa chừng không được xóa các dòng đang nhập dở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, request?.plan?.version, request?.plan?.status, mode, disbursementSignature]);

  const planned = rows.reduce((sum, row) => sum + Number(row.amountVnd ?? 0), 0);
  const difference = total - planned;

  const patch = (key: string, changes: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((current) => [
      ...current,
      {
        key: newKey(),
        plannedDate: last?.plannedDate ?? dayjs(),
        amountVnd: difference > 0 ? difference : null,
        method: "TRANSFER",
        receiverBank: last?.receiverBank,
        beneficiaryBankAccountId: last?.beneficiaryBankAccountId,
        paidAmount: 0,
      },
    ]);
  };

  const senderBankOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const account of companyAccounts) if (!names.has(account.bankCode)) names.set(account.bankCode, account.bankName ? `${account.bankCode} · ${account.bankName}` : account.bankCode);
    return [...names].map(([value, label]) => ({ value, label }));
  }, [companyAccounts]);
  const receiverBankOptions = useMemo(() => [...new Set(supplierAccounts.map((account) => account.bankName))].map((value) => ({ value, label: value })), [supplierAccounts]);

  const buildPayload = (): SavePaymentPlanPayload | null => {
    for (const [index, row] of rows.entries()) {
      const label = `Đợt ${index + 1}`;
      if (!row.plannedDate) return fail(`${label}: chưa chọn ngày dự kiến`);
      if (!row.amountVnd || row.amountVnd <= 0) return fail(`${label}: chưa nhập số tiền`);
      if (row.amountVnd < row.paidAmount) return fail(`${label}: số tiền không được nhỏ hơn số đã chi (${formatMoney(row.paidAmount)} đ)`);
      if (!row.beneficiaryBankAccountId) return fail(`${label}: chưa chọn tài khoản người nhận`);
      if (!row.bankAccountId) return fail(`${label}: chưa chọn tài khoản chuyển`);
      if (row.method === "DISBURSEMENT" && !row.lenderBankName?.trim()) return fail(`${label}: giải ngân cần ngân hàng cho vay`);
    }
    if (Math.round(difference) !== 0) return fail(`Tổng các đợt phải bằng số tiền đề nghị (đang lệch ${formatMoney(difference)} đ)`);
    return {
      note: note.trim() || undefined,
      lines: rows.map((row) => ({
        id: row.id,
        plannedDate: row.plannedDate!.format("YYYY-MM-DD"),
        amountVnd: row.amountVnd!,
        method: row.method,
        bankAccountId: row.bankAccountId!,
        beneficiaryBankAccountId: row.beneficiaryBankAccountId!,
        lenderBankName: row.method === "DISBURSEMENT" ? row.lenderBankName?.trim() : undefined,
        creditFacilityRef: row.method === "DISBURSEMENT" ? row.creditFacilityRef?.trim() || undefined : undefined,
      })),
    };
  };
  const fail = (message: string) => {
    notify.error(message);
    return null;
  };

  const save = async (submit: boolean) => {
    if (!request) return;
    const data = buildPayload();
    if (!data) return;
    await savePlan.mutateAsync({ requestId: request.id, data });
    if (submit) {
      await planAction.mutateAsync({ requestId: request.id, action: "submit" });
      notify.success("Đã gửi kế hoạch thanh toán cho giám đốc duyệt");
    } else {
      notify.success("Đã lưu nháp kế hoạch thanh toán");
    }
    onClose();
  };
  const approve = async () => {
    if (!request) return;
    await planAction.mutateAsync({ requestId: request.id, action: "approve", data: { note: note.trim() || undefined } });
    notify.success("Đã duyệt đề nghị và kế hoạch thanh toán");
    onClose();
  };
  const reject = async () => {
    if (!request) return;
    if (rejectReason.trim().length < 3) return void notify.error("Nhập lý do từ chối");
    await planAction.mutateAsync({ requestId: request.id, action: "reject", data: { reason: rejectReason.trim() } });
    notify.success("Đã từ chối, mua hàng và ngân hàng sẽ nhận thông báo");
    onClose();
  };

  const busy = savePlan.isPending || planAction.isPending;
  const canLinkDisbursement = mode === "view" && request?.plan?.status === "APPROVED" && rows.some((row) => row.method === "DISBURSEMENT");
  const columns: ColumnsType<Row> = [
    { title: "Đợt", key: "index", width: 46, align: "center", render: (_, __, index) => index + 1 },
    {
      title: "Ngày dự kiến", key: "plannedDate", width: 128,
      render: (_, row) => editable
        ? <DatePicker size="small" allowClear={false} format="DD/MM/YYYY" value={row.plannedDate} onChange={(value) => patch(row.key, { plannedDate: value })} style={{ width: "100%" }} />
        : dateText(row.plannedDate?.toISOString()),
    },
    {
      title: "Số tiền", key: "amountVnd", width: 150, align: "right",
      render: (_, row) => (
        <div>
          {editable
            ? <InputNumber size="small" min={0} precision={0} disabled={Boolean(row.batchNo)} value={row.amountVnd} onChange={(value) => patch(row.key, { amountVnd: value })} formatter={(value) => (value == null || `${value}` === "" ? "" : formatMoney(value))} parser={parseMoney} style={{ width: "100%" }} />
            : <span className="data-grid-num">{formatMoney(row.amountVnd)}</span>}
          {row.paidAmount > 0 ? <div className="data-grid-sub">Đã chi {formatMoney(row.paidAmount)}</div> : null}
          {row.batchNo ? <div className="data-grid-sub">Bảng kê {row.batchNo}</div> : null}
        </div>
      ),
    },
    {
      title: "Kiểu", key: "method", width: 170,
      render: (_, row) => {
        if (!editable) return row.method === "DISBURSEMENT" ? `Giải ngân · ${row.lenderBankName ?? ""}` : "Chuyển khoản";
        return (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            {/* Đợt đã có lần chi thì khóa kiểu và tài khoản chuyển, chỉ còn sửa được ngày và số tiền. */}
            <Select size="small" disabled={isLocked(row)} value={row.method} options={METHOD_OPTIONS} onChange={(method) => patch(row.key, { method })} style={{ width: "100%" }} />
            {row.method === "DISBURSEMENT" ? (
              <>
                <Input size="small" value={row.lenderBankName} placeholder="Ngân hàng cho vay" onChange={(event) => patch(row.key, { lenderBankName: event.target.value })} />
                <Input size="small" value={row.creditFacilityRef} placeholder="Khế ước / HĐ tín dụng" onChange={(event) => patch(row.key, { creditFacilityRef: event.target.value })} />
              </>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "Ngân hàng chuyển", key: "sender", width: 230,
      render: (_, row) => {
        const account = companyAccounts.find((item) => item.id === row.bankAccountId);
        if (!editable) return account ? <div>{account.bankCode}<div className="data-grid-sub">{account.accountNo}</div></div> : "—";
        return (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Select size="small" showSearch optionFilterProp="label" disabled={isLocked(row)} placeholder="Chọn ngân hàng" value={row.senderBank} options={senderBankOptions} onChange={(senderBank) => patch(row.key, { senderBank, bankAccountId: undefined })} style={{ width: "100%" }} />
            <Select
              size="small" showSearch optionFilterProp="label" disabled={isLocked(row) || !row.senderBank} placeholder="Chọn số tài khoản" value={row.bankAccountId}
              options={companyAccounts.filter((item) => item.bankCode === row.senderBank).map((item) => ({ value: item.id, label: `${item.accountNo}${item.accountName ? ` — ${item.accountName}` : ""}` }))}
              onChange={(bankAccountId) => patch(row.key, { bankAccountId })} style={{ width: "100%" }}
            />
          </Space>
        );
      },
    },
    {
      title: "Ngân hàng người nhận", key: "receiver", width: 230,
      render: (_, row) => {
        const account = supplierAccounts.find((item) => item.id === row.beneficiaryBankAccountId);
        if (!editable) return account ? <div>{account.bankName}<div className="data-grid-sub">{account.accountNo} · {account.accountName}</div></div> : row.receiverBank ?? "—";
        return (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Select size="small" showSearch optionFilterProp="label" disabled={Boolean(row.batchNo)} placeholder="Chọn ngân hàng" value={row.receiverBank} options={receiverBankOptions} onChange={(receiverBank) => patch(row.key, { receiverBank, beneficiaryBankAccountId: undefined })} style={{ width: "100%" }} />
            <Select
              size="small" showSearch optionFilterProp="label" disabled={Boolean(row.batchNo) || !row.receiverBank} placeholder="Chọn số tài khoản" value={row.beneficiaryBankAccountId}
              options={supplierAccounts.filter((item) => item.bankName === row.receiverBank).map((item) => ({ value: item.id, label: `${item.accountNo} — ${item.accountName}` }))}
              onChange={(beneficiaryBankAccountId) => patch(row.key, { beneficiaryBankAccountId })} style={{ width: "100%" }}
            />
          </Space>
        );
      },
    },
    /* Giải ngân về tài khoản công ty có hai dòng sao kê: tiền ra ghép với lần chi / bảng kê như
       chuyển khoản, còn tiền vào (khoản vay) gắn với đợt ở cột này. */
    ...(canLinkDisbursement
      ? [{
          title: "Tiền vào giải ngân", key: "disbursement", width: 190,
          render: (_: unknown, row: Row) => {
            if (row.method !== "DISBURSEMENT" || !row.id) return "—";
            if (row.disbursement) {
              return (
                <div>
                  {dateText(row.disbursement.txnDate)} · {formatMoney(row.disbursement.amount)}
                  <div><Button size="small" type="link" danger style={{ padding: 0 }} loading={disbursementLink.isPending} onClick={() => disbursementLink.mutate({ lineId: row.id! })}>Gỡ</Button></div>
                </div>
              );
            }
            return <Button size="small" onClick={() => setLinking(row)}>Gắn dòng sao kê</Button>;
          },
        }]
      : []),
    ...(editable
      ? [{
          title: "", key: "remove", width: 40, align: "center" as const,
          render: (_: unknown, row: Row) => (
            <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Xóa đợt" disabled={rows.length === 1 || isLocked(row)} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} />
          ),
        }]
      : []),
  ];

  const footer = mode === "edit" ? (
    <Space>
      <Button size="small" onClick={onClose}>Đóng</Button>
      <Button size="small" loading={busy} onClick={() => save(false)}>Lưu nháp</Button>
      <Button size="small" type="primary" loading={busy} onClick={() => save(true)}>Lưu và gửi duyệt</Button>
    </Space>
  ) : mode === "review" ? (
    <Space>
      <Button size="small" onClick={onClose}>Đóng</Button>
      <Button size="small" danger loading={busy} onClick={() => setRejecting(true)}>Từ chối</Button>
      <Button size="small" type="primary" loading={busy} onClick={approve}>Duyệt</Button>
    </Space>
  ) : (
    <Button size="small" onClick={onClose}>Đóng</Button>
  );

  return (
    <Drawer open={Boolean(request)} onClose={onClose} width={1120} destroyOnClose title={mode === "review" ? "Duyệt đề nghị và kế hoạch thanh toán" : "Kế hoạch thanh toán"} extra={footer}>
      {request ? (
        <>
          <Descriptions size="small" column={3} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Đề nghị">{request.requestNo}</Descriptions.Item>
            <Descriptions.Item label="Đơn hàng">{request.purchaseOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{statusTag(COMMERCIAL_REQUEST_STATUS, request.status)}</Descriptions.Item>
            <Descriptions.Item label="Nhà cung cấp">{request.purchaseOrder.supplier.name}</Descriptions.Item>
            <Descriptions.Item label="Số tiền đề nghị"><b>{formatMoney(request.amountVnd)} đ</b></Descriptions.Item>
            <Descriptions.Item label="Hạn thanh toán">{dateText(request.paymentDeadline)}</Descriptions.Item>
            {request.plan ? (
              <Descriptions.Item label="Kế hoạch">
                <Tag color={PLAN_STATUS[request.plan.status]?.color}>{PLAN_STATUS[request.plan.status]?.label ?? request.plan.status}</Tag>
                {request.plan.version > 1 ? `lần ${request.plan.version}` : null}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          {request.status === "DIRECTOR_REJECTED" && request.approvalNote ? (
            <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Giám đốc đã từ chối" description={request.approvalNote} />
          ) : null}
          {editable && !supplierAccounts.length ? (
            <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Nhà cung cấp chưa có tài khoản ngân hàng" description="Thêm tài khoản ở danh mục nhà cung cấp, hoặc trả đề nghị lại cho mua hàng bổ sung." />
          ) : null}

          <Table<Row> className="data-grid" rowKey="key" size="small" pagination={false} columns={columns} dataSource={rows} scroll={{ x: 1000 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            {editable ? <Button size="small" icon={<PlusOutlined />} onClick={addRow}>Thêm đợt</Button> : <span />}
            <Space size={16}>
              <span>Tổng các đợt: <b>{formatMoney(planned)} đ</b></span>
              {Math.round(difference) !== 0 ? <span style={{ color: "#c0392b" }}>Lệch {formatMoney(difference)} đ so với đề nghị</span> : <span style={{ color: "#1f8a4c" }}>Khớp số tiền đề nghị</span>}
            </Space>
          </div>

          {mode === "review" && request.plan?.note ? (
            <Alert type="info" style={{ marginTop: 12 }} message="Ghi chú của ngân hàng" description={request.plan.note} />
          ) : null}
          {mode !== "view" ? (
            <Input.TextArea style={{ marginTop: 12 }} autoSize={{ minRows: 2, maxRows: 4 }} value={note} onChange={(event) => setNote(event.target.value)} placeholder={editable ? "Ghi chú của ngân hàng cho kế hoạch (không bắt buộc)" : "Ghi chú khi duyệt (không bắt buộc)"} />
          ) : request.plan?.note ? (
            <Alert type="info" style={{ marginTop: 12 }} message="Ghi chú kế hoạch" description={request.plan.note} />
          ) : null}
        </>
      ) : null}

      <Modal className="banking-modal" open={rejecting} title="Từ chối đề nghị thanh toán" okText="Từ chối" okButtonProps={{ danger: true }} cancelText="Đóng" confirmLoading={busy} onCancel={() => setRejecting(false)} onOk={reject} width={460}>
        <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Lý do từ chối — mua hàng và ngân hàng đều nhận được thông báo này" />
      </Modal>
      {linking?.id && linking.bankAccountId ? (
        <DisbursementPicker
          bankAccountId={linking.bankAccountId}
          amount={Number(linking.amountVnd ?? 0)}
          loading={disbursementLink.isPending}
          onCancel={() => setLinking(null)}
          onPick={async (bankTransactionId) => {
            await disbursementLink.mutateAsync({ lineId: linking.id!, bankTransactionId });
            notify.success("Đã gắn dòng tiền vào của khoản giải ngân");
            setLinking(null);
          }}
        />
      ) : null}
    </Drawer>
  );
}

/* Chọn dòng tiền vào chưa xử lý trên sao kê của tài khoản nhận giải ngân. Tách riêng để chỉ tải
   sao kê khi người dùng thực sự mở hộp chọn. */
function DisbursementPicker({ bankAccountId, amount, loading, onCancel, onPick }: { bankAccountId: string; amount: number; loading: boolean; onCancel: () => void; onPick: (bankTransactionId: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const query = useBankTransactions({ page: 1, pageSize: 50, bankAccountId, direction: "IN", matchStatus: "UNMATCHED", confirmed: "false", keyword: keyword.trim() || undefined });
  const data = (query.data as any)?.data;
  /* Dòng khớp đúng số tiền của đợt lên đầu. */
  const transactions: BankTransactionItem[] = [...(Array.isArray(data) ? data : [])].sort(
    (a, b) => Number(Number(b.amount) === amount) - Number(Number(a.amount) === amount),
  );
  return (
    <Modal className="banking-modal" open title="Chọn dòng tiền vào của khoản giải ngân" footer={null} onCancel={onCancel} width={760}>
      <Input.Search size="small" allowClear placeholder="Tìm theo nội dung, số tham chiếu" onSearch={setKeyword} style={{ marginBottom: 8 }} />
      <Table<BankTransactionItem>
        className="data-grid" rowKey="id" size="small" loading={query.isLoading || loading} pagination={false} dataSource={transactions} scroll={{ y: 360 }}
        locale={{ emptyText: "Chưa có dòng tiền vào nào chưa xử lý trên sao kê của tài khoản này" }}
        columns={[
          { title: "Ngày", dataIndex: "txnDate", width: 100, render: (value) => dateText(value) },
          { title: "Số tiền", dataIndex: "amount", width: 150, align: "right", render: (value) => <span className="data-grid-num" style={Number(value) === amount ? { color: "#1f8a4c", fontWeight: 600 } : undefined}>{formatMoney(value)}</span> },
          { title: "Nội dung", dataIndex: "description", render: (value) => <span className="data-grid-clip">{value}</span> },
          { title: "", key: "pick", width: 70, align: "right", render: (_, row) => <Button size="small" type="primary" onClick={() => onPick(row.id)}>Chọn</Button> },
        ]}
      />
    </Modal>
  );
}
