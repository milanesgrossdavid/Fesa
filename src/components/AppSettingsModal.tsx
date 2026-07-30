import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  acceptTerms,
  APP_THEMES,
  DEFAULT_TABS,
  moveTab,
  setCrossfadeEnabled,
  setLockScreenControlsEnabled,
  setPlaybackRate,
  setSkipSilenceBetweenTracks,
  setSleepTimer,
  setTabEnabled,
  setThemeId,
  TabId,
  useAppSettings,
} from '../settings/appSettings';

interface AppSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_TIMER_OPTIONS = [
  { label: 'Desactivado', value: null as number | null },
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '45 minutos', value: 45 },
  { label: '60 minutos', value: 60 },
];

const TERMS_TEXT = [
  '1. FESA reproduce y organiza el audio almacenado localmente en tu dispositivo.',
  '2. La app solo solicita permisos necesarios para leer tu biblioteca y aplicar funciones como tonos cuando tú lo indicas.',
  '3. El contenido reproducido sigue siendo responsabilidad de la persona usuaria.',
  '4. Puedes cambiar tus preferencias, permisos y pestañas visibles en cualquier momento desde este panel.',
  '5. Si necesitas soporte, usa la opción de contacto y te responderemos con ayuda sobre la app.',
];

const formatSpeedLabel = (speed: number) => `${speed}x`;

