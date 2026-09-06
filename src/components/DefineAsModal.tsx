import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Song, ToneType } from "../../modules/local-music";
import { getTranslation } from "../i18n/translations";
import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";
import LibraryArtwork from "./LibraryArtwork";

const SHEET_RADIUS = 28;
const GROUP_RADIUS = 20;
const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 5;
const ROW_MIN_HEIGHT = 60;
const IOS_ROW_HORIZONTAL = 16;
const IOS_ROW_VERTICAL = 12;
const IOS_GAP = 8;
const HEADER_HEIGHT = 44;

interface DefineAsModalProps {
  song: Song | null;
  onClose: () => void;
  onDefineAs: (song: Song, type: ToneType) => void;
}

const SheetHandle = ({ color }: { color: string }) => (
  <View style={styles.handleWrapper}>
    <View style={[styles.handle, { backgroundColor: color }]} />
  </View>
);

interface ToneOptionMeta {
  value: ToneType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

const DefineAsModal = ({ song, onClose, onDefineAs }: DefineAsModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) =>
    getTranslation(language.id as any, key, fallback);

  const options: ToneOptionMeta[] = [
    {
      value: "ringtone",
      icon: Platform.OS === "ios" ? "phone-portrait-outline" : "call-outline",
      label: t("tone_option_ringtone", "Device tone"),
      description: t("tone_option_ringtone_desc", "Use as ringtone"),
    },
    {
      value: "alarm",
      icon: "alarm-outline",
      label: t("tone_option_alarm", "Alarm tone"),
      description: t("tone_option_alarm_desc", "Use as alarm"),
    },
  ];

  // Slide-in / fade animation matching iOS sheet presentation.
  const translateY = useRef(new Animated.Value(560)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (song) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(560);
      fadeAnim.setValue(0);
    }
  }, [song, translateY, fadeAnim]);

  return (
    <Modal
      transparent
      visible={Boolean(song)}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
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

        <View style={styles.kavWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY }],
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: theme.background,
              },
            ]}
          >
            <SheetHandle color={theme.mutedText} />

            {/* HIG toolbar: leading song info, trailing Close action. */}
            <View style={styles.header}>
              <View style={styles.headerLeading}>
                <View style={styles.headerIconCircle}>
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color={theme.accent}
                  />
                </View>
                <View style={styles.headerText}>
                  <Text
                    style={[styles.headerTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {t("define_as_title", "Set as")}
                  </Text>
                  {song ? (
                    <Text
                      style={[styles.headerSubtitle, { color: theme.mutedText }]}
                      numberOfLines={1}
                    >
                      {song.title}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("song_details_close", "Close")}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  { opacity: pressed ? 0.4 : 1 },
                ]}
              >
                <Text
                  style={[styles.closeButtonText, { color: theme.accent }]}
                >
                  {t("close", "Close")}
                </Text>
              </Pressable>
            </View>

            {song ? (
              <>
                {/* Song preview row — the iOS Music.app "Now Playing" mini header pattern. */}
                <View
                  style={[
                    styles.songRow,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  accessibilityRole="summary"
                  accessibilityLabel={`${song.title}, ${
                    song.artist?.trim() || t("unknown_artist", "Unknown artist")
                  }`}
                >
                  <LibraryArtwork
                    artwork={song.artwork}
                    className="mr-3 h-12 w-12 rounded-[10px]"
                    fallbackTextClassName="text-xl text-white"
                  />
                  <View style={styles.songMeta}>
                    <Text
                      style={[styles.songTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {song.title}
                    </Text>
                    <Text
                      style={[styles.songArtist, { color: theme.mutedText }]}
                      numberOfLines={1}
                    >
                      {song.artist?.trim() ||
                        t("unknown_artist", "Unknown artist")}
                    </Text>
                  </View>
                </View>

                {/* Grouped list of options — HIG Settings.app section pattern. */}
                <Text
                  style={[
                    styles.sectionCaption,
                    { color: theme.mutedText },
                  ]}
                >
                  {t(
                    "define_as_section_caption",
                    "Choose where to use this song",
                  ).toUpperCase()}
                </Text>

                <View
                  style={[
                    styles.optionGroup,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  {options.map((option, index) => (
                    <OptionRow
                      key={option.value}
                      option={option}
                      isLast={index === options.length - 1}
                      borderColor={theme.border}
                      textColor={theme.text}
                      mutedColor={theme.mutedText}
                      onPress={() => onDefineAs(song, option.value)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

interface OptionRowProps {
  option: ToneOptionMeta;
  isLast: boolean;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  onPress: () => void;
}

const OptionRow = ({
  option,
  isLast,
  borderColor,
  textColor,
  mutedColor,
  onPress,
}: OptionRowProps) => {
  // iOS-style press feedback (HIG ScaleButtonStyle).
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (value: number) =>
    Animated.timing(scale, {
      toValue: value,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.985)}
      onPressOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityHint={option.description}
      style={({ pressed }) => [
        styles.optionRow,
        isLast ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Animated.View
        style={[styles.optionRowContent, { transform: [{ scale }] }]}
      >
        <View
          style={[styles.optionIconWrap]}
        >
          <Ionicons
            name={option.icon}
            size={20}
            color={textColor}
          />
        </View>
        <View style={styles.optionText}>
          <Text
            style={[styles.optionLabel, { color: textColor }]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
          <Text
            style={[styles.optionDescription, { color: mutedColor }]}
            numberOfLines={1}
          >
            {option.description}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={mutedColor}
          style={{ opacity: 0.55 }}
        />
      </Animated.View>
    </Pressable>
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
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: 12,
    paddingTop: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  handleWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: 3,
    opacity: 0.32,
  },
  // HIG navigation toolbar row: 44pt height, content + trailing close.
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: HEADER_HEIGHT + 8,
  },
  headerLeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,132,255,0.12)",
    marginRight: 10,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  // HIG list row: 12/16 vertical/horizontal insets, 8 between icon and text.
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    paddingHorizontal: IOS_ROW_HORIZONTAL,
    paddingVertical: IOS_ROW_VERTICAL,
    borderRadius: GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: ROW_MIN_HEIGHT,
  },
  songMeta: { flex: 1 },
  songTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  songArtist: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "400",
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.4,
    marginTop: 20,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  optionGroup: {
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingRight: 4,
    borderRadius: GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    gap: 8,
  },
  optionRow: {
    paddingHorizontal: IOS_ROW_HORIZONTAL,
    paddingVertical: IOS_ROW_VERTICAL,
    minHeight: ROW_MIN_HEIGHT,
    justifyContent: "center",
  },
  optionRowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: IOS_GAP + 4,
    marginLeft: 8,
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
});

export default DefineAsModal;