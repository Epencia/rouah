import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Platform,
  PermissionsAndroid,
  Vibration,
  Appearance,
  useColorScheme,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Modal from 'react-native-modal';
import { Svg, Circle, G, Text as SvgText, Line, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Constantes
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;
const INITIAL_SPEED_THRESHOLD = 2; // Seuil initial de vitesse (km/h)
const MIN_SPEED_THRESHOLD = 0; // Seuil minimum (km/h)
const MAX_SPEED_THRESHOLD = 180; // Seuil maximum (km/h)
const MODAL_DEBOUNCE_TIME = 5000; // 5 secondes entre chaque modal
const MAX_SPEED_VALUE = 260; // Valeur maximale pour le compteur de vitesse
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.9, SCREEN_HEIGHT * 0.6); // Taille du compteur
const ALARM_SOUND = require('../assets/audio/emergency-alert-alarm.wav'); // Fichier audio

// Thèmes couleurs
const themes = {
  light: {
    background: '#f5f5f5',
    text: '#333',
    cardBackground: '#fff',
    buttonBackground: '#2c2c2e',
    buttonText: '#fff',
    speedometerBackground: '#fff',
    speedometerDial: '#ddd',
    statusNormal: '#4cd964',
    statusWarning: '#ffcc00',
    statusDanger: '#ff3b30',
    needle: '#ff3b30',
    thresholdMarker: '#ff3b30',
  },
  dark: {
    background: '#121212',
    text: '#fff',
    cardBackground: '#1e1e1e',
    buttonBackground: '#2c2c2e',
    buttonText: '#fff',
    speedometerBackground: '#1a1a1a',
    speedometerDial: '#333',
    statusNormal: '#4cd964',
    statusWarning: '#ffcc00',
    statusDanger: '#ff3b30',
    needle: '#ff3b30',
    thresholdMarker: '#ff3b30',
  },
};

