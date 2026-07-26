# Changelog

All notable changes to this package are documented here. The project follows
[Semantic Versioning](https://semver.org/).

## [1.3.1] - 2026-07-26

### Added

- Explicit asset availability metadata for local, cloud-only, protected, and
  otherwise unavailable library items.
- Native capability reporting through `getCapabilitiesAsync()`.
- `availability` and `artwork` query options.
- A root `app.plugin.js` entry point so Expo can resolve the config plugin by
  package name.
- JavaScript validation tests, config-plugin permission tests, package
  verification, pull-request CI, and npm provenance.
- A reproducible text lockfile used by frozen CI and release installs.

### Fixed

- Android config now limits `READ_EXTERNAL_STORAGE` to API 32 and requests only
  audio access on Android 13 and newer.
- Package import no longer crashes when the native module is unavailable or a
  native constant is missing.
- A single `[sortKey, ascending]` tuple is no longer mistaken for a list of sort
  values.
- Page sizes, IDs, cursors, date filters, search queries, and query modes are
  validated consistently before crossing the native bridge.
- Change events now describe their full-reload semantics instead of claiming
  to contain incremental changes.

### Compatibility

- Existing methods and the legacy `Asset.uri` string remain available.
- `Asset.artwork` keeps its 1.3.0 representation by default. New code can opt
  into lazy artwork URIs or use the additive `artworkUri` field.
- Pagination cursors remain strings but are explicitly opaque.

## [1.3.0] - 2026-02-25

- Added search, paginated subqueries, additional filters and sort keys, asset
  lookup by ID, library change notifications, and the initial config plugin.
