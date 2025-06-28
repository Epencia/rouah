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

const { width, height } = Dimensions.get('window');

// Constantes
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;
const INITIAL_THRESHOLD = 20; // Seuil initial pour détecter une anomalie (μT)
const WINDOW_SIZE = 10; // Taille de la fenêtre pour la moyenne mobile
const MIN_THRESHOLD = 5; // Seuil minimum (μT)
const MAX_THRESHOLD = 50; // Seuil maximum (μT)
const MODAL_DEBOUNCE_TIME = 5000; // 5 secondes entre chaque modal

// Composant WaveEmitter
const WaveEmitter = ({
  color = '#007bff',
  initialRadius = 50,
  maxRadius = SCREEN_WIDTH * 0.4,
  duration = 2000,
  numberOfWaves = 4,
  borderWidth = 2,
  fillOpacity = 0.2,
}) => {
  const animatedValues = useRef(Array.from({ length: numberOfWaves }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const createAnimation = (animatedValue, delay) => {
      animatedValue.setValue(0);
      return Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.out(Easing.ease),
        delay: delay,
        useNativeDriver: true,
      });
    };

    const startAnimations = () => {
      const animations = animatedValues.map((val, index) =>
        createAnimation(val, (duration / numberOfWaves) * index)
      );
      Animated.loop(Animated.parallel(animations)).start();
    };

    startAnimations();

    return () => {
      animatedValues.forEach((val) => val.stopAnimation());
    };
  }, [duration, numberOfWaves]);

  const baseCircleDiameter = initialRadius * 2;

  return (
    <View style={styles.waveEmitterContainer}>
      {animatedValues.map((animatedValue, index) => {
        const scale = animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, maxRadius / initialRadius],
        });

        const opacity = animatedValue.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.waveCircle,
              {
                width: baseCircleDiameter,
                height: baseCircleDiameter,
                borderRadius: baseCircleDiameter / 2,
                opacity: opacity,
                transform: [{ scale: scale }],
                borderColor: color,
                borderWidth: borderWidth,
                backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${fillOpacity})`,
              },
            ]}
          />
        );
      })}
      <View style={[styles.centerDot, { backgroundColor: color }]} />
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


export default function DetecteurMagnetique () {

  const [magneticField, setMagneticField] = useState({ x: 0, y: 0, z: 0 });
  const [baseline, setBaseline] = useState(null);
  const [magnitude, setMagnitude] = useState(0);
  const [filteredMagnitude, setFilteredMagnitude] = useState(0);
  const [history, setHistory] = useState([]);
  const [threshold, setThreshold] = useState(INITIAL_THRESHOLD);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const lastModalTime = useRef(0);
  const deviationAnim = useRef(new Animated.Value(0)).current;

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

        // Animer l'écart
        if (baseline) {
          const deviation = Math.abs(filtered - baseline);
          Animated.timing(deviationAnim, {
            toValue: deviation,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }

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
  }, [baseline, threshold, deviationAnim]);

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

  // Calculer la couleur, l'état et la taille des vagues
  const getWaveColorAndStatus = () => {
    if (!baseline) {
      return { color: '#ccc', status: 'Calibration requise', maxRadius: SCREEN_WIDTH * 0.3 };
    }
    const deviation = Math.abs(filteredMagnitude - baseline);
    if (deviation > threshold) {
      return { color: '#ff0000', status: 'Anomalie détectée', maxRadius: SCREEN_WIDTH * 0.5 };
    }
    if (deviation > threshold / 2) {
      return { color: '#ffa500', status: 'Perturbation modérée', maxRadius: SCREEN_WIDTH * 0.4 };
    }
    return { color: '#00ff00', status: 'Normal', maxRadius: SCREEN_WIDTH * 0.35 };
  };

  const { color, status, maxRadius } = getWaveColorAndStatus();

  return (
    <View style={styles.container}>
      {/* Onde en arrière-plan */}
      <View style={styles.backgroundWave}>
        <WaveEmitter
          color={color}
          initialRadius={50}
          maxRadius={maxRadius}
          duration={2000}
          numberOfWaves={4}
          borderWidth={3}
          fillOpacity={0.3}
        />
      </View>

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

      {/* Écart animé au centre */}
      <Animated.View style={styles.deviationContainer}>
        <Animated.Text style={[styles.deviationText, { color }]}>
          {baseline
            ? `${filteredMagnitude.toFixed(2)} μT (${status})`
            : 'Calibrez pour voir l\'écart'}
        </Animated.Text>
      </Animated.View>

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
  },
  backgroundWave: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  waveEmitterContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  waveCircle: {
    position: 'absolute',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    zIndex: 1,
  },
  dataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    margin: 10,
    width: SCREEN_WIDTH - 20,
    zIndex: 1,
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
  deviationContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  deviationText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 60,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    zIndex: 1,
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