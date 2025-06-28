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
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Modal from 'react-native-modal';
import { Svg, Circle, G, Text as SvgText, Line, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Constantes
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;
const INITIAL_SPEED_THRESHOLD = 50; // Seuil initial de vitesse (km/h)
const MIN_SPEED_THRESHOLD = 30; // Seuil minimum (km/h)
const MAX_SPEED_THRESHOLD = 130; // Seuil maximum (km/h)
const MODAL_DEBOUNCE_TIME = 5000; // 5 secondes entre chaque modal
const MAX_SPEED_VALUE = 140; // Valeur maximale pour le compteur de vitesse
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.85, SCREEN_HEIGHT * 0.65); // Taille du compteur

// Composant Speedometer
const Speedometer = ({ value = 0, maxValue = MAX_SPEED_VALUE, threshold = INITIAL_SPEED_THRESHOLD }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const needleRotation = rotation.interpolate({
    inputRange: [0, maxValue],
    outputRange: ['-135deg', '135deg'], // Étendu pour un look plus automobile
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
  
  // Déterminer la couleur en fonction du seuil
  const color = value > threshold ? '#ff0000' : '#007bff';

  // Créer les marques pour le compteur
  const renderTicks = () => {
    const ticks = [];
    const majorTickCount = 14; // Marques principales tous les 10 km/h
    const minorTickCount = 70; // Marques secondaires tous les 2 km/h
    const majorTickLength = 15;
    const minorTickLength = 8;
    
    // Marques secondaires
    for (let i = 0; i <= minorTickCount; i++) {
      const angle = (i / minorTickCount) * 270 - 135; // Arc de 270°
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
          stroke="#555"
          strokeWidth="1"
        />
      );
    }
    
    // Marques principales et labels
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
          stroke="#333"
          strokeWidth="3"
        />
      );
      
      // Ajouter les labels
      const labelValue = (i / majorTickCount) * maxValue;
      const labelX = center + (radius - strokeWidth - majorTickLength - 25) * Math.cos(angle * Math.PI / 180);
      const labelY = center + (radius - strokeWidth - majorTickLength - 25) * Math.sin(angle * Math.PI / 180);
      
      ticks.push(
        <SvgText
          key视角
          key={`label-${i}`}
          x={labelX}
          y={labelY}
          fill="#333"
          fontSize="14"
          fontWeight="600"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {Math.round(labelValue)}
        </SvgText>
      );
    }
    
    // Ajouter un triangle pour le seuil
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
        fill="#ff0000"
      />
    );
    
    return ticks;
  };

  return (
    <View style={styles.speedometerContainer}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        
        {/* Anneau extérieur décoratif */}
        <Circle
          cx={center}
          cy={center}
          r={radius + 5}
          stroke="#333"
          strokeWidth="4"
          fill="none"
          strokeOpacity="0.7"
        />
        
        {/* Cercle de fond */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          stroke="#ddd"
          strokeWidth={strokeWidth}
          fill="#fff"
          strokeOpacity="0.9"
        />
        
        {/* Cercle de progression */}
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
        
        {/* Marques et labels */}
        <G>
          {renderTicks()}
        </G>
        
        {/* Aiguille */}
        <G rotation={needleRotation} origin={`${center}, ${center}`}>
          <Line
            x1={center}
            y1={center}
            x2={center}
            y2={center - radius + 25}
            stroke="#e63946"
            strokeWidth="4"
            strokeLinecap="round"
            shadowColor="#000"
            shadowOffset={{ width: 2, height: 2 }}
            shadowOpacity={0.3}
            shadowRadius={2}
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
        
        {/* Valeur centrale */}
        <SvgText
          x={center}
          y={center + 50}
          fill="#333"
          fontSize="28"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="Arial"
        >
          {value.toFixed(0)} km/h
        </SvgText>
        
        {/* Seuil actuel */}
        <SvgText
          x={center}
          y={center + 80}
          fill="#ff0000"
          fontSize="16"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="Arial"
        >
          Seuil: {threshold} km/h
        </SvgText>
      </Svg>
    </View>
  );
};

