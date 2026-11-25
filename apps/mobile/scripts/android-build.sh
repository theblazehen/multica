#!/usr/bin/env bash
# Build an Android APK without installing it, for build machines that have no
# device attached (a remote Linux box, CI). Install the result from the machine
# the phone is plugged into with `adb install -r <apk>`.
#
# Usage: scripts/android-build.sh [debug|release] [gradle args...]
#   (default: debug). Extra arguments go to Gradle, e.g.
#   -PreactNativeArchitectures=arm64-v8a builds only the ABI a modern phone
#   needs, which is much faster than the default four.
#
# Like android-run.sh it prebuilds first so app.config.ts is re-applied, and
# APP_ENV plus the .env file come from the calling package.json script. A
# debug APK is the dev client (loads JS from Metro); a release APK embeds the
# JS bundle and is signed with the debug keystore that prebuild generates,
# which is enough for sideloading but not for Play Store distribution.
set -euo pipefail

variant=${1:-debug}
shift || true
case "$variant" in
  debug) task=assembleDebug ;;
  release) task=assembleRelease ;;
  *)
    echo "usage: $0 [debug|release] [gradle args...]" >&2
    exit 2
    ;;
esac

pnpm exec expo prebuild -p android --no-install
(cd android && ./gradlew "app:$task" "$@")
echo "APK: $(pwd)/android/app/build/outputs/apk/$variant/app-$variant.apk"
