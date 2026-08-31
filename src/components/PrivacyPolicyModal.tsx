import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../settings/appSettings';

const PRIVACY_POLICY_ITEMS = [
  'FESA solo accede a la biblioteca local de audio del dispositivo para reproducir, organizar y gestionar tus canciones.',
  'La aplicación no sube ni comparte tu música a servidores externos ni almacena tus archivos fuera del dispositivo.',
  'Los permisos solicitados son exclusivos para leer la biblioteca local, gestionar tonos y controlar la reproducción.',
  'Los datos de configuración como temas, pestañas visibles y archivos ocultos se guardan localmente en el dispositivo.',
  'No recopilamos información personal ni perfiles de usuario para venta, publicidad o análisis externos.',
  'La app puede abrir servicios del sistema como ajustes, contacto o enlaces de soporte cuando el usuario lo solicita.',
  'Si el usuario decide ocultar canciones, la decisión se conserva solo en la configuración local de la app.',
  'FESA puede actualizar esta política para reflejar cambios funcionales o requisitos de compatibilidad con Android.',
];

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal = ({ visible, onClose }: PrivacyPolicyModalProps) => {
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
            Política de privacidad
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-sm leading-6" style={{ color: theme.mutedText }}>
              Esta política describe cómo FESA maneja la música y la configuración dentro de tu dispositivo.
            </Text>

            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
              {PRIVACY_POLICY_ITEMS.map((item, index) => (
                <View
                  key={item}
                  className="px-4 py-4"
                  style={{
                    borderBottomWidth: index === PRIVACY_POLICY_ITEMS.length - 1 ? 0 : 0.5,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text className="text-sm leading-6" style={{ color: theme.text }}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default PrivacyPolicyModal;
