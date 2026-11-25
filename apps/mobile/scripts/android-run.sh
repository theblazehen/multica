#!/usr/bin/env bash
# Build and run the Android app, re-applying app.config.ts to android/ first.
#
# Android counterpart of scripts/ios-run.sh, for the same reason: `expo
# run:android` only prebuilds when android/ is missing, so without this step
# the application id, app name, icon, scheme and plugin config freeze at
# whatever the first prebuild produced. android/ is gitignored and fully
# generated, so prebuilding on every run is safe and idempotent; --clean is
# avoided to keep Gradle's incremental build.
#
# APP_ENV and the .env file are supplied by the calling package.json script, so
# prebuild and run resolve the same variant. Arguments are forwarded to
# run:android only (e.g. `--variant release`, `--device <name>`).
set -euo pipefail

pnpm exec expo prebuild -p android --no-install
exec pnpm exec expo run:android "$@"
