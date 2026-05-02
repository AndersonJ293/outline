import type { RefObject } from "react";

interface RefScalePopupProps {
  popup: { imageId: string; lengthMm: number; screenX: number; screenY: number };
  inputRef: RefObject<HTMLInputElement>;
  onConfirm: (realLengthMm: number) => void;
  onPointerDown: (event: React.MouseEvent) => void;
}

export function RefScalePopup({
  popup,
  inputRef,
  onConfirm,
  onPointerDown,
}: RefScalePopupProps) {
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
        minWidth: 200,
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={onPointerDown}
    >
      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        Linha: <strong style={{ color: "#ff9800" }}>{popup.lengthMm.toFixed(2)} mm</strong>
      </span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Tamanho real:
        </span>
        <input
          ref={inputRef}
          type="number"
          min={0.1}
          step={0.5}
          defaultValue={popup.lengthMm.toFixed(1)}
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
            if (event.key !== "Enter") return;
            event.stopPropagation();
            const value = parseFloat((event.target as HTMLInputElement).value);
            if (value > 0) {
              onConfirm(value);
            }
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
