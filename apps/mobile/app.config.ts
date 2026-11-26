import type { ExpoConfig, ConfigContext } from "expo/config";
import { withEntitlementsPlist, type ConfigPlugin } from "expo/config-plugins";

/**
 * Application ids registered in the Firebase project behind
 * google-services.json (see README "Push notifications"). A build under any
 * other id (an EXPO_BUNDLE_IDENTIFIER_* override) leaves Firebase out, since
 * Gradle's google-services step rejects a package the file doesn't list; push
 * registration then reports unavailable and the app runs without it.
 */
const FIREBASE_ANDROID_IDS = [
  "ai.multica.mobile",
  "ai.multica.mobile.staging",
  "ai.multica.mobile.dev",
];

/**
 * expo-notifications always adds the aps-environment entitlement on iOS, which
 * a free (personal team) Apple ID cannot sign. Push is Android-only here, so
 * drop it again. Applied to the config directly rather than listed in
 * `plugins`: its mod is then registered before expo-notifications', and the
 * last-registered mod runs first, so this one sees the plist after
 * expo-notifications wrote it.
 */
const withoutIosPushEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults["aps-environment"];
    return mod;
  });

/**
 * Dynamic Expo config — replaces app.json so we can read APP_ENV at runtime
 * and switch bundleIdentifier / display name for dev / staging / production.
 *
 * APP_ENV is set by package.json scripts:
 *   - dev          → APP_ENV unset (treated as "development")
 *   - dev:staging  → APP_ENV=staging
 *   - dev:prod     → APP_ENV=production (rare; usually only for EAS build)
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const env = process.env.APP_ENV ?? "development";
  const isProd = env === "production";
  const isStaging = env === "staging";
  // Per-variant app id overrides exist for one reason: an Apple ID can only
  // sign bundle prefixes it owns, so contributors not on the Multica Apple
  // Developer team (and external users self-building a personal copy against
  // production) need to swap to a reverse-domain they control. Each variant
  // has its own `_<VARIANT>` suffix and is only read inside that variant's
  // branch — a generic `EXPO_BUNDLE_IDENTIFIER` would leak across variants
  // (Expo CLI auto-loads `.env.<mode>.local` regardless of APP_ENV) and
  // collapse dev / staging / prod onto a single id. Android uses the same id
  // as its application id, so each variant installs side by side there too.
  const appId = isProd
    ? (process.env.EXPO_BUNDLE_IDENTIFIER_PROD ?? "ai.multica.mobile")
    : isStaging
      ? (process.env.EXPO_BUNDLE_IDENTIFIER_STAGING ?? "ai.multica.mobile.staging")
      : (process.env.EXPO_BUNDLE_IDENTIFIER_DEV ?? "ai.multica.mobile.dev");

  return withoutIosPushEntitlement({
    ...config,
    name: isProd
      ? "Multica"
      : isStaging
        ? "Multica (Staging)"
        : "Multica (Dev)",
    slug: "multica-mobile",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    scheme: "multica",
    // 1024x1024 full-bleed, no-alpha source that belongs to mobile alone. Do
    // not point this back at the desktop icon (apps/desktop/build/icon.png):
    // that one is padded for macOS, and iOS would mask it a second time, which
    // is the white ring from #6995. Expo prebuild generates every required iOS
    // icon size from this single PNG.
    icon: "./assets/icon.png",
    ios: {
      // Expo keeps the top-level portrait policy for iPhone while adding all
      // iPad orientations required for multitasking when tablet support is on.
      supportsTablet: true,
      // Pins DEVELOPMENT_TEAM on every prebuild. Leaving it unset is the normal
      // path — `expo run:ios` then resolves a signing identity from the Keychain
      // itself, which is right when the Apple ID owns exactly one team. With
      // several (a personal team plus an employer's) it takes the *first*
      // identity found whenever the terminal is non-interactive, writes that
      // choice into the generated ios/, and never clears it again: prebuild only
      // writes DEVELOPMENT_TEAM when a value is present, so a project pinned to
      // the wrong team stays wrong until ios/ is deleted. Setting this re-applies
      // the intended team on every `scripts/ios-run.sh` run, which also repairs
      // an already-mispinned checkout.
      appleTeamId: process.env.EXPO_APPLE_TEAM_ID,
      bundleIdentifier: appId,
    },
    android: {
      package: appId,
      // The shared icon is full-bleed with the glyph inside the central 60%,
      // which already sits in the adaptive-icon safe zone (inner 66%), so it
      // doubles as the foreground layer. The background matches its fill.
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#0B0B0C",
      },
      // Firebase Cloud Messaging, for inbox push notifications.
      googleServicesFile: FIREBASE_ANDROID_IDS.includes(appId)
        ? "./google-services.json"
        : undefined,
    },
    plugins: [
      "expo-router",
      "expo-image",
      "expo-localization",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      "react-native-enriched-markdown",
      [
        "expo-image-picker",
        {
          // iOS NSPhotoLibraryUsageDescription. Without this string in
          // Info.plist, calling launchImageLibraryAsync hard-crashes on
          // iOS 14+. Camera + microphone are disabled — we only ever read
          // from the existing photo library.
          photosPermission:
            "Allow Multica to access your photos to attach images to issues and comments.",
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            buildReactNativeFromSource: true,
            // SDK 57's supported scene runtime is required for Xcode 27 builds.
            // Keep this in prebuild config so clean native generations retain it.
            enableSceneSupport: true,
          },
        },
      ],
      [
        "expo-notifications",
        {
          // Android status-bar icon: the app glyph as a white silhouette.
          icon: "./assets/notification-icon.png",
          // Accent for the icon and app name: the --brand token (global.css),
          // readable on both light and dark shades.
          color: "#4A6EE0",
          // Created at runtime by lib/push-notifications.ts; FCM messages
          // without a channel land here too.
          defaultChannel: "inbox",
        },
      ],
    ],
    extra: { APP_ENV: env },
  });
};
