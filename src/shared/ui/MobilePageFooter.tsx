import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Render route tools outside the scrolling content, in the application shell. */
export function MobilePageFooter({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById("app-mobile-footer")); }, []);
  return target ? createPortal(children, target) : null;
}
