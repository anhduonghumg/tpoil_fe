# Mobile UI standard

User-approved reference: **Hàng dự kiến** (`ExpectedInventoryPage`), 20 October 2026.
Apply this pattern whenever creating a screen or modifying an existing mobile screen.

## Shared components

Import from `src/shared/ui/MobileList.tsx`:

- `MobileList`: flat white list with thin row separators.
- `MobileListItem`: bold primary information, optional status, secondary description and an accessible ellipsis button for details. Business actions may be included in its details content with their existing permission and confirmation guards.
- `MobileListValues`: short labelled values, preserving units and full numeric precision.
- `MobileListToolbar`: footer tool buttons, one open tool panel at a time, active indicators, summary and optional pagination. All tools inherit Ant Design size S.
- `MobileActiveFilters`: removable tags for the applied search/filter conditions (`{ key, label, onClear }`, falsy entries are skipped); renders nothing when no condition applies.

Import from `src/shared/ui/mobile.ts`:

- `useIsMobile()`: the only mobile/desktop switch for routes (below 768px, same as Ant Design `md`). Do not use `!Grid.useBreakpoint().md`: it reports mobile on the first desktop render and mounts the mobile list and footer for one frame.
- `mobileListSummary(query, total, filtered)`: footer summary text (`Toàn bộ` / `Kết quả` / `Đang tải…` / `Chưa tải được`).

`MobilePageFooter` mounts the tools in `#app-mobile-footer`, outside the scrolling route content. `AppLayout` owns this slot and safe-area spacing. The header and footer remain stationary while `.app-content` scrolls. Use the footer only in the mobile branch, with one toolbar per page. Switching routes unmounts the previous route's tools automatically. Do not position another fixed footer inside the page or create a second page-wide scroll container.

## Page structure

```tsx
import { MobileActiveFilters, MobileList, MobileListItem, MobileListToolbar, MobileListValues } from "../../shared/ui/MobileList";
import { mobileListSummary, useIsMobile } from "../../shared/ui/mobile";

// Inside the page; query, filters and permissions remain feature-owned.
// const mobile = useIsMobile();
{mobile ? <>
  <MobileActiveFilters items={[keyword ? { key: "keyword", label: `Tìm: ${keyword}`, onClear: clearKeyword } : null]} />
  <MobileList>
    {rows.map((row) => <MobileListItem key={row.id}
      title={row.name} status={renderStatus(row.status)}
      description={<><span>{row.warehouseName}</span><span>{row.dateLabel}</span></>}
      moreLabel={`Thông tin ${row.name}`} details={renderDetails(row)}>
      <MobileListValues items={[{ label: "Số lượng", value: formatQuantity(row) }]} />
    </MobileListItem>)}
  </MobileList>
  <MobileListToolbar openTool={activeTool} onToolChange={setActiveTool}
    tools={[
      { key: "search", label: "Mở tìm kiếm", icon: <SearchOutlined />, content: searchControl, active: Boolean(keyword) },
      { key: "filter", label: "Mở bộ lọc", icon: <FilterOutlined />, content: filterControl, active: hasFilters },
    ]}
    actions={permissionCheckedActions}
    summary={mobileListSummary(query, total, hasFilters)}
    pagination={pagination}
  />
</> : desktopTable}
```

The snippet illustrates layout slots; use the complete query/loading/error handling from `ExpectedInventoryPage`. Controls use `size="small"`, forms use `size="small"`, and modal footer buttons also use small. Search submission, filter changes and clearing filters reset the server page to 1. Close the active tool after applying it. Never filter only the currently loaded page or imply zero results while loading/failed. Show `Toàn bộ` without filters and `Kết quả` when filters apply. Long names, references and quantities must wrap without horizontal page overflow. Do not add empty ellipsis menus or inaccessible icon-only actions.

## Validation

Run frontend build and lint. Check mobile widths 320, 375 and 430px when a browser is available: long labels/quantities, safe area, scrolling to the last record, stationary header/footer, search/filter apply and clear, one panel open at a time, keyboard, paging, permissions, loading and failed refresh. Also check the desktop branch. Report browser verification separately from fixture/render checks; do not claim visual verification from a build alone.
