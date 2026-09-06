import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DeleteIcon } from "../Icons";
import { getTranslation } from "../i18n/translations";
import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";
import LibraryArtwork from "./LibraryArtwork";

/**
 * ConfirmDeleteModal — the project's in-app confirmation dialog.
 *
 * Brand voice: calm, intentional, warm. Destructive actions are highlighted
 * with a soft rose-tinted background and a measured red label — not a
 * screaming iOS alert. Layout follows iOS Settings-app grouping:
 *
 *   count chip  →  icon  →  title  →  message  →  item card  →  actions
 *
 * Backwards compatible: every existing call site keeps working with the
 * same prop shape (`visible`, `title`, `message`, `itemName`, `artwork`,
 * `confirmLabel`, `accent`, `onClose`, `onConfirm`).
 */

type AccentTone = "white" | "danger";

interface ConfirmDeleteModalProps {
  visible: boolean;
  title?: string;
  message: string;
  itemName?: string;
  artwork?: string | null;
  confirmLabel?: string;
  /**
   * "white"  — neutral destructive (default; matches brand voice).
   * "danger" — saturated red theme, reserved for permanent/irreversible
   *            actions (file deletion, account removal).
   */
  accent?: AccentTone;
  /** Optional leading number to render as a small count chip (e.g. "3"). */
  count?: number;
  onClose: () => void;
  onConfirm: () => void;
}

const SOFT_DANGER_TINT = "rgba(244, 63, 94, 0.10)";
const SOFT_DANGER_BORDER = "rgba(244, 63, 94, 0.28)";
const SOFT_DANGER_TEXT = "#F43F5E";
const HARD_DANGER_TINT = "rgba(255, 82, 82, 0.18)";
const HARD_DANGER_BORDER = "rgba(255, 82, 82, 0.5)";
const HARD_DANGER_TEXT = "#FF5252";

