import { useEffect, useState } from "react";
import { useAppShortcuts } from "./app/useAppShortcuts";
import { useAppWindow } from "./app/useAppWindow";
import { useBackendStatus } from "./app/useBackendStatus";
import { useCutterActions } from "./app/useCutterActions";
import { useProjectActions } from "./app/useProjectActions";
import Canvas2D from "./components/Canvas2D";
import { InspectorPanel } from "./components/app/InspectorPanel";
import { ModeTabs } from "./components/app/ModeTabs";
import { SketchToolbar } from "./components/app/SketchToolbar";
import { StatusBar } from "./components/app/StatusBar";
import { TopBar } from "./components/app/TopBar";
import Viewport3D from "./components/Viewport3D";
import { useStore } from "./stores/useStore";
import s from "./App.module.css";

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
    previewWireframe,
    setPreviewWireframe,
    addImage,
    updateImage,
    imageRefScaleMode,
    setImageRefScaleMode,
    snapToGrid,
    setSnapToGrid,
  } = useStore();

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [imageLockAspect, setImageLockAspect] = useState(true);
  const backendConnected = useBackendStatus();
  const {
    panelWidth,
    panelCollapsed,
    setPanelCollapsed,
    handleMinimizeWindow,
    handleToggleMaximizeWindow,
    handleCloseWindow,
    handleStartWindowDrag,
    handlePanelResizeStart,
  } = useAppWindow();
  const { saving, handleNewProject, handleSave, handleOpen, handleImportImage } =
    useProjectActions({ project, setProject, addImage, setStatus, setError });
  const { handleGenerateCutter, handleExportStl } = useCutterActions({
    project,
    selectedEntityIds,
    currentMesh,
    wallHeight,
    wallThickness,
    offsetSide,
    setCurrentMesh,
    setViewMode,
    setStatus,
    setError,
  });

  useEffect(() => {
    if (!project) {
      handleNewProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAppShortcuts({
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
    setToolMode,
  });

  const selectedEntity =
    selectedEntityIds.length === 1
      ? project?.sketch.entities.find((entity) => entity.id === selectedEntityIds[0]) ?? null
      : null;

  const selectedImage =
    selectedEntityIds.length === 1
      ? project?.sketch.images?.find((image) => image.id === selectedEntityIds[0]) ?? null
      : null;

  return (
    <div
      className={`${s["app-layout"]} ${panelCollapsed ? s["panel-collapsed"] : ""}`}
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
        snapToGrid={snapToGrid}
        onToolModeChange={setToolMode}
        onImportImage={handleImportImage}
        onClearSelection={() => selectEntity(null)}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        onUndo={undo}
        onRedo={redo}
      />

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

      {errorText && (
        <div className={s["error-toast"]} onClick={() => setError(null)}>
          {errorText}
        </div>
      )}
    </div>
  );
}

export default App;