// Composant Speedometer (tiré du second script, adapté au premier)
const Speedometer = ({ 
  value = 0, 
  maxValue = MAX_SPEED_VALUE, 
  threshold = INITIAL_SPEED_THRESHOLD,
  theme 
}) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const needleRotation = rotation.interpolate({
    inputRange: [0, maxValue],
    outputRange: ['-135deg', '135deg'],
  });

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: Math.min(value, maxValue),
      duration: 600,
      easing: Easing.out(Easing.elastic(0.5)),
      useNativeDriver: true,
    }).start();
  }, [value]);

  const radius = CIRCLE_SIZE / 2;
  const center = radius;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  const dashArray = `${circumference}, ${circumference}`;
  const progress = (value / maxValue) * circumference;
  
  // Couleur dynamique basée sur le seuil
  const getSpeedColor = () => {
    if (value > threshold) return theme.statusDanger;
    if (value > threshold * 0.8) return theme.statusWarning;
    return theme.statusNormal;
  };
  const speedColor = getSpeedColor();

  const renderTicks = () => {
    const ticks = [];
    const majorTickCount = Math.floor(maxValue / 20); // Un tick tous les 20 km/h
    const minorTickCount = majorTickCount * 4; // 4 ticks mineurs entre chaque majeur
    const majorTickLength = 15;
    const minorTickLength = 8;
    
    // Ticks mineurs
    for (let i = 0; i <= minorTickCount; i++) {
      const angle = (i / minorTickCount) * 270 - 135;
      const x1 = center + (radius - strokeWidth - 5) * Math.cos(angle * Math.PI / 180);
      const y1 = center + (radius - strokeWidth - 5) * Math.sin(angle * Math.PI / 180);
      const x2 = center + (radius - strokeWidth - minorTickLength - 5) * Math.cos(angle * Math.PI / 180);
      const y2 = center + (radius - strokeWidth - minorTickLength - 5) * Math.sin(angle * Math.PI / 180);
      
      ticks.push(
        <Line
          key={`minor-tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={theme.text}
          strokeWidth="1"
          opacity={0.6}
        />
      );
    }
    
    // Ticks majeurs et labels
    for (let i = 0; i <= majorTickCount; i++) {
      const angle = (i / majorTickCount) * 270 - 135;
      const x1 = center + (radius - strokeWidth - 5) * Math.cos(angle * Math.PI / 180);
      const y1 = center + (radius - strokeWidth - 5) * Math.sin(angle * Math.PI / 180);
      const x2 = center + (radius - strokeWidth - majorTickLength - 5) * Math.cos(angle * Math.PI / 180);
      const y2 = center + (radius - strokeWidth - majorTickLength - 5) * Math.sin(angle * Math.PI / 180);
      
      ticks.push(
        <Line
          key={`major-tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={theme.text}
          strokeWidth="3"
          opacity={0.8}
        />
      );
      
      const labelValue = i * 20; // Valeur du label tous les 20 km/h
      const labelX = center + (radius - strokeWidth - majorTickLength - 25) * Math.cos(angle * Math.PI / 180);
      const labelY = center + (radius - strokeWidth - majorTickLength - 25) * Math.sin(angle * Math.PI / 180);
      
      if (labelValue <= maxValue) {
        ticks.push(
          <SvgText
            key={`label-${i}`}
            x={labelX}
            y={labelY}
            fill={theme.text}
            fontSize="14"
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {labelValue}
          </SvgText>
        );
      }
    }
    
    // Marqueur de seuil
    if (threshold > 0) {
      const thresholdAngle = ((threshold / maxValue) * 270 - 135);
      const thresholdX1 = center + (radius - strokeWidth - 5) * Math.cos(thresholdAngle * Math.PI / 180);
      const thresholdY1 = center + (radius - strokeWidth - 5) * Math.sin(thresholdAngle * Math.PI / 180);
      const thresholdX2 = center + (radius - strokeWidth - 20) * Math.cos((thresholdAngle + 2) * Math.PI / 180);
      const thresholdY2 = center + (radius - strokeWidth - 20) * Math.sin((thresholdAngle + 2) * Math.PI / 180);
      const thresholdX3 = center + (radius - strokeWidth - 20) * Math.cos((thresholdAngle - 2) * Math.PI / 180);
      const thresholdY3 = center + (radius - strokeWidth - 20) * Math.sin((thresholdAngle - 2) * Math.PI / 180);
      
      ticks.push(
        <Path
          key="threshold-marker"
          d={`M ${thresholdX1} ${thresholdY1} L ${thresholdX2} ${thresholdY2} L ${thresholdX3} ${thresholdY3} Z`}
          fill={theme.thresholdMarker}
        />
      );
    }
    
    return ticks;
  };

  return (
    <View style={styles.speedometerContainer}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={speedColor} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={speedColor} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        
        <Circle
          cx={center}
          cy={center}
          r={radius + 5}
          stroke={theme.text}
          strokeWidth="4"
          fill="none"
          opacity="0.3"
        />
        
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          stroke={theme.speedometerDial}
          strokeWidth={strokeWidth}
          fill={theme.speedometerBackground}
        />
        
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          fill="transparent"
          rotation="-135"
          origin={`${center}, ${center}`}
        />
        
        <G>{renderTicks()}</G>
        
        <G rotation={needleRotation} origin={`${center}, ${center}`}>
          <Line
            x1={center}
            y1={center}
            x2={center}
            y2={center - radius + 25}
            stroke={theme.needle}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Circle
            cx={center}
            cy={center}
            r="10"
            fill="#333"
            stroke="#fff"
            strokeWidth="2"
          />
        </G>
        
        <SvgText
          x={center}
          y={center + 40}
          fill={theme.text}
          fontSize="28"
          fontWeight="bold"
          textAnchor="middle"
        >
          {Math.round(value)} 
        </SvgText>
        
        <SvgText
          x={center}
          y={center + 70}
          fill={theme.thresholdMarker}
          fontSize="16"
          fontWeight="600"
          textAnchor="middle"
        >
          {Math.round(threshold)}
        </SvgText>
      </Svg>
    </View>
  );
};

