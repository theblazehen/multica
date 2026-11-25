/**
 * Android renderer for `showActionSheetWithOptions` (lib/action-sheet.ts).
 * iOS presents ActionSheetIOS and never populates the store, so this host
 * renders nothing there.
 *
 * Layout follows the iOS sheet it stands in for: optional title/message
 * header, the actions, and Cancel split into its own row at the bottom;
 * the destructive action uses the destructive token. Tapping the backdrop
 * or pressing back resolves with the cancel index.
 */
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { resolveActionSheet, useActionSheetStore } from "@/lib/action-sheet";
import { cn } from "@/lib/utils";

export function ActionSheetHost() {
  const pending = useActionSheetStore((s) => s.pending);
  const insets = useSafeAreaInsets();
  if (!pending) return null;

  const { options, cancelButtonIndex, destructiveButtonIndex, title, message } =
    pending.config;
  const actionIndices = options
    .map((_, i) => i)
    .filter((i) => i !== cancelButtonIndex);
  const cancel = () => resolveActionSheet(undefined);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={cancel}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          cancelButtonIndex !== undefined ? options[cancelButtonIndex] : undefined
        }
        className="flex-1 justify-end bg-black/40 px-2"
        style={{ paddingBottom: insets.bottom + 8 }}
        onPress={cancel}
      >
        {/* Swallow presses on the sheet itself so only the backdrop cancels. */}
        <Pressable className="gap-2" onPress={() => {}}>
          <View className="overflow-hidden rounded-2xl bg-secondary">
            {title || message ? (
              <View className="items-center gap-1 border-b border-border px-4 py-3">
                {title ? (
                  <Text className="text-center text-sm font-semibold text-muted-foreground">
                    {title}
                  </Text>
                ) : null}
                {message ? (
                  <Text className="text-center text-sm text-muted-foreground">
                    {message}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {actionIndices.map((i, row) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                android_ripple={{ color: "rgba(127,127,127,0.2)" }}
                className={cn(
                  "items-center px-4 py-3.5",
                  row > 0 && "border-t border-border",
                )}
                onPress={() => resolveActionSheet(i)}
              >
                <Text
                  className={cn(
                    "text-base",
                    i === destructiveButtonIndex
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {options[i]}
                </Text>
              </Pressable>
            ))}
          </View>
          {cancelButtonIndex !== undefined ? (
            <Pressable
              accessibilityRole="button"
              android_ripple={{ color: "rgba(127,127,127,0.2)" }}
              className="items-center overflow-hidden rounded-2xl bg-secondary px-4 py-3.5"
              onPress={() => resolveActionSheet(cancelButtonIndex)}
            >
              <Text className="text-base font-semibold text-foreground">
                {options[cancelButtonIndex]}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
