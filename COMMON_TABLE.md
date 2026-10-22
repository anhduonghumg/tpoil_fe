# Common tables

`src/shared/ui/CommonTable.tsx` extends Ant Design Table and reuses `data-grid.css`. First adopter: `/sales/invoices`, both invoice records and unissued sources.

## Column widths

Pass a stable `tableKey` per screen and data schema (invoice records and unissued sources use separate keys). Give columns stable `key` or `dataIndex` and numeric default widths. Drag a header's right edge; keyboard users can focus the separator and use Left/Right. Double-click the separator or press Home to restore one column; **Khôi phục cột** restores all defaults. Widths are clamped and stored locally per key. Invalid/unavailable browser storage never blocks rendering. Named numeric columns are resizable; narrow icon columns retain their compact default. Horizontal scroll width follows the resized columns.

## Header filters

Pass `columnTools: Record<columnKey, {label, active, render(close)}>` for supported columns. Use `TextColumnFilter`, `DateColumnFilter`, `NumberColumnFilter` or existing selectors in `render`. Each feature owns applied state, removable tags, reset and query parameters. Applying/clearing a condition resets server page to 1; call `close()` after applying. Multiple columns combine with AND. `CommonTable` only displays controls and active indicators; it deliberately does not filter server-paginated rows locally.

Sales invoices support: order/request reference, order date range, customer, product code, total-payment range, accountant, invoice number/internal reference and status (status is the selected tab). Unissued sources share applicable filters; invoice number/status filters are not offered for records that do not yet have an invoice. The quantity, tax and unit-price columns currently have no filter because their multi-line meanings need a separate business definition. Invoice counts use the same applicable filters. Cancelled-draft visibility and issuance rules remain in the service.

Use `MobileList` and `MobileListToolbar` on phones. Expose the same applied filter state in the footer, preserving active tags. Do not show a desktop table with cramped header tools as the mobile default.

## Adoption

Import the common component in each existing table before expecting shared behavior. Existing direct imports of Ant Design Table only inherit shared CSS, not resize/filter logic. Migrate other screens incrementally, binding filters to their APIs. Keep specialized editable grids and grouped reports compatible with their workflows.

## Verification

Check dragging and fixed columns, keyboard resizing, persisted widths on reopen and reset, malformed browser storage, combined header filters across page 2+, clear/reset, date and amount boundaries, query errors, and mobile footer controls. Build/render fixtures do not replace live browser verification.
