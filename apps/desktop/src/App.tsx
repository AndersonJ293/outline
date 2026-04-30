import { useEffect, useState, useCallback } from "react";
import Canvas2D from "./components/Canvas2D";
import Viewport3D from "./components/Viewport3D";
import { useStore } from "./stores/useStore";
import * as commands from "./commands";
import { generateId } from "./types";
import type { Entity, Operation, Mesh } from "./types";

function App() {
  const {
    project,
    setProject,
    toolMode,
    setToolMode,
    viewMode,
    setViewMode,
    currentEntityId,
    selectEntity,
    removeEntity,
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
  } = useStore();

  const [saving, setSaving] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Verifica conexão com backend Rust
  useEffect(() => {
    commands
      .ping()
      .then((res) => {
        if (res === "pong") setBackendConnected(true);
      })
      .catch(() => setBackendConnected(false));
  }, []);

  // Novo projeto
  const handleNewProject = useCallback(async () => {
    const name = `Cortador ${new Date().toLocaleDateString()}`;
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
  const handleSave = useCallback(() => {
    if (!project) return;
    setSaving(true);
    try {
      const json = JSON.stringify(project, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project_name}.cortacad`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Projeto salvo: "${project.project_name}.cortacad"`);
    } catch (err) {
      setError(`Erro ao salvar: ${err}`);
    } finally {
      setSaving(false);
    }
  }, [project, setStatus, setError]);

  // Abrir projeto
  const handleOpen = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".cortacad,application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const proj = JSON.parse(text);
        setProject(proj);
        setStatus(`Projeto aberto: "${file.name}"`);
        setError(null);
      } catch (err) {
        setError(`Erro ao abrir projeto: ${err}`);
      }
    };
    input.click();
  }, [setProject, setStatus, setError]);

  // Gerar cortador (wall mesh via Rust)
  const handleGenerateCutter = useCallback(async () => {
    if (!project) {
      setError("Crie um projeto primeiro.");
      return;
    }

    const entity = project.sketch.entities.find(
      (e) => e.id === currentEntityId,
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
      op_type: "cookie_cutter_wall",
      source_entity_id: entity.id,
      height_mm: wallHeight,
      wall_thickness_mm: wallThickness,
      offset_side: offsetSide,
    };

    try {
      const result = await commands.generateWallMesh(entity, operation);
      if (result.ok && result.mesh) {
        setCurrentMesh(result.mesh);
        setViewMode("preview");
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
    currentEntityId,
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

    const input = document.createElement("input");
    input.type = "text";
    input.value = `${project?.project_name ?? "cortador"}.stl`;
    try {
      const result = await commands.exportStl(
        currentMesh,
        `/tmp/${input.value}`,
      );
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
        if (currentEntityId && project) {
          removeEntity(currentEntityId);
          setStatus("Entidade removida");
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
      if (e.key === "Escape") {
        selectEntity(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    currentEntityId,
    project,
    removeEntity,
    undo,
    redo,
    selectEntity,
    setStatus,
  ]);

  // Entidade selecionada
  const selectedEntity =
    project?.sketch.entities.find((e) => e.id === currentEntityId) ?? null;

  return (
    <div className="app-layout">
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">CortaCAD</span>
        <button className="topbar-btn" onClick={handleNewProject}>
          + Novo
        </button>
        <button className="topbar-btn" onClick={handleOpen}>
          Abrir
        </button>
        <button
          className="topbar-btn"
          onClick={handleSave}
          disabled={!project || saving}
        >
          Salvar
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="topbar-btn"
          onClick={undo}
          disabled={false}
          title="Desfazer (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="topbar-btn"
          onClick={redo}
          disabled={false}
          title="Refazer (Ctrl+Y)"
        >
          ↪
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="topbar-btn primary"
          onClick={handleExportStl}
          disabled={!currentMesh}
        >
          Exportar STL
        </button>
        {!backendConnected && (
          <span style={{ color: "var(--warning)", fontSize: 11 }}>
            Backend offline
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
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
          title="Retângulo (R)"
        >
          ▭
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn"
          onClick={() => selectEntity(null)}
          title="Cancelar seleção"
        >
          ✕
        </button>
      </div>

      {/* Viewport */}
      <div style={{ gridRow: 2, position: "relative", overflow: "hidden" }}>
        {/* Tabs */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            display: "flex",
            gap: 4,
          }}
        >
          <button
            className={`tab-btn ${viewMode === "sketch" ? "active" : ""}`}
            onClick={() => setViewMode("sketch")}
          >
            2D Sketch
          </button>
          <button
            className={`tab-btn ${viewMode === "preview" ? "active" : ""}`}
            onClick={() => setViewMode("preview")}
          >
            3D Preview
          </button>
        </div>

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

      {/* Painel lateral */}
      <div className="panel">
        {/* Seção: Projeto */}
        <div className="panel-section">
          <h3>Projeto</h3>
          {project ? (
            <div>
              <div className="panel-field">
                <label>Nome</label>
                <input value={project.project_name} readOnly />
              </div>
              <div className="panel-field">
                <label>Unidades</label>
                <input value={project.units} readOnly />
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              Clique em "Novo" para começar.
            </p>
          )}
        </div>

        {/* Seção: Entidades */}
        <div className="panel-section">
          <h3>Entidades</h3>
          {project && project.sketch.entities.length > 0 ? (
            <div className="entities-list">
              {project.sketch.entities.map((entity) => (
                <div
                  key={entity.id}
                  className={`entities-list-item ${entity.id === currentEntityId ? "selected" : ""}`}
                  onClick={() => selectEntity(entity.id)}
                >
                  <span>
                    {entity.entity_type} ({entity.points.length} pts)
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
                      removeEntity(entity.id);
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

        {/* Seção: Propriedades */}
        {selectedEntity && (
          <div className="panel-section">
            <h3>Propriedades</h3>
            <div className="panel-field">
              <label>Tipo</label>
              <input value={selectedEntity.entity_type} readOnly />
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
          </div>
        )}
      </div>

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
