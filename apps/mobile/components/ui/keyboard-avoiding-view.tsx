/**
 * KeyboardAvoidingView for full-screen forms. Use `behavior="padding"`.
 *
 * iOS keeps React Native's own KeyboardAvoidingView, as before.
 *
 * Android runs edge-to-edge under `<KeyboardProvider>` (app/_layout.tsx), so
 * the window is never resized for the IME and React Native's component, which
 * only hears `keyboardDidShow`, either does nothing (behavior undefined) or
 * jumps after the keyboard has finished animating. keyboard-controller's
 * drop-in follows the IME frame by frame and takes the same props.
 *
 * NativeWind only maps `className` on components it knows about, so the
 * keyboard-controller view is registered here; callers keep using
 * `className` on both platforms.
 */
import { KeyboardAvoidingView as RNKeyboardAvoidingView, Platform } from "react-native";
import { KeyboardAvoidingView as KCKeyboardAvoidingView } from "react-native-keyboard-controller";
import { cssInterop } from "nativewind";

cssInterop(KCKeyboardAvoidingView, { className: "style" });

export const KeyboardAvoidingView: typeof RNKeyboardAvoidingView =
  Platform.OS === "ios"
    ? RNKeyboardAvoidingView
    : (KCKeyboardAvoidingView as unknown as typeof RNKeyboardAvoidingView);
