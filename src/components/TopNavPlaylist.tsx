import React from "react";
import { Pressable, Text } from "react-native";
import { PlusIcon } from "../Icons";
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

interface TopNavPlaylistProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (
    option: TrackSortOption,
    direction: TrackSortDirection,
  ) => void;
  onCreatePlaylist?: () => void;
}

const TopNavPlaylist = ({
  selectedSort,
  selectedDirection,
  onSortChange,
  onCreatePlaylist,
}: TopNavPlaylistProps) => {
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const { t } = useTranslation(language.id);
  const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
    { label: t("sort_name", "Name"), value: "name" },
    { label: t("sort_date", "Date"), value: "date" },
  ];

  return (
    <TopNavSortFilter
      selectedSort={selectedSort}
      selectedDirection={selectedDirection}
      onSortChange={onSortChange}
      sortOptions={SORT_OPTIONS}
      rightContent={
        onCreatePlaylist ? (
          <Pressable
            className="flex-row items-center justify-center rounded-full border p-2.5"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
            onPress={onCreatePlaylist}
            accessibilityRole="button"
            accessibilityLabel={t("create_playlist", "Create playlist")}
          >
            <PlusIcon size={22} color={theme.text} />
          </Pressable>
        ) : null
      }
    />
  );
};

export default TopNavPlaylist;
