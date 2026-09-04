import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  APP_LANGUAGES,
  APP_THEMES,
  DEFAULT_TABS,
  reorderTabs,
  setLanguageId,
  setLockScreenControlsEnabled,
  setPlaybackRate,
  setSleepTimer,
  setTabEnabled,
  setThemeId,
  TabId,
  TabPreference,
  toggleHiddenSongId,
  useAppSettingsHiddenSongIds,
  useAppSettingsLanguage,
  useAppSettingsLockScreenControls,
  useAppSettingsPlaybackRate,
  useAppSettingsSleepTimerEndsAt,
  useAppSettingsTabs,
  useAppSettingsTermsAccepted,
  useAppSettingsTheme,
} from '../settings/appSettings';
import { CheckIcon } from '../Icons';
import { getTranslation } from '../i18n/translations';
import HideMusicModal from './HideMusicModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import OpenSourceLicensesModal from './OpenSourceLicensesModal';
import AppModal from './AppModal';

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
  language: '#FFB703',   // Amber iOS
};

const getAccentOverlay = (hex: string) => `${hex}22`;
const TAB_ROW_HEIGHT = 72;
const TAB_ROW_GAP = 10;
const TAB_ROW_STRIDE = TAB_ROW_HEIGHT + TAB_ROW_GAP;

