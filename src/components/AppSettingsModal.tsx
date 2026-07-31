import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  acceptTerms,
  APP_THEMES,
  DEFAULT_TABS,
  reorderTabs,
  setCrossfadeEnabled,
  setLockScreenControlsEnabled,
  setPlaybackRate,
  setSkipSilenceBetweenTracks,
  setSleepTimer,
  setTabEnabled,
  setThemeId,
  TabId,
  TabPreference,
  useAppSettings,
} from '../settings/appSettings';
import { BackIcon, CheckIcon } from '../Icons';

interface AppSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SETTINGS_ACCENT = '#ffffff';
const SETTINGS_ACCENT_SOFT = 'rgba(255,255,255,0.12)';
const TAB_ROW_HEIGHT = 72;
const TAB_ROW_GAP = 10;
const TAB_ROW_STRIDE = TAB_ROW_HEIGHT + TAB_ROW_GAP;

const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const PRESET_SLEEP_TIMER_VALUES = [15, 30, 45, 60] as const;
const SLEEP_TIMER_OPTIONS = [
  { label: 'Desactivado', value: null as number | null },
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '45 minutos', value: 45 },
  { label: '60 minutos', value: 60 },
];
const CUSTOM_SLEEP_MIN = 1;
const CUSTOM_SLEEP_MAX = 23 * 60 + 59;
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);

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

const SheetHandle = () => (
  <View className="mb-4 items-center">
    <View className="h-1 w-10 rounded-full bg-white/20" />
  </View>
);

const SettingsToggle = ({
  value,
  trackOff,
  knobOn,
}: {
  value: boolean;
  trackOff: string;
  knobOn: string;
}) => (
  <View
    className="h-7 w-12 justify-center rounded-full px-0.5"
    style={{ backgroundColor: value ? SETTINGS_ACCENT : trackOff }}
  >
    <View
      className="h-6 w-6 rounded-full"
      style={{
        backgroundColor: value ? knobOn : SETTINGS_ACCENT,
        alignSelf: value ? 'flex-end' : 'flex-start',
      }}
    />
  </View>
);