const formatRemainingTime = (endsAt: number | null, now: number) => {
  if (!endsAt) {
    return 'Desactivado';
  }

  const remainingMs = endsAt - now;

  if (remainingMs <= 0) {
    return 'Finalizando...';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) {
    return `${seconds}s restantes`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')} restantes`;
};

const SettingsRow = ({
  label,
  value,
  onPress,
  borderColor,
  valueColor,
}: {
  label: string;
  value: string;
  onPress: () => void;
  borderColor: string;
  valueColor: string;
}) => (
  <Pressable
    className="flex-row items-center justify-between px-4 py-4"
    style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
    onPress={onPress}
  >
    <Text className="flex-1 pr-3 text-base font-bold text-white">{label}</Text>
    <Text className="text-sm font-bold" style={{ color: valueColor }}>{value}</Text>
  </Pressable>
);

const AppSettingsModal = ({ visible, onClose }: AppSettingsModalProps) => {
  const settings = useAppSettings();
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [playbackSpeedVisible, setPlaybackSpeedVisible] = useState(false);
  const [tabsVisible, setTabsVisible] = useState(false);
  const [themesVisible, setThemesVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible || !settings.sleepTimerEndsAt) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.sleepTimerEndsAt, visible]);

  const visibleTabs = useMemo(
    () => settings.tabs.filter(tab => tab.enabled).map(tab => tab.id),
    [settings.tabs]
  );

  const openPermissions = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert('No se pudo abrir', 'Abre manualmente los ajustes del sistema para cambiar los permisos de FESA.');
    }
  };

  const openContact = async () => {
    const mailUrl = 'mailto:soporte.fesa.app@gmail.com?subject=Soporte%20FESA';

    try {
      const supported = await Linking.canOpenURL(mailUrl);

      if (!supported) {
        Alert.alert('Correo no disponible', 'Escríbenos a soporte.fesa.app@gmail.com.');
        return;
      }

      await Linking.openURL(mailUrl);
    } catch (error) {
      Alert.alert('Correo no disponible', 'Escríbenos a soporte.fesa.app@gmail.com.');
    }
  };

  const handleTabToggle = (tabId: TabId, enabled: boolean) => {
    const updated = setTabEnabled(tabId, enabled);

    if (!updated) {
      Alert.alert('Se necesita una pestaña', 'Mantén al menos una pestaña visible en la biblioteca.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 px-5 pt-12" style={{ backgroundColor: settings.theme.background }}>
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: settings.theme.text }}>Ajustes</Text>
          <Pressable onPress={onClose}>
            <Text className="text-base font-bold" style={{ color: settings.theme.accent }}>Cerrar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="mb-6">
            <Text className="mb-3 text-sm font-bold uppercase tracking-[1px]" style={{ color: settings.theme.mutedText }}>Reproducción</Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: settings.theme.surface }}>
              <SettingsRow
                label="Temporizador de apagado"
                value={formatRemainingTime(settings.sleepTimerEndsAt, now)}
                onPress={() => setSleepTimerVisible(true)}
                borderColor={settings.theme.border}
                valueColor={settings.theme.accent}
              />
              <SettingsRow
                label="Velocidad de reproducción"
                value={formatSpeedLabel(settings.playbackRate)}
                onPress={() => setPlaybackSpeedVisible(true)}
                borderColor={settings.theme.border}
                valueColor={settings.theme.accent}
              />
              <SettingsRow
                label="Transición gradual entre canciones (crossfade)"
                value={settings.crossfadeEnabled ? 'Activada' : 'Desactivada'}
                onPress={() => setCrossfadeEnabled(!settings.crossfadeEnabled)}
                borderColor={settings.theme.border}
                valueColor={settings.crossfadeEnabled ? settings.theme.accent : settings.theme.mutedText}
              />
              <SettingsRow
                label="Omitir silencio entre canciones"
                value={settings.skipSilenceBetweenTracks ? 'Activado' : 'Desactivado'}
                onPress={() => setSkipSilenceBetweenTracks(!settings.skipSilenceBetweenTracks)}
                borderColor={settings.theme.border}
                valueColor={settings.skipSilenceBetweenTracks ? settings.theme.accent : settings.theme.mutedText}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-sm font-bold uppercase tracking-[1px]" style={{ color: settings.theme.mutedText }}>Control y navegación</Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: settings.theme.surface }}>
              <SettingsRow
                label="Controlar música desde bloqueo"
                value={settings.lockScreenControlsEnabled ? 'Activado' : 'Desactivado'}
                onPress={() => setLockScreenControlsEnabled(!settings.lockScreenControlsEnabled)}
                borderColor={settings.theme.border}
                valueColor={settings.lockScreenControlsEnabled ? settings.theme.accent : settings.theme.mutedText}
              />
              <SettingsRow
                label="Administrar pestañas: eliminar y ordenar"
                value={`${visibleTabs.length}/${DEFAULT_TABS.length} visibles`}
                onPress={() => setTabsVisible(true)}
                borderColor={settings.theme.border}
                valueColor={settings.theme.accent}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-sm font-bold uppercase tracking-[1px]" style={{ color: settings.theme.mutedText }}>Apariencia</Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: settings.theme.surface }}>
              <SettingsRow
                label="Temas de personalización"
                value={settings.theme.name}
                onPress={() => setThemesVisible(true)}
                borderColor={settings.theme.border}
                valueColor={settings.theme.accent}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-sm font-bold uppercase tracking-[1px]" style={{ color: settings.theme.mutedText }}>Privacidad y soporte</Text>
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: settings.theme.surface }}>
              <SettingsRow
                label="Permisos"
                value="Abrir sistema"
                onPress={() => { void openPermissions(); }}
                borderColor={settings.theme.border}
                valueColor={settings.theme.accent}
              />
              <SettingsRow
                label="Términos y condiciones"
                value={settings.termsAcceptedAt ? 'Aceptados' : 'Revisar'}
                onPress={() => setTermsVisible(true)}
                borderColor={settings.theme.border}
                valueColor={settings.termsAcceptedAt ? settings.theme.accent : settings.theme.mutedText}
              />
              <SettingsRow
                label="Contacto"
                value="Escribir correo"
                onPress={() => { void openContact(); }}
                borderColor="transparent"
                valueColor={settings.theme.accent}
              />
            </View>
          </View>
        </ScrollView>

        <Modal transparent visible={sleepTimerVisible} animationType="fade" onRequestClose={() => setSleepTimerVisible(false)}>
          <View className="flex-1 justify-center px-6">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setSleepTimerVisible(false)} />
            <View className="rounded-3xl p-5" style={{ backgroundColor: settings.theme.surface }}>
              <Text className="text-xl font-bold" style={{ color: settings.theme.text }}>Temporizador de apagado</Text>
              <Text className="mt-2 text-sm" style={{ color: settings.theme.mutedText }}>
                La reproducción se pausará automáticamente cuando se cumpla el tiempo elegido.
              </Text>
              <View className="mt-5 gap-3">
                {SLEEP_TIMER_OPTIONS.map(option => (
                  <Pressable
                    key={option.label}
                    className="rounded-2xl px-4 py-4"
                    style={{ backgroundColor: settings.theme.background }}
                    onPress={() => {
                      setSleepTimer(option.value);
                      setNow(Date.now());
                      setSleepTimerVisible(false);
                    }}
                  >
                    <Text className="font-bold" style={{ color: option.value === null ? settings.theme.text : settings.theme.accent }}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={playbackSpeedVisible} animationType="fade" onRequestClose={() => setPlaybackSpeedVisible(false)}>
          <View className="flex-1 justify-center px-6">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setPlaybackSpeedVisible(false)} />
            <View className="rounded-3xl p-5" style={{ backgroundColor: settings.theme.surface }}>
              <Text className="text-xl font-bold" style={{ color: settings.theme.text }}>Velocidad de reproducción</Text>
              <Text className="mt-2 text-sm" style={{ color: settings.theme.mutedText }}>
                El cambio se aplica al instante en la canción actual y en las siguientes.
              </Text>
              <View className="mt-5 gap-3">
                {PLAYBACK_SPEED_OPTIONS.map(speed => (
                  <Pressable
                    key={speed}
                    className="rounded-2xl px-4 py-4"
                    style={{ backgroundColor: speed === settings.playbackRate ? settings.theme.accent : settings.theme.background }}
                    onPress={() => {
                      setPlaybackRate(speed);
                      setPlaybackSpeedVisible(false);
                    }}
                  >
                    <Text className="font-bold" style={{ color: speed === settings.playbackRate ? '#ffffff' : settings.theme.text }}>
                      {formatSpeedLabel(speed)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={tabsVisible} animationType="slide" onRequestClose={() => setTabsVisible(false)}>
          <View className="flex-1 justify-end bg-black/70">
            <View className="max-h-[82%] rounded-t-[32px] px-5 pb-6 pt-5" style={{ backgroundColor: settings.theme.background }}>
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-bold" style={{ color: settings.theme.text }}>Administrar pestañas</Text>
                  <Text className="mt-1 text-sm" style={{ color: settings.theme.mutedText }}>
                    Oculta pestañas o reordénalas. Siempre debe quedar una visible.
                  </Text>
                </View>
                <Pressable onPress={() => setTabsVisible(false)}>
                  <Text className="font-bold" style={{ color: settings.theme.accent }}>Cerrar</Text>
                </Pressable>
              </View>

              <ScrollView>
                {settings.tabs.map((tab, index) => (
                  <View key={tab.id} className="mb-3 rounded-2xl px-4 py-4" style={{ backgroundColor: settings.theme.surface }}>
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-base font-bold" style={{ color: settings.theme.text }}>{tab.id}</Text>
                        <Text className="mt-1 text-sm" style={{ color: settings.theme.mutedText }}>
                          {tab.enabled ? 'Visible en la barra superior' : 'Oculta de la navegación'}
                        </Text>
                      </View>
                      <Pressable
                        className="rounded-full px-4 py-2"
                        style={{ backgroundColor: tab.enabled ? settings.theme.accent : settings.theme.border }}
                        onPress={() => handleTabToggle(tab.id, !tab.enabled)}
                      >
                        <Text className="text-xs font-bold text-white">{tab.enabled ? 'Ocultar' : 'Mostrar'}</Text>
                      </Pressable>
                    </View>
                    <View className="mt-4 flex-row gap-3">
                      <Pressable
                        className="flex-1 rounded-full px-4 py-3"
                        style={{ backgroundColor: settings.theme.background, opacity: index === 0 ? 0.45 : 1 }}
                        disabled={index === 0}
                        onPress={() => moveTab(tab.id, 'left')}
                      >
                        <Text className="text-center font-bold" style={{ color: settings.theme.text }}>Mover izquierda</Text>
                      </Pressable>
                      <Pressable
                        className="flex-1 rounded-full px-4 py-3"
                        style={{ backgroundColor: settings.theme.background, opacity: index === settings.tabs.length - 1 ? 0.45 : 1 }}
                        disabled={index === settings.tabs.length - 1}
                        onPress={() => moveTab(tab.id, 'right')}
                      >
                        <Text className="text-center font-bold" style={{ color: settings.theme.text }}>Mover derecha</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={themesVisible} animationType="fade" onRequestClose={() => setThemesVisible(false)}>
          <View className="flex-1 justify-center px-6">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setThemesVisible(false)} />
            <View className="rounded-3xl p-5" style={{ backgroundColor: settings.theme.surface }}>
              <Text className="text-xl font-bold" style={{ color: settings.theme.text }}>Temas de personalización</Text>
              <Text className="mt-2 text-sm" style={{ color: settings.theme.mutedText }}>
                Cambia el color de acento y el estilo principal de la app.
              </Text>
              <View className="mt-5 gap-3">
                {APP_THEMES.map(themeOption => (
                  <Pressable
                    key={themeOption.id}
                    className="rounded-2xl border px-4 py-4"
                    style={{
                      backgroundColor: themeOption.surface,
                      borderColor: themeOption.id === settings.theme.id ? settings.theme.accent : themeOption.border,
                    }}
                    onPress={() => {
                      setThemeId(themeOption.id);
                      setThemesVisible(false);
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-bold" style={{ color: themeOption.text }}>{themeOption.name}</Text>
                      <View className="h-5 w-5 rounded-full" style={{ backgroundColor: themeOption.accent }} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={termsVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setTermsVisible(false)}>
          <View className="flex-1 px-5 pt-12" style={{ backgroundColor: settings.theme.background }}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-2xl font-bold" style={{ color: settings.theme.text }}>Términos y condiciones</Text>
              <Pressable onPress={() => setTermsVisible(false)}>
                <Text className="text-base font-bold" style={{ color: settings.theme.accent }}>Cerrar</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              <Text className="mb-4 text-sm leading-6" style={{ color: settings.theme.mutedText }}>
                Estos términos resumen el uso básico de FESA y cómo se comportan sus funciones principales dentro del dispositivo.
              </Text>
              {TERMS_TEXT.map(item => (
                <View key={item} className="mb-3 rounded-2xl px-4 py-4" style={{ backgroundColor: settings.theme.surface }}>
                  <Text className="text-sm leading-6" style={{ color: settings.theme.text }}>{item}</Text>
                </View>
              ))}
              <Pressable
                className="mt-4 rounded-full py-4"
                style={{ backgroundColor: settings.theme.accent }}
                onPress={() => {
                  acceptTerms();
                  setTermsVisible(false);
                }}
              >
                <Text className="text-center font-bold text-white">Aceptar términos</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default AppSettingsModal;
