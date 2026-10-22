import React from "react";
import type { UnissuedInvoiceSource } from "../types";
import { InvoiceIssueWorkspace } from "./InvoiceIssueWorkspace";
export function IssueFromSourceModal({ row, open, onClose }: { row?: UnissuedInvoiceSource; open: boolean; onClose: () => void }) {
  return row && open ? <InvoiceIssueWorkspace key={row.id} row={row} onClose={onClose} /> : null;
}
