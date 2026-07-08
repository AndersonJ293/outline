import { useEffect, useRef } from "react";
import type { ExtrudeMode } from "../types";

export interface ExtrudePopupState {
  entityId: string;
  screenX: number;
  screenY: number;
  mode: ExtrudeMode;
  height: number;
  thickness: number;
  /// Bumped on every open so the focus effect re-runs even when reopening
  /// on the same profile twice in a row.
  nonce: number;
}

interface ExtrudePopupProps {
  popup: ExtrudePopupState;
  onConfirm: (height: number, thickness?: number) => void;
  onCancel: () => void;
}

export function ExtrudePopup({ popup, onConfirm, onCancel }: ExtrudePopupProps) {
  const heightRef = useRef<HTMLInputElement>(null);
  const thicknessRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    heightRef.current?.focus();
    heightRef.current?.select();
  }, [popup.nonce]);

  const confirm = () => {
    const height = parseFloat(heightRef.current?.value ?? "");
    if (!(height > 0)) return;
    if (popup.mode === "thin") {
      const thickness = parseFloat(thicknessRef.current?.value ?? "");
      if (!(thickness > 0)) return;
      onConfirm(height, thickness);
    } else {
      onConfirm(height);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Enter") return;
    event.stopPropagation();
    confirm();
  };

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
          Height:
        </span>
        <input
          ref={heightRef}
          type="number"
          min={0.1}
          step={0.5}
          defaultValue={popup.height.toFixed(1)}
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
          onKeyDown={onKeyDown}
        />
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>mm</span>
      </div>
      {popup.mode === "thin" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            Wall:
          </span>
          <input
            ref={thicknessRef}
            type="number"
            min={0.1}
            step={0.1}
            defaultValue={popup.thickness.toFixed(1)}
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
            onKeyDown={onKeyDown}
          />
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>mm</span>
        </div>
      )}
      <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
        Enter confirma · Escape cancela
      </span>
    </div>
  );
}
