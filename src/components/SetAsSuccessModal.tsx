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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Song, ToneType } from "../../modules/local-music";
import { getTranslation } from "../i18n/translations";
import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";
import LibraryArtwork from "./LibraryArtwork";

/**
 * SetAsSuccessModal — the in-app success dialog shown after a song has
 * been set as a ringtone, contact tone, or alarm tone.
 *
 * Brand voice: celebratory but understated. The success state is an
 * affirmation, not a permission request — the user has already done the
 * work. So the visual treatment is "earned calm": a soft green check
 * inside a circle, a single line of congratulations, a small item card
 * for context, and a single primary action.
 *
 * Animation: a subtle scale-and-fade entry (matches the rest of the app)
 * with a self-dismissing check-mark draw.
 */

type ToneKind = "ringtone" | "contact" | "alarm";

interface SetAsSuccessModalProps {
  visible: boolean;
  song: Song | null;
  tone: ToneKind;
  onClose: () => void;
}

const SUCCESS_TINT = "rgba(48, 209, 88, 0.12)";
const SUCCESS_BORDER = "rgba(48, 209, 88, 0.32)";
const SUCCESS_GREEN = "#30D158";

const TONE_META: Record<
  ToneKind,
  { icon: keyof typeof Ionicons.glyphMap; labelKey: string; fallback: string }
> = {
  ringtone: {
    icon: "phone-portrait-outline",
    labelKey: "device_tone",
    fallback: "device tone",
  },
  contact: {
    icon: "person-outline",
    labelKey: "contact_tone",
    fallback: "contact tone",
  },
  alarm: {
    icon: "alarm-outline",
    labelKey: "alarm_tone",
    fallback: "alarm tone",
  },
};

const SetAsSuccessModal = ({
  visible,
  song,
  tone,
  onClose,
}: SetAsSuccessModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) =>
    getTranslation(language.id as any, key, fallback);

  // Card entry animation.
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  // Checkmark ring fill (stretches around the icon circle).
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.spring(ringScale, {
              toValue: 1,
              friction: 5,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      translateY.setValue(20);
      ringScale.setValue(0.6);
      ringOpacity.setValue(0);
    }
  }, [visible, fadeAnim, scaleAnim, translateY, ringScale, ringOpacity]);

  // Press feedback for the primary button.
  const primaryScale = useRef(new Animated.Value(1)).current;
  const animatePress = (value: Animated.Value, toValue: number) =>
    Animated.timing(value, {
      toValue,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  const meta = TONE_META[tone];
  const toneLabel = t(meta.labelKey, meta.fallback);
  const titleText = t(
    "set_as_success_title",
    "You\u2019re all set",
  );
  const messageText = t(
    "set_as_success_message",
    '"%name%" is now your %tone%.',
  ).replace("%name%", song?.title ?? "").replace("%tone%", toneLabel);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("done", "Done")}
          />
        </Animated.View>

        <View style={styles.kavWrapper} pointerEvents="box-none">
          <Animated.View
            accessibilityRole="alert"
            accessibilityViewIsModal
            accessibilityLabel={`${titleText} ${messageText}`}
            style={[
              styles.card,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                shadowColor: theme.text,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateY }],
              },
            ]}
          >
            {/* Soft top-edge success gradient */}
            <LinearGradient
              pointerEvents="none"
              colors={[SUCCESS_TINT, "rgba(48, 209, 88, 0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.topGradient}
            />

            {/* Animated success ring + checkmark icon */}
            <View style={styles.header}>
              <View
                style={[
                  styles.ringOuter,
                  {
                    borderColor: SUCCESS_BORDER,
                    backgroundColor: SUCCESS_TINT,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.ringInner,
                    {
                      backgroundColor: SUCCESS_GREEN,
                      borderColor: SUCCESS_GREEN,
                      transform: [{ scale: ringScale }],
                      opacity: ringOpacity,
                    },
                  ]}
                />
                <Ionicons
                  name="checkmark"
                  size={36}
                  color="#ffffff"
                  style={styles.checkmark}
                />
              </View>
            </View>

            {/* Title */}
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={2}
            >
              {titleText}
            </Text>

            {/* Message */}
            <Text
              style={[styles.message, { color: theme.mutedText }]}
              numberOfLines={3}
            >
              {messageText}
            </Text>

            {/* Item preview card */}
            {song ? (
              <View
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                accessibilityElementsHidden
              >
                <LibraryArtwork
                  artwork={song.artwork}
                  className="mr-3 h-12 w-12 rounded-[10px]"
                  fallbackTextClassName="text-xl text-white"
                />
                <View style={styles.itemMeta}>
                  <Text
                    style={[styles.itemTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {song.title}
                  </Text>
                  <View style={styles.itemBadge}>
                    <Ionicons
                      name={meta.icon}
                      size={11}
                      color={theme.text}
                    />
                    <Text
                      style={[styles.itemBadgeText, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {toneLabel}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Primary action */}
            <View style={styles.actions}>
              <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
                <Pressable
                  onPress={onClose}
                  onPressIn={() => animatePress(primaryScale, 0.97)}
                  onPressOut={() => animatePress(primaryScale, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={t("done", "Done")}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: theme.text,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.background}
                    style={styles.primaryIcon}
                  />
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: theme.background },
                    ]}
                  >
                    {t("done", "Done")}
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
    paddingTop: 32,
    paddingBottom: 18,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
    overflow: "hidden",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  ringOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 36,
    borderWidth: 1,
  },
  checkmark: {
    // The checkmark sits above the animated ring fill.
    zIndex: 2,
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
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemMeta: { flex: 1 },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    alignSelf: "flex-start",
  },
  itemBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  actions: {
    marginTop: 22,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
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
  primaryIcon: {
    marginRight: 8,
  },
});

export default SetAsSuccessModal;