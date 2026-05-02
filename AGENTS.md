# CortaCAD Agent Rules

This file is the quality gate for any AI agent changing this repository.

## Product Direction

CortaCAD is a desktop-first CAD-like tool for creating cookie cutters and simple 3D-printable parts from 2D sketches, reference images, wall generation, extrusion, and STL/3MF export.

The project should stay easy to evolve. Do not trade short-term feature speed for large files, hidden coupling, or duplicated domain rules.

## Architecture Rules

- React captures user intent, renders UI, and calls typed commands.
- Rust owns printable domain behavior: project validation, geometry, mesh generation, operations, and export orchestration.
- `crates/geometry` must stay pure geometry. It must not know about React, Tauri, files, UI state, or project shell behavior.
- `crates/export` must stay focused on file format export.
- Tauri command handlers should be thin adapters between the desktop app and `cortacad-core`.
- The frontend store must not become a domain engine. Keep it focused on current document state, UI state, selection, viewport, and transient editor state.

## Current Hotspots

These files are already too large and must not receive new feature logic:

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/components/Canvas2D.tsx`

Before adding behavior in these areas, extract smaller modules/components first.

## Complexity Limits

- React component target: under 300 lines.
- React component hard limit: 500 lines.
- Editor canvas component target: under 350 lines.
- Editor canvas component hard limit: 500 lines.
- Store file target: under 220 lines.
- Store file hard limit: 300 lines.
- Domain function target: under 60 lines.
- Avoid broad "manager" or "utils" modules unless the responsibility is specific and stable.

Exceeding a target requires an explicit explanation in the final report.
Exceeding a hard limit should block feature work unless the file is marked as temporary baseline debt in `scripts/quality.sh`.

## Code Rules

- Do not add `any` in TypeScript unless the final report explains why no safer type is practical.
- Do not duplicate TS/Rust contract fields casually. If a contract changes, update both sides deliberately and add/adjust serialization tests.
- Do not add domain validation only in React when Rust also needs to trust that rule.
- Do not add `unwrap()`/`expect()` in runtime Rust paths unless the invariant is local and documented. Tests may use them.
- Do not introduce new dependencies without explaining why existing code or standard libraries are insufficient.
- Do not hide errors behind generic messages when a structured error code is possible.
- Keep comments sparse and useful.

## Required Validation

Run before claiming completion:

```bash
pnpm quality
```

If the full command cannot run, report exactly which step failed or was skipped and why.

## Required Final Report

Every implementation handoff must include:

- Files changed and why.
- Commands run and results.
- Tests added or updated.
- Largest complexity risk introduced or reduced.
- Known gaps or untested behavior.

Do not claim a feature is working without running the relevant validation.
