import React from "react";
import { Pressable, View } from "react-native";
import { PlayIcon, ShuffleIcon } from "../Icons";
import { useTranslation } from "../i18n/translations";
import {
  useAppSettingsLanguage,
  useAppSettingsTheme,
} from "../settings/appSettings";
import TopNavSortFilter, {
  TrackSortDirection,
  TrackSortOption,
} from "./TopNavSortFilter";

export type { TrackSortDirection, TrackSortOption };

interface TopNavPistasProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (
    option: TrackSortOption,
    direction: TrackSortDirection,
  ) => void;
  onShufflePress: () => void;
  onPlayPress: () => void;
  disabled?: boolean;
}

const TopNavPistas = ({
  selectedSort,
  selectedDirection,
  onSortChange,
  onShufflePress,
  onPlayPress,
  disabled = false,
}: TopNavPistasProps) => {
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const { t } = useTranslation(language.id);
  const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
    { label: t("sort_name", "Name"), value: "name" },
    { label: t("sort_date", "Date"), value: "date" },
    { label: t("sort_artist", "Artist"), value: "artist" },
    { label: t("sort_albums", "Albums"), value: "albums" },
  ];

  return (
    <TopNavSortFilter
      selectedSort={selectedSort}
      selectedDirection={selectedDirection}
      onSortChange={onSortChange}
      sortOptions={SORT_OPTIONS}
      rightContent={
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-[14px] border"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
            disabled={disabled}
            onPress={onShufflePress}
            accessibilityRole="button"
            accessibilityLabel={t("shuffle", "Shuffle")}
          >
            <ShuffleIcon size={20} color={theme.text} />
          </Pressable>

          <Pressable
            className="h-10 w-10 items-center justify-center rounded-[14px] border"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
            disabled={disabled}
            onPress={onPlayPress}
            accessibilityRole="button"
            accessibilityLabel={t("play_all", "Play all")}
          >
            <PlayIcon size={20} color={theme.text} />
          </Pressable>
        </View>
      }
    />
  );
};

export default TopNavPistas;
