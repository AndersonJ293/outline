# CortaCAD Architecture

## Goal

CortaCAD should remain a small desktop product shell around a strong Rust core. The app can keep Tauri and React for fast UI iteration, but product-critical behavior must be isolated enough that the shell can change later without rewriting geometry, project validation, or export.

## Layers

```txt
apps/desktop
  React UI, canvas/viewport rendering, editor interaction, file dialogs

apps/desktop/src-tauri
  Thin Tauri command adapters, native file access, app bootstrapping

crates/cortacad-core
  Project model, domain commands, validation, operation orchestration

crates/geometry
  Pure 2D/3D geometry, offsets, profile detection, mesh generation

crates/export
  STL and future 3MF export
```

## Ownership

### React Frontend

Owns:

- Layout, toolbar, panels, dialogs, status messages.
- Canvas and Three.js rendering.
- Pointer/keyboard interaction.
- Selection and viewport state.
- Temporary tool state while the user is drawing.

Does not own:

- Printable geometry correctness.
- Project compatibility rules.
- Mesh validity.
- Export format rules.

### Tauri Layer

Owns:

- Command registration.
- File dialogs and file system access.
- Conversion between frontend DTOs and Rust core calls.

Should stay thin. If a command contains domain logic, move that logic into `cortacad-core`.

### Core

Owns:

- `Project`, `Sketch`, `Entity`, `Operation`, and future `Piece` models.
- Domain command application.
- Validation and structured domain errors.
- Calling geometry/export services to produce user-visible results.

The core should be testable without launching Tauri or React.

### Geometry

Owns:

- Points, paths, offsets, profile detection, extrusion mesh generation, and geometric validation.

Must stay deterministic and UI-agnostic.

### Export

Owns:

- STL export now.
- 3MF export later.

It should receive validated mesh data and write files. It should not inspect editor state.

## Evolution Path

1. Keep Tauri + React.
2. Modularize oversized frontend files before adding more editor tools.
3. Move project-changing behavior toward typed domain commands.
4. Strengthen TS/Rust contracts with serialization tests or generated bindings.
5. Add features only after the relevant layer boundary is clear.

## Non-Negotiable Boundary

Canvas captures intent. Rust validates and produces printable results.

If a change makes `Canvas2D.tsx`, `App.tsx`, or the Zustand store responsible for more domain behavior, the architecture is drifting.
