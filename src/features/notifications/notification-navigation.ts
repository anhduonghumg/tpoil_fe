import type { CommonNotification } from "./types";

export function notificationPath(item: CommonNotification) {
  const salesOrderId = typeof item.metadata?.salesOrderId === "string" ? item.metadata.salesOrderId : null;
  if (item.action === "REVIEW_PURCHASE_PAYMENT") return "/banking/payment-approvals";
  if (item.action === "PROCESS_PURCHASE_PAYMENT") return "/banking/payments";
  if (item.entityType === "COMMERCIAL_PURCHASE" && item.entityId) return `/commercial-purchases/lots/${item.entityId}`;
  if (item.entityType === "COMMERCIAL_PURCHASE_RETAIL" && item.entityId) return `/purchase-orders/${item.entityId}`;
  if (item.entityType === "SALES_ORDER" && item.entityId) return `/sales/orders/${item.entityId}`;
  if (item.entityType === "SALES_ORDER_ADJUSTMENT" && salesOrderId) return `/sales/orders/${salesOrderId}`;
  if (item.entityType === "SALES_DELIVERY") return "/sales/deliveries";
  if (item.entityType === "SALES_WITHDRAWAL") return "/sales/withdrawals";
  if (item.entityType === "SALES_INVOICE") return "/sales/invoices";
  if (item.category === "SALES_RECEIVABLE") return "/sales/receivables";
  if (item.entityType === "PURCHASE_RECEIPT") return "/operations/inventory-receipts";
  return null;
}
