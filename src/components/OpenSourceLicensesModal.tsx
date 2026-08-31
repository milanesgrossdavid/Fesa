import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../settings/appSettings';

const LICENSES = [
  {
    title: 'Expo',
    text: 'FESA está basado en la plataforma Expo y sus módulos nativos para entrega rápida, compatibilidad y rendimiento en Android.',
  },
  {
    title: 'React Native',
    text: 'La interfaz se construye con React Native y su motor de render para experiencias nativas en móvil.',
  },
  {
    title: 'Async Storage',
    text: 'La persistencia de ajustes y listas de música oculta utiliza almacenamiento local del dispositivo para mantener la configuración entre sesiones.',
  },
  {
    title: 'Expo Vector Icons',
    text: 'Los iconos de la app se apoyan en bibliotecas de iconografía vectorial con estilo nativo para iOS y Android.',
  },
  {
    title: 'NativeWind',
    text: 'El diseño visual usa utilidades de Tailwind en React Native para acelerar la composición de interfaces y mantener consistencia.',
  },
];

interface OpenSourceLicensesModalProps {
  visible: boolean;
  onClose: () => void;
}

const OpenSourceLicensesModal = ({ visible, onClose }: OpenSourceLicensesModalProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[85%] rounded-t-[32px] px-5 pb-6 pt-3"
          style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: `${theme.text}40` }} />
          </View>

          <Text className="mb-4 text-center text-xl font-bold" style={{ color: theme.text }}>
            Licencias de código abierto
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
              {LICENSES.map((license, index) => (
                <View
                  key={license.title}
                  className="px-4 py-4"
                  style={{
                    borderBottomWidth: index === LICENSES.length - 1 ? 0 : 0.5,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text className="mb-1 text-base font-bold" style={{ color: theme.text }}>{license.title}</Text>
                  <Text className="text-sm leading-6" style={{ color: theme.mutedText }}>{license.text}</Text>
                </View>
              ))}
            </View>

            <Text className="mt-4 text-center text-xs leading-5" style={{ color: theme.mutedText }}>
              Este listado resume las principales dependencias y licencias de soporte utilizadas para construir FESA.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default OpenSourceLicensesModal;
