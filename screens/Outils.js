// ═══════════════════════════════════════════════════════════════════════
//  Outils.js — Hub unique : Appareil, Magnétomètre, GPS, Scanner, QR, Jeu
//  Utilise react-native-reanimated correctement (pas de .value inline)
//  CameraView sans children (overlay en frère absolu)
//  Headers harmonisés style WhatsApp Business (#075E54)
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Dimensions, Share, ActivityIndicator, StatusBar,
  Platform, RefreshControl, Modal, TextInput, Vibration,
  TouchableWithoutFeedback, useWindowDimensions, AppState, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import { Magnetometer } from 'expo-sensors';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');
const fs = (s) => Math.round(s * Math.min(Math.max(SW / 375, 0.85), 1.3));

// ═══════════════════════════════════════════════════════════════════════
//  HEADER PARTAGÉ
// ═══════════════════════════════════════════════════════════════════════
function OutilHeader({ title, onClose, right = null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.outilHeader, { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 0) + 8 }]}>
      <TouchableOpacity onPress={onClose} style={styles.outilHeaderBackBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.outilHeaderTitle} numberOfLines={1}>{title}</Text>
      {right || <View style={{ width: 32 }} />}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  1) DEVICE INFO — utilise Reanimated FadeInDown pour les cartes
// ═══════════════════════════════════════════════════════════════════════
function DeviceInfoScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('device');
  const [copied, setCopied] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [batteryState, setBatteryState] = useState(null);
  const [networkInfo, setNetworkInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeOpacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const TABS = [
    { id: 'device', label: 'Appareil', icon: 'smartphone', color: '#6366f1' },
    { id: 'system', label: 'Système', icon: 'cpu', color: '#10b981' },
    { id: 'battery', label: 'Batterie', icon: 'battery', color: '#f59e0b' },
    { id: 'network', label: 'Réseau', icon: 'wifi', color: '#8b5cf6' },
  ];

  const loadData = async () => {
    try {
      const [level, state, networkState, ipInfo] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
        Network.getNetworkStateAsync(),
        Network.getIpAddressAsync(),
      ]);
      setBatteryLevel(level);
      setBatteryState(state);
      setNetworkInfo({ type: networkState.type, isConnected: networkState.isConnected, ip: ipInfo });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    loadData();
    fadeOpacity.value = withTiming(1, { duration: 600 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  // ✅ Style animé propre (pas de .value dans le JSX)
  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getDeviceTypeLabel = (type) => ({
    [Device.DeviceType.PHONE]: '📱 Téléphone',
    [Device.DeviceType.TABLET]: '📱 Tablette',
    [Device.DeviceType.DESKTOP]: '💻 Ordinateur',
    [Device.DeviceType.TV]: '📺 TV',
  }[type] || '🔍 Inconnu');

  const getBatteryStateLabel = (s) => ({
    [Battery.BatteryState.CHARGING]: '⚡ En charge',
    [Battery.BatteryState.FULL]: '✅ Pleine',
    [Battery.BatteryState.UNCHARGED]: '🔋 Décharge',
  }[s] || '🔌 Inconnu');

  const getNetworkTypeLabel = (t) => ({
    [Network.NetworkStateType.WIFI]: '📶 WiFi',
    [Network.NetworkStateType.CELLULAR]: '📡 Mobile',
    [Network.NetworkStateType.ETHERNET]: '🔌 Ethernet',
  }[t] || '❌ Déconnecté');

  const getBatteryColor = (l) => l === null ? '#9ca3af' : l > 0.5 ? '#10b981' : l > 0.2 ? '#f59e0b' : '#ef4444';

  const copyValue = async (label, value) => {
    try {
      await Clipboard.setStringAsync(`${label}: ${value || 'Non disponible'}`);
      setCopied(label);
      if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(null), 1500);
    } catch { Alert.alert('Erreur', 'Impossible de copier'); }
  };

  const deviceInfo = [
    { icon: 'smartphone', label: 'Nom', value: Device.deviceName },
    { icon: 'cpu', label: 'Marque', value: Device.brand },
    { icon: 'box', label: 'Fabricant', value: Device.manufacturer },
    { icon: 'hash', label: 'Modèle', value: Device.modelName },
    { icon: 'layout', label: 'Design', value: Device.designName },
    { icon: 'package', label: 'Produit', value: Device.productName },
    { icon: 'check-circle', label: 'Type', value: getDeviceTypeLabel(Device.deviceType) },
    { icon: Device.isDevice ? 'check-circle' : 'x-circle', label: 'Appareil réel', value: Device.isDevice ? '✅ Oui' : '❌ Non', valueColor: Device.isDevice ? '#10b981' : '#ef4444' },
  ];
  const systemInfo = [
    { icon: 'monitor', label: 'Système', value: Device.osName },
    { icon: 'code', label: 'Version OS', value: Device.osVersion },
    { icon: 'file-text', label: 'Build ID', value: Device.osBuildId },
    { icon: 'calendar', label: 'Année', value: Device.deviceYearClass?.toString() || '—' },
  ];
  const screenInfo = [
    { icon: 'maximize', label: 'Largeur', value: `${SW} px` },
    { icon: 'maximize-2', label: 'Hauteur', value: `${SH} px` },
    { icon: 'grid', label: 'Densité', value: `${Dimensions.get('window').scale.toFixed(2)}x` },
  ];
  const batteryInfo = [
    { icon: 'battery', label: 'Niveau', value: batteryLevel !== null ? `${Math.round(batteryLevel * 100)}%` : '—', valueColor: getBatteryColor(batteryLevel) },
    { icon: 'zap', label: 'État', value: batteryState !== null ? getBatteryStateLabel(batteryState) : '—' },
  ];
  const networkList = [
    { icon: 'wifi', label: 'Connexion', value: networkInfo.type ? getNetworkTypeLabel(networkInfo.type) : '—' },
    { icon: 'globe', label: 'État', value: networkInfo.isConnected ? '✅ Connecté' : '❌ Déconnecté', valueColor: networkInfo.isConnected ? '#10b981' : '#ef4444' },
    { icon: 'server', label: 'Adresse IP', value: networkInfo.ip || '—' },
  ];
  const appInfo = [
    { icon: 'tag', label: 'Application', value: Application.applicationName },
    { icon: 'hash', label: 'ID', value: Application.applicationId },
    { icon: 'download', label: 'Version', value: Application.nativeApplicationVersion },
    { icon: 'code', label: 'Build', value: Application.nativeBuildVersion },
  ];

  const shareInfo = async () => {
    const all = [...deviceInfo, ...systemInfo, ...batteryInfo, ...networkList, ...screenInfo, ...appInfo];
    const text = '📱 INFORMATIONS APPAREIL\n═══════════════════════\n\n' +
      all.map(i => `• ${i.label}: ${i.value || 'Non disponible'}`).join('\n');
    try { await Share.share({ message: text, title: 'Informations Appareil' }); }
    catch { Alert.alert('Erreur', 'Impossible de partager'); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // ✅ InfoCard avec entering layout animation (pas de valeur partagée)
  const InfoCard = ({ item, color, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400).springify()}
      style={styles.card}
    >
      <View style={styles.cardContent}>
        <View style={[styles.cardIcon, { backgroundColor: `${color}10` }]}>
          <Feather name={item.icon} size={18} color={color} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardLabel}>{item.label}</Text>
          <Text style={[styles.cardValue, item.valueColor && { color: item.valueColor }]} numberOfLines={2}>
            {item.value ?? '—'}
          </Text>
        </View>
        <TouchableOpacity style={styles.cardCopy} onPress={() => copyValue(item.label, item.value)}>
          <Feather name={copied === item.label ? 'check' : 'copy'} size={14} color={copied === item.label ? '#10b981' : '#94a3b8'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const Section = ({ title, items, color }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.sectionCount, { backgroundColor: `${color}10` }]}>
          <Text style={[styles.sectionCountText, { color }]}>{items.length}</Text>
        </View>
      </View>
      <View style={styles.cardsGrid}>
        {items.map((item, i) => <InfoCard key={i} item={item} color={color} index={i} />)}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'device': return (<><Section title="Informations" items={deviceInfo} color="#6366f1" /><Section title="Écran" items={screenInfo} color="#3b82f6" /></>);
      case 'system': return (<><Section title="Système" items={systemInfo} color="#10b981" /><Section title="Application" items={appInfo} color="#f97316" /></>);
      case 'battery': return <Section title="Batterie" items={batteryInfo} color="#f59e0b" />;
      case 'network': return <Section title="Réseau" items={networkList} color="#8b5cf6" />;
      default: return null;
    }
  };

  const shareBtn = (
    <TouchableOpacity onPress={shareInfo} style={{ padding: 6 }}>
      <Feather name="share-2" size={22} color="#fff" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        <OutilHeader title="Informations Appareil" onClose={onClose} right={shareBtn} />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}><Feather name="smartphone" size={48} color="#6366f1" /></View>
          <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 12 }} />
          <Text style={{ color: '#64748b', fontWeight: '500' }}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <OutilHeader title="Informations Appareil" onClose={onClose} right={shareBtn} />

      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => { setActiveTab(tab.id); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.7}>
                <View style={styles.tabContent}>
                  <View style={[styles.tabIconContainer, isActive && { backgroundColor: `${tab.color}15` }]}>
                    <Feather name={tab.icon} size={18} color={isActive ? tab.color : '#94a3b8'} />
                  </View>
                  <Text style={[styles.tabLabel, isActive && { color: tab.color, fontWeight: '600' }]}>{tab.label}</Text>
                  {isActive && <View style={[styles.tabIndicator, { backgroundColor: tab.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 20) + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}>
        {/* ✅ Utilise useAnimatedStyle au lieu de .value inline */}
        <Animated.View style={animatedContentStyle}>
          {renderContent()}
        </Animated.View>
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>
            Dernière mise à jour • {new Date().toLocaleTimeString('fr-FR')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  2) MAGNÉTOMÈTRE — ondes animées avec Reanimated
// ═══════════════════════════════════════════════════════════════════════
const INITIAL_THRESHOLD = 20;
const WINDOW_SIZE = 10;
const MIN_THRESHOLD = 5;
const MAX_THRESHOLD = 50;
const MODAL_DEBOUNCE_TIME = 5000;

function WaveCircle({ color, initialRadius, maxRadius, delay, borderWidth, fillOpacity }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, [delay]);

  // ✅ useAnimatedStyle : pas de .value dans le style inline
  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + progress.value * (maxRadius / initialRadius - 1);
    const opacity = progress.value < 0.7 ? 1 - progress.value * 0.714 : 0.5 - (progress.value - 0.7) * 1.666;
    return {
      opacity: Math.max(opacity, 0),
      transform: [{ scale }],
    };
  });

  const baseCircleDiameter = initialRadius * 2;

  return (
    <Animated.View
      style={[
        styles.waveCircle,
        {
          width: baseCircleDiameter,
          height: baseCircleDiameter,
          borderRadius: baseCircleDiameter / 2,
          borderColor: color,
          borderWidth,
          backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${fillOpacity})`,
        },
        animatedStyle,
      ]}
    />
  );
}

function WaveEmitter({ color = '#007bff', initialRadius = 50, maxRadius = SW * 0.4, numberOfWaves = 4, borderWidth = 2, fillOpacity = 0.2 }) {
  return (
    <View style={styles.waveEmitterContainer}>
      {Array.from({ length: numberOfWaves }).map((_, index) => (
        <WaveCircle
          key={index}
          color={color}
          initialRadius={initialRadius}
          maxRadius={maxRadius}
          delay={(2000 / numberOfWaves) * index}
          borderWidth={borderWidth}
          fillOpacity={fillOpacity}
        />
      ))}
      <View style={[styles.centerDot, { backgroundColor: color }]} />
    </View>
  );
}

function MagnetometerScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const [magneticField, setMagneticField] = useState({ x: 0, y: 0, z: 0 });
  const [baseline, setBaseline] = useState(null);
  const [magnitude, setMagnitude] = useState(0);
  const [filteredMagnitude, setFilteredMagnitude] = useState(0);
  const [history, setHistory] = useState([]);
  const [threshold, setThreshold] = useState(INITIAL_THRESHOLD);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const lastModalTime = useRef(0);

  const calculateMagnitude = ({ x, y, z }) => Math.sqrt(x * x + y * y + z * z);
  const applyMovingAverage = (values) => {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  useEffect(() => {
    Magnetometer.setUpdateInterval(100);
    const subscription = Magnetometer.addListener(({ x, y, z }) => {
      const newMagneticField = { x, y, z };
      setMagneticField(newMagneticField);
      const newMagnitude = calculateMagnitude(newMagneticField);
      setMagnitude(newMagnitude);

      setHistory((prev) => {
        const newHistory = [...prev, newMagnitude].slice(-WINDOW_SIZE);
        const filtered = applyMovingAverage(newHistory);
        setFilteredMagnitude(filtered);

        if (baseline && Math.abs(filtered - baseline) > threshold) {
          const currentTime = Date.now();
          if (currentTime - lastModalTime.current >= MODAL_DEBOUNCE_TIME) {
            setModalMessage(`Variation significative du champ magnétique : ${filtered.toFixed(2)} μT`);
            setIsModalVisible(true);
            lastModalTime.current = currentTime;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
        return newHistory;
      });
    });

    Magnetometer.isAvailableAsync().then((available) => {
      if (!available) {
        setModalMessage("Le magnétomètre n'est pas disponible sur cet appareil.");
        setIsModalVisible(true);
      }
    });

    return () => subscription.remove();
  }, [baseline, threshold]);

  const handleCalibrate = () => {
    setBaseline(filteredMagnitude);
    setModalMessage(`Baseline définie à ${filteredMagnitude.toFixed(2)} μT`);
    setIsModalVisible(true);
  };
  const increaseThreshold = () => setThreshold(p => Math.min(p + 1, MAX_THRESHOLD));
  const decreaseThreshold = () => setThreshold(p => Math.max(p - 1, MIN_THRESHOLD));
  const closeModal = () => setIsModalVisible(false);

  const getWaveColorAndStatus = () => {
    if (!baseline) return { color: '#ccc', status: 'Calibration requise', maxRadius: SW * 0.3 };
    const deviation = Math.abs(filteredMagnitude - baseline);
    if (deviation > threshold) return { color: '#ff0000', status: 'Anomalie détectée', maxRadius: SW * 0.5 };
    if (deviation > threshold / 2) return { color: '#ffa500', status: 'Perturbation modérée', maxRadius: SW * 0.4 };
    return { color: '#00ff00', status: 'Normal', maxRadius: SW * 0.35 };
  };
  const { color, status, maxRadius } = getWaveColorAndStatus();

  return (
    <View style={styles.magContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <OutilHeader title="Magnétomètre" onClose={onClose} />

      <View style={{ flex: 1 }}>
        <View style={styles.magBackgroundWave}>
          <WaveEmitter
            color={color}
            initialRadius={50}
            maxRadius={maxRadius}
            numberOfWaves={4}
            borderWidth={3}
            fillOpacity={0.3}
          />
        </View>

        <View style={styles.magDataContainer}>
          <View style={styles.magDataRow}>
            <Text style={styles.magLabel}>X: {magneticField.x.toFixed(2)} μT</Text>
            <Text style={styles.magLabel}>Y: {magneticField.y.toFixed(2)} μT</Text>
            <Text style={styles.magLabel}>Z: {magneticField.z.toFixed(2)} μT</Text>
          </View>
          <View style={styles.magDataRow}>
            <Text style={styles.magLabel}>Brute: {magnitude.toFixed(2)} μT</Text>
            <Text style={styles.magLabel}>Filtrée: {filteredMagnitude.toFixed(2)} μT</Text>
            <Text style={styles.magLabel}>Baseline: {baseline ? baseline.toFixed(2) : 'N/A'} μT</Text>
          </View>
        </View>

        <View style={styles.magDeviationContainer}>
          <Text style={[styles.magDeviationText, { color }]}>
            {baseline ? `${filteredMagnitude.toFixed(2)} μT (${status})` : "Calibrez pour voir l'écart"}
          </Text>
        </View>

        <View style={[styles.magControlsContainer, { paddingBottom: Math.max(insets.bottom, 12) + 20 }]}>
          <Text style={styles.magThresholdLabel}>Seuil de détection: {threshold} μT</Text>
          <View style={styles.magButtonGroup}>
            <TouchableOpacity
              style={[styles.magThresholdButton, { opacity: threshold <= MIN_THRESHOLD ? 0.5 : 1 }]}
              onPress={decreaseThreshold}
              disabled={threshold <= MIN_THRESHOLD}
            >
              <Text style={styles.magThresholdButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.magCalibrateButton} onPress={handleCalibrate}>
              <Text style={styles.magCalibrateButtonText}>Calibrer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.magThresholdButton, { opacity: threshold >= MAX_THRESHOLD ? 0.5 : 1 }]}
              onPress={increaseThreshold}
              disabled={threshold >= MAX_THRESHOLD}
            >
              <Text style={styles.magThresholdButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.magModalBackdrop}>
          <View style={styles.magModalContent}>
            <Text style={styles.magModalTitle}>Notification</Text>
            <Text style={styles.magModalMessage}>{modalMessage}</Text>
            <TouchableOpacity style={styles.magModalButton} onPress={closeModal}>
              <Text style={styles.magModalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  3) GPS
// ═══════════════════════════════════════════════════════════════════════
const INITIAL_COORDS = [7.5399, -5.5471];
const INITIAL_ZOOM = 7;

function GPSScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [statusMessage, setStatusMessage] = useState('En attente de la position...');
  const [errorMsg, setErrorMsg] = useState(null);
  const webviewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const getAddress = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'Rouah/1.0 (infoseric35@gmail.com)' } });
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const parts = [a.road, a.suburb, a.city_district, a.city, a.town, a.village, a.state, a.country].filter(Boolean);
        return parts.join(', ');
      }
      return null;
    } catch { return null; }
  };

  useEffect(() => {
    let sub;
    let cancelled = false;
    const start = async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          if (!cancelled) setErrorMsg('Les services de localisation sont désactivés');
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setErrorMsg('Permission de localisation refusée');
          return;
        }
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setCurrentLocation({ latitude, longitude, accuracy });
            const addr = await getAddress(latitude, longitude);
            setStatusMessage(addr ? `${addr} (Précision: ${accuracy.toFixed(0)}m)` :
              `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
            if (webviewRef.current && mapReady) {
              webviewRef.current.injectJavaScript(`
                if (typeof map !== 'undefined') {
                  if (window.currentUserMarker) map.removeLayer(window.currentUserMarker);
                  window.currentUserMarker = L.marker([${latitude}, ${longitude}]).addTo(map)
                    .bindPopup('Lat: ${latitude.toFixed(6)}<br>Lon: ${longitude.toFixed(6)}');
                  if (window.accuracyCircle) map.removeLayer(window.accuracyCircle);
                  window.accuracyCircle = L.circle([${latitude}, ${longitude}], { radius: ${accuracy}, color: '#007bff', fillOpacity: 0.1 }).addTo(map);
                  if (!window.mapCentered) { map.setView([${latitude}, ${longitude}], 16); window.mapCentered = true; }
                }
              `);
            }
          }
        );
      } catch {
        if (!cancelled) setErrorMsg('Erreur initialisation');
      }
    };
    start();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [mapReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && errorMsg) {
        try {
          const enabled = await Location.hasServicesEnabledAsync();
          const { status } = await Location.getForegroundPermissionsAsync();
          if (enabled && status === 'granted') {
            setErrorMsg(null);
            setStatusMessage('Nouvelle tentative...');
            setMapReady(false);
            setTimeout(() => setMapReady(true), 100);
          }
        } catch {}
      }
    });
    return () => sub.remove();
  }, [errorMsg]);

  const refresh = async () => {
    try {
      setStatusMessage('Actualisation...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permission refusée');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy } = pos.coords;
      setCurrentLocation({ latitude, longitude, accuracy });
      const addr = await getAddress(latitude, longitude);
      setStatusMessage(addr ? `${addr} (Précision: ${accuracy.toFixed(0)}m)` : `Précision: ${accuracy.toFixed(0)}m`);
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          if (typeof map !== 'undefined') {
            if (window.currentUserMarker) map.removeLayer(window.currentUserMarker);
            window.currentUserMarker = L.marker([${latitude}, ${longitude}]).addTo(map).openPopup();
            map.setView([${latitude}, ${longitude}], 16);
          }
        `);
      }
      Vibration.vibrate(50);
    } catch { Alert.alert('Erreur', 'Impossible de mettre à jour'); }
  };

  const center = () => {
    if (currentLocation && webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') map.setView([${currentLocation.latitude}, ${currentLocation.longitude}], 16);
      `);
    }
  };

  const htmlContent = `
    <!DOCTYPE html><html><head>
    <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
    </head><body><div id="map"></div>
    <script>
      const map = L.map('map').setView([${INITIAL_COORDS[0]}, ${INITIAL_COORDS[1]}], ${INITIAL_ZOOM});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
      window.map = map;
      map.whenReady(() => window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' })));
    </script></body></html>
  `;

  if (errorMsg) {
    const isPermissionDenied = errorMsg.toLowerCase().includes('permission');
    const isServicesDisabled = errorMsg.toLowerCase().includes('désactivés');

    const handlePrimaryAction = async () => {
      try {
        if (isServicesDisabled) {
          if (Platform.OS === 'android') {
            await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
          } else {
            await Linking.openSettings();
          }
        } else if (isPermissionDenied) {
          await Linking.openSettings();
        } else {
          setErrorMsg(null);
          setStatusMessage('Nouvelle tentative...');
          setMapReady(false);
          setTimeout(() => setMapReady(true), 100);
        }
      } catch {
        Alert.alert('Erreur', "Impossible d'ouvrir les paramètres");
      }
    };

    const primaryLabel = isServicesDisabled
      ? 'Activer la localisation'
      : isPermissionDenied
        ? 'Autoriser la permission'
        : 'Réessayer';

    const primaryIcon = isServicesDisabled
      ? 'navigate-outline'
      : isPermissionDenied
        ? 'lock-open-outline'
        : 'refresh';

    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        <OutilHeader title="GPS — Position live" onClose={onClose} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
          <Feather name="map-pin" size={60} color="#ff6b6b" />
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 20 }}>Erreur</Text>
          <Text style={{ color: '#666', textAlign: 'center', marginVertical: 16 }}>{errorMsg}</Text>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#075E54', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 10, marginBottom: 12 }}
            onPress={handlePrimaryAction}
          >
            <Ionicons name={primaryIcon} size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{primaryLabel}</Text>
          </TouchableOpacity>

          {(isServicesDisabled || isPermissionDenied) && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, gap: 8 }}
              onPress={() => {
                setErrorMsg(null);
                setStatusMessage('Nouvelle tentative...');
                setMapReady(false);
                setTimeout(() => setMapReady(true), 100);
              }}
            >
              <Ionicons name="refresh" size={18} color="#075E54" />
              <Text style={{ color: '#075E54', fontWeight: '600', fontSize: 14 }}>J'ai activé, réessayer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F2F5' }}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <OutilHeader title="GPS — Position live" onClose={onClose} />

      <View style={{ flex: 1 }}>
        <WebView ref={webviewRef} originWhitelist={['*']} source={{ html: htmlContent }}
          javaScriptEnabled domStorageEnabled style={{ flex: 1 }}
          onMessage={(e) => { try { const d = JSON.parse(e.nativeEvent.data); if (d.type === 'mapReady') setMapReady(true); } catch {} }} />

        <Animated.View entering={FadeIn.duration(1000)} style={{ position: 'absolute', top: 10, left: 10, right: 10 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, padding: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Feather name="map-pin" size={20} color="#007bff" />
              <Text style={{ fontWeight: 'bold', color: '#007bff', marginLeft: 8 }}>Votre position</Text>
            </View>
            <Text style={{ textAlign: 'center', color: '#333' }}>{statusMessage}</Text>
          </View>
        </Animated.View>

        <TouchableOpacity style={[styles.gpsFab, { backgroundColor: '#28a745', bottom: Math.max(insets.bottom, 20) + 100 }]} onPress={refresh}>
          <Feather name="refresh-cw" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gpsFab, { backgroundColor: '#007bff', bottom: Math.max(insets.bottom, 20) + 160 }]} onPress={center}>
          <Feather name="navigation" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  4) SCANNER — CameraView sans children + ligne de scan Reanimated
