import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";
import { api } from "@/data/api";
import { useAuthStore } from "@/data/auth-store";
import {
  isPushEnabled,
  registerForPush,
  registerToken,
} from "@/lib/push-notifications";
import { getInboxPushTarget, parseInboxPushData } from "@/lib/push-target";

function warn(what: string) {
  return (err: unknown) => console.warn(`[push] ${what}`, err);
}

/** The FCM data map of a tapped notification. Expo puts it in the content
 *  for notifications it presented itself (app in the foreground) and leaves
 *  it on the remote message for ones the system tray showed. */
function responseData(response: Notifications.NotificationResponse): unknown {
  const { content, trigger } = response.notification.request;
  if (content.data && Object.keys(content.data).length > 0) return content.data;
  const remote = (trigger as { remoteMessage?: { data?: unknown } } | null)?.remoteMessage;
  return remote?.data ?? null;
}

/**
 * Inbox push for the signed-in user (Android, see lib/push-notifications.ts):
 * registers the device once a session is live, follows FCM token rotation,
 * and opens the issue behind a tapped notification, including the one that
 * cold-started the app. Mounted once, in the root layout.
 */
export function usePushNotifications() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pathname = usePathname();
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPushEnabled || !userId) return;
    // While the app is open the inbox already updates live, but a tappable
    // notification still beats hunting for the new row.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const bearer = api.getToken();
    if (bearer) registerForPush(bearer).catch(warn("registration failed"));
    const subscription = Notifications.addPushTokenListener(({ data }) => {
      const current = api.getToken();
      if (current && typeof data === "string") {
        registerToken(current, data).catch(warn("re-registering a rotated token failed"));
      }
    });
    return () => subscription.remove();
  }, [userId]);

  useEffect(() => {
    // Wait until auth has settled and the entry redirect (app/index.tsx) has
    // left "/", so it cannot replace the screen opened here.
    if (!isPushEnabled || !response || isLoading || !userId || pathname === "/") return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handledRef.current === id) return;
    handledRef.current = id;
    Notifications.clearLastNotificationResponse();

    const push = parseInboxPushData(responseData(response));
    if (!push) return;
    router.push(getInboxPushTarget(push, String(Date.now())));
    // Same as opening the row in the inbox: read on every opening. The inbox
    // caches catch up through the inbox:read realtime event.
    api
      .markInboxRead(push.inboxItemId, { workspaceSlug: push.workspace })
      .catch(warn("marking the item read failed"));
  }, [response, isLoading, userId, pathname]);
}
