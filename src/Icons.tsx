import Ionicons from '@expo/vector-icons/Ionicons';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

interface IconProps {
  size?: number;
  color?: string;
}

export const FilterIcon = ({ size, color }: IconProps) => (
  <Ionicons name="filter-outline" size={size} color={color} />
);

export const ShuffleIcon = ({ size, color }: IconProps) => (
  <Ionicons name="shuffle-outline" size={size} color={color} />
);

export const RepeatOffbackIcon = ({ size, color }: IconProps) => (
  <MaterialCommunityIcons name="repeat-off" size={size} color={color} />
);

export const RepeatAllIcon = ({ size, color }: IconProps) => (
  <MaterialCommunityIcons name="repeat" size={size} color={color} />
);

export const RepeatOnceIcon = ({ size, color }: IconProps) => (
  <MaterialCommunityIcons name="repeat-once" size={size} color={color} />
);

export const PlayIcon = ({ size, color }: IconProps) => (
  <Ionicons name="play" size={size} color={color} />
);

export const SortAscIcon = ({ size, color }: IconProps) => (
  <Octicons name="sort-asc" size={size} color={color}  />
);

export const SortDescIcon = ({ size, color }: IconProps) => (
    <Octicons name="sort-desc" size={size} color={color}  />
);

export const SearchIcon = ({ size, color }: IconProps) => (
    <Ionicons name="search" size={size} color={color} />
);

export const DotsIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="dots-vertical" size={size} color={color} />
);

export const SettingsIcon = ({ size, color }: IconProps) => (
    <Ionicons name="settings-outline" size={size} color={color} />
);

export const MusicPlayedIcon = ({ size, color }: IconProps) => (
    <Ionicons name="settings-outline" size={size} color={color} />
);

export const FavoritedIcon = ({ size, color }: IconProps) => (
    <Ionicons name="star" size={size} color={color} />
);

export const UnfavoritedIcon = ({ size, color }: IconProps) => (
    <Ionicons name="star-outline" size={size} color={color} />
);

export const PlusIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="plus" size={size} color={color}  />
);

export const ShareIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="share-variant-outline" size={size} color={color} />
);

export const DeleteIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="delete-outline" size={size} color={color} />
);

export const CheckIcon = ({ size = 24, color = '#f5f5f5' }: IconProps) => (
    <MaterialCommunityIcons name="check-circle" size={size} color={color} />
);

export const EditIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="circle-edit-outline" size={size} color={color} />
);

export const PlaylistIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="playlist-music-outline" size={size} color={color} />
);

export const BackIcon = ({ size, color }: IconProps) => (
    <Ionicons name="chevron-back" size={size} color={color} />
);

export const ImageIcon = ({ size, color }: IconProps) => (
    <Ionicons name="image-outline" size={size} color={color} />
);

export const LockScreenIcon = ({ size, color }: IconProps) => (
    <MaterialCommunityIcons name="lock-outline" size={size} color={color} />
);

export const BackwardIcon = ({ size, color }: IconProps) => (
    <FontAwesome5 name="backward" size={size} color={color} />
);

export const ForwardIcon = ({ size, color }: IconProps) => (
    <FontAwesome5 name="forward" size={size} color={color} />
);

export const VolumeLowIcon = ({ size, color }: IconProps) => (
    <Ionicons name="volume-low" size={size} color={color} />
);

export const VolumeHighIcon = ({ size, color }: IconProps) => (
    <Ionicons name="volume-high" size={size} color={color} />
);

export const DragHandleIcon = ({ size, color }: IconProps) => (
  <Ionicons name="menu-outline" size={size} color={color} />
);




