const LS_KEY = "erp:last-route";
const FALLBACK = "/dashboard";

/**
 * Màn hình cuối cùng người dùng đứng khi còn phiên. Dùng để khi họ gõ thẳng /login
 * trên thanh địa chỉ lúc đang đăng nhập thì quay lại đúng chỗ đang làm dở, thay vì
 * bị ném về dashboard. Lưu ở localStorage để mở tab mới vẫn nhớ.
 */
export function saveLastRoute(path: string) {
  if (!path.startsWith("/") || path.startsWith("/login")) return;
  try {
    localStorage.setItem(LS_KEY, path);
  } catch {}
}

export function loadLastRoute(): string {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw && raw.startsWith("/") && !raw.startsWith("/login")) return raw;
  } catch {}
  return FALLBACK;
}

export function clearLastRoute() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}
