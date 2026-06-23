import { useEffect, useState } from "react";
import { useAppShortcuts } from "./app/useAppShortcuts";
import { useAppWindow } from "./app/useAppWindow";
import { useBackendStatus } from "./app/useBackendStatus";
import { useExportActions } from "./app/useExportActions";
import { useProjectActions } from "./app/useProjectActions";
import { useRebuildEffect } from "./app/useRebuildEffect";
import UnifiedViewport from "./components/UnifiedViewport";
import { InspectorPanel } from "./components/app/InspectorPanel";
import { ModelToolbar } from "./components/app/ModelToolbar";
import { SketchToolbar } from "./components/app/SketchToolbar";
import { StatusBar } from "./components/app/StatusBar";
import { TopBar } from "./components/app/TopBar";
import { useStore } from "./stores/useStore";
import s from "./App.module.css";

function App() {
  const {
    project,
    setProject,
    toolMode,
    setToolMode,
    tool3DMode,
    setTool3DMode,
    extrudeMode,
    setExtrudeMode,
    selectedEntityIds,
    selectedVertices,
    selectEntity,
    removeSelectedEntities,
    removeSelectedVertices,
    bodies,
    bodyErrors,
    setBodies,
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
    updateImageCommitted,
    imageRefScaleMode,
    setImageRefScaleMode,
    editingImageId,
    setEditingImageId,
    entityDragTarget,
    setEntityDragTarget,
    snapToGrid,
    setSnapToGrid,
    isSketching,
    setIsSketching,
    workingPlane,
    setWorkingPlane,
    faceSelectionActive,
    setFaceSelectionActive,
    planePickerActive,
    setPlanePickerActive,
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
  const { handleExportStl } = useExportActions({
    project,
    bodies,
    setStatus,
    setError,
  });

  useRebuildEffect(project, setBodies);

  useEffect(() => {
    if (!project) {
      handleNewProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAppShortcuts({
    selectedEntityIds,
    selectedVertices,
    project,
    isSketching,
    removeSelectedEntities,
    removeSelectedVertices,
    undo,
    redo,
    handleNewProject,
    handleOpen,
    handleSave,
    selectEntity,
    setEditingImageId,
    setEntityDragTarget,
    setStatus,
    setToolMode,
    setTool3DMode,
  });

  const handleCreateSketch = () => {
    setPlanePickerActive(true);
    setStatus("Click a plane to sketch, or 'Select Face' for a solid face");
  };

  const handleSelectFace = () => {
    setPlanePickerActive(false);
    setFaceSelectionActive(true);
    setStatus("Click on a solid face to use as sketch plane");
  };

  const handleCancelPicker = () => {
    setPlanePickerActive(false);
    setFaceSelectionActive(false);
    setStatus("Ready");
  };

  const handleFinishSketch = () => {
    setIsSketching(false);
    setStatus("Sketch finished");
  };

  const handleCancelSketch = () => {
    setIsSketching(false);
    setStatus("Sketch cancelled");
  };

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

      {isSketching ? (
        <div className={s["tab-strip"]}>
          <div className={s["sketch-actions"]}>
            <button className={s["sketch-btn"]} onClick={handleFinishSketch}>Finish Sketch</button>
            <button className={s["sketch-btn"]} onClick={handleCancelSketch}>Cancel</button>
          </div>
        </div>
      ) : planePickerActive || faceSelectionActive ? (
        <div className={s["tab-strip"]}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 8 }}>
            {planePickerActive ? "Click a plane to sketch" : "Click a solid face"}
          </span>
          {planePickerActive && (
            <button className={s["plane-btn"]} onClick={handleSelectFace}>Select Face</button>
          )}
          <button className={s["plane-btn-cancel"]} onClick={handleCancelPicker}>Cancel</button>
        </div>
      ) : (
        <div className={s["tab-strip"]}>
          <button className={s["sketch-btn"]} onClick={handleCreateSketch}>Create Sketch</button>
          <div style={{ flex: 1 }} />
          <button className={s["toolbar-btn-sm"]} onClick={undo} title="Undo">↩</button>
          <button className={s["toolbar-btn-sm"]} onClick={redo} title="Redo">↪</button>
        </div>
      )}

      {isSketching ? (
        <SketchToolbar
          toolMode={toolMode}
          snapToGrid={snapToGrid}
          onToolModeChange={setToolMode}
          onImportImage={handleImportImage}
          onClearSelection={() => {
            selectEntity(null);
            setEditingImageId(null);
            setEntityDragTarget(null);
          }}
          onToggleSnap={() => setSnapToGrid(!snapToGrid)}
          onUndo={undo}
          onRedo={redo}
        />
      ) : (
        <ModelToolbar
          tool3DMode={tool3DMode}
          extrudeMode={extrudeMode}
          onTool3DModeChange={setTool3DMode}
          onExtrudeModeChange={setExtrudeMode}
          onClearSelection={() => {
            selectEntity(null);
          }}
          onUndo={undo}
          onRedo={redo}
        />
      )}

      <div style={{ gridRow: 3, gridColumn: 2, position: "relative", overflow: "hidden" }}>
        <UnifiedViewport />
        <StatusBar project={project} statusText={statusText} errorText={errorText} />
      </div>

      <InspectorPanel
        project={project}
        selectedEntityIds={selectedEntityIds}
        selectedEntity={selectedEntity}
        selectedImage={selectedImage}
        bodies={bodies}
        bodyErrors={bodyErrors}
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
        onSetEditingImageId={setEditingImageId}
        onSetEntityDragTarget={setEntityDragTarget}
        onRemoveSelected={removeSelectedEntities}
        onUpdateImage={updateImageCommitted}
        onToggleImageLockAspect={() => setImageLockAspect((locked) => !locked)}
        onSetImageRefScaleMode={setImageRefScaleMode}
        onSetWallHeight={setWallHeight}
        onSetWallThickness={setWallThickness}
        onSetOffsetSide={setOffsetSide}
        onSetPreviewWireframe={setPreviewWireframe}
        onExportStl={handleExportStl}
        tool3DMode={tool3DMode}
        extrudeMode={extrudeMode}
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
