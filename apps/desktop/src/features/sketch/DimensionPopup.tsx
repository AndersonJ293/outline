import { useEffect, useRef } from "react";

export interface DimensionPopupState {
  dimId: string;
  current: number;
  screenX: number;
  screenY: number;
  label?: string;
}

interface DimensionPopupProps {
  popup: DimensionPopupState;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

export function DimensionPopup({ popup, onConfirm, onCancel }: DimensionPopupProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [popup.dimId]);

  return (
    <div
      style={{
        position: "absolute",
        left: popup.screenX + 16,
        top: popup.screenY - 20,
        background: "#202024",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 12px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        minWidth: 180,
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {popup.label ?? "Comprimento:"}
        </span>
        <input
          ref={inputRef}
          type="number"
          min={0.1}
          step={0.5}
          defaultValue={popup.current.toFixed(1)}
          style={{
            width: 80,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            padding: "3px 6px",
            borderRadius: 4,
            fontSize: 12,
            outline: "none",
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              onCancel();
              return;
            }
            if (event.key !== "Enter") return;
            event.stopPropagation();
            const value = parseFloat((event.target as HTMLInputElement).value);
            if (value > 0) onConfirm(value);
          }}
        />
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>mm</span>
      </div>
      <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
        Enter confirma · Escape cancela
      </span>
    </div>
  );
}
