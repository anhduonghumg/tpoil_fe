// features/customers/ui/CustomerOverviewSidebar.tsx
import { Card, Descriptions, Empty, Spin, Typography } from "antd";
import { useState } from "react";
import type {
  CustomerOverview,
  CustomerContractOverviewItem,
  AssignableContract,
} from "../types";
import { useCustomerOverview } from "../hooks";
import CustomerContractsBlock from "./CustomerContractsBlock";
import AssignContractModal from "./AssignContractModal";

const { Text } = Typography;

interface CustomerOverviewSidebarProps {
  customerId?: string | null;
}

export default function CustomerOverviewSidebar({
  customerId,
}: CustomerOverviewSidebarProps) {
  const { data, isLoading } = useCustomerOverview(customerId || undefined);
  const [assignOpen, setAssignOpen] = useState(false);

  if (!customerId) {
    return (
      <div
        style={{
          height: "100%",
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Empty description="Chọn một khách hàng để xem chi tiết" />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        style={{
          height: "100%",
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin />
      </div>
    );
  }

  const overview: CustomerOverview = data;
  const customer = overview.customer;
  const contracts: CustomerContractOverviewItem[] = Array.isArray(
    overview.contracts
  )
    ? overview.contracts
    : [];

  // TODO: sau này thay mock này bằng hook từ module Contracts (HĐ chưa gán customerId)
  const mockUnassignedContracts: AssignableContract[] = [];

  return (
    <>
      <div style={{ height: "100%", padding: 12, overflow: "auto" }}>
        <Card
          size="small"
          style={{ padding: 12 }}
          title={
            <div>
              <Text strong>{customer.name}</Text>
              <div>
                <Text type="secondary">{customer.code}</Text>
              </div>
            </div>
          }
        >
          {/* THÔNG TIN CUSTOMER CƠ BẢN */}
          <Descriptions
            size="small"
            column={1}
            colon={false}
            labelStyle={{ width: 110 }}
          >
            <Descriptions.Item label="MST">
              {customer.taxCode || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Loại">
              {customer.type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {customer.status || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Hạn mức">
              {customer.creditLimit
                ? customer.creditLimit.toLocaleString("vi-VN")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Kỳ thanh toán">
              {typeof customer.paymentTermDays === "number"
                ? `${customer.paymentTermDays} ngày`
                : "-"}
            </Descriptions.Item>
          </Descriptions>

          {customer.note && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Ghi chú
              </Text>
              <div style={{ fontSize: 12, marginTop: 4 }}>{customer.note}</div>
            </div>
          )}

          {/* BLOCK HỢP ĐỒNG ĐÃ GÁN */}
          <CustomerContractsBlock
            contracts={contracts}
            onOpenAssignModal={() => setAssignOpen(true)}
          />
        </Card>
      </div>

      {/* MODAL GÁN HỢP ĐỒNG CÓ SẴN */} 
      <AssignContractModal
        open={assignOpen}
        customerName={customer.name}
        contracts={mockUnassignedContracts}
        loading={false}
        multiple
        onClose={() => setAssignOpen(false)}
        onConfirm={(selectedIds) => {
          // TODO: sau này gọi API gán HĐ:
          // POST /customers/:id/contracts/assign { contractIds: selectedIds }
          // console.log("Assign contracts", {
          //   customerId,
          //   contractIds: selectedIds,
          // });
          setAssignOpen(false);
        }}
      />
    </>
  );
}
