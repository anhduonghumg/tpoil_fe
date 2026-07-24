import type { SupplierLocation, WarehouseRentalContract } from "./types";
import { toAbsUrl } from "../../shared/lib/url";

export type WarehouseRentalContractState = "not-applicable" | "missing" | "active" | "expiring" | "expired";

export function getWarehouseRentalContractStatus(warehouse: SupplierLocation): {
  state: WarehouseRentalContractState;
  contract?: WarehouseRentalContract;
} {
  if (warehouse.warehouseType !== "THIRD_PARTY") return { state: "not-applicable" };

  const now = new Date();
  const currentContracts = (warehouse.rentalContracts ?? [])
    .filter((contract) => contract.status === "Active" && new Date(contract.startDate) <= now && new Date(contract.endDate) >= now)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const current = currentContracts[0];
  if (current) {
    const daysRemaining = Math.ceil((new Date(current.endDate).getTime() - now.getTime()) / 86_400_000);
    return { state: daysRemaining <= 30 ? "expiring" : "active", contract: current };
  }

  const latest = [...(warehouse.rentalContracts ?? [])]
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
  if (latest && new Date(latest.endDate) < now) return { state: "expired", contract: latest };
  return { state: "missing", contract: latest };
}

export function getContractFileUrl(contract?: WarehouseRentalContract) {
  const file = contract?.attachments?.find((item) => item.category === "ScanSigned" && (item.fileUrl || item.externalUrl))
    ?? contract?.attachments?.find((item) => item.fileUrl || item.externalUrl);
  return toAbsUrl(file?.fileUrl || file?.externalUrl);
}