// Composant Modal personnalisé
const CustomModal = ({ isVisible, onClose, title, message }) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.5}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
          <Text style={styles.modalButtonText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default function SpeedDetector() {
  const [speed, setSpeed] = useState(0);
  const [speedThreshold, setSpeedThreshold] = useState(INITIAL_SPEED_THRESHOLD);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSpeeding, setIsSpeeding] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const lastModalTime = useRef(0);

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
          
          // Convertir la vitesse de m/s en km/h
          const speedKmh = newLocation.coords.speed * 3.6;
          setSpeed(speedKmh);

          // Détecter si la vitesse dépasse le seuil
          if (speedKmh > speedThreshold && !isSpeeding) {
            setIsSpeeding(true);
            const currentTime = Date.now();
            if (currentTime - lastModalTime.current >= MODAL_DEBOUNCE_TIME) {
              setModalMessage(`Attention ! Vous dépassez la vitesse seuil de ${speedThreshold} km/h (${speedKmh.toFixed(0)} km/h)`);
              setIsModalVisible(true);
              lastModalTime.current = currentTime;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          } else if (speedKmh <= speedThreshold && isSpeeding) {
            setIsSpeeding(false);
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
    setSpeedThreshold((prev) => Math.min(prev + 5, MAX_SPEED_THRESHOLD));
  };

  const decreaseThreshold = () => {
    setSpeedThreshold((prev) => Math.max(prev - 5, MIN_SPEED_THRESHOLD));
  };

  // Fermer le modal
  const closeModal = () => {
    setIsModalVisible(false);
  };

  // Calculer la couleur et l'état
  const getColorAndStatus = () => {
    if (speed > speedThreshold) {
      return { color: '#ff0000', status: 'Dépassement de vitesse !' };
    }
    return { color: '#007bff', status: 'Vitesse normale' };
  };

  const { color, status } = getColorAndStatus();

  return (
    <View style={styles.container}>
      {/* Données en haut */}
      <View style={styles.dataContainer}>
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : location ? (
          <>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Vitesse: {speed.toFixed(0)} km/h</Text>
              <Text style={styles.label}>Seuil: {speedThreshold} km/h</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Lat: {location.coords.latitude.toFixed(5)}</Text>
              <Text style={styles.label}>Lon: {location.coords.longitude.toFixed(5)}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Précision: {location.coords.accuracy.toFixed(0)} m</Text>
              <Text style={styles.label}>Altitude: {location.coords.altitude ? location.coords.altitude.toFixed(0) : 'N/A'} m</Text>
            </View>
          </>
        ) : (
          <Text style={styles.label}>Acquisition des données GPS...</Text>
        )}
      </View>

      {/* Compteur de vitesse */}
      <View style={styles.speedometerWrapper}>
        <Speedometer 
          value={speed} 
          maxValue={MAX_SPEED_VALUE} 
          threshold={speedThreshold}
        />
      </View>

      {/* État au centre */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color }]}>
          {status}
        </Text>
      </View>

      {/* Contrôles en bas */}
      <View style={styles.controlsContainer}>
        <Text style={styles.thresholdLabel}>Seuil de vitesse : {speedThreshold} km/h</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.thresholdButton,
              { opacity: speedThreshold <= MIN_SPEED_THRESHOLD ? 0.5 : 1 },
            ]}
            onPress={decreaseThreshold}
            disabled={speedThreshold <= MIN_SPEED_THRESHOLD}
          >
            <Text style={styles.thresholdButtonText}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.thresholdButton,
              { opacity: speedThreshold >= MAX_SPEED_THRESHOLD ? 0.5 : 1 },
            ]}
            onPress={increaseThreshold}
            disabled={speedThreshold >= MAX_SPEED_THRESHOLD}
          >
            <Text style={styles.thresholdButtonText}>+5</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal personnalisé */}
      <CustomModal
        isVisible={isModalVisible}
        onClose={closeModal}
        title="Alerte de vitesse"
        message={modalMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedometerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  speedometerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    margin: 10,
    width: SCREEN_WIDTH - 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  statusContainer: {
    marginVertical: 12,
  },
  statusText: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingBottom: 50,
  },
  thresholdLabel: {
    fontSize: 18,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thresholdButton: {
    backgroundColor: '#007aff',
    width: 70,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  thresholdButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});