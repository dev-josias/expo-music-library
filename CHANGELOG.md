# Changelog

All notable changes to this package are documented here. The project follows
[Semantic Versioning](https://semver.org/).

## [1.3.2] - 2026-07-26

### Fixed

- Replaced deprecated plural Expo Modules constants with singular constant
  definitions on Android and iOS.
- Moved Android queries onto the app context's lifecycle-owned background
  coroutine scope and preserved structured cancellation.
- Made Android and iOS library observers idempotent and prevented queued
  callbacks from firing after listener or module teardown.
- Switched Android to Expo-managed SDK defaults and aligned the podspec with
  the Expo 55 compatibility floor of iOS 15.1 and Swift 5.9.
- Removed an unregistered privacy manifest whose required-reason declaration
  did not correspond to APIs used by the module.

### Tooling

- Updated the development and example toolchains to Expo SDK 57, React Native
  0.86, and React 19.2.
- Replaced stale checked-in example native projects with an Expo-generated
  fixture.
- Added Android and iOS native compile gates across Expo SDK 55, 56, and 57.
- Made CI, release validation, and npm publication operate on the same verified
  tarball, with registry-integrity reconciliation for safe reruns.

### Compatibility

- Runtime peer support remains Expo SDK 55 through 57 and React Native 0.83
  through 0.86.
- No JavaScript API or serialized asset fields were removed.

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
