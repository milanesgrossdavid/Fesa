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
import { LinearGradient } from 'expo-linear-gradient';
import { getAudioFilesWithPermission, Song } from '../../modules/local-music';
import {
  acceptTerms,
  APP_THEMES,
  DEFAULT_TABS,
  getHiddenSongIds,
  reorderTabs,
  setLockScreenControlsEnabled,
  setPlaybackRate,
  setSleepTimer,
  setTabEnabled,
  setThemeId,
  TabId,
  TabPreference,
  toggleHiddenSongId,
  useAppSettings,
} from '../settings/appSettings';
import { CheckIcon } from '../Icons';
import HideMusicModal from './HideMusicModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import OpenSourceLicensesModal from './OpenSourceLicensesModal';

interface AppSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SETTINGS_ACCENT = '#ffffff';
const SETTINGS_ACCENT_SOFT = 'rgba(255,255,255,0.12)';
const IOS_TOGGLE_ON = '#34C759';

// Paleta iOS "Settings.app": cada fila tiene un icono con contenedor tintado
// para transmitir jerarquía visual (Clarity + Depth del HIG).
const IOS_ICON_COLORS = {
  moon: '#5E5CE6',       // Indigo iOS
  speed: '#FF9F0A',      // Orange iOS
  lock: '#8E8E93',       // Gray iOS
  tabs: '#0A84FF',       // Blue iOS
  palette: '#FF375F',    // Pink iOS
  shield: '#30D158',     // Green iOS
  doc: '#FFD60A',        // Yellow iOS
  contact: '#64D2FF',    // Teal iOS
};

const getAccentOverlay = (hex: string) => `${hex}22`;
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
const SUPPORT_EMAIL = 'davmilgross@gmail.com';
const FACEBOOK_APP_URL = 'fb://facewebmodal/f?href=https%3A%2F%2Fwww.facebook.com%2Fdavid.milanes.10';
const FACEBOOK_WEB_URL = 'https://www.facebook.com/david.milanes.10';
const INSTAGRAM_APP_URL = 'instagram://user?username=davmilanes';
const INSTAGRAM_WEB_URL = 'https://www.instagram.com/davmilanes/';
const WHATSAPP_APP_URL = 'whatsapp://send?phone=5354776027';
const WHATSAPP_WEB_URL = 'https://wa.me/5354776027';
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);

