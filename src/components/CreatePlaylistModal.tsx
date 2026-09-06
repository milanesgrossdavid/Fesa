import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTranslation } from "../i18n/translations";
import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";

const PLAYLIST_NAME_MAX = 60;

interface CreatePlaylistModalProps {
  visible: boolean;
  playlistName: string;
  onChangePlaylistName: (name: string) => void;
  onClose: () => void;
  onNext: () => void;
}

const CreatePlaylistModal = ({
  visible,
  playlistName,
  onChangePlaylistName,
  onClose,
  onNext,
}: CreatePlaylistModalProps) => {
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) =>
    getTranslation(language.id as any, key, fallback);

  const trimmed = playlistName.trim();
  const canContinue = trimmed.length > 0;
  const counter = trimmed.length;

  // Entrance animation (subtle fade + small upward drift)
  const slideAnim = useRef(new Animated.Value(12)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(12);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleSubmit = () => {
    if (canContinue) {
      onNext();
    }
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

        <View style={styles.kavWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: fadeAnim,
                transform: [{ translateY: Animated.multiply(slideAnim, 0.25) }],
                backgroundColor: theme.background,
              },
            ]}
          >
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
                <Text style={[styles.headerButtonText, { color: theme.accent }]}>
                  {t("cancel", "Cancel")}
                </Text>
              </Pressable>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {t("create_playlist_title", "New Playlist")}
              </Text>
              <Pressable
                onPress={handleSubmit}
                disabled={!canContinue}
                accessibilityRole="button"
                accessibilityLabel={t("choose_songs", "Choose songs")}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  styles.headerButtonRight,
                  {
                    opacity: !canContinue ? 0.35 : pressed ? 0.4 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.headerButtonText,
                    styles.headerButtonRightText,
                    { color: theme.accent },
                  ]}
                >
                  {t("create_playlist_action", "Create")}
                </Text>
              </Pressable>
            </View>

            <View style={styles.body}>
              <View
                style={[
                  styles.subtitleRow,
                  { paddingHorizontal: 16 },
                ]}
              >
                <Ionicons
                  name="musical-notes"
                  size={32}
                  color={theme.accent}
                />
                <Text style={[styles.subtitle, { color: theme.mutedText }]}>
                  {t(
                    "create_playlist_subtitle",
                    "Give your playlist a name. You can add songs next.",
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.group,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.fieldRow}>
                  <TextInput
                    autoFocus
                    value={playlistName}
                    onChangeText={onChangePlaylistName}
                    placeholder={t(
                      "playlist_name_placeholder",
                      "Playlist name",
                    )}
                    placeholderTextColor={theme.mutedText}
                    maxLength={PLAYLIST_NAME_MAX}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    selectionColor={theme.accent}
                    style={[
                      styles.input,
                      { color: theme.text },
                    ]}
                    accessibilityLabel={t("playlist_name_label", "Name")}
                  />
                </View>
              </View>

              <View style={styles.counterRow}>
                <Text
                  style={[styles.caption, { color: theme.mutedText }]}
                >
                  {`${counter}/${PLAYLIST_NAME_MAX}`}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
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
  headerButtonRight: {
    alignItems: "flex-end",
  },
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
  body: {
    paddingTop: 8,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    fontWeight: "400",
  },
  group: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    overflow: "hidden",
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  input: {
    fontSize: 17,
    fontWeight: "500",
    padding: 0,
  },
  counterRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: "flex-end",
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.08,
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

export default CreatePlaylistModal;