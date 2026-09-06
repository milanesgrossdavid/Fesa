import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTranslation } from "../i18n/translations";
import { setSleepTimer } from "../settings/appSettings";
import {
  useAppSettingsLanguage,
  useAppSettingsTheme,
} from "../settings/appSettings";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);
const WHEEL_ITEM_HEIGHT = 36;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_PADDING = WHEEL_ITEM_HEIGHT * 2;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;
const CUSTOM_SLEEP_MIN = 1;
const CUSTOM_SLEEP_MAX = 23 * 60 + 59;
const DEFAULT_MINUTES = 20;

interface CustomSleepTimerModalProps {
  visible: boolean;
  initialMinutes?: number;
  onClose: () => void;
  onApplied?: (totalMinutes: number) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const Wheel = ({
  values,
  value,
  onChange,
  label,
  textColor,
  mutedColor,
  surfaceColor,
  accentColor,
  visible,
}: {
  values: number[];
  value: number;
  onChange: (next: number) => void;
  label: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  accentColor: string;
  visible: boolean;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const index = clamp(values.indexOf(value), 0, values.length - 1);
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: index * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectFromOffset = (offsetY: number) => {
    const index = clamp(
      Math.round(offsetY / WHEEL_ITEM_HEIGHT),
      0,
      values.length - 1,
    );
    onChange(values[index]);
  };

  return (
    <View style={styles.wheelColumn}>
      <Text style={[styles.wheelLabel, { color: mutedColor }]}>{label}</Text>
      <View
        style={[
          styles.wheelSurface,
          { backgroundColor: surfaceColor },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.wheelHighlight,
            { backgroundColor: accentColor + "22" },
          ]}
        />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onScrollBeginDrag={() => {
            isUserScrolling.current = true;
          }}
          onMomentumScrollEnd={event => {
            selectFromOffset(event.nativeEvent.contentOffset.y);
            isUserScrolling.current = false;
          }}
          onScrollEndDrag={event => {
            const offsetY = event.nativeEvent.contentOffset.y;
            const index = clamp(
              Math.round(offsetY / WHEEL_ITEM_HEIGHT),
              0,
              values.length - 1,
            );
            scrollRef.current?.scrollTo({
              y: index * WHEEL_ITEM_HEIGHT,
              animated: true,
            });
            onChange(values[index]);
          }}
          contentContainerStyle={{
            paddingVertical: WHEEL_PADDING,
          }}
        >
          {values.map(option => {
            const selected = option === value;
            return (
              <View
                key={`${label}-${option}`}
                style={[
                  styles.wheelItem,
                  { height: WHEEL_ITEM_HEIGHT},
                ]}
              >
                <Text
                  style={{
                    color: selected ? textColor : mutedColor,
                    fontSize: selected ? 26 : 18,
                    fontWeight: selected ? "600" : "400",
                    opacity: selected ? 1 : 0.5,
                  }}
                >
                  {option.toString().padStart(2, "0")}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const CustomSleepTimerModal = ({
  visible,
  initialMinutes,
  onClose,
  onApplied,
}: CustomSleepTimerModalProps) => {
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const insets = useSafeAreaInsets();
  const t = (key: string, fallback?: string) =>
    getTranslation(language.id as any, key, fallback);

  const seed = useMemo(() => {
    const m = clamp(
      Math.round(initialMinutes ?? DEFAULT_MINUTES),
      CUSTOM_SLEEP_MIN,
      CUSTOM_SLEEP_MAX,
    );
    return m;
  }, [initialMinutes]);

  const [hours, setHours] = useState(() => Math.floor(seed / 60));
  const [minutes, setMinutes] = useState(() => seed % 60);

  // Reset values whenever the modal becomes visible.
  useEffect(() => {
    if (visible) {
      setHours(Math.floor(seed / 60));
      setMinutes(seed % 60);
    }
  }, [visible, seed]);

  const totalMinutes = hours * 60 + minutes;

  // Sheet entrance animation
  const slideAnim = useRef(new Animated.Value(560)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(560);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.96);
    }
  }, [visible, slideAnim, fadeAnim, scaleAnim]);

  const previewText = useMemo(() => {
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours} h`);
    }
    parts.push(`${minutes.toString().padStart(2, "0")} min`);
    return parts.join(" ");
  }, [hours, minutes]);

  const handleApply = () => {
    if (totalMinutes < CUSTOM_SLEEP_MIN || totalMinutes > CUSTOM_SLEEP_MAX) {
      Alert.alert(
        t("select_time_invalid", "Invalid time"),
        t(
          "select_time_invalid_message",
          "Choose at least 1 minute for the timer.",
        ),
      );
      return;
    }
    setSleepTimer(totalMinutes);
    onApplied?.(totalMinutes);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("cancel", "Cancel")}
          />
        </Animated.View>

        <View
          style={styles.kavWrapper}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                paddingBottom: Math.max(insets.bottom, 16),
                backgroundColor: theme.background,
              },
            ]}
          >
            <View style={styles.handleWrapper}>
              <View
                style={[styles.handle, { backgroundColor: theme.mutedText }]}
              />
            </View>

            <View style={styles.headerRow}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("cancel", "Cancel")}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: pressed ? 0.4 : 1 },
                ]}
              >
                <Text
                  style={[styles.headerButtonText, { color: theme.accent }]}
                >
                  {t("cancel", "Cancel")}
                </Text>
              </Pressable>
              <Text
                style={[styles.title, { color: theme.text }]}
                numberOfLines={1}
              >
                {t("custom_sleep_timer", "Custom Timer")}
              </Text>
              <Pressable
                onPress={handleApply}
                accessibilityRole="button"
                accessibilityLabel={t("apply", "Apply")}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  styles.headerButtonRight,
                  { opacity: pressed ? 0.4 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.headerButtonText,
                    styles.headerButtonRightText,
                    { color: theme.accent },
                  ]}
                >
                  {t("apply", "Set")}
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.subtitle,
                { color: theme.mutedText, paddingHorizontal: 24 },
              ]}
            >
              {t(
                "custom_sleep_timer_description",
                "Pick how long until playback stops.",
              )}
            </Text>

            <View style={styles.previewWrapper}>
              <Text
                style={[
                  styles.previewLabel,
                  { color: theme.mutedText },
                ]}
              >
                {t("custom_sleep_choice", "Total duration")}
              </Text>
              <Text
                style={[
                  styles.previewValue,
                  { color: theme.text },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {previewText}
              </Text>
            </View>

            <View style={styles.wheelsRow}>
              <Wheel
                values={HOUR_OPTIONS}
                value={hours}
                onChange={setHours}
                label={t("hours", "Hours")}
                textColor={theme.text}
                mutedColor={theme.mutedText}
                surfaceColor={theme.surface}
                accentColor={theme.accent}
                visible={visible}
              />
              <View style={styles.wheelsSeparator}>
                <Text
                  style={[
                    styles.wheelsSeparatorText,
                    { color: theme.text },
                  ]}
                >
                  :
                </Text>
              </View>
              <Wheel
                values={MINUTE_OPTIONS}
                value={minutes}
                onChange={setMinutes}
                label={t("minutes", "Minutes")}
                textColor={theme.text}
                mutedColor={theme.mutedText}
                surfaceColor={theme.surface}
                accentColor={theme.accent}
                visible={visible}
              />
            </View>

            <Pressable
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel={t("apply", "Apply")}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: theme.background },
                ]}
              >
                {t("apply", "Set Timer")}
              </Text>
            </Pressable>
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
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  handleWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    opacity: 0.35,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerButton: {
    minWidth: 70,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerButtonRight: { alignItems: "flex-end" },
  headerButtonText: {
    fontSize: 17,
    fontWeight: "400",
  },
  headerButtonRightText: {
    fontWeight: "600",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 18,
    textAlign: "center",
    fontWeight: "400",
  },
  previewWrapper: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.08,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  previewValue: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1,
  },
  wheelsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginTop: 6,
  },
  wheelColumn: {
    flex: 1,
  },
  wheelLabel: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  wheelSurface: {
    height: WHEEL_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  wheelHighlight: {
    position: "absolute",
    left: 6,
    right: 6,
    top: WHEEL_PADDING - 1,
    height: WHEEL_ITEM_HEIGHT + 8,
    borderRadius: 12,
    zIndex: 0,
  },
  wheelItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelsSeparator: {
    width: 24,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 38,
  },
  wheelsSeparatorText: {
    fontSize: 30,
    fontWeight: "300",
  },
  primaryButton: {
    marginTop: 22,
    marginHorizontal: 8,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
});

export default CustomSleepTimerModal;