// Composant Modal personnalisé
const CustomModal = ({ isVisible, onClose, title, message, theme }) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.7}
      style={styles.modal}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.modalMessage, { color: theme.text }]}>{message}</Text>
        <TouchableOpacity 
          style={[styles.modalButton, { backgroundColor: theme.statusDanger }]} 
          onPress={onClose}
        >
          <Text style={styles.modalButtonText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default function DetecteurVitesse() {
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const [speed, setSpeed] = useState(0);
  const [speedThreshold, setSpeedThreshold] = useState(INITIAL_SPEED_THRESHOLD);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSpeeding, setIsSpeeding] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sound, setSound] = useState(null);
  const lastModalTime = useRef(0);
  const alarmPlaying = useRef(false);

  const theme = darkMode ? themes.dark : themes.light;

  // Charger le son avec gestion d'erreur
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          ALARM_SOUND,
          { shouldPlay: false }
        );
        setSound(sound);
        console.log('Son chargé avec succès');
      } catch (error) {
        console.error('Erreur lors du chargement du son :', error);
        setErrorMsg('Son d\'alerte non disponible');
      }
    };

    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync().catch((error) => {
          console.error('Erreur lors du déchargement du son :', error);
        });
      }
    };
  }, []);

  // Détecter les changements de thème système
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setDarkMode(colorScheme === 'dark');
    });

    return () => subscription.remove();
  }, []);

  // Jouer l'alarme
  const playAlarm = async () => {
    if (sound && !alarmPlaying.current) {
      try {
        alarmPlaying.current = true;
        await sound.replayAsync();
        console.log('Son d\'alerte joué');
        setTimeout(() => {
          alarmPlaying.current = false;
        }, 2000);
      } catch (error) {
        console.error('Erreur lors de la lecture du son :', error);
      }
    }
  };

  // Arrêter l'alarme
  const stopAlarm = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        console.log('Son arrêté');
        alarmPlaying.current = false;
      } catch (error) {
        console.error('Erreur lors de l\'arrêt du son :', error);
      }
    }
  };

  // Demander les permissions et démarrer le suivi GPS
  useEffect(() => {
    let locationSubscription;

    const startLocationUpdates = async () => {
      // Demander la permission pour Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setErrorMsg('Permission de localisation refusée');
          return;
        }
      }

      // Vérifier si le service de localisation est activé
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission de localisation refusée');
        return;
      }

      // Démarrer le suivi de la position
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);
          
          // Convertir la vitesse de m/s en km/h, avec gestion des valeurs nulles
          const speedKmh = newLocation.coords.speed ? newLocation.coords.speed * 3.6 : 0;
          setSpeed(speedKmh);

          // Détecter si la vitesse dépasse le seuil
          if (speedKmh > speedThreshold && !isSpeeding) {
            setIsSpeeding(true);
            const currentTime = Date.now();
            if (currentTime - lastModalTime.current >= MODAL_DEBOUNCE_TIME) {
              setModalMessage(`Attention ! Vous dépassez la vitesse seuil de ${Math.round(speedThreshold)} km/h (${Math.round(speedKmh)} km/h)`);
              setIsModalVisible(true);
              lastModalTime.current = currentTime;
              Vibration.vibrate([500, 500, 500]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              playAlarm();
            }
          } else if (speedKmh <= speedThreshold && isSpeeding) {
            setIsSpeeding(false);
            stopAlarm();
          }
        }
      );
    };

    startLocationUpdates();

    // Nettoyage
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [speedThreshold, isSpeeding]);

  // Ajuster le seuil de vitesse
  const increaseThreshold = () => {
    setSpeedThreshold((prev) => Math.min(prev + 1, MAX_SPEED_THRESHOLD));
  };

  const decreaseThreshold = () => {
    setSpeedThreshold((prev) => Math.max(prev - 1, MIN_SPEED_THRESHOLD));
  };

  // Basculer entre les modes jour/nuit
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Fermer le modal
  const closeModal = () => {
    setIsModalVisible(false);
  };

  // Calculer la couleur et l'état
  const getColorAndStatus = () => {
    if (speed > speedThreshold) {
      return { color: theme.statusDanger, status: 'DÉPASSEMENT DE VITESSE !' };
    } else if (speed > speedThreshold * 0.8) {
      return { color: theme.statusWarning, status: 'APPROCHE LIMITE' };
    }
    return { color: theme.statusNormal, status: 'VITESSE NORMALE' };
  };

  const { color, status } = getColorAndStatus();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Bouton de bascule jour/nuit */}
      <TouchableOpacity 
        style={[styles.themeButton, { backgroundColor: theme.buttonBackground }]}
        onPress={toggleDarkMode}
      >
        <Text style={[styles.themeButtonText, { color: theme.buttonText }]}>
          {darkMode ? '☀️ Mode Jour' : '🌙 Mode Nuit'}
        </Text>
      </TouchableOpacity>

      {/* Données en haut */}
      <View style={[styles.dataContainer, { backgroundColor: theme.cardBackground }]}>
        {errorMsg ? (
          <Text style={[styles.errorText, { color: theme.statusDanger }]}>{errorMsg}</Text>
        ) : location ? (
          <>
            <View style={styles.dataRow}>
              <Text style={[styles.label, { color: theme.text }]}>
                Vitesse : <Text style={{ fontWeight: 'bold', color }}>{Math.round(speed)} km/h</Text>
              </Text>
              <Text style={[styles.label, { color: theme.text }]}>
                Seuil : <Text style={{ fontWeight: 'bold', color: theme.thresholdMarker }}>{Math.round(speedThreshold)} km/h</Text>
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.label, { color: theme.text }]}>Latitude : {location.coords.latitude.toFixed(5)}</Text>
              <Text style={[styles.label, { color: theme.text }]}>Longitude : {location.coords.longitude.toFixed(5)}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.label, { color: theme.text }]}>Précision : {location.coords.accuracy.toFixed(0)} m</Text>
              <Text style={[styles.label, { color: theme.text }]}>
                Altitude : {location.coords.altitude ? location.coords.altitude.toFixed(0) : 'N/A'} m
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.label, { color: theme.text }]}>Acquisition des données GPS...</Text>
        )}
      </View>

      {/* Compteur de vitesse */}
      <View style={styles.speedometerWrapper}>
        <Speedometer 
          value={speed} 
          maxValue={MAX_SPEED_VALUE} 
          threshold={speedThreshold}
          theme={theme}
        />
      </View>

      {/* État au centre */}
      <View style={[styles.statusContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.statusText, { color }]}>
          {status}
        </Text>
      </View>

      {/* Contrôles en bas */}
      <View style={[styles.controlsContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.thresholdLabel, { color: theme.text }]}>Ajuster le seuil de vitesse</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.thresholdButton,
              { 
                backgroundColor: theme.buttonBackground,
                opacity: speedThreshold <= MIN_SPEED_THRESHOLD ? 0.5 : 1 
              },
            ]}
            onPress={decreaseThreshold}
            disabled={speedThreshold <= MIN_SPEED_THRESHOLD}
          >
            <Text style={[styles.thresholdButtonText, { color: theme.buttonText }]}>-1 km/h</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.thresholdButton,
              { 
                backgroundColor: theme.buttonBackground,
                opacity: speedThreshold >= MAX_SPEED_THRESHOLD ? 0.5 : 1 
              },
            ]}
            onPress={increaseThreshold}
            disabled={speedThreshold >= MAX_SPEED_THRESHOLD}
          >
            <Text style={[styles.thresholdButtonText, { color: theme.buttonText }]}>+1 km/h</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal personnalisé */}
      <CustomModal
        isVisible={isModalVisible}
        onClose={closeModal}
        title="⚠️ Alerte de vitesse"
        message={modalMessage}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  themeButton: {
    position: 'absolute',
    top: 5,
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  speedometerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedometerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataContainer: {
    borderRadius: 15,
    padding: 15,
    margin: 10,
    width: SCREEN_WIDTH - 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  statusContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  controlsContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  thresholdLabel: {
    fontSize: 16,
    marginBottom: 15,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  thresholdButton: {
    width: 120,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  thresholdButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});