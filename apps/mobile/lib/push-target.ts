/**
 * Where tapping an inbox push notification lands. Mirrors
 * getInboxNavigationTarget in lib/inbox-display.ts, which the inbox row uses,
 * so a notification opens the same screen as its row: the issue (at the
 * comment it is about), a notice's detail sheet, or else the inbox.
 *
 * The payload is the FCM `data` map the multica-push notifier sends (see
 * apps/mobile/README.md "Push notifications"); every value is a string.
 */
import { isInboxNotice } from "@/lib/inbox-display";
import type { InboxItem } from "@multica/core/types";

export interface InboxPushData {
  inboxItemId: string;
  workspace: string;
  itemType: string;
  issueId?: string;
  commentId?: string;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** Narrow a notification's data map to an inbox push, or null. */
export function parseInboxPushData(data: unknown): InboxPushData | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const inboxItemId = str(record.inbox_item_id);
  const workspace = str(record.workspace);
  if (record.type !== "multica_inbox" || !inboxItemId || !workspace) return null;
  return {
    inboxItemId,
    workspace,
    itemType: str(record.item_type) ?? "",
    issueId: str(record.issue_id),
    commentId: str(record.comment_id),
  };
}

export function getInboxPushTarget(push: InboxPushData, historyToken: string) {
  if (push.issueId) {
    return {
      pathname: "/[workspace]/issue/[id]" as const,
      params: {
        workspace: push.workspace,
        id: push.issueId,
        highlight: push.commentId,
        h: historyToken,
      },
    };
  }
  if (isInboxNotice(push.itemType as InboxItem["type"])) {
    return {
      pathname: "/[workspace]/inbox/[id]" as const,
      params: { workspace: push.workspace, id: push.inboxItemId },
    };
  }
  return {
    pathname: "/[workspace]/inbox" as const,
    params: { workspace: push.workspace },
  };
}
