# Releasing expo-music-library

Releases are immutable npm tarballs built and validated by GitHub Actions. Do
not run `npm publish` from a development checkout.

## One-time repository setup

1. Protect `main` and require every `CI` job.
2. Protect `v*` tags from deletion or movement.
3. Create a protected GitHub environment named `npm` and require review for
   production publication.
4. Keep the `NPM_TOKEN` Actions secret limited to publishing this package.
5. Require review for changes to `.github/workflows/publish.yml`.

npm trusted publishing is preferable to a long-lived token. After configuring
`dev-josias/expo-music-library`, `publish.yml`, and the `npm` environment as a
trusted publisher on npm, remove `NPM_TOKEN` from the workflow and repository.
The workflow already uses an OIDC permission and npm provenance.

## Release checklist

1. Update `package.json` with a stable semantic version.
2. Add the matching dated heading to `CHANGELOG.md`.
3. Regenerate the root and local-example locks when their dependencies change:

   ```sh
   bun install
   npm install --prefix example --package-lock-only --ignore-scripts
   ```

4. Build one candidate tarball, then regenerate the frozen Expo 55–57 consumer
   locks from those exact bytes:

   ```sh
   bun run build
   mkdir -p npm-artifact
   npm pack --ignore-scripts --pack-destination npm-artifact
   bun run fixtures:update npm-artifact/expo-music-library-1.3.2.tgz
   ```

   `fixtures:update` verifies the tarball before changing any lock and builds
   each lock in an isolated temporary directory. Update the filename for the
   release version.

5. Run the local package gate:

   ```sh
   bun install --frozen-lockfile
   npm ci --prefix example --ignore-scripts
   bun run check
   ```

6. Merge the reviewed commit to `main` and wait for CI. CI:

   - builds one npm tarball and verifies its exact contents and entry points;
   - installs that tarball from frozen Expo 55, 56, and 57 fixture locks;
   - typechecks the public declarations installed from that tarball;
   - compiles Android and iOS apps for every supported Expo SDK.

7. Tag that exact commit and push only the tag:

   ```sh
   git tag v1.3.2
   git push origin v1.3.2
   ```

The publish workflow rejects tags whose version does not match `package.json`,
tags not contained in `main`, missing changelog entries, failed native jobs, or
artifacts whose contents differ from the verified tarball.

Publication is safe to rerun. If the version already exists with identical npm
integrity, the job succeeds without republishing. A different integrity or an
unreconciled registry/network error fails closed.

## Recovery

npm versions cannot be overwritten. If a released package is defective,
deprecate that version, fix forward with a new patch version, and repeat the
normal release process. Never move an existing release tag.
