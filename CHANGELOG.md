# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2026-10-10

### Changed
- Migrated project to ES Modules (ESM) to prevent global scope pollution and explicitly define dependencies.
- Updated `index.html` to load `js/app.js` as a module.
- Dynamic character-themed favicon that changes color to match the selected character's accent color.
- `js/favicon.js` utility for SVG recoloring and favicon management.
- Split characters into individual JSON files within `data/characters`.

### Added
- Created `CHANGELOG.md` to track project history.

## [1.1.3] - 2026-10-07
### Added
- Initial project structure.
- Support for monoclass characters.
- Wikidot link generation.
