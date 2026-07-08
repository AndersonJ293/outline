import { useEffect, useRef } from "react";

export interface OffsetPopupState {
  entityId: string;
  /// Present when reopening an existing offset to edit its distance.
  dimId?: string;
  current: number;
  screenX: number;
  screenY: number;
}

interface OffsetPopupProps {
  popup: OffsetPopupState;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

export function OffsetPopup({ popup, onConfirm, onCancel }: OffsetPopupProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [popup.entityId]);

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
        minWidth: 190,
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Offset:
        </span>
        <input
          ref={inputRef}
          type="number"
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
            const value = parseFloat((event.target as HTMLInputElement).value.replace(",", "."));
            if (Number.isFinite(value) && value !== 0) onConfirm(value);
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
