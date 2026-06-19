# Changelog

All notable changes to Outline will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Project renamed from CortaCAD to Outline
- File extension changed from `.cortacad` to `.outline`
- All user-facing strings, comments, and documentation translated to English

### Removed
- Internal planning docs and architecture document
- Manual test scripts

## [0.1.0] - 2026-06-19

### Added
- 2D sketch viewport with pan, zoom, and grid snap
- Polyline and rectangle drawing tools
- Multi-selection, undo/redo, delete
- Reference image import (PNG, JPG) with scale-by-reference
- Real 2D polygon offset (inside / outside / center)
- Wall mesh generation with configurable height and thickness
- 3D preview (Three.js) with orbit, pan, zoom, and wireframe overlay
- STL export (binary and ASCII) with validation
- Project save/open as `.outline` JSON
- Keyboard shortcuts (Ctrl+N/O/S, Ctrl+1/2/3, Ctrl+Z/Y, Delete)
- MIT license and open-source documentation
