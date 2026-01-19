// features/purchases/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { PurchasesApi } from "./api";
import type {
  PriceRegionOption,
  PurchaseOrderListQuery,
  UpsertPurchaseOrderPayload,
} from "./types";

export const usePurchaseOrderList = (params: PurchaseOrderListQuery) =>
  useQuery({
    queryKey: ["purchaseOrders", "list", params],
    queryFn: () => PurchasesApi.listPO(params),
  });

export const usePurchaseOrderDetail = (id?: string) =>
  useQuery({
    queryKey: ["purchaseOrders", "detail", id],
    queryFn: () => PurchasesApi.detailPO(id!),
    enabled: !!id,
  });

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPurchaseOrderPayload) =>
      PurchasesApi.createPO(payload),
    onSuccess: () => {
      message.success("Đã tạo đơn mua hàng");
      qc.invalidateQueries({ queryKey: ["purchaseOrders", "list"] });
    },
  });
};

export const useApprovePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PurchasesApi.approvePO(id),
    onSuccess: (_, id) => {
      message.success("Đã duyệt đơn");
      qc.invalidateQueries({ queryKey: ["purchaseOrders", "detail", id] });
      qc.invalidateQueries({ queryKey: ["purchaseOrders", "list"] });
    },
  });
};

export const usePriceRegionsSelect = (keyword: string) =>
  useQuery<PriceRegionOption[]>({
    queryKey: ["priceRegions", "select", keyword],
    queryFn: () => PurchasesApi.regionsSelect(keyword),
    staleTime: 24 * 60 * 60 * 1000,
  });

export const useCancelPurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchaseOrders", "cancel"],
    mutationFn: (id: string) => PurchasesApi.cancelPO(id),
    onSuccess: async (_res, id) => {
      await qc.invalidateQueries({ queryKey: ["purchaseOrders", "list"] });
      await qc.invalidateQueries({
        queryKey: ["purchaseOrders", "detail", id],
      });
      message.success("Đã huỷ đơn");
    },
    onError: () => message.error("Không huỷ được đơn"),
  });
};