// ═══════════════════════════════════════════════════════════════════════
function ScanLine() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(SW * 0.7 - 4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  // ✅ useAnimatedStyle → pas de .value inline
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        { width: '100%', height: 2, backgroundColor: '#2196F3' },
        animatedStyle,
      ]}
    />
  );
}

function ScannerScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState('back');

  const reset = () => { setScanned(false); };

  const handle = ({ data }) => {
    setScanned(true);
    if (data.startsWith('http')) {
      Alert.alert('Lien détecté', `Ouvrir ?\n\n${data}`, [
        { text: 'Non', onPress: reset },
        { text: 'Oui', onPress: () => Linking.openURL(data).catch(() => { Alert.alert('Erreur', 'Impossible'); reset(); }) },
      ]);
    } else {
      Alert.alert('Code scanné', data, [{ text: 'OK', onPress: reset }]);
    }
  };

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        <OutilHeader title="Scanner QR / Code-barres" onClose={onClose} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        <OutilHeader title="Scanner QR / Code-barres" onClose={onClose} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="camera" size={80} color="#2196F3" />
          <Text style={{ color: '#fff', fontSize: 18, marginVertical: 20, textAlign: 'center' }}>
            Autorisez la caméra pour scanner
          </Text>
          <TouchableOpacity style={{ backgroundColor: '#2196F3', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 }} onPress={requestPermission}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Autoriser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <OutilHeader title="Scanner QR / Code-barres" onClose={onClose} />

      <View style={{ flex: 1 }}>
        {/* ✅ CameraView SANS children */}
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          onBarcodeScanned={scanned ? undefined : handle}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13'] }}
        />

        {/* ✅ Overlay en frère absolu */}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }]}
          pointerEvents="none"
        >
          <View style={{ width: SW * 0.7, height: SW * 0.7, borderRadius: 20, borderWidth: 2, borderColor: '#2196F3', overflow: 'hidden' }}>
            <ScanLine />
          </View>
          <Text style={{ color: '#fff', marginTop: 30, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
            Placez le code dans le cadre
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, paddingBottom: Math.max(insets.bottom, 20) + 4, backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setTorch(!torch)}>
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={28} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 5 }}>Flash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
          <Ionicons name="camera-reverse" size={28} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 5 }}>Caméra</Text>
        </TouchableOpacity>
        {scanned && (
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={reset}>
            <Ionicons name="refresh" size={28} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, marginTop: 5 }}>Nouveau</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  5) QR CODE
