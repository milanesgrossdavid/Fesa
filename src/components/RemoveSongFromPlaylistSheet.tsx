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
import { Song } from "../../modules/local-music";
import { getTranslation } from "../i18n/translations";
import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";
import LibraryArtwork from "./LibraryArtwork";

const DESTRUCTIVE_RED = "#FF3B30";
const SHEET_RADIUS = 28;
const GROUP_RADIUS = 20;
const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 5;

export interface RemoveSongFromPlaylistTarget {
  playlistId: string;
  song: Song;
}

interface RemoveSongFromPlaylistSheetProps {
  visible: boolean;
  target: RemoveSongFromPlaylistTarget | null;
  onClose: () => void;
  onConfirm: (target: RemoveSongFromPlaylistTarget) => void;
}

const SheetHandle = ({ color }: { color: string }) => (
  <View style={styles.handleWrapper}>
    <View
      style={[styles.handle, { backgroundColor: color }]}
    />
  </View>
);

const ActionRow = ({
  label,
  onPress,
  destructive = false,
  textColor,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  textColor: string;
  disabled?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.985)}
      onPressOut={() => animateTo(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionRow,
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
      ]}
      className="p-4 font-semibold"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text
          style={[
            styles.actionLabel,
            {
              color: destructive ? DESTRUCTIVE_RED : textColor,
              fontWeight: destructive ? "700" : "600",
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const RemoveSongFromPlaylistSheet = ({
  visible,
  target,
  onClose,
  onConfirm,
}: RemoveSongFromPlaylistSheetProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) =>
    getTranslation(language.id as any, key, fallback);

  const translateY = useRef(new Animated.Value(560)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Slide-in / slide-out animation mirroring the iOS sheet presentation.
  useEffect(() => {
    if (visible) {
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
  }, [visible, translateY, fadeAnim]);

  const handleConfirm = () => {
    if (!target) {
      return;
    }

    onConfirm(target);
  };

  return (
    <Modal
      transparent
      visible={visible}
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

            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>
                {t("remove_from_playlist_title", "Remove from playlist")}
              </Text>
              {target ? (
                <Text
                  style={[styles.subtitle, { color: theme.mutedText }]}
                  numberOfLines={2}
                >
                  {t(
                    "remove_from_playlist_message",
                    'Do you want to remove "%name%" from this playlist?',
                  ).replace("%name%", target.song.title)}
                </Text>
              ) : null}
            </View>

            {target ? (
              <View
                style={[
                  styles.songCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <LibraryArtwork
                  artwork={target.song.artwork}
                  className="mr-3 h-12 w-12 rounded-[10px]"
                  fallbackTextClassName="text-xl text-white"
                />
                <View style={styles.songMeta}>
                  <Text
                    style={[styles.songTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {target.song.title}
                  </Text>
                  <Text
                    style={[styles.songArtist, { color: theme.mutedText }]}
                    numberOfLines={1}
                  >
                    {target.song.artist?.trim() ||
                      t("unknown_artist", "Unknown artist")}
                  </Text>
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.group,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ActionRow
                label={t("remove_action", "Remove")}
                destructive
                onPress={handleConfirm}
                textColor={theme.text}
                disabled={!target}
              />
            </View>

            <View
              style={[
                styles.cancelGroup,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ActionRow
                label={t("cancel_action", "Cancel")}
                onPress={onClose}
                textColor={theme.text}
                disabled={!target}
              />
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
  header: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,132,255,0.12)",
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "400",
  },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
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
  group: {
    marginHorizontal: 4,
    marginBottom: 10,
    borderRadius: GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cancelGroup: {
    marginHorizontal: 4,
    borderRadius: GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  actionRow: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  actionLabel: {
    fontSize: 18,
    textAlign: "center",
  },
});

export default RemoveSongFromPlaylistSheet;