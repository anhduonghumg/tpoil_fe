import { useSyncExternalStore } from "react";

// Same boundary as Ant Design `md`: below 768px the route renders its mobile branch.
const DESKTOP_QUERY = "(min-width: 768px)";
const desktopMedia = typeof window === "undefined" ? null : window.matchMedia(DESKTOP_QUERY);
const subscribe = (onChange: () => void) => {
  desktopMedia?.addEventListener("change", onChange);
  return () => desktopMedia?.removeEventListener("change", onChange);
};
const getSnapshot = () => !(desktopMedia?.matches ?? true);

/**
 * Mobile branch switch for routes. Unlike `!Grid.useBreakpoint().md`, it is correct on the first
 * render, so desktop never mounts the mobile list and footer for one frame before switching.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

const count = new Intl.NumberFormat("vi-VN");

/** Footer summary: never shows a zero count while the first load is pending or failed. */
export function mobileListSummary(query: { data?: unknown; isPending: boolean }, total: number, filtered: boolean) {
  if (query.data != null) return `${filtered ? "Kết quả" : "Toàn bộ"}: ${count.format(total)}`;
  return query.isPending ? "Đang tải…" : "Chưa tải được";
}
