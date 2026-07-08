import { useEffect } from "react";

type UseOperationDeleteShortcutArgs = {
  active: boolean;
  selectedOperationId: string | null;
  removeOperation: (id: string) => void;
  setStatus: (text: string) => void;
};

export function useOperationDeleteShortcut({
  active,
  selectedOperationId,
  removeOperation,
  setStatus,
}: UseOperationDeleteShortcutArgs) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const focused = document.activeElement;
      if (
        focused instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName)
      ) {
        return;
      }
      if (!selectedOperationId) return;
      event.preventDefault();
      removeOperation(selectedOperationId);
      setStatus("Operation removed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, selectedOperationId, removeOperation, setStatus]);
}
