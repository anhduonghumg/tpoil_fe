// src/shared/hooks/useDrawer.ts
import { useModal } from "./useModal";

export function useDrawer(initial = false) {
  return useModal(initial);
}

export default useDrawer;