// ═══════════════════════════════════════════════════════════════════════
function QrScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [size] = useState(200);
  const [backgroundColor] = useState('#FFFFFF');
  const [color, setColor] = useState('#000000');
  const [modalVisible, setModalVisible] = useState(false);
  const qrContainerRef = useRef(null);

  const generate = () => {
    if (!text.trim()) return Alert.alert('Erreur', 'Veuillez entrer un texte');
    setQrValue(text);
  };
  const reset = () => { setText(''); setQrValue(''); setColor('#000000'); };

  const share = async () => {
    if (!qrValue) return Alert.alert('Erreur', 'Générez un QR Code');
    try {
      const uri = await captureRef(qrContainerRef.current, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { Alert.alert('Erreur', 'Impossible de partager'); }
  };

  const COLORS = [
    { value: '#000000', name: 'Noir' }, { value: '#333333', name: 'Gris' },
    { value: '#2196F3', name: 'Bleu' }, { value: '#4CAF50', name: 'Vert' },
    { value: '#FF9800', name: 'Orange' }, { value: '#9C27B0', name: 'Violet' },
    { value: '#F44336', name: 'Rouge' }, { value: '#00BCD4', name: 'Turquoise' },
    { value: '#795548', name: 'Marron' }, { value: '#607D8B', name: 'Bleu gris' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <OutilHeader title="Générateur QR Code" onClose={onClose} />

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
        <TextInput style={{
          width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 15,
          fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 80,
          textAlignVertical: 'top', marginBottom: 15,
        }} placeholder="Entrez le texte ou l'URL..." value={text} onChangeText={setText} multiline />

        <TouchableOpacity style={{ backgroundColor: '#6C63FF', padding: 14, borderRadius: 12, width: '100%', marginBottom: 10 }}
          onPress={() => setModalVisible(true)}>
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Changer la couleur</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ backgroundColor: '#075E54', padding: 14, borderRadius: 12, width: '100%', marginBottom: 20 }}
          onPress={generate}>
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Générer QR Code</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '100%' }}>
          <View ref={qrContainerRef} collapsable={false} style={{ padding: 20, backgroundColor: '#fff', borderRadius: 10 }}>
            <QRCode value={qrValue || 'Prévisualisation'} size={qrValue ? size : 150} color={color} backgroundColor={backgroundColor} />
          </View>
          {qrValue ? (
            <>
              <Text style={{ marginTop: 20, color: '#666', textAlign: 'center' }}>{qrValue}</Text>
              <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
                <TouchableOpacity style={{ backgroundColor: '#FF9800', padding: 12, borderRadius: 10, flex: 1 }} onPress={share}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#9C27B0', padding: 12, borderRadius: 10, flex: 1 }} onPress={() => setModalVisible(true)}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Paramètres</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={{ marginTop: 20, color: '#666', textAlign: 'center' }}>
              Entrez du texte et cliquez sur "Générer"
            </Text>
          )}
        </View>

        <TouchableOpacity style={{ backgroundColor: '#f44336', padding: 14, borderRadius: 12, width: '100%', marginTop: 20 }} onPress={reset}>
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Réinitialiser</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 10, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Choisir la couleur</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 24, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {COLORS.map(c => (
                  <TouchableOpacity key={c.value} style={{ alignItems: 'center', width: '30%', marginBottom: 15 }} onPress={() => setColor(c.value)}>
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: c.value, borderWidth: color === c.value ? 3 : 0, borderColor: '#2196F3' }} />
                    <Text style={{ fontSize: 12, marginTop: 4 }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={{ backgroundColor: '#075E54', padding: 14, borderRadius: 12, marginTop: 16 }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  6) JEU CAISSIER FOU
// ═══════════════════════════════════════════════════════════════════════
const GRAVITY = 0.9, JUMP_FORCE = -16, DOUBLE_JUMP = -14;
const SCROLL_SPEED = 5, MAX_SPEED = 11, ACCELERATION = 0.002;
const GROUND_RATIO = 0.78, PLAYER_SIZE = 44, PLAYER_X_RATIO = 0.18, FPS = 30;
const POWERUP_DURATION = { magnet: 300, shield: 1, slowmo: 150 };
const COMBO_THRESHOLD = 5;

const THEMES = {
  day: { bg: '#F0F2F5', sky: '#B8E6F0', skyLight: '#E8F7FB', ground: '#A67C52', groundTop: '#8B6340', text: '#111B21', gold: '#FBBF24', carton: '#C08B5C', cartonDark: '#A06B3C', caddie: '#4A90E2', caddieDark: '#2563EB', cloud: '#FFFFFF', sun: '#FCD34D', shop: '#8B7355' },
  night: { bg: '#0F172A', sky: '#1E293B', skyLight: '#0F172A', ground: '#4A3B2A', groundTop: '#2D2418', text: '#E2E8F0', gold: '#FBBF24', carton: '#7A5B3C', cartonDark: '#5A4028', caddie: '#3B6BA5', caddieDark: '#1E3A5F', cloud: '#475569', sun: '#94A3B8', shop: '#334155' },
};

function collide(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function updatePlayer(p, screenH) {
  const groundY = screenH * GROUND_RATIO;
  let { y, vy, jumping } = p;
  vy += GRAVITY; y += vy;
  if (y >= groundY - PLAYER_SIZE) { y = groundY - PLAYER_SIZE; vy = 0; jumping = false; }
  return { ...p, y, vy, jumping };
}
function scrollArray(arr, speed) { return arr.map(o => ({ ...o, x: o.x - speed })).filter(o => o.x + o.w > -50); }
function creerObstacle(type, sw, sh, lastX = sw) {
  const gy = sh * GROUND_RATIO;
  if (type === 'carton') {
    const s = 38 + Math.random() * 20;
    return { id: `o-${Date.now()}-${Math.random()}`, type, x: lastX + 200 + Math.random() * 200, y: gy - s, w: s, h: s, collided: false };
  }
  return { id: `o-${Date.now()}-${Math.random()}`, type: 'caddie', x: lastX + 250 + Math.random() * 250, y: gy - 42, w: 52, h: 42, collided: false };
}
function creerPiece(sw, sh, lastX = sw) {
  const gy = sh * GROUND_RATIO;
  return { id: `c-${Date.now()}-${Math.random()}`, x: lastX + 150 + Math.random() * 300, y: gy - 80 - Math.random() * 100, w: 28, h: 28, collected: false, type: 'coin' };
}
function creerPowerUp(sw, sh, lastX = sw) {
  const gy = sh * GROUND_RATIO;
  const types = ['magnet', 'shield', 'slowmo'];
  const type = types[Math.floor(Math.random() * types.length)];
  const colors = { magnet: '#8B5CF6', shield: '#3B82F6', slowmo: '#F59E0B' };
  return { id: `pw-${Date.now()}-${Math.random()}`, x: lastX + 300 + Math.random() * 300, y: gy - 100 - Math.random() * 80, w: 34, h: 34, collected: false, type: 'powerup', powerType: type, color: colors[type] };
}

function JeuScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [phase, setPhase] = useState('accueil');
  const [score, setScore] = useState(0);
  const [record, setRecord] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    (async () => { try { const r = await AsyncStorage.getItem('@caissier_record'); if (r) setRecord(parseInt(r, 10) || 0); } catch {} })();
  }, []);

  const demarrer = useCallback(async () => { setScore(0); setCoins(0); setPhase('jeu'); }, []);
  const gameOver = useCallback(async (fs_) => {
    setScore(fs_);
    const nr = Math.max(record, fs_);
    setRecord(nr);
    try { await AsyncStorage.setItem('@caissier_record', String(nr)); } catch {}
    setPhase('gameover');
    Vibration.vibrate([0, 100, 100, 200]);
  }, [record]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F2F5' }}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <OutilHeader title="Caissier Fou" onClose={onClose} />

      {phase === 'accueil' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) }}>
          <Animated.View entering={FadeInDown.duration(600).springify()} style={{ alignItems: 'center' }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#075E54', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <MaterialCommunityIcons name="run-fast" size={fs(56)} color="#fff" />
            </View>
            <Text style={{ fontSize: fs(32), fontWeight: '900', color: '#075E54', letterSpacing: 2, marginBottom: 8 }}>CAISSIER FOU</Text>
            <Text style={{ fontSize: fs(14), color: '#111B21', textAlign: 'center', marginBottom: 20 }}>
              Cours vers la boutique,{'\n'}ramasse les FCFA, évite les obstacles !
            </Text>
            {record > 0 && (
              <View style={{ flexDirection: 'row', backgroundColor: '#075E54', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 20 }}>
                <Ionicons name="trophy" size={14} color="#FBBF24" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Record : {record} m</Text>
              </View>
            )}
          </Animated.View>
          <TouchableWithoutFeedback onPress={demarrer}>
            <View style={{ flexDirection: 'row', backgroundColor: '#25D366', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, gap: 10 }}>
              <Ionicons name="play" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 }}>JOUER</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
      {phase === 'jeu' && <JeuTerrain winW={winW} winH={winH} onGameOver={gameOver} onCoinsUpdate={setCoins} />}
      {phase === 'gameover' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 20) }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center' }}>
            <MaterialCommunityIcons name={score >= record && score > 0 ? 'trophy-award' : 'emoticon-sad'} size={fs(70)} color={score >= record && score > 0 ? '#FBBF24' : '#EF4444'} />
            <Text style={{ fontSize: fs(26), fontWeight: '900', color: '#075E54', marginTop: 8 }}>
              {score >= record && score > 0 ? 'NOUVEAU RECORD !' : 'GAME OVER'}
            </Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#F0F2F5', borderRadius: 14, padding: 16, marginVertical: 16, width: '100%', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#075E54' }}>{score}</Text>
                <Text style={{ fontSize: 11, color: '#667781' }}>mètres</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#E9EDEF' }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#075E54' }}>{coins}</Text>
                <Text style={{ fontSize: 11, color: '#667781' }}>pièces</Text>
              </View>
            </View>
            <TouchableWithoutFeedback onPress={demarrer}>
              <View style={{ flexDirection: 'row', backgroundColor: '#25D366', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, gap: 8, marginTop: 12, width: '100%', justifyContent: 'center' }}>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>REJOUER</Text>
              </View>
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={() => setPhase('accueil')}>
              <View style={{ paddingVertical: 12, paddingHorizontal: 20, marginTop: 6 }}>
                <Text style={{ color: '#075E54', fontSize: 13, fontWeight: '700' }}>Retour au menu</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
      )}
    </View>
  );
}

