import React, { useEffect, useMemo, useState } from "react";
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { SupplierLocationsApi } from "../../supplierLocations/api";
import { notify } from "../../../shared/lib/notification";
import { useCreateLotWithdrawal } from "../hooks";
import type {
  CommercialLotOrderLine,
  CommercialLotPurchase,
} from "../types";
import { formatQty } from "./labels";

type Props = {
  open: boolean;
  order: CommercialLotPurchase;
  onClose: () => void;
};

type FormValues = {
  withdrawalNo: string;
  withdrawalDate: dayjs.Dayjs;
  note?: string;
};

export default function LotWithdrawalModal({
  open,
  order,
  onClose,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const createMutation = useCreateLotWithdrawal(order.id);
  const warehousesQuery = useQuery({
    queryKey: ["supplier-locations", "active", "lot-withdrawal"],
    queryFn: () =>
      SupplierLocationsApi.list({
        isActive: true,
        page: 1,
        pageSize: 100,
      }),
    enabled: open,
  });

  const withdrawableLines = useMemo(
    () =>
      order.lines.filter((line) => {
        const position = line.commercialLotPosition;
        return (
          position &&
          Number(position.invoicedQty) - Number(position.withdrawnQty) > 0
        );
      }),
    [order.lines],
  );

  useEffect(() => {
    if (!open) return;
    setQuantities({});
    setDestinations(
      Object.fromEntries(
        withdrawableLines.flatMap((line) => {
          const positionId = line.commercialLotPosition?.id;
          const warehouseId = line.receivingWarehouse?.id;
          return positionId && warehouseId ? [[positionId, warehouseId]] : [];
        }),
      ),
    );
    form.setFieldsValue({
      withdrawalNo: `RUT-${dayjs().format("YYYYMMDD-HHmm")}`,
      withdrawalDate: dayjs(),
      note: "",
    });
  }, [form, open, withdrawableLines]);

  const warehouseOptionsFor = (line: CommercialLotOrderLine) => {
    const plannedWarehouseId = line.receivingWarehouse?.id;
    const plannedAreaId = line.plannedReceivingArea?.id;
    return (warehousesQuery.data?.items ?? [])
      .filter((warehouse) => {
        if (plannedWarehouseId) return warehouse.id === plannedWarehouseId;
        return !plannedAreaId || warehouse.areaId === plannedAreaId;
      })
      .map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.code} - ${warehouse.name}`,
      }));
  };

  const columns: ColumnsType<CommercialLotOrderLine> = [
    {
      title: "Mặt hàng",
      dataIndex: "product",
      render: (product) =>
        product ? `${product.code} - ${product.name}` : "-",
    },
    {
      title: "Kho dự kiến",
      dataIndex: "receivingWarehouse",
      width: 155,
      render: (warehouse) => warehouse?.name ?? "-",
    },
    {
      title: "Kho nhận thực tế",
      width: 200,
      render: (_, line) => {
        const positionId = line.commercialLotPosition!.id;
        return (
          <Select
            showSearch
            optionFilterProp="label"
            loading={warehousesQuery.isFetching}
            value={destinations[positionId]}
            placeholder="Chọn kho nhận"
            options={warehouseOptionsFor(line)}
            onChange={(value) =>
              setDestinations((current) => ({ ...current, [positionId]: value }))
            }
          />
        );
      },
    },
    {
      title: "Đã hóa đơn",
      width: 110,
      align: "right",
      render: (_, line) =>
        formatQty(line.commercialLotPosition?.invoicedQty),
    },
    {
      title: "Đã rút",
      width: 90,
      align: "right",
      render: (_, line) =>
        formatQty(line.commercialLotPosition?.withdrawnQty),
    },
    {
      title: "Còn lại",
      width: 100,
      align: "right",
      render: (_, line) => {
        const position = line.commercialLotPosition;
        return formatQty(
          Number(position?.invoicedQty ?? 0) -
            Number(position?.withdrawnQty ?? 0),
        );
      },
    },
    {
      title: "Số lượng rút",
      width: 140,
      render: (_, line) => {
        const position = line.commercialLotPosition!;
        const max =
          Number(position.invoicedQty) - Number(position.withdrawnQty);
        return (
          <InputNumber
            min={0}
            max={max}
            precision={3}
            controls={false}
            value={quantities[position.id]}
            placeholder="0"
            onChange={(value) =>
              setQuantities((current) => ({
                ...current,
                [position.id]: Number(value ?? 0),
              }))
            }
          />
        );
      },
    },
  ];

  const submit = async () => {
    const values = await form.validateFields();
    const lines = withdrawableLines
      .map((line) => {
        const positionId = line.commercialLotPosition!.id;
        return {
          commercialLotPositionId: positionId,
          destinationWarehouseId: destinations[positionId],
          actualQty: Number(quantities[positionId] ?? 0),
        };
      })
      .filter((line) => line.actualQty > 0);
    if (!lines.length) {
      notify.error("Nhập số lượng cần rút cho ít nhất một mặt hàng");
      return;
    }
    if (lines.some((line) => !line.destinationWarehouseId)) {
      notify.error("Chọn kho nhận thực tế cho từng mặt hàng cần rút");
      return;
    }
    await createMutation.mutateAsync({
      withdrawalNo: values.withdrawalNo.trim(),
      withdrawalDate: values.withdrawalDate.toISOString(),
      note: values.note?.trim(),
      lines,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Tạo phiếu rút lô"
      width={1120}
      okText="Lưu phiếu nháp"
      cancelText="Đóng"
      confirmLoading={createMutation.isPending}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
    >
      <Form<FormValues> form={form} layout="vertical">
        <div className="commercial-lot-withdrawal-form">
          <Form.Item
            name="withdrawalNo"
            label="Số phiếu rút"
            rules={[{ required: true, message: "Nhập số phiếu rút" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="withdrawalDate"
            label="Ngày rút"
            rules={[{ required: true, message: "Chọn ngày rút" }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </div>
      </Form>
      <Typography.Title level={5}>Số lượng rút</Typography.Title>
      <Table<CommercialLotOrderLine>
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={withdrawableLines}
        className="commercial-lot-table commercial-lot-withdrawal-table"
        scroll={{ x: 1080, y: 300 }}
      />
    </Modal>
  );
}
