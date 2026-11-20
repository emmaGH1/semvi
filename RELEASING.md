# Release the Semvi helpers

The helper version is independent of the npm package version. The workflow builds the locked `intent` and `prepare` examples on native Linux x64 and arm64 and macOS x64 and arm64 runners. Each runner generates a throwaway key, signs an offline job and checks the resulting V2 transaction request before packaging. A manual dispatch builds downloadable Actions artifacts. A pushed `helpers-v*` tag on a commit containing the workflow publishes the four archives and `SHA256SUMS` after all builds pass.

## Cut the first release

1. Land the release workflow and package code on `main`. An optional manual run of **Build and release Semvi helpers** on `main` exercises the full matrix before tagging.
2. From the repository, tag the reviewed commit on `main` and push that tag.

   ```sh
   git fetch origin main
   git tag -a helpers-v0.1.0 origin/main -m 'Semvi helpers v0.1.0'
   git push origin refs/tags/helpers-v0.1.0
   ```

3. Wait for the tagged workflow to finish. Check that the release targets the reviewed tag and has all five assets. If a matrix build fails, inspect its log before proceeding.

## Check and pin the binaries

From the repository, download the release into a fresh directory and verify the four archive digests.

```sh
release_assets=$(mktemp -d)
gh release download helpers-v0.1.0 --repo emmaGH1/semvi --dir "$release_assets" \
  --pattern 'semvi-helpers-0.1.0-*.tar.gz' --pattern SHA256SUMS
(cd "$release_assets" && shasum -a 256 -c SHA256SUMS && cat SHA256SUMS)
```

Check that there is one line for each of `linux-x64`, `linux-arm64`, `darwin-x64`, and `darwin-arm64`. Compare them with the matching `SHA256SUMS` files in the tagged workflow's build artifacts. In [helpers.js](packages/semvi/lib/helpers.js), keep `HELPERS_VERSION` at `0.1.0` and replace each `null` in `SHA256` with the corresponding lowercase digest. Commit the four pins together.

Run `npm test`. From a fresh directory, install the local Node package from the pinned checkout and exercise the default installer with an empty cache.

```sh
semvi_repo="$PWD"
semvi_check=$(mktemp -d)
(
  cd "$semvi_check"
  npm install "$semvi_repo/packages/semvi"
  export SEMVI_HELPERS_DIR="$semvi_check/helpers"
  npx semvi-helpers install
  "$SEMVI_HELPERS_DIR/intent" keygen "$semvi_check/payer.key"
)
rm -rf "$semvi_check" "$release_assets"
```

An embedded hash authenticates the exact bytes approved in the package revision. During bootstrap, `--allow-unpinned` checks the archive against a manifest fetched from the same release. A caller using this option trusts the release publisher. Once a platform has an embedded hash, the option still requires that hash. Existing bootstrap installs are usable by a pinned package when the recorded archive hash matches the pin.

Keep published archives intact. For changed helper binaries, release a new tag, verify its assets, and pin the new version and all four digests together. Linux builds use GNU/Linux runners and may require a source build on older distributions or on musl. Test on each supported platform when changing the build or packaging process.
