import { useCallback, useState } from "react";

interface UseModalReturn {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  setOpen: (v: boolean) => void;
}

export function useModal(initial = false): UseModalReturn {
  const [open, setOpen] = useState(initial);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  const toggleModal = useCallback(() => setOpen((prev) => !prev), []);

  return {
    open,
    openModal,
    closeModal,
    toggleModal,
    setOpen,
  };
}

export default useModal;
