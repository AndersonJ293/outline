import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Canvas2D from "./components/Canvas2D";
import Viewport3D from "./components/Viewport3D";
import { useStore } from "./stores/useStore";
import * as commands from "./commands";
import { generateId } from "./types";
import type { Entity, Operation, Mesh, SketchImage } from "./types";

function formatProjectDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeFileName(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "") || "cortador";
}

function App() {
  const {
    project,
    setProject,
    toolMode,
    setToolMode,
    viewMode,
    setViewMode,
    selectedEntityIds,
    selectEntity,
    removeSelectedEntities,
    currentMesh,
    setCurrentMesh,
    wallHeight,
    setWallHeight,
    wallThickness,
    setWallThickness,
    offsetSide,
    setOffsetSide,
    statusText,
    setStatus,
    errorText,
    setError,
    undo,
    redo,
    pushUndo,
    previewWireframe,
    setPreviewWireframe,
    addImage,
    updateImage,
    imageRefScaleMode,
    setImageRefScaleMode,
  } = useStore();

  const [saving, setSaving] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [imageLockAspect, setImageLockAspect] = useState(true);
  const [panelWidth, setPanelWidth] = useState(260);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const panelResizeStart = useRef<{ x: number; width: number } | null>(null);

  const appWindow = getCurrentWindow();

  const handleMinimizeWindow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void appWindow.minimize();
  }, [appWindow]);

  const handleToggleMaximizeWindow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void appWindow.toggleMaximize();
  }, [appWindow]);

  const handleCloseWindow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void appWindow.close();
  }, [appWindow]);

  const handleStartWindowDrag = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    if (event.button !== 0) return;
    void appWindow.startDragging();
  }, [appWindow]);

  const handlePanelResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    panelResizeStart.current = { x: event.clientX, width: panelWidth };
  }, [panelWidth]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!panelResizeStart.current) return;
      const delta = panelResizeStart.current.x - event.clientX;
      setPanelWidth(Math.min(420, Math.max(220, panelResizeStart.current.width + delta)));
    };

    const handleUp = () => {
      panelResizeStart.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  // Verifica conexão com backend Rust
  useEffect(() => {
    commands
      .ping()
      .then((res) => {
        if (res === "pong") setBackendConnected(true);
      })
      .catch(() => setBackendConnected(false));
  }, []);

  // Cria projeto automaticamente na inicialização
  useEffect(() => {
    if (!project) {
      handleNewProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Novo projeto
  const handleNewProject = useCallback(async () => {
    const name = `Cortador ${formatProjectDate()}`;
    try {
      const proj = await commands.newProject(name);
      setProject(proj);
      setStatus(`Novo projeto: "${name}"`);
      setError(null);
    } catch (err) {
      setError(`Erro ao criar projeto: ${err}`);
    }
  }, [setProject, setStatus, setError]);

  // Salvar projeto
  const handleSave = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const fileName = `${safeFileName(project.project_name)}.cortacad`;
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "CortaCAD", extensions: ["cortacad"] }],
      });
      if (!filePath) { setSaving(false); return; }
      const json = JSON.stringify(project, null, 2);
      await commands.saveFile(filePath, json);
      setStatus(`Projeto salvo: "${filePath}"`);
    } catch (err) {
      setError(`Erro ao salvar: ${err}`);
    } finally {
      setSaving(false);
    }
  }, [project, setStatus, setError]);

  // Abrir projeto
  const handleOpen = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "CortaCAD", extensions: ["cortacad"] }],
      });
      if (!selected) return;
      const path = selected as string;
      const text = await commands.readFile(path);
      const proj = JSON.parse(text);
      setProject(proj);
      setStatus(`Projeto aberto: "${path}"`);
      setError(null);
    } catch (err) {
      setError(`Erro ao abrir projeto: ${err}`);
    }
  }, [setProject, setStatus, setError]);

  // Importar imagem
  const handleImportImage = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Imagens", extensions: ["png", "jpg", "jpeg"] }],
      });
      if (!selected) return;
      const path = selected as string;
      const dataUrl = await commands.readImageBase64(path);

      const el = new window.Image();
      await new Promise<void>((resolve, reject) => {
        el.onload = () => resolve();
        el.onerror = () => reject(new Error("Falha ao carregar imagem"));
        el.src = dataUrl;
      });

      const maxDim = 100;
      const w = el.naturalWidth;
      const h = el.naturalHeight;
      let widthMm: number, heightMm: number;
      if (w > h) { widthMm = maxDim; heightMm = (h / w) * maxDim; }
      else { heightMm = maxDim; widthMm = (w / h) * maxDim; }

      const image: SketchImage = {
        id: generateId(),
        type: "image",
        x: 0,
        y: 0,
        widthMm,
        heightMm,
        source: dataUrl,
        rotation: 0,
        mirrorX: false,
        mirrorY: false,
        opacity: 0.4,
      };
      addImage(image);
      setStatus(`Imagem importada: ${Math.round(widthMm)} x ${Math.round(heightMm)} mm`);
      setError(null);
    } catch (err) {
      setError(`Erro ao importar imagem: ${err}`);
    }
  }, [addImage, setStatus, setError]);
  const handleGenerateCutter = useCallback(async () => {
    if (!project) {
      setError("Crie um projeto primeiro.");
      return;
    }

    const entity = project.sketch.entities.find(
      (e) => e.id === selectedEntityIds[0],
    );
    if (!entity) {
      setError("Selecione um contorno fechado.");
      return;
    }

    if (!entity.closed) {
      setError("O contorno precisa estar fechado.");
      return;
    }

    const operation: Operation = {
      id: generateId(),
      type: "cookie_cutter_wall",
      source_entity_id: entity.id,
      height_mm: wallHeight,
      wall_thickness_mm: wallThickness,
      offset_side: offsetSide,
    };

    try {
      const result = await commands.generateWallMesh(entity, operation);
      if (result.ok && result.mesh) {
        setCurrentMesh(result.mesh);
        setViewMode("solid");
        setStatus(
          `Cortador gerado: ${result.mesh.vertices.length} vértices, ${result.mesh.triangles.length} triângulos`,
        );
        setError(null);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(`Erro ao gerar cortador: ${err}`);
    }
  }, [
    project,
    selectedEntityIds,
    wallHeight,
    wallThickness,
    offsetSide,
    setCurrentMesh,
    setViewMode,
    setStatus,
    setError,
  ]);

  // Export STL
  const handleExportStl = useCallback(async () => {
    if (!currentMesh) {
      setError("Gere um cortador primeiro.");
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const fileName = `${safeFileName(project?.project_name ?? "cortador")}.stl`;
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "STL", extensions: ["stl"] }],
      });
      if (!filePath) return;
      const result = await commands.exportStl(currentMesh, filePath);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(`Erro ao exportar STL: ${err}`);
    }
  }, [currentMesh, project, setStatus, setError]);

  // Delete key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEntityIds.length > 0 && project) {
          removeSelectedEntities();
          setStatus(`${selectedEntityIds.length} entidade(s) removida(s)`);
        }
      }
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
        setStatus("Desfazer");
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
        setStatus("Refazer");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void handleNewProject();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpen();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        selectEntity(null);
      }
      if (e.ctrlKey && e.key === "1") { e.preventDefault(); setViewMode("sketch"); }
      if (e.ctrlKey && e.key === "2") { e.preventDefault(); setViewMode("solid"); }
      if (e.ctrlKey && e.key === "3") { e.preventDefault(); setViewMode("export"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedEntityIds,
    project,
    removeSelectedEntities,
    undo,
    redo,
    handleNewProject,
    handleOpen,
    handleSave,
    selectEntity,
    setStatus,
    setViewMode,
  ]);

  // Primeira entidade selecionada (para exibir props / gerar cortador)
  const selectedEntity =
    selectedEntityIds.length === 1
      ? project?.sketch.entities.find((e) => e.id === selectedEntityIds[0]) ?? null
      : null;

  const selectedImage =
    selectedEntityIds.length === 1
      ? project?.sketch.images?.find((i) => i.id === selectedEntityIds[0]) ?? null
      : null;

  return (
    <div
      className={`app-layout ${panelCollapsed ? "panel-collapsed" : ""}`}
      style={{
        gridTemplateColumns: `var(--toolbar-width) 1fr ${panelCollapsed ? 32 : panelWidth}px`,
        gridTemplateRows: `var(--topbar-height) var(--tab-height) 1fr`,
      }}
    >
      {/* Topbar */}
      <div className="topbar" onMouseDown={handleStartWindowDrag}>
        <span className="topbar-title">CortaCAD</span>
        <div className="file-menu" data-no-drag>
          <button
            className={`topbar-btn ${fileMenuOpen ? "active" : ""}`}
            onClick={() => setFileMenuOpen((open) => !open)}
          >
            Arquivo
          </button>
          {fileMenuOpen && (
            <div className="file-menu-popover">
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  void handleNewProject();
                }}
              >
                <span>Novo</span>
                <kbd>Ctrl+N</kbd>
              </button>
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  handleOpen();
                }}
              >
                <span>Abrir</span>
                <kbd>Ctrl+O</kbd>
              </button>
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  handleSave();
                }}
                disabled={!project || saving}
              >
                <span>Salvar</span>
                <kbd>Ctrl+S</kbd>
              </button>
            </div>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ flex: 1 }} />
        {!backendConnected && (
          <span style={{ color: "var(--warning)", fontSize: 11 }}>
            Backend offline
          </span>
        )}
        <div className="window-controls" data-no-drag>
          <button
            className="window-control-btn"
            onClick={handleMinimizeWindow}
            tabIndex={-1}
            title="Minimizar"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            className="window-control-btn"
            onClick={handleToggleMaximizeWindow}
            tabIndex={-1}
            title="Maximizar"
          >
            <span aria-hidden="true">□</span>
          </button>
          <button
            className="window-control-btn close"
            onClick={handleCloseWindow}
            tabIndex={-1}
            title="Fechar"
          >
            <span className="close-icon" aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {/* Abas de modo */}
      <div className="mode-tabs">
        <button
          className={`mode-tab ${viewMode === "sketch" ? "active" : ""}`}
          onClick={() => setViewMode("sketch")}
        >
          Sketch
        </button>
        <button
          className={`mode-tab ${viewMode === "solid" ? "active" : ""}`}
          onClick={() => setViewMode("solid")}
        >
          Solid
        </button>
        <button
          className={`mode-tab ${viewMode === "export" ? "active" : ""}`}
          onClick={() => setViewMode("export")}
        >
          Export
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        {viewMode === "sketch" && (
          <>
            <button
              className={`toolbar-btn ${toolMode === "select" ? "active" : ""}`}
              onClick={() => setToolMode("select")}
              title="Selecionar (V)"
            >
              ➤
            </button>
            <button
              className={`toolbar-btn ${toolMode === "polyline" ? "active" : ""}`}
              onClick={() => setToolMode("polyline")}
              title="Polyline (P)"
            >
              ✎
            </button>
            <button
              className={`toolbar-btn ${toolMode === "rectangle" ? "active" : ""}`}
              onClick={() => setToolMode("rectangle")}
              title="Retangulo (R)"
            >
              ▭
            </button>
            <div className="toolbar-divider" />
            <button
              className="toolbar-btn"
              onClick={handleImportImage}
              title="Importar imagem"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
                <circle cx="5.5" cy="6" r="1.5" />
                <path d="M1.5 11.5l3.5-3.5 2.5 2.5 2-2 3.5 3" />
              </svg>
            </button>
            <button
              className="toolbar-btn"
              onClick={() => selectEntity(null)}
              title="Cancelar selecao"
            >
              ✕
            </button>
          </>
        )}
        <div className="toolbar-spacer" />
        <button className="toolbar-btn" onClick={undo} title="Desfazer (Ctrl+Z)">
          ↩
        </button>
        <button className="toolbar-btn" onClick={redo} title="Refazer (Ctrl+Y)">
          ↪
        </button>
      </div>

      {/* Viewport */}
      <div style={{ gridRow: 3, gridColumn: 2, position: "relative", overflow: "hidden" }}>
        {viewMode === "sketch" ? <Canvas2D /> : <Viewport3D />}

        {/* Status bar */}
        <div className="status-bar">
          <span>
            {project
              ? `${project.project_name} | ${project.sketch.entities.length} entidades`
              : "Sem projeto"}
          </span>
          <span>{statusText}</span>
          {errorText && <span className="error">{errorText}</span>}
        </div>
      </div>

      {/* Painel lateral (so aparece quando algo selecionado) */}
      {(selectedEntityIds.length > 0 || currentMesh) && (
      <div className="panel-shell">
        <button
          className="panel-toggle"
          onClick={() => setPanelCollapsed((collapsed) => !collapsed)}
          title={panelCollapsed ? "Mostrar painel" : "Recolher painel"}
        >
          {panelCollapsed ? "‹" : "›"}
        </button>
        {!panelCollapsed && (
          <div
            className="panel-resizer"
            onMouseDown={handlePanelResizeStart}
            title="Redimensionar painel"
          />
        )}
      <div className="panel">

        {/* Seção: Entidades */}
        <div className="panel-section">
          <h3>
            Entidades
            {selectedEntityIds.length > 1 && (
              <span className="panel-badge">{selectedEntityIds.length} selecionadas</span>
            )}
          </h3>
          {project && project.sketch.entities.length > 0 ? (
            <div className="entities-list">
              {project.sketch.entities.map((entity) => (
                <div
                  key={entity.id}
                  className={`entities-list-item ${selectedEntityIds.includes(entity.id) ? "selected" : ""}`}
                  onClick={() => selectEntity(entity.id)}
                >
                  <span>
                    {entity.type} ({entity.points.length} pts)
                    {entity.closed ? " 🔒" : ""}
                  </span>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectEntity(entity.id, false);
                      removeSelectedEntities();
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              Use a polyline ou retângulo para desenhar.
            </p>
          )}
        </div>

        {/* Seção: Propriedades (entidade poligonal) */}
        {selectedEntity && (
          <div className="panel-section">
            <h3>Propriedades</h3>
            <div className="panel-field">
              <label>Tipo</label>
              <input value={selectedEntity.type} readOnly />
            </div>
            <div className="panel-field">
              <label>Pontos</label>
              <input value={`${selectedEntity.points.length}`} readOnly />
            </div>
            <div className="panel-field">
              <label>Fechado</label>
              <input value={selectedEntity.closed ? "Sim" : "Não"} readOnly />
            </div>
          </div>
        )}

        {/* Seção: Propriedades da imagem */}
        {selectedImage && (
          <div className="panel-section">
            <h3>Imagem</h3>
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
              <div className="panel-field" style={{ flex: 1 }}>
                <label>Largura (mm)</label>
                <input
                  type="number"
                  min={1}
                  value={Math.round(selectedImage.widthMm * 10) / 10}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    if (imageLockAspect) {
                      const ratio = selectedImage.heightMm / selectedImage.widthMm;
                      updateImage(selectedImage.id, { widthMm: v, heightMm: v * ratio });
                    } else {
                      updateImage(selectedImage.id, { widthMm: v });
                    }
                  }}
                />
              </div>
              <button
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  color: imageLockAspect ? "var(--accent)" : "var(--text-secondary)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "4px 6px",
                  marginTop: 14,
                  lineHeight: 1,
                }}
                onClick={() => setImageLockAspect(!imageLockAspect)}
                title={imageLockAspect ? "Proporção travada" : "Proporção livre"}
              >
                {imageLockAspect ? "🔗" : "⛓️"}
              </button>
              <div className="panel-field" style={{ flex: 1 }}>
                <label>Altura (mm)</label>
                <input
                  type="number"
                  min={1}
                  value={Math.round(selectedImage.heightMm * 10) / 10}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    if (imageLockAspect) {
                      const ratio = selectedImage.widthMm / selectedImage.heightMm;
                      updateImage(selectedImage.id, { heightMm: v, widthMm: v * ratio });
                    } else {
                      updateImage(selectedImage.id, { heightMm: v });
                    }
                  }}
                />
              </div>
            </div>
            <div className="panel-field">
              <label>Opacidade</label>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={selectedImage.opacity}
                onChange={(e) => updateImage(selectedImage.id, { opacity: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {Math.round(selectedImage.opacity * 100)}%
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="panel-btn-sm"
                onClick={() => updateImage(selectedImage.id, { mirrorX: !selectedImage.mirrorX })}
              >
                {selectedImage.mirrorX ? "↔ Espelhado X" : "↔ Espelhar X"}
              </button>
              <button
                className="panel-btn-sm"
                onClick={() => updateImage(selectedImage.id, { mirrorY: !selectedImage.mirrorY })}
              >
                {selectedImage.mirrorY ? "↕ Espelhado Y" : "↕ Espelhar Y"}
              </button>
            </div>
            <button
              className={`panel-btn-sm ${imageRefScaleMode ? "active" : ""}`}
              onClick={() => setImageRefScaleMode(!imageRefScaleMode)}
            >
              {imageRefScaleMode ? "Cancelar escala" : "Escala por referência"}
            </button>
            <button
              className="panel-btn-sm"
              onClick={() => removeSelectedEntities()}
            >
              Remover imagem
            </button>
          </div>
        )}

        {/* Seção: Gerar cortador */}
        <div className="panel-section">
          <h3>Cortador</h3>
          <div className="panel-field">
            <label>Altura (mm)</label>
            <input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={wallHeight}
              onChange={(e) => setWallHeight(Number(e.target.value))}
            />
          </div>
          <div className="panel-field">
            <label>Espessura da parede (mm)</label>
            <input
              type="number"
              min={0.4}
              max={10}
              step={0.1}
              value={wallThickness}
              onChange={(e) => setWallThickness(Number(e.target.value))}
            />
          </div>
          <div className="panel-field">
            <label>Lado do offset</label>
            <select
              value={offsetSide}
              onChange={(e) =>
                setOffsetSide(e.target.value as "center" | "inside" | "outside")
              }
            >
              <option value="center">Centralizado</option>
              <option value="inside">Interno</option>
              <option value="outside">Externo</option>
            </select>
          </div>
          <button
            className="panel-btn"
            onClick={handleGenerateCutter}
            disabled={!selectedEntity || !selectedEntity.closed}
          >
            Gerar Cortador
          </button>
        </div>

        {/* Seção: Mesh */}
        {currentMesh && (
          <div className="panel-section">
            <h3>Malha</h3>
            <div className="panel-field">
              <label>Vértices</label>
              <input value={`${currentMesh.vertices.length}`} readOnly />
            </div>
            <div className="panel-field">
              <label>Triângulos</label>
              <input value={`${currentMesh.triangles.length}`} readOnly />
            </div>
            <label className="panel-checkbox">
              <input
                type="checkbox"
                checked={previewWireframe}
                onChange={(e) => setPreviewWireframe(e.target.checked)}
              />
              Wireframe
            </label>
            <button className="panel-btn" onClick={handleExportStl}>
              Exportar STL
            </button>
      </div>
      )}
      </div>
      </div>
      )}

      {/* Error toast */}
      {errorText && (
        <div className="error-toast" onClick={() => setError(null)}>
          {errorText}
        </div>
      )}
    </div>
  );
}

export default App;
