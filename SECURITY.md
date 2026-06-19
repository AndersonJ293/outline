# Security Policy

## Supported Versions

Outline is in active development. Security updates are released for the latest minor version only. Older versions are not patched.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, **do not** open a public GitHub issue.

Please report it privately by emailing the maintainers. Include:

- A clear description of the issue and its impact
- Reproduction steps
- Affected version
- Any known mitigations

You can expect an acknowledgement within 72 hours. We will coordinate disclosure timing with you and credit you in the fix release notes unless you prefer to remain anonymous.

## Scope

The following are in scope:

- The Outline desktop application
- The Rust core, geometry, and export crates
- The Tauri command surface

Out of scope:

- Third-party dependencies (please report upstream)
- Local build issues on unsupported platforms
