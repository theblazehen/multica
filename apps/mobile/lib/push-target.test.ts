import { describe, expect, it } from "vitest";
import { getInboxPushTarget, parseInboxPushData } from "./push-target";

const base = {
  type: "multica_inbox",
  inbox_item_id: "item-1",
  workspace: "blazelight",
};

describe("parseInboxPushData", () => {
  it("reads the notifier's data map", () => {
    expect(
      parseInboxPushData({
        ...base,
        item_type: "new_comment",
        issue_id: "issue-1",
        comment_id: "comment-1",
      }),
    ).toEqual({
      inboxItemId: "item-1",
      workspace: "blazelight",
      itemType: "new_comment",
      issueId: "issue-1",
      commentId: "comment-1",
    });
  });

  it("rejects other notifications", () => {
    expect(parseInboxPushData(null)).toBeNull();
    expect(parseInboxPushData({ ...base, type: "other" })).toBeNull();
    expect(parseInboxPushData({ ...base, workspace: "" })).toBeNull();
    expect(parseInboxPushData({ type: "multica_inbox", workspace: "w" })).toBeNull();
  });
});

describe("getInboxPushTarget", () => {
  it("opens the issue at the comment, like the inbox row", () => {
    const push = parseInboxPushData({
      ...base,
      item_type: "new_comment",
      issue_id: "issue-1",
      comment_id: "comment-1",
    });
    expect(getInboxPushTarget(push!, "42")).toEqual({
      pathname: "/[workspace]/issue/[id]",
      params: { workspace: "blazelight", id: "issue-1", highlight: "comment-1", h: "42" },
    });
  });

  it("opens an issue-less notice in its detail sheet", () => {
    const push = parseInboxPushData({ ...base, item_type: "autopilot_paused" });
    expect(getInboxPushTarget(push!, "42")).toEqual({
      pathname: "/[workspace]/inbox/[id]",
      params: { workspace: "blazelight", id: "item-1" },
    });
  });

  it("falls back to the inbox", () => {
    const push = parseInboxPushData({ ...base, item_type: "something_new" });
    expect(getInboxPushTarget(push!, "42")).toEqual({
      pathname: "/[workspace]/inbox",
      params: { workspace: "blazelight" },
    });
  });
});
