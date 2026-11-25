/**
 * System glyph that is native on both platforms: an SF Symbol on iOS
 * (expo-image's `sf:` source, which only resolves on Apple platforms) and the
 * closest Ionicons glyph elsewhere. Callers name both explicitly so the
 * Android choice is reviewed next to the iOS one rather than guessed by a
 * lookup table.
 */
import type { ComponentProps } from "react";
import { Platform, type ColorValue } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export function PlatformIcon({
  sf,
  ionicon,
  size,
  color,
}: {
  /** SF Symbol name, e.g. "chevron.right". */
  sf: string;
  /** Ionicons glyph used on Android, e.g. "chevron-forward". */
  ionicon: IoniconName;
  size: number;
  color: ColorValue;
}) {
  if (Platform.OS === "ios") {
    // expo-image reads `style.color` as the SF Symbol tint (alias of
    // `tintColor`, but typed to accept any ColorValue).
    return (
      <ExpoImage
        source={`sf:${sf}`}
        style={{ width: size, height: size, color }}
      />
    );
  }
  return <Ionicons name={ionicon} size={size} color={color} />;
}
