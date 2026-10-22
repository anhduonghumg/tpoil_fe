import React, { useEffect, useState } from "react";
import { Alert, Button, Collapse, Empty, Form, Input, Select, Space, Switch, Tag } from "antd";
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { MobilePageFooter } from "../../../shared/ui/MobilePageFooter";
import type { DraftLine, DraftOrder } from "./QuickEntryPanel";
import "./retail-mobile-entry.css";

type Props = {
  orders: DraftOrder[];
  busy: boolean;
  parsing: boolean;
  text: string;
  onTextChange: (text: string) => void;
  onParse: () => void;
  useAi: boolean;
  onUseAiChange: (value: boolean) => void;
  regionControl: React.ReactNode;
  renderField: (key: string, order: DraftOrder, line?: DraftLine) => React.ReactNode;
  totalOf: (order: DraftOrder) => number;
  onAdd: () => void;
  onAddLine: (key: string) => void;
  onRemoveLine: (orderKey: string, lineKey: string) => void;
  onRemove: (key: string) => void;
  onSave: (order: DraftOrder) => void;
};
const money = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);

/** The mobile editor uses the same field renderers and save workflow as quick entry on desktop. */
export function RetailMobileEntry(props: Props) {
  const [selectedKey, setSelectedKey] = useState<string>();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [lineKey, setLineKey] = useState<string>();
  const [showErrors, setShowErrors] = useState(false);
  const order = props.orders.find((item) => item.key === selectedKey) ?? props.orders.find((item) => item.save.kind !== "SAVED") ?? props.orders[0];
  const saved = order?.save.kind === "SAVED";
  const disabled = props.busy || saved;
  useEffect(() => {
    setShowErrors(false);
    setLineKey(order?.lines[0]?.key);
  }, [order?.key]);
  useEffect(() => {
    if (props.orders.length) setSelectedKey(props.orders[props.orders.length - 1].key);
  }, [props.orders.length]);

  const field = (key: string, label: string, required = false, line?: DraftLine, error?: string) => (
    <Form.Item key={key} label={label} required={required} validateStatus={showErrors && error ? "error" : undefined} help={showErrors ? error : undefined}>
      {order ? props.renderField(key, order, line) : null}
    </Form.Item>
  );
  const remove = () => {
    if (!order || props.busy) return;
    // Confirmation belongs to the page, which retains draft state across tabs.
    props.onRemove(order.key);
  };

  return <div className="retail-mobile-entry">
    <div className="retail-mobile-entry-tools">
      <Button size="small" icon={<ThunderboltOutlined />} disabled={props.busy} onClick={() => setPasteOpen((value) => !value)} aria-expanded={pasteOpen}>Dán tin nhắn</Button>
      {props.orders.length ? <Select size="small" aria-label="Chọn đơn đang nhập" value={order?.key} disabled={props.busy}
        onChange={setSelectedKey} options={props.orders.map((item, index) => ({ value: item.key, label: `${item.save.kind === "SAVED" ? "✓ " : ""}${item.save.kind === "SAVED" ? item.save.orderNo ?? `Đơn ${index + 1}` : `Đơn ${index + 1}`} · ${item.customerCode ?? (item.customerPartyId ? "Đã chọn khách" : "Chưa chọn khách")}` }))} /> : null}
    </div>
    {pasteOpen ? <section className="retail-mobile-paste" aria-label="Đọc tin nhắn đặt hàng">
      <Input.TextArea size="small" aria-label="Nội dung đơn từ tin nhắn" value={props.text} disabled={props.busy} onChange={(event) => props.onTextChange(event.target.value)}
        autoSize={{ minRows: 4, maxRows: 8 }} placeholder={"Dán tin nhắn khách tại đây.\nKiểm tra lại thông tin trước khi lưu."} />
      <Space wrap size={8}><Switch size="small" checked={props.useAi} disabled={props.busy} onChange={props.onUseAiChange} /><span>Dùng AI khi mẫu còn thiếu</span></Space>
      <Button size="small" type="primary" loading={props.parsing} disabled={props.busy || !props.text.trim()} onClick={props.onParse}>Đọc và kiểm tra đơn</Button>
    </section> : null}
    {!order ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Thêm đơn để nhập tay hoặc dán tin nhắn khách.">
      <Button size="small" type="primary" icon={<PlusOutlined />} disabled={props.busy} onClick={props.onAdd}>Thêm đơn lẻ</Button>
    </Empty> : <>
      <div className="retail-mobile-order-heading"><strong>{order.save.kind === "SAVED" ? order.save.orderNo ?? "Đơn đã lưu" : "Thông tin đơn"}</strong>
        <Tag color={saved ? "green" : order.save.kind === "FAILED" ? "red" : "blue"}>{saved ? "Đã lưu" : order.save.kind === "FAILED" ? "Lưu chưa thành công" : "Chưa lưu"}</Tag>
      </div>
      <Form layout="vertical" size="small" component="div">
        {field("customer", "Khách hàng", true, undefined, !order.customerPartyId ? "Chọn khách hàng" : undefined)}
        <div className="retail-mobile-two-fields">{field("orderDate", "Ngày đặt", true)}{field("kind", "Loại đơn", true)}</div>
        <div className="retail-mobile-two-fields">
          {field("plate", "Biển số xe", true, undefined, !order.plate.trim() ? "Nhập biển số xe" : undefined)}
          {field("driver", "Lái xe", true, undefined, !order.driver.trim() ? "Nhập tên lái xe" : undefined)}
        </div>
        <Form.Item label="Vùng giá">{props.regionControl}</Form.Item>
        <div className="retail-mobile-order-heading"><strong>Mặt hàng ({order.lines.length})</strong><Button size="small" disabled={disabled} icon={<PlusOutlined />} onClick={() => {
          props.onAddLine(order.key); setLineKey("__new__");
        }}>Thêm hàng</Button></div>
        <Collapse ghost activeKey={lineKey === "__new__" ? order.lines[order.lines.length - 1]?.key : lineKey ?? order.lines[0]?.key}
          onChange={(keys) => setLineKey(Array.isArray(keys) ? keys[keys.length - 1] ?? "" : keys)} accordion
          items={order.lines.map((line, index) => ({ key: line.key,
            label: <span className="retail-mobile-line-title">{line.productCode ?? line.productRawText ?? `Mặt hàng ${index + 1}`}</span>,
            children: <div className="retail-mobile-line-fields">
              {field("product", "Mặt hàng", true, line, !line.productId ? "Chọn mặt hàng" : undefined)}
              {field("warehouse", "Kho nhận", true, line, !line.warehouseId ? "Chọn kho cụ thể" : undefined)}
              <div className="retail-mobile-two-fields">
                {field("quantity", "Số lượng", true, line, !line.quantity || line.quantity <= 0 ? "Số lượng phải lớn hơn 0" : undefined)}
                {field("unitPrice", "Đơn giá", false, line)}
              </div>
              <div className="retail-mobile-two-fields">{field("supplySource", "Nguồn hàng", false, line)}{field("transportFeeUnitPrice", "Phí vận chuyển / đơn vị", false, line)}</div>
              <div className="retail-mobile-line-total">Thành tiền <strong>{money(Number(line.quantity ?? 0) * (Number(line.unitPrice ?? 0) - Number(line.discountBaseAmount ?? 0) - Number(line.discountAdjustmentAmount ?? 0) + Number(line.transportFeeUnitPrice ?? 0)))} đ</strong></div>
              <Button size="small" type="text" danger disabled={disabled} icon={<DeleteOutlined />} onClick={() => props.onRemoveLine(order.key, line.key)}>Xóa dòng hàng</Button>
            </div>,
          }))} />
      </Form>
      {order.save.kind === "FAILED" ? <Alert type="error" showIcon message="Chưa lưu được đơn" description={order.save.message} /> : null}
      {order.save.kind === "SAVED" ? <Alert type={order.save.violations.length ? "warning" : "success"} showIcon message={`Đã lưu ${order.save.orderNo ?? "đơn"}`}
        description={[...order.save.violations, ...order.save.warnings].join(" · ") || "Bạn có thể theo dõi đơn trong danh sách."} /> : null}
      <Button size="small" type="text" danger disabled={props.busy} onClick={remove}>{saved ? "Dọn đơn đã lưu" : "Bỏ đơn đang nhập"}</Button>
    </>}
    <MobilePageFooter>
      <div className="retail-mobile-footer-total"><span>{order ? `Tổng đơn${saved ? " đã lưu" : ""}` : "Đơn lẻ"}</span><strong>{order ? `${money(props.totalOf(order))} đ` : `${props.orders.length} đơn`}</strong></div>
      <div className="retail-mobile-footer-actions">
        <Button size="small" icon={<PlusOutlined />} disabled={props.busy} onClick={props.onAdd}>Thêm đơn</Button>
        <Button size="small" type="primary" loading={props.busy && !props.parsing} disabled={!order || saved || props.busy} onClick={() => {
          if (!order) return; setShowErrors(true);
          const invalidLine = order.lines.find((line) => !line.productId || !line.warehouseId || !line.quantity || line.quantity <= 0);
          if (invalidLine) setLineKey(invalidLine.key);
          props.onSave(order);
        }}>Lưu đơn</Button>
      </div>
    </MobilePageFooter>
  </div>;
}
