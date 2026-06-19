# Outline

> A lightweight desktop CAD for sketching 2D outlines and extruding them into 3D-printable parts.

Outline is a cross-platform native application for designing simple 3D-printable parts — cookie cutters, stamps, molds, stencils — directly from 2D sketches and reference images.

It is intentionally small, fast, and focused. It is not a full CAD suite. It does one thing: from a 2D outline, produce a printable mesh.

## Features

- 2D sketch viewport with pan, zoom, and grid snap
- Drawing tools: polyline and rectangle
- Multi-selection, undo/redo, delete
- Reference image import (PNG, JPG) with scale-by-reference
- Real 2D polygon offset (inside / outside / center)
- Wall mesh generation with configurable height and thickness
- 3D preview (Three.js) with orbit, pan, zoom, and wireframe overlay
- STL export (binary and ASCII) validated before write
- Native desktop app on Windows, macOS, and Linux

## Screenshots

> Add screenshots or a short GIF here. Drop them in `docs/` (untracked) or a `media/` folder.

## Why

Generic CAD tools (Fusion 360, FreeCAD, Blender) are powerful but heavy for the simple case of "I want to make a cookie cutter of this image." Outline skips constraints, assemblies, and timelines and gives you a fast, native path from sketch to printable mesh.

## Tech Stack

- **Shell:** [Tauri 2](https://tauri.app/) (Rust + webview)
- **UI:** React 18 + TypeScript + Vite
- **State:** Zustand
- **2D rendering:** HTML5 Canvas
- **3D rendering:** Three.js
- **Core, geometry, export:** Rust workspace (`outline-core`, `geometry`, `export`)

## Getting Started

### Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) 1.75+
- Platform-specific Tauri deps — see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Install

```bash
pnpm install
```

### Run in development

```bash
pnpm dev
```

This launches the Tauri dev server with hot reload.

### Build a production binary

```bash
pnpm build
```

The Tauri bundler produces installers for your current platform in `apps/desktop/src-tauri/target/release/bundle/`.

## Project Layout

```
apps/desktop/             React + TypeScript frontend
  src/                    UI source
  src-tauri/              Tauri shell, Rust command adapters

crates/
  outline-core/           Project model, domain commands, validation
  geometry/               2D/3D geometry, offsets, mesh generation
  export/                 File format exporters (STL)
```

The Rust core is UI-agnostic and can be tested without Tauri. The frontend is a thin shell that captures user intent and calls typed commands.

## Quality Gate

The project ships with a single script that runs every check:

```bash
pnpm quality
```

It runs `cargo fmt`, `cargo clippy`, `cargo test`, frontend build, frontend tests, and file-size guards. Use it before opening a pull request.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening an issue or pull request.

Good first issues are tagged [`good first issue`](https://github.com/AndersonJ293/outline/labels/good%20first%20issue).

## Security

To report a vulnerability, please follow [SECURITY.md](SECURITY.md). Do not file public issues for security reports.

## License

[MIT](LICENSE)

## Acknowledgments

- The Tauri team for making native desktop apps pleasant to build
- The Rust, React, and Three.js communities
