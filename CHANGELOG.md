# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-01-17

### Added
- Versioned metadata to scan output (`meta` field with `schemaVersion`, `scanId`, `projectId`, `generatedAt`).
- `--upload` flag placeholder (reserved for future SaaS compatibility).
- Stabilized JSON data contract (`ScanResultV1`).

### Changed
- Improved error handling and JSON output isolation.
- Updated license to MIT.
- Node.js engine requirement set to >= 18.
