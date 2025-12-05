// features/customers/ui/CustomerOverviewSidebar.tsx
import { Empty, Spin, Typography, Tag, Divider, Button, Tooltip } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons"; // Thêm icon nếu cần
import { useState } from "react";
import type { CustomerOverview } from "../types";
import { useCustomerOverview } from "../hooks";
import CustomerContractsModal from "./CustomerContractsModal";
import AssignContractsModal from "./AssignContractModal";

const { Text, Link } = Typography;

interface Props {
  customerId?: string | null;
}

export default function CustomerOverviewSidebar({ customerId }: Props) {
  const [contractsOpen, setContractsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading } = useCustomerOverview(customerId || undefined);

  // ===== Style chung cho container căn giữa =====
  const centerStyle: React.CSSProperties = {
    height: "100%",
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (!customerId) {
    return (
      <div style={centerStyle}>
        <Empty
          description="Chọn khách hàng để xem"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div style={centerStyle}>
        <Spin />
      </div>
    );
  }

  const overview = data as CustomerOverview;
  const customer: any = overview.customer;
  const groups = overview.contracts ?? {};

  const totalContracts =
    (groups.active?.length ?? 0) +
    (groups.expired?.length ?? 0) +
    (groups.upcoming?.length ?? 0) +
    (groups.cancelled?.length ?? 0) +
    (groups.terminated?.length ?? 0);

  const salesOwnerName =
    customer.salesOwner?.fullName ?? customer.salesOwnerName ?? "-";
  const accountingOwnerName =
    customer.accountingOwner?.fullName ?? customer.accountingOwnerName ?? "-";
  const paymentTermText =
    typeof customer.paymentTermDays === "number"
      ? `${customer.paymentTermDays} ngày`
      : "-";
  // console.log("Customer overview data:", customer);
  // console.log("account", customer?.owners?.accounting?.fullName);
  // console.log("sale", customer?.owners?.sales?.fullName);
  return (
    <>
      <div
        style={{
          height: "100%",
          padding: "16px 20px",
          overflowY: "auto",
          backgroundColor: "#fff",
        }}
      >
        {/* ===== HEADER: TÊN + CODE ===== */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <div>
              <Text
                strong
                style={{ fontSize: 16, display: "block", lineHeight: 1.4 }}
              >
                {customer.name}
              </Text>
              {customer.code && (
                <Tag
                  color="default"
                  style={{
                    marginTop: 4,
                    border: "none",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  {customer.code}
                </Tag>
              )}
            </div>
            {/* Nút hành động nhanh (Ví dụ: Sửa) - Có thể bỏ nếu không cần */}
            {/* <Button type="text" size="small" icon={<EditOutlined />} /> */}
          </div>
        </div>

        {/* ===== SECTION 1: THÔNG TIN CHÍNH ===== */}
        <SectionTitle>Thông tin chung</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <InfoRow label="MST" value={customer.taxCode} copyable />
          <InfoRow label="Loại KH" value={customer.type} />
          {/* <InfoRow
            label="Trạng thái"
            value={
              customer.status ? (
                <Tag
                  color={customer.status === "ACTIVE" ? "success" : "default"}
                >
                  {customer.status}
                </Tag>
              ) : (
                "-"
              )
            }
          /> */}
          <InfoRow
            label="Hạn mức nợ"
            value={
              customer.creditLimit != null
                ? `${customer.creditLimit.toLocaleString("vi-VN")} đ`
                : "-"
            }
            valueStyle={{ fontWeight: 600 }}
          />
          <InfoRow label="Kỳ thanh toán" value={paymentTermText} />
        </div>

        <StyledDivider />

        {/* ===== SECTION 2: PHỤ TRÁCH ===== */}
        <SectionTitle>Người phụ trách</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <InfoRow
            label="Kế toán"
            value={customer?.owners?.accounting?.fullName}
          />
          <InfoRow label="Sales" value={customer?.owners?.sales?.fullName} />
        </div>

        <StyledDivider />

        {/* ===== SECTION 3: HỢP ĐỒNG (Gọn gàng nhất) ===== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <SectionTitle style={{ marginBottom: 0 }}>Hợp đồng</SectionTitle>
          <Tooltip title="Gán thêm hợp đồng">
            <Button
              type="dashed"
              size="small"
              shape="circle"
              icon={<PlusOutlined />}
              onClick={() => setAssignOpen(true)}
            />
          </Tooltip>
        </div>

        <div
          style={{
            backgroundColor: "#F9FAFB",
            padding: "10px 12px",
            borderRadius: 6,
          }}
        >
          {totalContracts === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <Text type="secondary">Chưa có hợp đồng</Text>
              <Link onClick={() => setAssignOpen(true)}>Gán ngay</Link>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span>
                Tổng số: <b>{totalContracts}</b>
              </span>
              <Link onClick={() => setContractsOpen(true)}>
                Xem chi tiết &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* ===== GHI CHÚ ===== */}
        {customer.note && (
          <>
            <StyledDivider />
            <SectionTitle>Ghi chú</SectionTitle>
            <div
              style={{
                fontSize: 13,
                color: "#4B5563",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                background: "#fff",
                border: "1px dashed #e5e7eb",
                padding: 8,
                borderRadius: 4,
              }}
            >
              {customer.note}
            </div>
          </>
        )}
      </div>

      {/* Modals giữ nguyên */}
      <CustomerContractsModal
        open={contractsOpen}
        onClose={() => setContractsOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
        contractsGroups={overview.contracts}
      />
      <AssignContractsModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
      />
    </>
  );
}

/* ============ SUB-COMPONENTS TINH GỌN ============ */

function StyledDivider() {
  return <Divider style={{ margin: "16px 0", borderColor: "#f0f0f0" }} />;
}

function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        color: "#9CA3AF",
        marginBottom: 8,
        letterSpacing: 0.5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * InfoRow: Hiển thị Label bên trái, Value bên phải trên cùng 1 dòng.
 * Giúp giao diện gọn gàng, giống Property Sheet.
 */
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  valueStyle?: React.CSSProperties;
  copyable?: boolean;
}

function InfoRow({ label, value, valueStyle, copyable }: InfoRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6B7280", flexShrink: 0, marginRight: 16 }}>
        {label}
      </span>
      <div
        style={{
          textAlign: "right",
          color: "#111827",
          flex: 1,
          wordBreak: "break-word",
          ...valueStyle,
        }}
      >
        {value ? (
          copyable ? (
            <Text copyable={{ text: String(value) }}>{value}</Text>
          ) : (
            value
          )
        ) : (
          "-"
        )}
      </div>
    </div>
  );
}
