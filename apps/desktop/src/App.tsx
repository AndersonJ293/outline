import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Canvas2D from "./components/Canvas2D";
import Viewport3D from "./components/Viewport3D";
import { InspectorPanel } from "./components/app/InspectorPanel";
import { ModeTabs } from "./components/app/ModeTabs";
import { SketchToolbar } from "./components/app/SketchToolbar";
import { StatusBar } from "./components/app/StatusBar";
import { TopBar } from "./components/app/TopBar";
import { useStore } from "./stores/useStore";
import * as commands from "./commands";
import { generateId } from "./types";
import type { Operation, SketchImage } from "./types";

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
      <TopBar
        backendConnected={backendConnected}
        fileMenuOpen={fileMenuOpen}
        saving={saving}
        hasProject={Boolean(project)}
        onStartWindowDrag={handleStartWindowDrag}
        onToggleFileMenu={() => setFileMenuOpen((open) => !open)}
        onNewProject={() => {
          setFileMenuOpen(false);
          void handleNewProject();
        }}
        onOpenProject={() => {
          setFileMenuOpen(false);
          handleOpen();
        }}
        onSaveProject={() => {
          setFileMenuOpen(false);
          handleSave();
        }}
        onMinimizeWindow={handleMinimizeWindow}
        onToggleMaximizeWindow={handleToggleMaximizeWindow}
        onCloseWindow={handleCloseWindow}
      />

      <ModeTabs viewMode={viewMode} onChange={setViewMode} />

      <SketchToolbar
        viewMode={viewMode}
        toolMode={toolMode}
        onToolModeChange={setToolMode}
        onImportImage={handleImportImage}
        onClearSelection={() => selectEntity(null)}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Viewport */}
      <div style={{ gridRow: 3, gridColumn: 2, position: "relative", overflow: "hidden" }}>
        {viewMode === "sketch" ? <Canvas2D /> : <Viewport3D />}

        <StatusBar project={project} statusText={statusText} errorText={errorText} />
      </div>

      <InspectorPanel
        project={project}
        selectedEntityIds={selectedEntityIds}
        selectedEntity={selectedEntity}
        selectedImage={selectedImage}
        currentMesh={currentMesh}
        panelCollapsed={panelCollapsed}
        imageLockAspect={imageLockAspect}
        imageRefScaleMode={imageRefScaleMode}
        wallHeight={wallHeight}
        wallThickness={wallThickness}
        offsetSide={offsetSide}
        previewWireframe={previewWireframe}
        onTogglePanel={() => setPanelCollapsed((collapsed) => !collapsed)}
        onResizeStart={handlePanelResizeStart}
        onSelectEntity={selectEntity}
        onRemoveSelected={removeSelectedEntities}
        onUpdateImage={updateImage}
        onToggleImageLockAspect={() => setImageLockAspect((locked) => !locked)}
        onSetImageRefScaleMode={setImageRefScaleMode}
        onSetWallHeight={setWallHeight}
        onSetWallThickness={setWallThickness}
        onSetOffsetSide={setOffsetSide}
        onGenerateCutter={handleGenerateCutter}
        onSetPreviewWireframe={setPreviewWireframe}
        onExportStl={handleExportStl}
      />

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
