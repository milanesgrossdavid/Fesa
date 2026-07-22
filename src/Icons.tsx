import Ionicons from '@expo/vector-icons/Ionicons';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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