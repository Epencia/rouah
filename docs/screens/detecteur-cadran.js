import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import { Svg, Circle, G, Text as SvgText, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Constantes
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;
const INITIAL_THRESHOLD = 20; // Seuil initial pour détecter une anomalie (μT)
const WINDOW_SIZE = 10; // Taille de la fenêtre pour la moyenne mobile
const MIN_THRESHOLD = 5; // Seuil minimum (μT)
const MAX_THRESHOLD = 50; // Seuil maximum (μT)
const MODAL_DEBOUNCE_TIME = 5000; // 5 secondes entre chaque modal
const MAX_SPEED_VALUE = 100; // Valeur maximale pour le compteur de vitesse
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.8, SCREEN_HEIGHT * 0.6); // Taille du compteur

// Composant Speedometer
const Speedometer = ({ value = 0, maxValue = MAX_SPEED_VALUE, color = '#007bff' }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const needleRotation = rotation.interpolate({
    inputRange: [0, maxValue],
    outputRange: ['-90deg', '90deg'],
  });

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: Math.min(value, maxValue),
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [value]);

  const radius = CIRCLE_SIZE / 2;
  const center = radius;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  const dashArray = `${circumference}, ${circumference}`;
  const progress = (value / maxValue) * circumference;

  // Créer les marques pour le compteur
  const renderTicks = () => {
    const ticks = [];
    const tickCount = 10;
    const tickLength = 10;
    
    for (let i = 0; i <= tickCount; i++) {
      const angle = (i / tickCount) * 180 - 90;
      const x1 = center + (radius - strokeWidth - 5) * Math.cos(angle * Math.PI / 180);
      const y1 = center + (radius - strokeWidth - 5) * Math.sin(angle * Math.PI / 180);
      const x2 = center + (radius - strokeWidth - tickLength - 5) * Math.cos(angle * Math.PI / 180);
      const y2 = center + (radius - strokeWidth - tickLength - 5) * Math.sin(angle * Math.PI / 180);
      
      ticks.push(
        <Line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#333"
          strokeWidth="2"
        />
      );
      
      // Ajouter les labels
      if (i % 2 === 0) {
        const labelValue = (i / tickCount) * maxValue;
        const labelX = center + (radius - strokeWidth - tickLength - 25) * Math.cos(angle * Math.PI / 180);
        const labelY = center + (radius - strokeWidth - tickLength - 25) * Math.sin(angle * Math.PI / 180);
        
        ticks.push(
          <SvgText
            key={`label-${i}`}
            x={labelX}
            y={labelY}
            fill="#333"
            fontSize="12"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {labelValue}
          </SvgText>
        );
      }
    }
    
    return ticks;
  };

  return (
    <View style={styles.speedometerContainer}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        {/* Cercle de fond */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          stroke="#eee"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Cercle de progression */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          fill="transparent"
          rotation="-90"
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
            y2={center - radius + 30}
            stroke="#333"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Circle
            cx={center}
            cy={center}
            r="8"
            fill="#333"
          />
        </G>
        
        {/* Valeur centrale */}
        <SvgText
          x={center}
          y={center + 40}
          fill="#333"
          fontSize="24"
          fontWeight="bold"
          textAnchor="middle"
        >
          {value.toFixed(1)} μT
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

export default function DetecteurMagnetique() {
  const [magneticField, setMagneticField] = useState({ x: 0, y: 0, z: 0 });
  const [baseline, setBaseline] = useState(null);
  const [magnitude, setMagnitude] = useState(0);
  const [filteredMagnitude, setFilteredMagnitude] = useState(0);
  const [history, setHistory] = useState([]);
  const [threshold, setThreshold] = useState(INITIAL_THRESHOLD);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const lastModalTime = useRef(0);

  // Calcul de l'amplitude du champ magnétique
  const calculateMagnitude = ({ x, y, z }) => {
    return Math.sqrt(x * x + y * y + z * z);
  };

  // Filtre de moyenne mobile
  const applyMovingAverage = (values) => {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };

  // Gestion des données du magnétomètre
  useEffect(() => {
    Magnetometer.setUpdateInterval(100);

    const subscription = Magnetometer.addListener(({ x, y, z }) => {
      const newMagneticField = { x, y, z };
      setMagneticField(newMagneticField);

      // Calculer l'amplitude
      const newMagnitude = calculateMagnitude(newMagneticField);
      setMagnitude(newMagnitude);

      // Mettre à jour l'historique pour le filtre
      setHistory((prev) => {
        const newHistory = [...prev, newMagnitude].slice(-WINDOW_SIZE);
        const filtered = applyMovingAverage(newHistory);
        setFilteredMagnitude(filtered);

        // Détecter une anomalie si baseline existe
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

    // Vérifier la disponibilité du magnétomètre
    Magnetometer.isAvailableAsync().then((available) => {
      if (!available) {
        setModalMessage('Le magnétomètre n\'est pas disponible sur cet appareil.');
        setIsModalVisible(true);
      }
    });

    // Nettoyage
    return () => {
      subscription.remove();
    };
  }, [baseline, threshold]);

  // Fonction de calibrage
  const handleCalibrate = () => {
    setBaseline(filteredMagnitude);
    setModalMessage(`Baseline définie à ${filteredMagnitude.toFixed(2)} μT`);
    setIsModalVisible(true);
  };

  // Ajuster le seuil
  const increaseThreshold = () => {
    setThreshold((prev) => Math.min(prev + 1, MAX_THRESHOLD));
  };

  const decreaseThreshold = () => {
    setThreshold((prev) => Math.max(prev - 1, MIN_THRESHOLD));
  };

  // Fermer le modal
  const closeModal = () => {
    setIsModalVisible(false);
  };

  // Calculer la couleur et l'état
  const getColorAndStatus = () => {
    if (!baseline) {
      return { color: '#ccc', status: 'Calibration requise' };
    }
    const deviation = Math.abs(filteredMagnitude - baseline);
    if (deviation > threshold) {
      return { color: '#ff0000', status: 'Anomalie détectée' };
    }
    if (deviation > threshold / 2) {
      return { color: '#ffa500', status: 'Perturbation modérée' };
    }
    return { color: '#00ff00', status: 'Normal' };
  };

  const { color, status } = getColorAndStatus();

  return (
    <View style={styles.container}>

            {/* Données en haut */}
      <View style={styles.dataContainer}>
        <View style={styles.dataRow}>
          <Text style={styles.label}>X: {magneticField.x.toFixed(2)} μT</Text>
          <Text style={styles.label}>Y: {magneticField.y.toFixed(2)} μT</Text>
          <Text style={styles.label}>Z: {magneticField.z.toFixed(2)} μT</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Brute: {magnitude.toFixed(2)} μT</Text>
          <Text style={styles.label}>Filtrée: {filteredMagnitude.toFixed(2)} μT</Text>
          <Text style={styles.label}>
            Baseline: {baseline ? baseline.toFixed(2) : 'N/A'} μT
          </Text>
        </View>
      </View>

      {/* Compteur de vitesse */}
      <View style={styles.speedometerWrapper}>
        <Speedometer 
          value={filteredMagnitude} 
          maxValue={MAX_SPEED_VALUE} 
          color={color} 
        />
      </View>



      {/* État au centre */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color }]}>
          {baseline ? status : 'Calibrez pour voir l\'état'}
        </Text>
      </View>

      {/* Contrôles en bas */}
      <View style={styles.controlsContainer}>
        <Text style={styles.thresholdLabel}>Seuil de détection: {threshold} μT</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.thresholdButton,
              { opacity: threshold <= MIN_THRESHOLD ? 0.5 : 1 },
            ]}
            onPress={decreaseThreshold}
            disabled={threshold <= MIN_THRESHOLD}
          >
            <Text style={styles.thresholdButtonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.calibrateButton} onPress={handleCalibrate}>
            <Text style={styles.calibrateButtonText}>Calibrer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.thresholdButton,
              { opacity: threshold >= MAX_THRESHOLD ? 0.5 : 1 },
            ]}
            onPress={increaseThreshold}
            disabled={threshold >= MAX_THRESHOLD}
          >
            <Text style={styles.thresholdButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal personnalisé */}
      <CustomModal
        isVisible={isModalVisible}
        onClose={closeModal}
        title="Notification"
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
    //paddingVertical: 20,
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
  },
  dataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    margin: 10,
    width: SCREEN_WIDTH - 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  statusContainer: {
    marginVertical: 10,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controlsContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingBottom: 60,
  },
  thresholdLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thresholdButton: {
    backgroundColor: '#007aff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  thresholdButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  calibrateButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  calibrateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});