/**
 * Android push notifications for inbox items.
 *
 * Multica's server has no push. This fork pairs the app with a small
 * notifier service (multica-push, deployed beside the backend) that watches
 * inbox items and sends them through Firebase Cloud Messaging to the device
 * tokens registered here. Registration carries the user's Multica bearer
 * token; the notifier checks it against GET /api/me, so a device always maps
 * to the signed-in user.
 *
 * Active only on Android builds with EXPO_PUBLIC_PUSH_URL set (the notifier's
 * base URL, e.g. https://project.blazelight.dev/push) and a Firebase config
 * for the app id (see app.config.ts). Everything else, including iOS, skips
 * it and keeps the in-app inbox as before.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { i18n } from "@/lib/i18n/singleton";

const PUSH_URL = process.env.EXPO_PUBLIC_PUSH_URL?.replace(/\/+$/, "") ?? "";

/** Must match the `channel_id` the notifier sends and the expo-notifications
 *  plugin's `defaultChannel` in app.config.ts. */
export const INBOX_CHANNEL_ID = "inbox";

export const isPushEnabled = Platform.OS === "android" && PUSH_URL !== "";

/** The FCM token registered (or being registered) from this process and the
 *  bearer token that registered it. */
let registered: { bearer: string; token: string } | null = null;

async function sendDevice(method: "POST" | "DELETE", bearer: string, token: string) {
  const res = await fetch(`${PUSH_URL}/devices`, {
    method,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      platform: "android",
      app_id: Constants.expoConfig?.android?.package ?? "",
    }),
  });
  if (!res.ok) throw new Error(`push ${method} /devices failed: HTTP ${res.status}`);
}

/**
 * Ask for notification permission (Android 13+ shows the system prompt once),
 * then register this device's FCM token for the signed-in user. Safe to call
 * on every launch: registering a known token only refreshes it.
 */
export async function registerForPush(bearer: string): Promise<void> {
  if (!isPushEnabled) return;
  // The channel exists before the first message, so the user's per-channel
  // settings apply to every inbox notification.
  await Notifications.setNotificationChannelAsync(INBOX_CHANNEL_ID, {
    name: i18n.t("inbox:title"),
    importance: Notifications.AndroidImportance.HIGH,
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return;
  const { data: token } = await Notifications.getDevicePushTokenAsync();
  await registerToken(bearer, token);
}

/** Register a (possibly rotated) FCM token for the signed-in user. */
export async function registerToken(bearer: string, token: string): Promise<void> {
  if (!isPushEnabled) return;
  // Expo also reports a freshly fetched token through the rotation listener;
  // skip the identical second request.
  if (registered?.bearer === bearer && registered.token === token) return;
  registered = { bearer, token };
  try {
    await sendDevice("POST", bearer, token);
  } catch (err) {
    registered = null;
    throw err;
  }
}

/**
 * Sign-out: remove this device from the user's push targets, then delete the
 * FCM token itself. The delete is what guarantees silence even when the
 * DELETE cannot authenticate (a session that ended on a 401): the notifier
 * drops a token as soon as FCM reports it unregistered. The next sign-in
 * gets a fresh token.
 */
export async function unregisterFromPush(bearer: string | null): Promise<void> {
  if (!isPushEnabled) return;
  const token = registered?.token;
  registered = null;
  if (bearer && token) {
    await sendDevice("DELETE", bearer, token).catch((err: unknown) => {
      console.warn("[push] unregister failed", err);
    });
  }
  await Notifications.unregisterForNotificationsAsync().catch((err: unknown) => {
    console.warn("[push] deleting the FCM token failed", err);
  });
}
