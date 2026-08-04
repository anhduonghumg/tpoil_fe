# Nợ kỹ thuật - Mua thương mại lẻ & Đơn đặt hàng kinh doanh

Ghi chú các mục còn thừa / chưa hoàn thiện phát sinh khi làm luồng mua thương mại lẻ:
tab đơn khách đặt -> đơn mua -> hóa đơn -> thanh toán -> kho nhập tồn -> so sánh lãi lỗ.

Ngày ghi: 2026-08-02

---

## 0. Đã dọn (2026-08-02)

Sau khi trang chi tiết mới `RetailPurchaseDetailPage` thay thế trang cũ, đã xóa các file không
còn ai tham chiếu:

- `src/features/purchases/page/PurchaseOrderDetailPage.tsx` (trang chi tiết cũ)
- `src/features/purchases/ui/PurchaseOrderUpsertOverlay.tsx` (popup tạo đơn cũ)
- `src/features/purchases/ui/PurchaseOrderFilters.tsx` (bộ lọc cũ, đã thay bằng toolbar kiểu đơn lô)
- `src/features/purchases/ui/po/` (`PaymentPlanEditor`, `PurchaseOrderLinesEditor` - chỉ overlay cũ dùng)

---

## 1. Cần dọn - thừa do đổi hướng thiết kế

Ban đầu làm nhầm chiều "tạo đơn mua trước rồi sinh đơn bán". Quy trình chốt lại là
**kinh doanh đặt hàng trước, mua hàng tiếp nhận rồi sinh đơn mua**. Những thứ sau còn sót lại
của chiều cũ, xóa được mà không ảnh hưởng dữ liệu (chỉ là code + 1 endpoint):

| Mục | Vị trí | Ghi chú |
|---|---|---|
| Endpoint `POST /sales-orders/from-purchase-order/:purchaseOrderId` | backend `modules/sales/sales-orders.controller.ts` + `.service.ts` | Chiều ngược, không còn trong quy trình |
| DTO `CreateSalesOrderFromPurchaseDto` | backend `modules/sales/dto/sales-order.dto.ts` | Chỉ phục vụ endpoint trên |
| Ô "Khách hàng đặt (kinh doanh)" | `src/features/purchases/page/RetailPurchaseCreatePage.tsx` | Khách hàng đã có sẵn ở đơn đặt hàng |
| Nút "Tạo đơn đặt hàng" | `src/features/sales/ui/SalesOrderLinkCard.tsx` | Cùng lý do |
| `SalesOrdersApi.createFromPurchaseOrder` + hook `useCreateSalesOrderFromPurchase` | `src/features/sales/api.ts`, `hooks.ts` | Cùng lý do |

**Không có cột database nào thừa** - đã kiểm tra bằng `information_schema`, toàn bộ cột đang
dùng hoặc sẽ dùng.

---

## 2. Đã lưu nhưng chưa hiển thị

`SalesOrderLine.vehiclePlate` và `SalesOrderLine.driverName` hiện **chỉ ghi vào, chưa đọc ra ở
đâu**. Đã chốt giữ dạng **text tự do** (khớp đặc tả `backend/prisma/docs/sales-internal-workflow.md`,
ví dụ `Xe: 34C-118.23 / Lái xe: Nguyễn Đình Cường`).

Cần nối vào UI:
- Hiển thị ở bảng "Đơn khách đặt" (`src/features/sales/ui/SalesOrdersPendingPanel.tsx`)
- Điền sẵn khi mua hàng lập đề nghị nhập kho

Trùng khái niệm cần biết: `GoodsReceipt` đã có `vehicleId` / `driverId` trỏ tới danh mục
`Vehicle` / `Driver` (hai bảng này bắt buộc `supplierCustomerId`, tức xe của nhà cung cấp).
Đơn đặt hàng dùng text vì lúc kinh doanh đặt thì chưa biết nhà cung cấp. Chấp nhận tồn tại
song song, chưa gộp.

---

## 3. Bẫy hạ tầng cần biết

### 3.1. KHÔNG chạy `prisma migrate dev` trên DB này

Bảng `session` do `express-session` tự tạo, nằm ngoài lịch sử migration của Prisma. Vì vậy
`prisma migrate dev` phát hiện drift và **đòi reset toàn bộ schema - mất sạch dữ liệu**.

Cách áp migration an toàn:

```bash
# 1. Tắt backend trước (tiến trình giữ file query engine, gây lỗi EPERM)
npx prisma generate
npx prisma migrate deploy   # chỉ chạy migration chưa áp, không bao giờ reset
```

Nên xử lý dứt điểm bằng cách thêm một migration khai báo bảng `session` để khớp lịch sử.

### 3.2. Module mới phải đăng ký vào `web-app.module.ts`

`main.ts` bootstrap `WebModule` (từ `src/web-app.module.ts`), **không dùng `AppModule`**
(`src/app.module.ts`). Đăng ký nhầm vào `AppModule` thì route không tồn tại, trả 404 rất khó
đoán nguyên nhân.

`AppModule` hiện không runtime nào dùng - nên cân nhắc xóa để tránh lặp lại lỗi này.

### 3.3. Không chạy `npm run start:all` khi đang watch

Ba tiến trình `nest start --watch` cùng xóa/ghi thư mục `dist` gây `EPERM: rmdir` và chết cả
ba. Chạy từng cái ở terminal riêng, hoặc build một lần rồi chạy bản `:prod`.

### 3.4. Worker phải chạy thì thông báo mới tới

`NotificationOutboxProcessor` chỉ hoạt động khi `APP_TYPE=worker`. Chạy mỗi `start:web` thì
nghiệp vụ vẫn đúng nhưng thông báo nằm chờ trong bảng outbox, chuông không nhảy.

---

## 4. Quy ước thông báo

Không loại người thao tác (`excludeUserIds`) với sự kiện **bàn giao việc giữa hai bộ phận** -
ví dụ `sales.order.requested` gửi cho nhóm quyền `purchases.*`. Lý do: người kiêm nhiệm hai vai
(rất phổ biến ở đội nhỏ, và luôn đúng khi test) sẽ không bao giờ nhận được việc.

Vẫn giữ loại trừ với sự kiện kiểu "ai đó vừa duyệt đơn của bạn".

---

## 5. CSS dùng chung

`src/features/commercial-lots/commercial-lots.css` hiện được cả màn mua lẻ import
(`PurchaseOrdersPage.tsx`, `RetailPurchaseCreatePage.tsx`). Nó không còn là style riêng của mua
lô nữa - nên tách ra `shared/` và đổi tiền tố class cho đúng nghĩa.

---

## 6. Còn phải làm

- [ ] Trang chi tiết đơn lẻ dựng lại theo khuôn đơn lô: Steps vòng đời + 5 tab
      (Hàng hóa / Hóa đơn & công nợ / Đề nghị thanh toán / Đề nghị nhập hàng / So sánh lãi lỗ)
- [ ] Backend trả `lifecycle` + `quantities` + `payment` cho đơn lẻ, dùng chung logic với đơn lô
- [ ] Tab so sánh lãi lỗ: doanh thu (đơn bán) vs giá vốn (đơn mua), tính **chưa VAT**
- [ ] Bước "tiếp nhận" đơn của kinh doanh: chuyển `SalesOrder.status` DRAFT -> CONFIRMED khi mua
      hàng bấm tạo đơn mua (không cần cột mới)
- [ ] Đối chiếu với `backend/prisma/docs/sales-internal-workflow.md` - đặc tả bán hàng đã có sẵn
      705 dòng, gồm ba loại đơn (lấy 1 lần / lấy nhiều lần / đơn kho)