const SettingsRow = ({
  label,
  subtitle,
  value,
  onPress,
  borderColor,
  textColor,
  mutedColor,
  showChevron,
  toggleValue,
  knobOn,
}: {
  label: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  showChevron?: boolean;
  toggleValue?: boolean;
  knobOn: string;
}) => (
  <Pressable
    className="flex-row items-center px-4 py-4"
    style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
    onPress={onPress}
  >
    <View className="flex-1 pr-3">
      <Text className="text-base font-bold" style={{ color: textColor }}>{label}</Text>
      {subtitle ? (
        <Text className="mt-0.5 text-xs" style={{ color: mutedColor }} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {typeof toggleValue === 'boolean' ? (
      <SettingsToggle value={toggleValue} trackOff={borderColor} knobOn={knobOn} />
    ) : (
      <View className="flex-row items-center gap-1">
        {value ? (
          <Text className="max-w-[140px] text-sm font-bold" style={{ color: SETTINGS_ACCENT }} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={mutedColor} />
        ) : null}
      </View>
    )}
  </Pressable>
);

const VerticalWheelPicker = ({
  values,
  value,
  visible,
  onChange,
  label,
  textColor,
  mutedColor,
  background,
}: {
  values: number[];
  value: number;
  visible: boolean;
  onChange: (next: number) => void;
  label: string;
  textColor: string;
  mutedColor: string;
  background: string;
}) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const index = Math.max(0, values.indexOf(value));
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: false });
    }, 50);

    return () => clearTimeout(timeout);
    // Solo al abrir el modal, para no pelear con el gesto del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectFromOffset = (offsetY: number) => {
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT))
    );
    onChange(values[index]);
  };

  return (
    <View className="flex-1">
      <Text className="mb-2 text-center text-xs font-bold uppercase tracking-[1px]" style={{ color: mutedColor }}>
        {label}
      </Text>
      <View className="overflow-hidden rounded-2xl" style={{ height: WHEEL_HEIGHT, backgroundColor: background }}>
        <View
          pointerEvents="none"
          className="absolute left-2 right-2 z-10 rounded-xl"
          style={{
            top: WHEEL_ITEM_HEIGHT * 2,
            height: WHEEL_ITEM_HEIGHT,
            backgroundColor: SETTINGS_ACCENT_SOFT,
          }}
        />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={event => {
            selectFromOffset(event.nativeEvent.contentOffset.y);
          }}
          onScrollEndDrag={event => {
            const offsetY = event.nativeEvent.contentOffset.y;
            const index = Math.max(
              0,
              Math.min(values.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT))
            );
            scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
            onChange(values[index]);
          }}
          contentContainerStyle={{
            paddingVertical: WHEEL_ITEM_HEIGHT * 2,
          }}
        >
          {values.map(option => {
            const selected = option === value;

            return (
              <View
                key={`${label}-${option}`}
                className="items-center justify-center"
                style={{ height: WHEEL_ITEM_HEIGHT }}
              >
                <Text
                  className="text-center font-bold"
                  style={{
                    color: selected ? textColor : mutedColor,
                    fontSize: selected ? 22 : 16,
                    opacity: selected ? 1 : 0.45,
                  }}
                >
                  {option.toString().padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const OptionSheet = ({
  visible,
  title,
  subtitle,
  background,
  surface,
  textColor,
  mutedColor,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  background: string;
  surface: string;
  textColor: string;
  mutedColor: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end">
      <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
      <View className="rounded-t-[32px] px-5 pb-8 pt-3" style={{ backgroundColor: background }}>
        <SheetHandle />
        <View className="mb-5 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-xl font-bold" style={{ color: textColor }}>{title}</Text>
            {subtitle ? (
              <Text className="mt-1 text-sm" style={{ color: mutedColor }}>{subtitle}</Text>
            ) : null}
          </View>
          <Pressable onPress={onClose}>
            <Text className="font-bold" style={{ color: SETTINGS_ACCENT }}>Cerrar</Text>
          </Pressable>
        </View>
        <View style={{ backgroundColor: surface, borderRadius: 20, overflow: 'hidden' }}>
          {children}
        </View>
      </View>
    </View>
  </Modal>
);

const DraggableTabsList = ({
  tabs,
  surface,
  background,
  textColor,
  mutedColor,
  borderColor,
  onToggle,
  onReorder,
}: {
  tabs: TabPreference[];
  surface: string;
  background: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  onToggle: (tabId: TabId, enabled: boolean) => void;
  onReorder: (orderedIds: TabId[]) => void;
}) => {
  const [orderedTabs, setOrderedTabs] = useState(tabs);
  const [draggingId, setDraggingId] = useState<TabId | null>(null);
  const dragOffset = useRef(new Animated.Value(0)).current;
  const originIndexRef = useRef(0);
  const originListRef = useRef(tabs);
  const orderedTabsRef = useRef(orderedTabs);
  const tabsRef = useRef(tabs);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    if (!draggingId) {
      setOrderedTabs(tabs);
    }
  }, [tabs, draggingId]);

  useEffect(() => {
    orderedTabsRef.current = orderedTabs;
  }, [orderedTabs]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  const moveItem = (from: number, to: number, list: TabPreference[]) => {
    if (from === to || to < 0 || to >= list.length) {
      return list;
    }

    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const handleResponders = useMemo(() => {
    const responders = new Map<TabId, ReturnType<typeof PanResponder.create>>();

    for (const defaultTab of DEFAULT_TABS) {
      const tabId = defaultTab.id;

      responders.set(
        tabId,
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            const index = orderedTabsRef.current.findIndex(tab => tab.id === tabId);

            if (index < 0) {
              return;
            }

            originIndexRef.current = index;
            originListRef.current = orderedTabsRef.current;
            dragOffset.setValue(0);
            setDraggingId(tabId);
          },
          onPanResponderMove: (_, gesture) => {
            const originIndex = originIndexRef.current;
            const targetIndex = Math.max(
              0,
              Math.min(
                originListRef.current.length - 1,
                Math.round((originIndex * TAB_ROW_STRIDE + gesture.dy) / TAB_ROW_STRIDE)
              )
            );
            const next = moveItem(originIndex, targetIndex, originListRef.current);
            setOrderedTabs(next);
            dragOffset.setValue(originIndex * TAB_ROW_STRIDE + gesture.dy - targetIndex * TAB_ROW_STRIDE);
          },
          onPanResponderRelease: () => {
            const nextOrder = orderedTabsRef.current.map(tab => tab.id);
            setDraggingId(null);
            dragOffset.setValue(0);
            onReorderRef.current(nextOrder);
          },
          onPanResponderTerminate: () => {
            setDraggingId(null);
            dragOffset.setValue(0);
            setOrderedTabs(tabsRef.current);
          },
        })
      );
    }

    return responders;
  }, [dragOffset]);

  return (
    <View style={{ height: orderedTabs.length * TAB_ROW_STRIDE - TAB_ROW_GAP }}>
      {orderedTabs.map((tab, index) => {
        const isDragging = draggingId === tab.id;
        const handleResponder = handleResponders.get(tab.id);

        return (
          <Animated.View
            key={tab.id}
            className="absolute left-0 right-0 overflow-hidden rounded-3xl px-4"
            style={{
              height: TAB_ROW_HEIGHT,
              top: index * TAB_ROW_STRIDE,
              backgroundColor: surface,
              zIndex: isDragging ? 10 : 1,
              elevation: isDragging ? 8 : 0,
              opacity: draggingId && !isDragging ? 0.65 : 1,
              transform: isDragging ? [{ translateY: dragOffset }, { scale: 1.02 }] : [],
              borderWidth: isDragging ? 1 : 0,
              borderColor: SETTINGS_ACCENT,
            }}
          >
            <View className="flex-1 flex-row items-center">
              <View
                className="mr-3 h-10 w-8 items-center justify-center"
                {...(handleResponder?.panHandlers ?? {})}
              >
                <View className="gap-1">
                  <View className="h-0.5 w-5 rounded-full" style={{ backgroundColor: mutedColor }} />
                  <View className="h-0.5 w-5 rounded-full" style={{ backgroundColor: mutedColor }} />
                  <View className="h-0.5 w-5 rounded-full" style={{ backgroundColor: mutedColor }} />
                </View>
              </View>

              <View className="flex-1 pr-3">
                <Text className="text-base font-bold" style={{ color: textColor }}>{tab.id}</Text>
                <Text className="mt-1 text-sm" style={{ color: mutedColor }}>
                  {tab.enabled ? 'Visible en la barra superior' : 'Oculta de la navegación'}
                </Text>
              </View>

              <Pressable onPress={() => onToggle(tab.id, !tab.enabled)}>
                <SettingsToggle value={tab.enabled} trackOff={borderColor} knobOn={background} />
              </Pressable>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const AppSettingsModal = ({ visible, onClose }: AppSettingsModalProps) => {
  const insets = useSafeAreaInsets();
  const settings = useAppSettings();
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [customSleepVisible, setCustomSleepVisible] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(20);
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

  const openCustomSleepTimer = () => {
    const remainingMinutes = settings.sleepTimerEndsAt
      ? Math.max(1, Math.ceil((settings.sleepTimerEndsAt - Date.now()) / 60000))
      : 20;
    const isPreset = PRESET_SLEEP_TIMER_VALUES.some(
      value => Math.abs(remainingMinutes - value) <= 1
    );

    const seedMinutes = Math.min(
      CUSTOM_SLEEP_MAX,
      settings.sleepTimerEndsAt && !isPreset ? remainingMinutes : 20
    );
    setCustomHours(Math.floor(seedMinutes / 60));
    setCustomMinutes(seedMinutes % 60);
    setCustomSleepVisible(true);
  };

  const applyCustomSleepTimer = () => {
    const totalMinutes = customHours * 60 + customMinutes;

    if (totalMinutes < CUSTOM_SLEEP_MIN || totalMinutes > CUSTOM_SLEEP_MAX) {
      Alert.alert(
        'Tiempo no válido',
        'Elige al menos 1 minuto para el temporizador.'
      );
      return;
    }

    setSleepTimer(totalMinutes);
    setNow(Date.now());
    setCustomSleepVisible(false);
    setSleepTimerVisible(false);
  };

  const theme = settings.theme;
  const rowProps = {
    borderColor: theme.border,
    textColor: theme.text,
    mutedColor: theme.mutedText,
    knobOn: theme.background,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: insets.bottom,
        }}
      >
        <View className="mb-2 flex-row items-center px-4 py-2">
          <Pressable
            className="mr-2 h-10 w-10 items-center justify-center rounded-full"
            onPress={onClose}
          >
            <BackIcon size={24} color={theme.text} />
          </Pressable>
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>Ajustes</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <View className="mb-6">
            <Text className="mb-3 text-xs font-bold uppercase tracking-[1.5px]" style={{ color: theme.mutedText }}>
              Reproducción
            </Text>
            <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <SettingsRow
                label="Temporizador de apagado"
                subtitle={formatRemainingTime(settings.sleepTimerEndsAt, now)}
                onPress={() => setSleepTimerVisible(true)}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Velocidad de reproducción"
                value={formatSpeedLabel(settings.playbackRate)}
                onPress={() => setPlaybackSpeedVisible(true)}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Transición gradual"
                subtitle="Crossfade entre canciones"
                onPress={() => setCrossfadeEnabled(!settings.crossfadeEnabled)}
                toggleValue={settings.crossfadeEnabled}
                {...rowProps}
              />
              <SettingsRow
                label="Omitir silencio"
                subtitle="Entre canciones"
                onPress={() => setSkipSilenceBetweenTracks(!settings.skipSilenceBetweenTracks)}
                borderColor="transparent"
                textColor={theme.text}
                mutedColor={theme.mutedText}
                knobOn={theme.background}
                toggleValue={settings.skipSilenceBetweenTracks}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-xs font-bold uppercase tracking-[1.5px]" style={{ color: theme.mutedText }}>
              Control y navegación
            </Text>
            <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <SettingsRow
                label="Controles en bloqueo"
                subtitle="Desde la pantalla de bloqueo"
                onPress={() => setLockScreenControlsEnabled(!settings.lockScreenControlsEnabled)}
                toggleValue={settings.lockScreenControlsEnabled}
                {...rowProps}
              />
              <SettingsRow
                label="Administrar pestañas"
                subtitle={`${visibleTabs.length}/${DEFAULT_TABS.length} visibles`}
                onPress={() => setTabsVisible(true)}
                borderColor="transparent"
                textColor={theme.text}
                mutedColor={theme.mutedText}
                knobOn={theme.background}
                showChevron
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-xs font-bold uppercase tracking-[1.5px]" style={{ color: theme.mutedText }}>
              Apariencia
            </Text>
            <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <SettingsRow
                label="Tema"
                value={theme.name}
                onPress={() => setThemesVisible(true)}
                borderColor="transparent"
                textColor={theme.text}
                mutedColor={theme.mutedText}
                knobOn={theme.background}
                showChevron
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-xs font-bold uppercase tracking-[1.5px]" style={{ color: theme.mutedText }}>
              Privacidad y soporte
            </Text>
            <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <SettingsRow
                label="Permisos"
                subtitle="Abrir ajustes del sistema"
                onPress={() => { void openPermissions(); }}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Términos y condiciones"
                subtitle={settings.termsAcceptedAt ? 'Aceptados' : 'Pendientes de revisar'}
                onPress={() => setTermsVisible(true)}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Contacto"
                subtitle="soporte.fesa.app@gmail.com"
                onPress={() => { void openContact(); }}
                borderColor="transparent"
                textColor={theme.text}
                mutedColor={theme.mutedText}
                knobOn={theme.background}
                showChevron
              />
            </View>
          </View>
        </ScrollView>

        <OptionSheet
          visible={sleepTimerVisible}
          title="Temporizador de apagado"
          subtitle="La reproducción se pausará automáticamente cuando se cumpla el tiempo."
          background={theme.background}
          surface={theme.surface}
          textColor={theme.text}
          mutedColor={theme.mutedText}
          onClose={() => setSleepTimerVisible(false)}
        >
          {SLEEP_TIMER_OPTIONS.map(option => {
            const remainingMinutes = settings.sleepTimerEndsAt
              ? Math.ceil((settings.sleepTimerEndsAt - now) / 60000)
              : null;
            const isSelected = option.value === null
              ? !settings.sleepTimerEndsAt
              : remainingMinutes !== null &&
                option.value !== null &&
                Math.abs(remainingMinutes - option.value) <= 1;

            return (
              <Pressable
                key={option.label}
                className="flex-row items-center justify-between px-4 py-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isSelected ? SETTINGS_ACCENT_SOFT : 'transparent',
                }}
                onPress={() => {
                  setSleepTimer(option.value);
                  setNow(Date.now());
                  setSleepTimerVisible(false);
                }}
              >
                <Text className="text-base font-bold" style={{ color: isSelected ? SETTINGS_ACCENT : theme.text }}>
                  {option.label}
                </Text>
                {isSelected ? <CheckIcon size={22} color={SETTINGS_ACCENT} /> : null}
              </Pressable>
            );
          })}

          {(() => {
            const remainingMinutes = settings.sleepTimerEndsAt
              ? Math.ceil((settings.sleepTimerEndsAt - now) / 60000)
              : null;
            const isCustomSelected = remainingMinutes !== null &&
              !PRESET_SLEEP_TIMER_VALUES.some(value => Math.abs(remainingMinutes - value) <= 1);

            return (
              <Pressable
                className="flex-row items-center justify-between px-4 py-4"
                style={{ backgroundColor: isCustomSelected ? SETTINGS_ACCENT_SOFT : 'transparent' }}
                onPress={openCustomSleepTimer}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-bold" style={{ color: isCustomSelected ? SETTINGS_ACCENT : theme.text }}>
                    Personalizado
                  </Text>
                  <Text className="mt-0.5 text-xs" style={{ color: theme.mutedText }}>
                    {isCustomSelected && remainingMinutes
                      ? `${remainingMinutes} min restantes`
                      : 'Elige tu propio tiempo'}
                  </Text>
                </View>
                {isCustomSelected ? <CheckIcon size={22} color={SETTINGS_ACCENT} /> : (
                  <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
                )}
              </Pressable>
            );
          })()}
        </OptionSheet>

        <Modal transparent visible={customSleepVisible} animationType="fade" onRequestClose={() => setCustomSleepVisible(false)}>
          <View className="flex-1 justify-center px-6">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setCustomSleepVisible(false)} />
            <View className="rounded-3xl p-5" style={{ backgroundColor: theme.surface }}>
              <Text className="text-xl font-bold" style={{ color: theme.text }}>Tiempo personalizado</Text>
              <Text className="mt-2 text-sm" style={{ color: theme.mutedText }}>
                Desliza para elegir horas y minutos.
              </Text>

              <View className="mt-5 flex-row items-center gap-3">
                <VerticalWheelPicker
                  values={HOUR_OPTIONS}
                  value={customHours}
                  visible={customSleepVisible}
                  onChange={setCustomHours}
                  label="Horas"
                  textColor={theme.text}
                  mutedColor={theme.mutedText}
                  background={theme.background}
                />
                <Text className="pt-5 text-2xl font-bold" style={{ color: theme.text }}>:</Text>
                <VerticalWheelPicker
                  values={MINUTE_OPTIONS}
                  value={customMinutes}
                  visible={customSleepVisible}
                  onChange={setCustomMinutes}
                  label="Minutos"
                  textColor={theme.text}
                  mutedColor={theme.mutedText}
                  background={theme.background}
                />
              </View>

              <Text className="mt-4 text-center text-sm font-bold" style={{ color: SETTINGS_ACCENT }}>
                {customHours > 0
                  ? `${customHours}h ${customMinutes.toString().padStart(2, '0')}min`
                  : `${customMinutes} min`}
              </Text>

              <View className="mt-5 flex-row justify-end gap-3">
                <Pressable className="rounded-full px-4 py-3" onPress={() => setCustomSleepVisible(false)}>
                  <Text className="font-bold" style={{ color: theme.mutedText }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  className="rounded-full px-5 py-3"
                  style={{ backgroundColor: SETTINGS_ACCENT }}
                  onPress={applyCustomSleepTimer}
                >
                  <Text className="font-bold" style={{ color: theme.background }}>Aplicar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <OptionSheet
          visible={playbackSpeedVisible}
          title="Velocidad de reproducción"
          subtitle="El cambio se aplica al instante en la canción actual y en las siguientes."
          background={theme.background}
          surface={theme.surface}
          textColor={theme.text}
          mutedColor={theme.mutedText}
          onClose={() => setPlaybackSpeedVisible(false)}
        >
          {PLAYBACK_SPEED_OPTIONS.map((speed, index) => {
            const isSelected = speed === settings.playbackRate;

            return (
              <Pressable
                key={speed}
                className="flex-row items-center justify-between px-4 py-4"
                style={{
                  borderBottomWidth: index === PLAYBACK_SPEED_OPTIONS.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isSelected ? SETTINGS_ACCENT_SOFT : 'transparent',
                }}
                onPress={() => {
                  setPlaybackRate(speed);
                  setPlaybackSpeedVisible(false);
                }}
              >
                <Text className="text-base font-bold" style={{ color: isSelected ? SETTINGS_ACCENT : theme.text }}>
                  {formatSpeedLabel(speed)}
                </Text>
                {isSelected ? <CheckIcon size={22} color={SETTINGS_ACCENT} /> : null}
              </Pressable>
            );
          })}
        </OptionSheet>

        <Modal transparent visible={tabsVisible} animationType="slide" onRequestClose={() => setTabsVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setTabsVisible(false)} />
            <View
              className="max-h-[82%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-bold" style={{ color: theme.text }}>Administrar pestañas</Text>
                  <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                    Arrastra el asa para reordenar. Siempre debe quedar una visible.
                  </Text>
                </View>
                <Pressable onPress={() => setTabsVisible(false)}>
                  <Text className="font-bold" style={{ color: SETTINGS_ACCENT }}>Cerrar</Text>
                </Pressable>
              </View>

              <ScrollView scrollEnabled={false}>
                <DraggableTabsList
                  tabs={settings.tabs}
                  surface={theme.surface}
                  background={theme.background}
                  textColor={theme.text}
                  mutedColor={theme.mutedText}
                  borderColor={theme.border}
                  onToggle={handleTabToggle}
                  onReorder={reorderTabs}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <OptionSheet
          visible={themesVisible}
          title="Temas"
          subtitle="Cambia el color de acento y el estilo principal de la app."
          background={theme.background}
          surface={theme.surface}
          textColor={theme.text}
          mutedColor={theme.mutedText}
          onClose={() => setThemesVisible(false)}
        >
          {APP_THEMES.map((themeOption, index) => {
            const isSelected = themeOption.id === theme.id;

            return (
              <Pressable
                key={themeOption.id}
                className="flex-row items-center justify-between px-4 py-4"
                style={{
                  borderBottomWidth: index === APP_THEMES.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isSelected ? SETTINGS_ACCENT_SOFT : 'transparent',
                }}
                onPress={() => {
                  setThemeId(themeOption.id);
                  setThemesVisible(false);
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-8 w-8 rounded-full" style={{ backgroundColor: themeOption.accent }} />
                  <View>
                    <Text className="text-base font-bold" style={{ color: theme.text }}>{themeOption.name}</Text>
                    <View className="mt-1.5 flex-row gap-1.5">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeOption.background }} />
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeOption.surface }} />
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeOption.accent }} />
                    </View>
                  </View>
                </View>
                {isSelected ? <CheckIcon size={22} color={SETTINGS_ACCENT} /> : null}
              </Pressable>
            );
          })}
        </OptionSheet>

        <Modal transparent visible={termsVisible} animationType="slide" onRequestClose={() => setTermsVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setTermsVisible(false)} />
            <View
              className="max-h-[85%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-xl font-bold" style={{ color: theme.text }}>Términos y condiciones</Text>
                <Pressable onPress={() => setTermsVisible(false)}>
                  <Text className="font-bold" style={{ color: SETTINGS_ACCENT }}>Cerrar</Text>
                </Pressable>
              </View>

              <ScrollView>
                <Text className="mb-4 text-sm leading-6" style={{ color: theme.mutedText }}>
                  Estos términos resumen el uso básico de FESA y cómo se comportan sus funciones principales dentro del dispositivo.
                </Text>
                {TERMS_TEXT.map(item => (
                  <View key={item} className="mb-3 rounded-2xl px-4 py-4" style={{ backgroundColor: theme.surface }}>
                    <Text className="text-sm leading-6" style={{ color: theme.text }}>{item}</Text>
                  </View>
                ))}
                <Pressable
                  className="mt-2 rounded-full py-4"
                  style={{ backgroundColor: SETTINGS_ACCENT }}
                  onPress={() => {
                    acceptTerms();
                    setTermsVisible(false);
                  }}
                >
                  <Text className="text-center font-bold" style={{ color: theme.background }}>Aceptar términos</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default AppSettingsModal;
