import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { useAppSettingsTheme } from '../settings/appSettings';
import MicroPressable from './MicroPressable';

interface SelectionRadioButtonProps {
  selected: boolean;
  label?: string;
  onPress?: () => void;
}

const SelectionRadioButton = ({
  selected,
  label,
  onPress,
}: SelectionRadioButtonProps) => {
  const theme = useAppSettingsTheme();
  const content = (
    <>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? theme.accent : theme.mutedText}
      />
      {label ? (
        <Text className="ml-2 text-sm font-bold" style={{ color: theme.text }}>
          {label}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        className={label ? 'mb-2 flex-row items-center rounded-[16px] px-2 py-1' : 'h-7 w-7 items-center justify-center'}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        {content}
      </View>
    );
  }

  return (
    <MicroPressable
      className="mb-2 flex-row items-center rounded-[16px] px-2 py-1"
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      {content}
    </MicroPressable>
  );
};

export default SelectionRadioButton;
