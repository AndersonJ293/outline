# Contributing to Outline

Thanks for your interest in contributing. This document explains how to set up the project locally, the development workflow, and the project's coding conventions.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to its terms.

## Getting Started

### Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) 1.75+
- Platform-specific [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Setup

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the Tauri dev server with hot reload.

## Development Workflow

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make focused commits with clear messages.
3. Run the quality gate before opening a pull request:
   ```bash
   pnpm quality
   ```
   This runs `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, the desktop build, the frontend tests, and file-size guards.
4. Open a pull request against `main`. Fill in the PR template.

## Project Layout

```
apps/desktop/        React + TypeScript frontend
crates/
  outline-core/      Project model, domain commands, validation
  geometry/          2D/3D geometry, offsets, mesh generation
  export/            File format exporters
```

The Rust core is UI-agnostic and testable without Tauri. The frontend captures user intent and calls typed commands. Please preserve this boundary.

## Coding Conventions

### General

- Keep functions small and focused. Domain functions should stay under 60 lines.
- Avoid broad "manager" or "utils" modules. Be specific.
- Comments should be sparse and useful. Don't restate what the code does.
- All comments, docstrings, and user-facing strings must be in English.

### TypeScript

- No `any`. If you can't find a safer type, document why in the PR description.
- Keep React components under 300 lines. The hard limit is 500.
- Editor canvas components should stay under 350 lines.
- Store files should stay under 220 lines.

### Rust

- No `unwrap()` or `expect()` in runtime paths. Tests may use them.
- Domain validation lives in Rust, not just in the frontend. If a rule exists on both sides, it must exist on both.
- Don't introduce a new dependency without explaining why existing code or the standard library is insufficient.

### TS / Rust Contracts

When you change a field that crosses the TS/Rust boundary (anything in `apps/desktop/src-tauri/src/commands.rs`, `apps/desktop/src/types.ts`, or the `outline-core` models), update both sides deliberately. Add or adjust a serialization test in `crates/outline-core/src/commands.rs`.

## Pull Request Checklist

- [ ] `pnpm quality` passes locally
- [ ] New behavior is covered by a test
- [ ] User-facing strings are in English
- [ ] No `any`, no `unwrap()` in runtime paths
- [ ] Public APIs and shared types stay in sync between TS and Rust
- [ ] PR description explains the change and links to any related issue

## Reporting Issues

Use the GitHub issue templates:

- **Bug report** — for anything broken
- **Feature request** — for new functionality

For security issues, follow [SECURITY.md](SECURITY.md) instead.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