const TERMS_TEXT = [
  '1. FESA es una aplicación de reproducción y organización de audio local. No sube tus archivos a servidores externos.',
  '2. Los permisos que solicita son únicamente para acceder a tu biblioteca local y habilitar funciones de audio, tonos y reproducción.',
  '3. El uso de tu contenido de audio y la selección de canciones son responsabilidad del usuario, no de FESA.',
  '4. La app no garantiza compatibilidad con todos los formatos de audio ni con todos los archivos del dispositivo.',
  '5. No almacenamos ni compartimos tu información personal fuera del dispositivo sin tu consentimiento explícito.',
  '6. Puedes cambiar tus ajustes, temas y pestañas visibles en cualquier momento desde el panel de Ajustes.',
  '7. El contacto y las redes sociales están disponibles solo para soporte y consultas relacionadas con la aplicación.',
  '8. Aceptar estos términos implica que conoces el alcance de la app y su funcionamiento dentro de tu dispositivo.',
  '9. FESA fue desarrollada por su programador con apoyo de herramientas de inteligencia artificial como asistencia durante el proceso de creación.',
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

// Switch estilo iOS: track verde sistema cuando está activo, knob blanco
// con sombra sutil (HIG - "Depth"). Tamaño 51x31 como UISwitch nativo.
const SettingsToggle = ({
  value,
  trackOff,
}: {
  value: boolean;
  trackOff: string;
  knobOn?: string;
}) => (
  <View
    style={{
      width: 51,
      height: 31,
      borderRadius: 31,
      justifyContent: 'center',
      paddingHorizontal: 2,
      backgroundColor: value ? IOS_TOGGLE_ON : trackOff,
    }}
  >
    <View
      style={{
        width: 27,
        height: 27,
        borderRadius: 27,
        backgroundColor: '#FFFFFF',
        alignSelf: value ? 'flex-end' : 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
      }}
    />
  </View>
);

// Fila estilo Settings.app: icono tintado en contenedor cuadrado redondeado,
// título en peso semibold, valor en color secundario, chevron `chevron.forward`.
// Separadores insertados que respetan el padding del icono (HIG - Clarity).
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
  icon,
  iconColor,
  isLast,
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
  knobOn?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  isLast?: boolean;
}) => (
  <Pressable
    android_ripple={{ color: SETTINGS_ACCENT_SOFT }}
    accessibilityRole={typeof toggleValue === 'boolean' ? 'switch' : 'button'}
    accessibilityState={typeof toggleValue === 'boolean' ? { checked: toggleValue } : undefined}
    accessibilityLabel={label}
    accessibilityHint={subtitle}
    className="flex-row items-center px-4"
    style={({ pressed }) => ({
      paddingVertical: 12,
      minHeight: 56,
      opacity: pressed ? 0.6 : 1,
    })}
    onPress={onPress}
  >
    {icon ? (
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
    ) : null}
    <View
      className="flex-1 pr-3"
      style={
        !isLast
          ? { borderBottomWidth: 0.5, borderBottomColor: borderColor, paddingVertical: 6 }
          : { paddingVertical: 6 }
      }
    >
      <Text
        style={{ color: textColor, fontSize: 17, fontWeight: '500', letterSpacing: -0.2 }}
      >
        {label}
      </Text>
      {subtitle ? (
        <Text
          style={{ color: mutedColor, fontSize: 13, marginTop: 2, letterSpacing: -0.1 }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
    {typeof toggleValue === 'boolean' ? (
      <SettingsToggle value={toggleValue} trackOff={borderColor} />
    ) : (
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {value ? (
          <Text
            style={{ color: mutedColor, fontSize: 15, maxWidth: 160, letterSpacing: -0.2 }}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {showChevron ? (
          <Ionicons name="chevron-forward" size={16} color={mutedColor} style={{ opacity: 0.6 }} />
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
            <Text className="text-xl font-bold text-center" style={{ color: textColor }}>{title}</Text>
            {subtitle ? (
              <Text className="mt-1 text-sm text-center" style={{ color: mutedColor }}>{subtitle}</Text>
            ) : null}
          </View>
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
  const [hideMusicVisible, setHideMusicVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [licensesVisible, setLicensesVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
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

  useEffect(() => {
    if (!visible || !hideMusicVisible) {
      return;
    }

    let active = true;

    getAudioFilesWithPermission()
      .then(music => {
        if (active) {
          setLibrarySongs(music);
        }
      })
      .catch(error => {
        console.error('Error al cargar la música para ocultar:', error);
      });

    return () => {
      active = false;
    };
  }, [hideMusicVisible, visible]);

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

  const openContact = () => {
    setContactVisible(true);
  };

  const openMail = async (email: string) => {
    const mailUrl = `mailto:${email}?subject=${encodeURIComponent('Soporte FESA')}`;

    try {
      await Linking.openURL(mailUrl);
    } catch {
      Alert.alert('Correo no disponible', `Escríbenos a ${email}.`);
    }
  };

  const openPhone = async (phone: string) => {
    const telUrl = `tel:${phone}`;

    try {
      const supported = await Linking.canOpenURL(telUrl);

      if (!supported) {
        Alert.alert('Teléfono no disponible', `Llama a ${phone}.`);
        return;
      }

      await Linking.openURL(telUrl);
    } catch {
      Alert.alert('Teléfono no disponible', `Llama a ${phone}.`);
    }
  };

  const openAppLink = async (appUrl: string, webUrl: string, fallbackMessage: string) => {
    try {
      await Linking.openURL(appUrl);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        Alert.alert('Enlace no disponible', fallbackMessage);
      }
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
  const termsAccepted = Boolean(settings.termsAcceptedAt);
  const hiddenSongIds = getHiddenSongIds();
  const rowProps = {
    borderColor: theme.border,
    textColor: theme.text,
    mutedColor: theme.mutedText,
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
        {/* Barra de navegación estilo iOS con Large Title (HIG - Deference) */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          <View className="flex-row items-center" style={{ height: 44 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar ajustes"
              style={({ pressed }) => ({
                height: 32,
                minWidth: 32,
                paddingHorizontal: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
              onPress={onClose}
            >
              <Ionicons name="chevron-back" size={26} color={theme.accent} />
              
            </Pressable>
            <Text
            style={{
              color: theme.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: 0.37,
              paddingHorizontal: 4,
            }}
          >
            Ajustes
          </Text>
          </View>
          
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.mutedText,
                fontSize: 13,
                fontWeight: '400',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Reproducción
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label="Temporizador de apagado"
                subtitle={formatRemainingTime(settings.sleepTimerEndsAt, now)}
                onPress={() => setSleepTimerVisible(true)}
                icon="moon"
                iconColor={IOS_ICON_COLORS.moon}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Velocidad de reproducción"
                subtitle="Ajusta el ritmo de la canción actual"
                value={formatSpeedLabel(settings.playbackRate)}
                onPress={() => setPlaybackSpeedVisible(true)}
                icon="speedometer"
                iconColor={IOS_ICON_COLORS.speed}
                showChevron
                isLast
                {...rowProps}
              />
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.mutedText,
                fontSize: 13,
                fontWeight: '400',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Control y navegación
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label="Controles externos"
                subtitle="Desde la pantalla de bloqueo y notificaciones"
                onPress={() => setLockScreenControlsEnabled(!settings.lockScreenControlsEnabled)}
                toggleValue={settings.lockScreenControlsEnabled}
                icon="lock-closed"
                iconColor={IOS_ICON_COLORS.lock}
                {...rowProps}
              />
              <SettingsRow
                label="Administrar pestañas"
                subtitle={`${visibleTabs.length}/${DEFAULT_TABS.length} visibles`}
                onPress={() => setTabsVisible(true)}
                icon="grid"
                iconColor={IOS_ICON_COLORS.tabs}
                showChevron
                isLast
                {...rowProps}
              />
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.mutedText,
                fontSize: 13,
                fontWeight: '400',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Apariencia
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label="Tema"
                subtitle="Personaliza colores y estilo visual"
                value={theme.name}
                onPress={() => setThemesVisible(true)}
                icon="color-palette"
                iconColor={IOS_ICON_COLORS.palette}
                showChevron
                isLast
                {...rowProps}
              />
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.mutedText,
                fontSize: 13,
                fontWeight: '400',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Privacidad y soporte
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label="Ocultar música"
                subtitle={`${hiddenSongIds.length} ${hiddenSongIds.length === 1 ? 'archivo oculto' : 'archivos ocultos'}`}
                onPress={() => setHideMusicVisible(true)}
                icon="eye-off"
                iconColor={IOS_ICON_COLORS.shield}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Permisos"
                subtitle="Abrir ajustes del sistema"
                onPress={() => { void openPermissions(); }}
                icon="shield-checkmark"
                iconColor={IOS_ICON_COLORS.shield}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Política de privacidad"
                subtitle="Cómo usamos tu música y ajustes"
                onPress={() => setPrivacyVisible(true)}
                icon="shield-checkmark"
                iconColor={IOS_ICON_COLORS.shield}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Licencias de código abierto"
                subtitle="Dependencias de la app"
                onPress={() => setLicensesVisible(true)}
                icon="library"
                iconColor={IOS_ICON_COLORS.doc}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Términos y condiciones"
                subtitle={termsAccepted ? 'Aceptados' : 'Pendientes de revisar'}
                onPress={() => setTermsVisible(true)}
                icon="document-text"
                iconColor={IOS_ICON_COLORS.doc}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label="Contacto"
                subtitle="Soporte y redes sociales"
                onPress={openContact}
                icon="person-circle"
                iconColor={IOS_ICON_COLORS.contact}
                showChevron
                isLast
                {...rowProps}
              />
            </View>
          </View>
        </ScrollView>

        <OptionSheet
          visible={sleepTimerVisible}
          title="Temporizador de apagado"
          subtitle="La reproducción se pausará automáticamente cuando se cumpla el tiempo"
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
                <Pressable className="rounded-full px-4 py-3" style={{backgroundColor: theme.background}} onPress={() => setCustomSleepVisible(false)}>
                  <Text className="font-bold" style={{ color: theme.text }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  className="rounded-full px-5 py-3"
                  style={{ backgroundColor: theme.background }}
                  onPress={applyCustomSleepTimer}
                >
                  <Text className="font-bold" style={{ color: theme.text }}>Aplicar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <OptionSheet
          visible={playbackSpeedVisible}
          title="Velocidad de reproducción"
          subtitle="El cambio se aplica al instante en la canción actual y en las siguientes"
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
                  <Text className="text-xl font-bold text-center" style={{ color: theme.text }}>Administrar pestañas</Text>
                  <Text className="mt-1 text-sm text-center" style={{ color: theme.mutedText }}>
                    Arrastra el asa para reordenar. Siempre debe quedar una visible
                  </Text>
                </View>
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
          subtitle="Cambia el color de acento y el estilo principal de la app"
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
                  backgroundColor: isSelected ? getAccentOverlay(themeOption.accent) : 'transparent',
                }}
                onPress={() => {
                  setThemeId(themeOption.id);
                  setThemesVisible(false);
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-8 w-8 rounded-full" style={{ backgroundColor: themeOption.accent, borderColor: themeOption.border, borderWidth: 1 }} />
                  <View>
                    <Text className="text-base font-bold" style={{ color: themeOption.text }}>{themeOption.name}</Text>
                    <View className="mt-1.5 flex-row gap-1.5">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeOption.background }} />
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeOption.surface }} />
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeOption.accent }} />
                    </View>
                  </View>
                </View>
                {isSelected ? <CheckIcon size={22} color={themeOption.accent} /> : null}
              </Pressable>
            );
          })}
        </OptionSheet>

        <HideMusicModal
          visible={hideMusicVisible}
          songs={librarySongs}
          hiddenSongIds={hiddenSongIds}
          onClose={() => setHideMusicVisible(false)}
          onToggleHidden={songId => {
            toggleHiddenSongId(songId);
            setLibrarySongs(currentSongs => currentSongs.map(song => ({
              ...song,
              hidden: hiddenSongIds.includes(song.id) ? false : song.id === songId ? true : false,
            })));
          }}
        />

        <PrivacyPolicyModal
          visible={privacyVisible}
          onClose={() => setPrivacyVisible(false)}
        />

        <OpenSourceLicensesModal
          visible={licensesVisible}
          onClose={() => setLicensesVisible(false)}
        />

        <Modal transparent visible={termsVisible} animationType="slide" onRequestClose={() => setTermsVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setTermsVisible(false)} />
            <View
              className="max-h-[85%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4">
                <Text className="text-xl font-bold text-center" style={{ color: theme.text }}>Términos y condiciones</Text>
              </View>

              <ScrollView>
                <Text className="mb-4 text-sm text-center leading-6" style={{ color: theme.mutedText }}>
                  Estos términos resumen el uso y las responsabilidades de FESA como aplicación de reproducción y gestión de audio local
                </Text>
                <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                  {TERMS_TEXT.map((item, index) => (
                    <View
                      key={item}
                      className="px-4 py-4"
                      style={{
                        borderBottomWidth: index === TERMS_TEXT.length - 1 ? 0 : 0.5,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <Text className="text-sm leading-6" style={{ color: theme.text }}>{item}</Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  className="mt-4 flex-row items-center justify-center rounded-xl py-3.5"
                  disabled={termsAccepted}
                  style={{ backgroundColor: termsAccepted ? SETTINGS_ACCENT_SOFT : SETTINGS_ACCENT }}
                  onPress={() => {
                    if (termsAccepted) {
                      return;
                    }
                    acceptTerms();
                  }}
                >
                  {termsAccepted ? <CheckIcon size={20} color={SETTINGS_ACCENT} /> : null}
                  <Text
                    className="text-center font-bold"
                    style={{
                      color: termsAccepted ? SETTINGS_ACCENT : theme.background,
                      marginLeft: termsAccepted ? 8 : 0,
                      fontSize: 16,
                    }}
                  >
                    {termsAccepted ? 'Aceptado' : 'Aceptar términos'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={contactVisible} animationType="slide" onRequestClose={() => setContactVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setContactVisible(false)} />
            <View
              className="max-h-[88%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold ml-2" style={{ color: theme.text }}>Contacto</Text>
                </View>
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-full"
                  onPress={() => setContactVisible(false)}
                  accessibilityLabel="Cerrar contacto"
                >
                  <Ionicons name="close" size={20} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-4 items-center py-4">
                  <View
                    className="h-32 w-32 items-center justify-center rounded-full p-1"
                    style={{ backgroundColor: theme.accent, opacity: 0.5 }}
                  >
                    <View
                      className="h-full w-full items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.background }}
                    >
                      <Ionicons name="person" size={68} color={theme.text} />
                    </View>
                  </View>
                  <Text className="mt-4 text-2xl font-bold" style={{ color: theme.text }}>David Milanes Gross</Text>
                </View>

                <Text className="mb-2 ml-4 text-xs font-bold uppercase tracking-[1px]" style={{ color: theme.mutedText }}>
                  Escríbenos
                </Text>
                <View className="mb-5 overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    onPress={() => void openMail(SUPPORT_EMAIL)}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: getAccentOverlay(theme.accent) }}
                    >
                      <Ionicons name="mail-outline" size={20} color={theme.accent} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-bold" style={{ color: theme.text }}>Correo electrónico</Text>
                      <Text className="mt-0.5 text-xs" style={{ color: theme.mutedText }}>{SUPPORT_EMAIL}</Text>
                    </View>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                </View>

                <Text className="mb-2 ml-4 text-xs font-bold uppercase tracking-[1px]" style={{ color: theme.mutedText }}>
                  También estamos aquí
                </Text>
                <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    style={{ borderBottomWidth: 0.5, borderBottomColor: theme.border }}
                    onPress={() => void openAppLink(FACEBOOK_APP_URL, FACEBOOK_WEB_URL, 'Abre Facebook para contactar al autor.')}
                  >
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                    <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>Facebook</Text>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    style={{ borderBottomWidth: 0.5, borderBottomColor: theme.border }}
                    onPress={() => void openAppLink(INSTAGRAM_APP_URL, INSTAGRAM_WEB_URL, 'Abre Instagram para contactar al autor.')}
                  >
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                    <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>Instagram</Text>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    onPress={() => void openAppLink(WHATSAPP_APP_URL, WHATSAPP_WEB_URL, 'Abre WhatsApp para enviar un mensaje al autor.')}
                  >
                    <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                    <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>WhatsApp</Text>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default AppSettingsModal;