const ConfirmDeleteModal = ({
  visible,
  title,
  message,
  itemName,
  artwork,
  confirmLabel,
  accent = "white",
  count,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) => {
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) =>
    getTranslation(language.id as any, key, fallback);

  const isWhiteAccent = accent === "white";
  const resolvedTitle = title ?? t("remove", "Remove");
  const resolvedConfirmLabel = confirmLabel ?? t("delete", "Delete");

  // Soft (brand) palette: a measured, warm red for white-accent variant.
  const iconBg = isWhiteAccent ? SOFT_DANGER_TINT : HARD_DANGER_TINT;
  const iconColor = isWhiteAccent ? SOFT_DANGER_TEXT : HARD_DANGER_TEXT;
  const topGradient = isWhiteAccent
    ? ["rgba(244, 63, 94, 0.10)", "rgba(244, 63, 94, 0)"]
    : ["rgba(255, 82, 82, 0.16)", "rgba(255, 82, 82, 0)"];

  // Action button colors.
  const confirmButtonBackground = isWhiteAccent
    ? theme.text
    : HARD_DANGER_TEXT;
  const confirmButtonTextColor = isWhiteAccent ? theme.background : "#ffffff";
  const confirmButtonBorder = isWhiteAccent
    ? theme.text
    : "rgba(255, 82, 82, 0.5)";

  // Entry / exit animations.
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.96);
      translateY.setValue(16);
    }
  }, [visible, fadeAnim, scaleAnim, translateY]);

  // Press feedback for action buttons.
  const confirmScale = useRef(new Animated.Value(1)).current;
  const cancelScale = useRef(new Animated.Value(1)).current;

  const animatePress = (value: Animated.Value, toValue: number) =>
    Animated.timing(value, {
      toValue,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Backdrop is mounted only once the entry animation finishes so the
            user can't accidentally tap-dismiss the modal during the first
            220 ms while it's still invisible. This also prevents the
            modal from being "swallowed" on first paint on slow devices. */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("cancel", "Cancel")}
          />
        </Animated.View>

        <View style={styles.kavWrapper} pointerEvents="box-none">
          <Animated.View
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={[
              styles.card,
              {
                backgroundColor: isWhiteAccent
                  ? theme.background
                  : "rgba(32,18,18,0.82)",
                borderColor: isWhiteAccent
                  ? theme.border
                  : HARD_DANGER_BORDER,
                shadowColor: theme.text,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateY }],
              },
            ]}
          >
            {/* Top-edge danger gradient for the strong (danger) variant only.
                The brand-voice (white) variant stays clean and minimal. */}
            {!isWhiteAccent ? (
              <LinearGradient
                pointerEvents="none"
                colors={topGradient as [string, string]}
                style={styles.topGradient}
              />
            ) : null}

            {/* Icon header with optional count chip — placed inside the
                iconCircle on Android to avoid clipping. The chip sits on the
                upper-right of the circle, fully within the card bounds. */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: iconBg,
                    borderColor: isWhiteAccent
                      ? SOFT_DANGER_BORDER
                      : HARD_DANGER_BORDER,
                  },
                ]}
              >
                {isWhiteAccent ? (
                  <DeleteIcon size={32} color={iconColor} />
                ) : (
                  <Ionicons name="trash-outline" size={36} color={iconColor} />
                )}

                {typeof count === "number" && count > 1 ? (
                  <View
                    style={[
                      styles.countChip,
                      {
                        backgroundColor: isWhiteAccent
                          ? theme.background
                          : "rgba(32,18,18,0.92)",
                        borderColor: isWhiteAccent
                          ? SOFT_DANGER_BORDER
                          : HARD_DANGER_BORDER,
                      },
                    ]}
                    accessibilityLabel={`${count} ${t(
                      "selection_selected_many",
                      "items",
                    )}`}
                  >
                    <Text
                      style={[styles.countText, { color: iconColor }]}
                      numberOfLines={1}
                    >
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Title */}
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={2}
            >
              {resolvedTitle}
            </Text>

            {/* Message — single paragraph, max 3 lines. */}
            <Text
              style={[styles.message, { color: theme.mutedText }]}
              numberOfLines={4}
            >
              {message}
            </Text>

            {/* Item preview card (optional). HIG: confirmation dialogs should
                make the target unambiguous. */}
            {itemName ? (
              <View
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isWhiteAccent
                      ? theme.border
                      : "rgba(255,255,255,0.06)",
                  },
                ]}
                accessibilityElementsHidden
              >
                {artwork !== undefined ? (
                  <LibraryArtwork
                    artwork={artwork}
                    className="mr-3 h-12 w-12 rounded-[10px]"
                    fallbackTextClassName="text-xl text-white"
                  />
                ) : (
                  <View
                    style={[
                      styles.itemPlaceholder,
                      { backgroundColor: theme.background },
                    ]}
                  >
                    <Ionicons
                      name="musical-note"
                      size={20}
                      color={theme.mutedText}
                    />
                  </View>
                )}
                <Text
                  style={[styles.itemName, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {itemName}
                </Text>
              </View>
            ) : null}

            {/* Action stack. Cancel on top, destructive on bottom — keeps
                Cancel easy to reach with the thumb and visually separates
                the safe action from the irreversible one. */}
            <View style={styles.actions}>
              <Animated.View style={{ transform: [{ scale: cancelScale }] }}>
                <Pressable
                  onPress={onClose}
                  onPressIn={() => animatePress(cancelScale, 0.985)}
                  onPressOut={() => animatePress(cancelScale, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={t("cancel", "Cancel")}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isWhiteAccent
                        ? theme.border
                        : "rgba(255,255,255,0.10)",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: theme.text },
                    ]}
                  >
                    {t("cancel", "Cancel")}
                  </Text>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={{ transform: [{ scale: confirmScale }] }}
              >
                <Pressable
                  onPress={onConfirm}
                  onPressIn={() => animatePress(confirmScale, 0.985)}
                  onPressOut={() => animatePress(confirmScale, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={resolvedConfirmLabel}
                  accessibilityHint={t(
                    "confirm_delete_hint",
                    "This action cannot be undone.",
                  )}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: confirmButtonBackground,
                      borderColor: confirmButtonBorder,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={confirmButtonTextColor}
                    style={styles.primaryButtonIcon}
                  />
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: confirmButtonTextColor },
                    ]}
                  >
                    {resolvedConfirmLabel}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kavWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 18,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
    // The card itself does not clip its children so the count chip can
    // extend slightly beyond the icon circle bounds. The top gradient is
    // positioned absolutely inside the card and gets the same radius
    // treatment.
    overflow: "hidden",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countChip: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    textAlign: "center",
  },
  itemCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  actions: {
    marginTop: 22,
    gap: 10,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  primaryButtonIcon: {
    marginRight: 8,
  },
});

export default ConfirmDeleteModal;