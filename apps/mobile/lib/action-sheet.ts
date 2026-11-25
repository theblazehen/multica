/**
 * Cross-platform `showActionSheetWithOptions` with ActionSheetIOS semantics.
 *
 * iOS keeps the native `ActionSheetIOS` sheet. Android has no native
 * equivalent (RN's `Alert` caps out at three buttons), so the request is
 * handed to `<ActionSheetHost />`, mounted once in `app/_layout.tsx`, which
 * draws a bottom sheet in a `Modal`. Callers stay platform-agnostic: same
 * option shape, same callback contract (selected index; dismissing via the
 * backdrop or the back button reports `cancelButtonIndex`), and presenting a
 * second sheet from inside the callback works on both platforms.
 */
import { ActionSheetIOS, Platform } from "react-native";
import { create } from "zustand";

export interface ActionSheetOptions {
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
  title?: string;
  message?: string;
}

export interface PendingActionSheet {
  config: ActionSheetOptions;
  callback: (buttonIndex: number) => void;
}

interface ActionSheetState {
  pending: PendingActionSheet | null;
}

export const useActionSheetStore = create<ActionSheetState>(() => ({
  pending: null,
}));

export function showActionSheetWithOptions(
  config: ActionSheetOptions,
  callback: (buttonIndex: number) => void,
): void {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(config, callback);
    return;
  }
  useActionSheetStore.setState({ pending: { config, callback } });
}

/**
 * Resolve the visible Android sheet. The sheet is cleared before the
 * callback runs so a callback that opens another sheet replaces it rather
 * than being cleared afterwards.
 */
export function resolveActionSheet(buttonIndex: number | undefined): void {
  const { pending } = useActionSheetStore.getState();
  if (!pending) return;
  useActionSheetStore.setState({ pending: null });
  const index = buttonIndex ?? pending.config.cancelButtonIndex;
  if (index !== undefined) pending.callback(index);
}