const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const PRESET_SLEEP_TIMER_VALUES = [15, 30, 45, 60] as const;
const getSleepTimerOptions = (t: (key: string, fallback?: string) => string) => [
  { label: t('sleep_timer_disabled', 'Disabled'), value: null as number | null },
  { label: t('sleep_timer_15', '15 minutes'), value: 15 },
  { label: t('sleep_timer_30', '30 minutes'), value: 30 },
  { label: t('sleep_timer_45', '45 minutes'), value: 45 },
  { label: t('sleep_timer_60', '60 minutes'), value: 60 },
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

const getTermsText = (t: (key: string, fallback?: string) => string) => [
  t('terms_item_1', '1. FESA is a local audio playback and organization app. It does not upload your files to external servers.'),
  t('terms_item_2', '2. The permissions it requests are only to access your local library and enable audio, tone, and playback features.'),
  t('terms_item_3', '3. The use of your audio content and song selection is the user’s responsibility, not FESA’s.'),
  t('terms_item_4', '4. The app does not guarantee compatibility with every audio format or every file on the device.'),
  t('terms_item_5', '5. We do not store or share your personal information outside the device without your explicit consent.'),
  t('terms_item_6', '6. You can change your settings, themes, and visible tabs at any time from the Settings panel.'),
  t('terms_item_7', '7. Contact and social media are available only for support and queries related to the application.'),
  t('terms_item_8', '8. Accepting these terms means you are aware of the app’s scope and its operation within your device.'),
  t('terms_item_9', '9. FESA was developed by its programmer with support from artificial intelligence tools as part of the creation process.'),
];

const formatSpeedLabel = (speed: number) => `${speed}x`;

const getTabDisplayName = (tabId: TabId, t: (key: string, fallback?: string) => string) => {
  const translationKeyByTab: Record<TabId, string> = {
    Inicio: 'tab_home',
    Favoritos: 'tab_favorites',
    Playlist: 'tab_playlist',
    Pistas: 'tab_tracks',
    'Álbumes': 'tab_albums',
    Artistas: 'tab_artists',
    Carpetas: 'tab_folders',
  };

  return t(translationKeyByTab[tabId], tabId);
};

const formatRemainingTime = (endsAt: number | null, now: number, t: (key: string, fallback?: string) => string) => {
  if (!endsAt) {
    return t('sleep_timer_disabled', 'Disabled');
  }

  const remainingMs = endsAt - now;

  if (remainingMs <= 0) {
    return t('sleep_timer_ending', 'Finishing...');
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) {
    return `${seconds}s ${t('sleep_timer_remaining', 'remaining')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')} ${t('sleep_timer_remaining', 'remaining')}`;
};

const LanguageFlagIcon = ({ languageId }: { languageId: string }) => {
  const flagMap: Record<string, string> = {
    es: '🇪🇸',
    en: '🇬🇧',
    pt: '🇵🇹',
    fr: '🇫🇷',
    it: '🇮🇹',
  };

  return (
    <View
      style={{
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 28 }}>{flagMap[languageId] ?? '🇪🇸'}</Text>
    </View>
  );
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
          backgroundColor: iconColor ?? '#FFFFFF20',
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
  onHidden,
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
  onHidden?: () => void;
  children: React.ReactNode;
}) => (
  <AppModal
    transparent
    visible={visible}
    animationType="slide"
    onRequestClose={onClose}
    onModalHide={onHidden}
  >
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
  </AppModal>
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
  t,
}: {
  tabs: TabPreference[];
  surface: string;
  background: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  onToggle: (tabId: TabId, enabled: boolean) => void;
  onReorder: (orderedIds: TabId[]) => void;
  t: (key: string, fallback?: string) => string;
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

  // Build the PanResponder for each tab ONCE (they read live state from refs).
  // Holding the responders in a ref instead of a `useMemo` means dragging
  // never causes a re-render of every tab row.
  const handleRespondersRef = useRef<Map<TabId, ReturnType<typeof PanResponder.create>>>(new Map());
  if (handleRespondersRef.current.size === 0) {
    for (const defaultTab of DEFAULT_TABS) {
      const tabId = defaultTab.id;

      handleRespondersRef.current.set(
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
  }

  const handleResponders = handleRespondersRef.current;

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
                <Text className="text-base font-bold" style={{ color: textColor }}>{getTabDisplayName(tab.id, t)}</Text>
                <Text className="mt-1 text-sm" style={{ color: mutedColor }}>
                  {tab.enabled ? t('tab_visible', 'Visible in the top bar') : t('tab_hidden', 'Hidden from navigation')}
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
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const tabs = useAppSettingsTabs();
  const hiddenSongIdsFromStore = useAppSettingsHiddenSongIds();
  const playbackRate = useAppSettingsPlaybackRate();
  const sleepTimerEndsAt = useAppSettingsSleepTimerEndsAt();
  const lockScreenControlsEnabled = useAppSettingsLockScreenControls();
  const termsAcceptedAt = useAppSettingsTermsAccepted();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const sleepTimerOptions = useMemo(() => getSleepTimerOptions(t), [t]);
  const getThemeDisplayName = (themeId: string) => {
    const nameMap: Record<string, string> = {
      light: t('theme_name_light', 'Daylight'),
      dark: t('theme_name_dark', 'Midnight'),
      masculine: t('theme_name_masculine', 'Forge'),
      feminine: t('theme_name_feminine', 'Bloom'),
      unisex: t('theme_name_unisex', 'Meadow'),
      ocean: t('theme_name_ocean', 'Tide'),
      amber: t('theme_name_amber', 'Honey'),
      plum: t('theme_name_plum', 'Velvet'),
    };
    return nameMap[themeId] ?? themeId;
  };
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [customSleepVisible, setCustomSleepVisible] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(20);
  const [playbackSpeedVisible, setPlaybackSpeedVisible] = useState(false);
  const [tabsVisible, setTabsVisible] = useState(false);
  const [themesVisible, setThemesVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [hideMusicVisible, setHideMusicVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [licensesVisible, setLicensesVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
  const [now, setNow] = useState(Date.now());

  // Lazy-mount flags: each sub-sheet is only inserted into the tree when first
  // opened, and is unmounted after the close animation finishes to release
  // the native view hierarchy.
  const [sleepTimerMounted, setSleepTimerMounted] = useState(false);
  const [playbackSpeedMounted, setPlaybackSpeedMounted] = useState(false);
  const [tabsMounted, setTabsMounted] = useState(false);
  const [themesMounted, setThemesMounted] = useState(false);
  const [languageMounted, setLanguageMounted] = useState(false);
  const [hideMusicMounted, setHideMusicMounted] = useState(false);
  const [privacyMounted, setPrivacyMounted] = useState(false);
  const [licensesMounted, setLicensesMounted] = useState(false);
  const [termsMounted, setTermsMounted] = useState(false);
  const [contactMounted, setContactMounted] = useState(false);
  const [customSleepMounted, setCustomSleepMounted] = useState(false);

  const requestCloseSleepTimer = useCallback(() => setSleepTimerVisible(false), []);
  const requestClosePlaybackSpeed = useCallback(() => setPlaybackSpeedVisible(false), []);
  const requestCloseTabs = useCallback(() => setTabsVisible(false), []);
  const requestCloseThemes = useCallback(() => setThemesVisible(false), []);
  const requestCloseLanguage = useCallback(() => setLanguageVisible(false), []);
  const requestCloseHideMusic = useCallback(() => setHideMusicVisible(false), []);
  const requestClosePrivacy = useCallback(() => setPrivacyVisible(false), []);
  const requestCloseLicenses = useCallback(() => setLicensesVisible(false), []);
  const requestCloseTerms = useCallback(() => setTermsVisible(false), []);
  const requestCloseContact = useCallback(() => setContactVisible(false), []);

  useEffect(() => {
    if (!visible || !sleepTimerEndsAt) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerEndsAt, visible]);

  useEffect(() => {
    if (!visible || !hideMusicVisible) {
      return;
    }

    let active = true;

    getAudioFilesWithPermission(true)
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
    () => tabs.filter(tab => tab.enabled).map(tab => tab.id),
    [tabs]
  );

  const openPermissions = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(
        t('system_error_title', 'Could not open'),
        t('permission_open_system_message', 'Open the system settings manually to change FESA permissions.')
      );
    }
  };

  const openContact = () => {
    setContactMounted(true);
    setContactVisible(true);
  };

  const openMail = async (email: string) => {
    const mailUrl = `mailto:${email}?subject=${encodeURIComponent('Soporte FESA')}`;

    try {
      await Linking.openURL(mailUrl);
    } catch {
      Alert.alert(t('mail_unavailable', 'Mail unavailable'), `${t('write_us', 'Write us')} a ${email}.`);
    }
  };

  const openPhone = async (phone: string) => {
    const telUrl = `tel:${phone}`;

    try {
      const supported = await Linking.canOpenURL(telUrl);

      if (!supported) {
        Alert.alert(t('system_error_title', 'Could not open'), `${t('call_label', 'Call')} ${phone}.`);
        return;
      }

      await Linking.openURL(telUrl);
    } catch {
      Alert.alert(t('phone_unavailable', 'Phone unavailable'), `${t('call_label', 'Call')} ${phone}.`);
    }
  };

  const openAppLink = async (appUrl: string, webUrl: string, fallbackMessage: string) => {
    try {
      await Linking.openURL(appUrl);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        Alert.alert(t('system_error_title', 'Could not open'), fallbackMessage);
      }
    }
  };

  const handleTabToggle = (tabId: TabId, enabled: boolean) => {
    const updated = setTabEnabled(tabId, enabled);

    if (!updated) {
      Alert.alert(
        t('leave_one_tab_visible', 'A tab is required'),
        t('leave_one_tab_visible_message', 'Keep at least one tab visible in the library.')
      );
    }
  };

  const openCustomSleepTimer = () => {
    const remainingMinutes = sleepTimerEndsAt
      ? Math.max(1, Math.ceil((sleepTimerEndsAt - Date.now()) / 60000))
      : 20;
    const isPreset = PRESET_SLEEP_TIMER_VALUES.some(
      value => Math.abs(remainingMinutes - value) <= 1
    );

    const seedMinutes = Math.min(
      CUSTOM_SLEEP_MAX,
      sleepTimerEndsAt && !isPreset ? remainingMinutes : 20
    );
    setCustomHours(Math.floor(seedMinutes / 60));
    setCustomMinutes(seedMinutes % 60);
    setCustomSleepMounted(true);
    setCustomSleepVisible(true);
  };

  const applyCustomSleepTimer = () => {
    const totalMinutes = customHours * 60 + customMinutes;

    if (totalMinutes < CUSTOM_SLEEP_MIN || totalMinutes > CUSTOM_SLEEP_MAX) {
      Alert.alert(
        t('select_time_invalid', 'Invalid time'),
        t('select_time_invalid_message', 'Choose at least 1 minute for the timer.')
      );
      return;
    }

    setSleepTimer(totalMinutes);
    setNow(Date.now());
    setCustomSleepVisible(false);
    setSleepTimerVisible(false);
  };

  const termsAccepted = Boolean(termsAcceptedAt);
  const hiddenSongIds = hiddenSongIdsFromStore;
  const termsText = useMemo(() => getTermsText(t), [t]);
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
              accessibilityLabel={t('close_settings', 'Close settings')}
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
            {t('settings_title', 'Settings')}
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
              {t('reproduction_section', 'Playback')}
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label={t('sleep_timer', 'Sleep Timer')}
                subtitle={formatRemainingTime(sleepTimerEndsAt, now, t)}
                onPress={() => { setSleepTimerMounted(true); setSleepTimerVisible(true); }}
                icon="moon"
                iconColor={IOS_ICON_COLORS.moon}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('playback_speed', 'Playback Speed')}
                subtitle={t('playback_speed_description', 'The change applies immediately to the current song and the next ones')}
                value={formatSpeedLabel(playbackRate)}
                onPress={() => { setPlaybackSpeedMounted(true); setPlaybackSpeedVisible(true); }}
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
              {t('controls_section', 'Controls and navigation')}
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label={t('external_controls', 'External Controls')}
                subtitle={t('lock_screen_controls', 'From the lock screen and notifications')}
                onPress={() => setLockScreenControlsEnabled(!lockScreenControlsEnabled)}
                toggleValue={lockScreenControlsEnabled}
                icon="lock-closed"
                iconColor={IOS_ICON_COLORS.lock}
                {...rowProps}
              />
              <SettingsRow
                label={t('manage_tabs', 'Manage Tabs')}
                subtitle={`${visibleTabs.length}/${DEFAULT_TABS.length} ${t('visible_short', 'visible')}`}
                onPress={() => { setTabsMounted(true); setTabsVisible(true); }}
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
              {t('appearance_section', 'Appearance')}
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label={t('language', 'Language')}
                subtitle={language.nativeName}
                value={language.label}
                onPress={() => { setLanguageMounted(true); setLanguageVisible(true); }}
                icon="globe"
                iconColor={IOS_ICON_COLORS.language}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('theme', 'Theme')}
                subtitle={t('theme_description', 'Customize colors and visual style')}
                value={getThemeDisplayName(theme.id)}
                onPress={() => { setThemesMounted(true); setThemesVisible(true); }}
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
              {t('privacy_support_section', 'Privacy and support')}
            </Text>
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                label={t('hide_music', 'Hide Music')}
                subtitle={`${hiddenSongIds.length} ${hiddenSongIds.length === 1 ? t('hidden_file_single', 'hidden file') : t('hidden_file_plural', 'hidden files')}`}
                onPress={() => { setHideMusicMounted(true); setHideMusicVisible(true); }}
                icon="eye-off"
                iconColor={IOS_ICON_COLORS.shield}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('permissions', 'Permissions')}
                subtitle={t('permission_open_system', 'Open system settings')}
                onPress={() => { void openPermissions(); }}
                icon="shield-checkmark"
                iconColor={IOS_ICON_COLORS.shield}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('privacy_policy', 'Privacy Policy')}
                subtitle={t('privacy_policy_subtitle', 'How we use your music and settings')}
                onPress={() => { setPrivacyMounted(true); setPrivacyVisible(true); }}
                icon="shield-checkmark"
                iconColor={IOS_ICON_COLORS.shield}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('open_source_licenses', 'Open Source Licenses')}
                subtitle={t('licenses_subtitle', 'App dependencies')}
                onPress={() => { setLicensesMounted(true); setLicensesVisible(true); }}
                icon="library"
                iconColor={IOS_ICON_COLORS.doc}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('terms_and_conditions', 'Terms and Conditions')}
                subtitle={termsAccepted ? t('terms_subtitle_accepted', 'Accepted') : t('terms_subtitle_pending', 'Pending review')}
                onPress={() => { setTermsMounted(true); setTermsVisible(true); }}
                icon="document-text"
                iconColor={IOS_ICON_COLORS.doc}
                showChevron
                {...rowProps}
              />
              <SettingsRow
                label={t('contact_us', 'Contact Us')}
                subtitle={t('support', 'Support')}
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

        {sleepTimerMounted ? (
          <OptionSheet
            visible={sleepTimerVisible}
            title={t('sleep_timer', 'Sleep Timer')}
            subtitle={t('sleep_timer_description', 'Playback will pause automatically when the time is reached')}
            background={theme.background}
            surface={theme.surface}
            textColor={theme.text}
            mutedColor={theme.mutedText}
            onClose={requestCloseSleepTimer}
            onHidden={() => setSleepTimerMounted(false)}
          >
          {sleepTimerOptions.map(option => {
            const remainingMinutes = sleepTimerEndsAt
              ? Math.ceil((sleepTimerEndsAt - now) / 60000)
              : null;
            const isSelected = option.value === null
              ? !sleepTimerEndsAt
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
            const remainingMinutes = sleepTimerEndsAt
              ? Math.ceil((sleepTimerEndsAt - now) / 60000)
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
                    {t('custom_timer_short', 'Custom')}
                  </Text>
                  <Text className="mt-0.5 text-xs" style={{ color: theme.mutedText }}>
                    {isCustomSelected && remainingMinutes
                      ? `${remainingMinutes} ${t('custom_sleep_remaining', 'min remaining')}`
                      : t('custom_timer_short_description', 'Choose your own time')}
                  </Text>
                </View>
                {isCustomSelected ? <CheckIcon size={22} color={SETTINGS_ACCENT} /> : (
                  <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
                )}
              </Pressable>
            );
          })()}
          </OptionSheet>
        ) : null}

        {customSleepMounted ? (
          <AppModal
            transparent
            visible={customSleepVisible}
            animationType="fade"
            onRequestClose={() => setCustomSleepVisible(false)}
            onModalHide={() => setCustomSleepMounted(false)}
          >
          <View className="flex-1 justify-center px-6">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setCustomSleepVisible(false)} />
            <View className="rounded-3xl p-5" style={{ backgroundColor: theme.surface }}>
              <Text className="text-xl font-bold" style={{ color: theme.text }}>{t('custom_sleep_timer', 'Custom time')}</Text>
              <Text className="mt-2 text-sm" style={{ color: theme.mutedText }}>
                {t('custom_sleep_timer_description', 'Slide to choose hours and minutes.')}
              </Text>

              <View className="mt-5 flex-row items-center gap-3">
                <VerticalWheelPicker
                  values={HOUR_OPTIONS}
                  value={customHours}
                  visible={customSleepVisible}
                  onChange={setCustomHours}
                  label={t('hours', 'Hours')}
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
                  label={t('minutes', 'Minutes')}
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
                  <Text className="font-bold" style={{ color: theme.text }}>{t('cancel', 'Cancel')}</Text>
                </Pressable>
                <Pressable
                  className="rounded-full px-5 py-3"
                  style={{ backgroundColor: theme.background }}
                  onPress={applyCustomSleepTimer}
                >
                  <Text className="font-bold" style={{ color: theme.text }}>{t('apply', 'Apply')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
          </AppModal>
        ) : null}

        {playbackSpeedMounted ? (
          <OptionSheet
            visible={playbackSpeedVisible}
            title={t('playback_speed', 'Playback Speed')}
            subtitle={t('playback_speed_description', 'The change applies immediately to the current song and the next ones')}
            background={theme.background}
            surface={theme.surface}
            textColor={theme.text}
            mutedColor={theme.mutedText}
            onClose={requestClosePlaybackSpeed}
            onHidden={() => setPlaybackSpeedMounted(false)}
          >
          {PLAYBACK_SPEED_OPTIONS.map((speed, index) => {
            const isSelected = speed === playbackRate;

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
        ) : null}

        {tabsMounted ? (
          <AppModal
            transparent
            visible={tabsVisible}
            animationType="slide"
            onRequestClose={requestCloseTabs}
            onModalHide={() => setTabsMounted(false)}
          >
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setTabsVisible(false)} />
            <View
              className="max-h-[82%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-bold text-center" style={{ color: theme.text }}>{t('manage_tabs', 'Manage Tabs')}</Text>
                  <Text className="mt-1 text-sm text-center" style={{ color: theme.mutedText }}>
                    {t('manage_tabs_description_detail', 'Drag the handle to reorder. One tab must always remain visible')}
                  </Text>
                </View>
              </View>

              <ScrollView scrollEnabled={false}>
                <DraggableTabsList
                  tabs={tabs}
                  surface={theme.surface}
                  background={theme.background}
                  textColor={theme.text}
                  mutedColor={theme.mutedText}
                  borderColor={theme.border}
                  onToggle={handleTabToggle}
                  onReorder={reorderTabs}
                  t={t}
                />
              </ScrollView>
            </View>
          </View>
          </AppModal>
        ) : null}

        {languageMounted ? (
          <OptionSheet
            visible={languageVisible}
            title={t('language', 'Language')}
            subtitle={t('language_choose', 'Choose the app’s main language')}
            background={theme.background}
            surface={theme.surface}
            textColor={theme.text}
            mutedColor={theme.mutedText}
            onClose={requestCloseLanguage}
            onHidden={() => setLanguageMounted(false)}
          >
          {APP_LANGUAGES.map((languageOption, index) => {
            const isSelected = languageOption.id === language.id;

            return (
              <Pressable
                key={languageOption.id}
                className="flex-row items-center justify-between px-4 py-4"
                style={{
                  borderBottomWidth: index === APP_LANGUAGES.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isSelected ? getAccentOverlay(theme.accent) : 'transparent',
                }}
                onPress={() => {
                  setLanguageId(languageOption.id);
                  setLanguageVisible(false);
                }}
              >
                <View className="flex-row items-center gap-3">
                  <LanguageFlagIcon languageId={languageOption.id} />
                  <View>
                    <Text className="text-base font-bold" style={{ color: theme.text }}>{languageOption.label}</Text>
                    <Text className="mt-1 text-xs" style={{ color: theme.mutedText }}>{languageOption.nativeName}</Text>
                  </View>
                </View>
                {isSelected ? <CheckIcon size={22} color={theme.accent} /> : null}
              </Pressable>
            );
          })}
          </OptionSheet>
        ) : null}

        {themesMounted ? (
          <OptionSheet
            visible={themesVisible}
            title={t('theme', 'Theme')}
            subtitle={t('theme_choose', 'Change accent color and app style')}
            background={theme.background}
            surface={theme.surface}
            textColor={theme.text}
            mutedColor={theme.mutedText}
            onClose={requestCloseThemes}
            onHidden={() => setThemesMounted(false)}
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
                  <View className="h-8 w-8 rounded-full" style={{ backgroundColor: themeOption.background, borderColor: themeOption.border, borderWidth: 1 }} />
                  <View>
                    <Text className="text-base font-bold" style={{ color: theme.text }}>{getThemeDisplayName(themeOption.id)}</Text>
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
        ) : null}

        {hideMusicMounted ? (
          <HideMusicModal
            visible={hideMusicVisible}
            songs={librarySongs}
            hiddenSongIds={hiddenSongIds}
            onClose={requestCloseHideMusic}
            onToggleHidden={songId => {
              const nextHiddenSongIds = toggleHiddenSongId(songId);

              setLibrarySongs(currentSongs => [...currentSongs].sort((a, b) => {
                const aHidden = nextHiddenSongIds.includes(a.id);
                const bHidden = nextHiddenSongIds.includes(b.id);

                if (aHidden !== bHidden) {
                  return aHidden ? -1 : 1;
                }

                return a.title.localeCompare(b.title);
              }));
            }}
          />
        ) : null}

        {privacyMounted ? (
          <PrivacyPolicyModal
            visible={privacyVisible}
            onClose={requestClosePrivacy}
          />
        ) : null}

        {licensesMounted ? (
          <OpenSourceLicensesModal
            visible={licensesVisible}
            onClose={requestCloseLicenses}
          />
        ) : null}

        {termsMounted ? (
          <AppModal
            transparent
            visible={termsVisible}
            animationType="slide"
            onRequestClose={requestCloseTerms}
            onModalHide={() => setTermsMounted(false)}
          >
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setTermsVisible(false)} />
            <View
              className="max-h-[85%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4">
                <Text className="text-xl font-bold text-center" style={{ color: theme.text }}>{t('terms_title', 'Terms and Conditions')}</Text>
              </View>

              <ScrollView>
                <Text className="mb-4 text-sm text-center leading-6" style={{ color: theme.mutedText }}>
                  {t('terms_summary', 'These terms summarize the use and responsibilities of FESA as a local audio playback and management application')}
                </Text>
                <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                  {termsText.map((item, index) => (
                    <View
                      key={`${item}-${index}`}
                      className="px-4 py-4"
                      style={{
                        borderBottomWidth: index === termsText.length - 1 ? 0 : 0.5,
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
                    {termsAccepted ? t('accepted', 'Accepted') : t('accept_terms', 'Accept terms')}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
          </AppModal>
        ) : null}

        {contactMounted ? (
          <AppModal
            transparent
            visible={contactVisible}
            animationType="slide"
            onRequestClose={requestCloseContact}
            onModalHide={() => setContactMounted(false)}
          >
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setContactVisible(false)} />
            <View
              className="max-h-[88%] rounded-t-[32px] px-5 pb-6 pt-3"
              style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <SheetHandle />
              <View className="mb-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold ml-2" style={{ color: theme.text }}>{t('contact_title', 'Contact')}</Text>
                </View>
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-full"
                  onPress={() => setContactVisible(false)}
                  accessibilityLabel={t('contact_close', 'Close contact')}
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
                  {t('write_us', 'Write us')}
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
                      <Text className="text-sm font-bold" style={{ color: theme.text }}>{t('email_label', 'Email')}</Text>
                      <Text className="mt-0.5 text-xs" style={{ color: theme.mutedText }}>{SUPPORT_EMAIL}</Text>
                    </View>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                </View>

                <Text className="mb-2 ml-4 text-xs font-bold uppercase tracking-[1px]" style={{ color: theme.mutedText }}>
                  {t('we_are_here', 'We are here too')}
                </Text>
                <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    style={{ borderBottomWidth: 0.5, borderBottomColor: theme.border }}
                    onPress={() => void openAppLink(FACEBOOK_APP_URL, FACEBOOK_WEB_URL, t('support_message', 'Open Facebook to contact the author.'))}
                  >
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                    <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>Facebook</Text>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    style={{ borderBottomWidth: 0.5, borderBottomColor: theme.border }}
                    onPress={() => void openAppLink(INSTAGRAM_APP_URL, INSTAGRAM_WEB_URL, t('instagram_message', 'Open Instagram to contact the author.'))}
                  >
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                    <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>Instagram</Text>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                  <Pressable
                    className="flex-row items-center px-4 py-3.5"
                    onPress={() => void openAppLink(WHATSAPP_APP_URL, WHATSAPP_WEB_URL, t('whatsapp_message', 'Open WhatsApp to send a message to the author.'))}
                  >
                    <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                    <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>WhatsApp</Text>
                    <Ionicons name="arrow-up-outline" size={18} color={theme.mutedText} style={{ transform: [{ rotate: '45deg' }] }} />
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
          </AppModal>
        ) : null}
      </View>
    </Modal>
  );
};

export default AppSettingsModal;
