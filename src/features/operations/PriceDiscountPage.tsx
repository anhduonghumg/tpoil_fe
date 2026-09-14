import React, { useCallback, useMemo } from "react";
import { Tabs, Typography } from "antd";
import { useSearchParams } from "react-router-dom";
import { PriceBulletinsPage } from "../price-bulletins/page/PriceBulletinsPage";
import DiscountBoardPage from "../sales/page/DiscountBoardPage";
// Tab "Giá bán" mượn kiểu lưới .sales-grid cho giống các bảng khác của bán hàng.
import "../sales/sales.css";

/**
 * Gộp "Bảng giá bán" và "Thông báo chiết khấu" về một màn của vận hành.
 *
 * Hai bảng vẫn giữ nguyên cấu trúc cũ, chỉ tách thành hai tab để người dùng
 * không phải nhảy qua lại hai mục menu khi ra giá cho cùng một ngày.
 * Tab đang mở nằm ở query `?tab=` để copy link gửi nhau vẫn vào đúng chỗ.
 */
const TAB_KEYS = ["price", "discount"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function PriceDiscountPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeKey = useMemo<TabKey>(() => {
    const raw = searchParams.get("tab") as TabKey | null;
    return raw && TAB_KEYS.includes(raw) ? raw : "price";
  }, [searchParams]);

  const onChange = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
        Giá bán &amp; chiết khấu
      </Typography.Title>

      <Tabs
        activeKey={activeKey}
        onChange={onChange}
        items={[
          {
            key: "price",
            label: "Giá bán",
            children: <PriceBulletinsPage />,
          },
          {
            key: "discount",
            label: "Chiết khấu",
            children: <DiscountBoardPage embedded />,
          },
        ]}
      />
    </div>
  );
}