function JeuTerrain({ winW, winH, onGameOver, onCoinsUpdate }) {
  const groundY = winH * GROUND_RATIO;
  const playerX = winW * PLAYER_X_RATIO;
  const [player, setPlayer] = useState({ x: playerX, y: groundY - PLAYER_SIZE, vy: 0, jumping: false });
  const [obstacles, setObstacles] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [particles, setParticles] = useState([]);
  const [distance, setDistance] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [powerupUI, setPowerupUI] = useState(null);
  const [theme, setTheme] = useState('day');
  const [shielded, setShielded] = useState(false);

  const playerRef = useRef(player), obstaclesRef = useRef(obstacles), piecesRef = useRef(pieces);
  const particlesRef = useRef([]), deadRef = useRef(false), coinRef = useRef(0);
  const speedRef = useRef(SCROLL_SPEED), distanceRef = useRef(0);
  const lastSpawnObsRef = useRef(0), lastSpawnCoinRef = useRef(0), lastSpawnPowerupRef = useRef(0);
  const gameLoopRef = useRef(null), doubleJumpedRef = useRef(false);
  const comboRef = useRef(0), comboTimeoutRef = useRef(null);
  const shieldRef = useRef(false), magnetFramesRef = useRef(0), slowmoFramesRef = useRef(0);
  const pausedRef = useRef(false);
  const theme_ = THEMES[theme];

  const sauter = () => {
    if (deadRef.current || pausedRef.current) return;
    const p = playerRef.current;
    if (!p.jumping) {
      const u = { ...p, vy: JUMP_FORCE, jumping: true };
      playerRef.current = u; setPlayer(u); doubleJumpedRef.current = false;
    } else if (!doubleJumpedRef.current) {
      const u = { ...p, vy: DOUBLE_JUMP, jumping: true };
      playerRef.current = u; setPlayer(u); doubleJumpedRef.current = true;
      Vibration.vibrate(20);
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { pausedRef.current = s !== 'active'; });
    return () => sub.remove();
  }, []);

  const addCoin = () => {
    coinRef.current += 1; setCoinCount(coinRef.current); onCoinsUpdate?.(coinRef.current);
    comboRef.current += 1; setCombo(comboRef.current);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => { comboRef.current = 0; setCombo(0); }, 2000);
  };
  const addParticle = (x, y, color = '#FBBF24') => {
    particlesRef.current.push({ id: `p-${Date.now()}-${Math.random()}`, x, y, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 2, life: 30, color, size: 6 + Math.random() * 6 });
  };

  useEffect(() => {
    gameLoopRef.current = setInterval(() => {
      if (deadRef.current || pausedRef.current) return;
      const isSlowmo = slowmoFramesRef.current > 0;
      const speedMult = isSlowmo ? 0.5 : 1;
      const np = updatePlayer(playerRef.current, winH);
      playerRef.current = np; setPlayer(np);
      speedRef.current = Math.min(speedRef.current + ACCELERATION, MAX_SPEED);
      const effSpeed = speedRef.current * speedMult;
      const newObs = scrollArray(obstaclesRef.current, effSpeed);
      const newPieces = scrollArray(piecesRef.current, effSpeed);

      if (magnetFramesRef.current > 0) {
        magnetFramesRef.current -= 1;
        for (const coin of newPieces) {
          const dx = np.x - coin.x, dy = np.y - coin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 5) { coin.x += (dx / dist) * 6; coin.y += (dy / dist) * 6; }
        }
        if (magnetFramesRef.current === 0) setPowerupUI(null);
      }
      if (slowmoFramesRef.current > 0) {
        slowmoFramesRef.current -= 1;
        if (slowmoFramesRef.current === 0) setPowerupUI(null);
      }

      lastSpawnObsRef.current += 1;
      const obsInterval = Math.max(40, 90 - Math.floor(speedRef.current * 4));
      if (lastSpawnObsRef.current >= obsInterval) {
        lastSpawnObsRef.current = 0;
        const type = Math.random() < 0.6 ? 'carton' : 'caddie';
        const maxX = newObs.length > 0 ? Math.max(...newObs.map(o => o.x)) : winW;
        newObs.push(creerObstacle(type, winW, winH, maxX));
      }
      lastSpawnCoinRef.current += 1;
      if (lastSpawnCoinRef.current >= 55) {
        lastSpawnCoinRef.current = 0;
        const maxX = newPieces.length > 0 ? Math.max(...newPieces.map(p => p.x)) : winW;
        newPieces.push(creerPiece(winW, winH, maxX));
      }
      lastSpawnPowerupRef.current += 1;
      if (lastSpawnPowerupRef.current >= 360) {
        lastSpawnPowerupRef.current = 0;
        const maxX = newPieces.length > 0 ? Math.max(...newPieces.map(p => p.x)) : winW;
        newPieces.push(creerPowerUp(winW, winH, maxX));
      }

      const pBox = { x: np.x + 6, y: np.y + 6, w: PLAYER_SIZE - 12, h: PLAYER_SIZE - 12 };
      for (const obs of newObs) {
        if (!obs.collided && collide(pBox, obs)) {
          obs.collided = true;
          if (shieldRef.current) { shieldRef.current = false; setShielded(false); Vibration.vibrate(50); obs.x = -200; continue; }
          deadRef.current = true;
          clearInterval(gameLoopRef.current);
          setTimeout(() => onGameOver(Math.floor(distanceRef.current)), 200);
          return;
        }
      }
      for (const item of newPieces) {
        if (!item.collected && collide(pBox, item)) {
          item.collected = true;
          if (item.type === 'coin') { addCoin(); addParticle(item.x + item.w / 2, item.y + item.h / 2, '#FBBF24'); }
          else if (item.type === 'powerup') {
            addParticle(item.x + item.w / 2, item.y + item.h / 2, item.color);
            if (item.powerType === 'magnet') { magnetFramesRef.current = POWERUP_DURATION.magnet; setPowerupUI({ type: 'magnet', icon: 'magnet', color: '#8B5CF6' }); }
            else if (item.powerType === 'shield') { shieldRef.current = true; setShielded(true); setPowerupUI({ type: 'shield', icon: 'shield-checkmark', color: '#3B82F6' }); }
            else if (item.powerType === 'slowmo') { slowmoFramesRef.current = POWERUP_DURATION.slowmo; setPowerupUI({ type: 'slowmo', icon: 'hourglass', color: '#F59E0B' }); }
          }
        }
      }
      const cleaned = newPieces.filter(p => !p.collected);
      particlesRef.current = particlesRef.current.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.3, life: pt.life - 1 })).filter(pt => pt.life > 0);
      obstaclesRef.current = newObs; piecesRef.current = cleaned;
      setObstacles(newObs); setPieces(cleaned); setParticles([...particlesRef.current]);
      distanceRef.current += effSpeed / 8; setDistance(distanceRef.current);
      setTheme(Math.floor(distanceRef.current / 500) % 2 === 0 ? 'day' : 'night');
    }, 1000 / FPS);
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current); };
  }, [winW, winH, onGameOver]);

  return (
    <TouchableWithoutFeedback onPress={sauter}>
      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: theme_.skyLight }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: groundY, backgroundColor: theme_.sky }}>
          <View style={{ position: 'absolute', top: 40, left: 30, width: 70, height: 22, borderRadius: 11, backgroundColor: theme_.cloud }} />
          <View style={{ position: 'absolute', top: 90, right: 60, width: 70, height: 22, borderRadius: 11, backgroundColor: theme_.cloud }} />
          <View style={{ position: 'absolute', top: 30, right: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: theme_.sun, opacity: 0.8 }} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: winH - groundY, backgroundColor: theme_.ground }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: theme_.groundTop }} />
        </View>

        {obstacles.map(obs => (
          <View key={obs.id} style={{
            position: 'absolute', left: obs.x, top: obs.y, width: obs.w, height: obs.h,
            backgroundColor: obs.type === 'carton' ? theme_.carton : theme_.caddie,
            borderColor: obs.type === 'carton' ? theme_.cartonDark : theme_.caddieDark,
            borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialCommunityIcons name={obs.type === 'carton' ? 'package-variant-closed' : 'cart'} size={obs.w * 0.7}
              color={obs.type === 'carton' ? theme_.cartonDark : '#fff'} />
          </View>
        ))}

        {pieces.map(item => (
          <View key={item.id} style={{
            position: 'absolute', left: item.x, top: item.y, width: item.w, height: item.h,
            borderRadius: item.type === 'powerup' ? 17 : 14,
            backgroundColor: item.type === 'powerup' ? item.color : theme_.gold,
            alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
          }}>
            {item.type === 'coin' ? <Text style={{ color: '#92400E', fontWeight: '900' }}>F</Text> :
              <Ionicons name={item.powerType === 'magnet' ? 'magnet' : item.powerType === 'shield' ? 'shield-checkmark' : 'hourglass'} size={18} color="#fff" />}
          </View>
        ))}

        {particles.map(p => (
          <View key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color, opacity: p.life / 30 }} />
        ))}

        <View style={{ position: 'absolute', left: player.x, top: player.y, width: PLAYER_SIZE, height: PLAYER_SIZE, alignItems: 'center' }}>
          {shielded && <View style={{ position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: PLAYER_SIZE, borderWidth: 3, borderColor: '#3B82F6' }} />}
          <View style={{ position: 'absolute', top: 12, width: 32, height: 26, backgroundColor: '#075E54', borderRadius: 6 }} />
          <View style={{ position: 'absolute', top: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#F5C99B' }} />
          <View style={{ position: 'absolute', top: 0, width: 24, height: 10, backgroundColor: '#25D366', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
        </View>

        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 }}>
            <Ionicons name="walk" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800' }}>{Math.floor(distance)} m</Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6, alignItems: 'center' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FBBF24' }} />
            <Text style={{ color: '#fff', fontWeight: '800' }}>{coinCount}</Text>
            {combo >= COMBO_THRESHOLD && (
              <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row' }}>
                <Ionicons name="flame" size={10} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>×2</Text>
              </View>
            )}
          </View>
        </View>

        {powerupUI && (
          <View style={{ position: 'absolute', top: 60, left: 12, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: powerupUI.color, gap: 4 }}>
            <Ionicons name={powerupUI.icon} size={14} color={powerupUI.color} />
            <Text style={{ fontSize: 11, fontWeight: '900', color: powerupUI.color }}>{powerupUI.type.toUpperCase()}</Text>
          </View>
        )}

        <View style={{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Touche pour sauter (2× double)</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  7) HUB OUTILS
// ═══════════════════════════════════════════════════════════════════════
const OUTILS = [
  { id: 'device', label: 'Appareil', subtitle: 'Infos système', icon: 'phone-portrait-outline', lib: 'ion', color: '#6366f1', Comp: DeviceInfoScreen },
  { id: 'magnet', label: 'Magnéto', subtitle: 'Champ magnétique', icon: 'magnet', lib: 'mci', color: '#ef4444', Comp: MagnetometerScreen },
  { id: 'gps', label: 'GPS', subtitle: 'Position live', icon: 'location-outline', lib: 'ion', color: '#10b981', Comp: GPSScreen },
  { id: 'scanner', label: 'Scanner', subtitle: 'QR & codes-barres', icon: 'scan-outline', lib: 'ion', color: '#f59e0b', Comp: ScannerScreen },
  { id: 'qrcode', label: 'QR Code', subtitle: 'Générateur', icon: 'qr-code-outline', lib: 'ion', color: '#8b5cf6', Comp: QrScreen },
  { id: 'game', label: 'Caissier Fou', subtitle: 'Mini-jeu', icon: 'game-controller-outline', lib: 'ion', color: '#25D366', Comp: JeuScreen },
];

const OutilIcon = ({ outil, size = 26 }) => {
  if (outil.lib === 'mci') return <MaterialCommunityIcons name={outil.icon} size={size} color={outil.color} />;
  return <Ionicons name={outil.icon} size={size} color={outil.color} />;
};

export default function Outils({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [activeOutil, setActiveOutil] = useState(null);

  const open = (outil) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveOutil(outil);
  };
  const closeActive = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveOutil(null);
  };

  const ActiveComp = activeOutil?.Comp;
  const CARD_W = (SW - 32 - 12 * 2) / 3;

  return (
    <>
      <Modal visible={visible && !activeOutil} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#f8fafc',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: SH * 0.9,
            paddingBottom: Math.max(insets.bottom, 0),
          }}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#2a687a15', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="apps" size={22} color="#075E54" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Outils</Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}>{OUTILS.length} outils disponibles</Text>
                </View>
                <TouchableOpacity style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
                  <Ionicons name="close" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {OUTILS.map((o, idx) => (
                  <Animated.View
                    key={o.id}
                    entering={FadeInDown.delay(idx * 60).duration(400).springify()}
                    style={{ width: CARD_W }}
                  >
                    <TouchableOpacity style={{
                      width: '100%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center',
                    }} onPress={() => open(o)} activeOpacity={0.7}>
                      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `${o.color}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                        <OutilIcon outil={o} size={26} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>{o.label}</Text>
                      <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>{o.subtitle}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
              <Text style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 24 }}>Touchez un outil pour l'ouvrir</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeOutil} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeActive} statusBarTranslucent>
        {ActiveComp && <ActiveComp onClose={closeActive} />}
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  loadingIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },

  outilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#075E54',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  outilHeaderBackBtn: { padding: 4, marginRight: 6 },
  outilHeaderTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold' },

  tabBarContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 8 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 4, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#f8fafc' },
  tabContent: { alignItems: 'center', flexDirection: 'row', gap: 6, position: 'relative' },
  tabIconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  tabIndicator: { position: 'absolute', bottom: -6, left: 0, right: 0, height: 2.5, borderRadius: 2 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sectionCountText: { fontSize: 11, fontWeight: '600' },

  cardsGrid: { gap: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }, android: { elevation: 1 } }) },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTextContainer: { flex: 1 },
  cardLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 1 },
  cardValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  cardCopy: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  magContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  magBackgroundWave: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  waveEmitterContainer: { width: SW, height: SW, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  waveCircle: { position: 'absolute' },
  centerDot: { width: 20, height: 20, borderRadius: 10, position: 'absolute', zIndex: 1 },
  magDataContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 10, padding: 10, margin: 10, width: SW - 20, zIndex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  magDataRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  magLabel: { fontSize: 14, color: '#333', flex: 1, textAlign: 'center' },
  magDeviationContainer: { position: 'absolute', top: SH / 2 - 180, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  magDeviationText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  magControlsContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  magThresholdLabel: { fontSize: 16, color: '#333', marginBottom: 10 },
  magButtonGroup: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  magThresholdButton: { backgroundColor: '#2c2c2e', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  magThresholdButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  magCalibrateButton: { backgroundColor: '#2c2c2e', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 10 },
  magCalibrateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  magModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  magModalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, width: SW - 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  magModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  magModalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  magModalButton: { backgroundColor: '#075E54', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  magModalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  gpsFab: { position: 'absolute', right: 15, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});