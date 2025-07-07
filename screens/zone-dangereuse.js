import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import * as Location from 'expo-location';
import Modal from 'react-native-modal';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

// Constantes
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;
const API_URL = 'https://rouah.net/api/zone-dangereuse.php';
const MODAL_DEBOUNCE_TIME = 5000; // 5 secondes entre chaque modal
const ALARM_SOUND = require('../assets/audio/signal-alert.wav');

// Fonction utilitaire : Calcul de la distance (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
};

// Composant WaveEmitter
const WaveEmitter = ({
  color = '#ccc',
  initialRadius = 50,
  maxRadius = SCREEN_WIDTH * 0.4,
  duration = 2000,
  numberOfWaves = 4,
  borderWidth = 3,
  fillOpacity = 0.3,
}) => {
  const animatedValues = useRef(
    Array.from({ length: numberOfWaves }, () => new Animated.Value(0))
  ).current;

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
                backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(
                  color.slice(3, 5),
                  16
                )}, ${parseInt(color.slice(5, 7), 16)}, ${fillOpacity})`,
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

// Composant principal
export default function ZoneDangereuse({navigation}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [dangerZones, setDangerZones] = useState([]);
  const [currentDangerZone, setCurrentDangerZone] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [waveColor, setWaveColor] = useState('#ccc');
  const [statusMessage, setStatusMessage] = useState('En attente de la position...');
  const lastModalTime = useRef(0);
  const statusAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const hasPlayedSound = useRef(false);

  // Charger le son
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(ALARM_SOUND);
        soundRef.current = sound;
      } catch (error) {
        console.error('Erreur lors du chargement du son:', error);
      }
    };

    loadSound();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Charger les zones dangereuses
  useEffect(() => {
    const fetchDangerZones = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDangerZones(data);
      } catch (error) {
        console.error('Erreur lors du chargement des zones dangereuses:', error);
        setModalMessage('Impossible de charger les zones dangereuses.');
        setIsModalVisible(true);
      }
    };

    fetchDangerZones();
  }, []);

  // Gérer la localisation
  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setModalMessage("L'accès à la localisation est nécessaire pour détecter les zones dangereuses.");
        setIsModalVisible(true);
        setStatusMessage('Permission de localisation refusée.');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 1,
        },
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });

          // Vérifier si dans une zone dangereuse
          let foundDangerZone = null;
          for (const zone of dangerZones) {
            const zoneDistance = calculateDistance(
              latitude,
              longitude,
              zone.latitude_zone,
              zone.longitude_zone
            );
            if (zoneDistance <= zone.rayon_zone) {
              foundDangerZone = zone;
              break;
            }
          }

          if (foundDangerZone && !currentDangerZone) {
            setCurrentDangerZone(foundDangerZone);
            setWaveColor(foundDangerZone.couleur_zone);
            setStatusMessage(`Zone dangereuse : ${foundDangerZone.adresse_zone}`);
            Animated.timing(statusAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }).start();
            
            // Vibrer et jouer le son
            Vibration.vibrate([500, 500, 500]);
            if (soundRef.current && !hasPlayedSound.current) {
              soundRef.current.replayAsync();
              hasPlayedSound.current = true;
            }
            
            const currentTime = Date.now();
            if (currentTime - lastModalTime.current >= MODAL_DEBOUNCE_TIME) {
              setModalMessage(
                `Vous êtes dans ${foundDangerZone.adresse_zone}. ${foundDangerZone.observation_zone}`
              );
              setIsModalVisible(true);
              lastModalTime.current = currentTime;
            }
          } else if (!foundDangerZone && currentDangerZone) {
            setCurrentDangerZone(null);
            setWaveColor('#ccc');
            setStatusMessage('Zone sûre');
            Animated.timing(statusAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }).start();
            
            // Réinitialiser le flag pour le son
            hasPlayedSound.current = false;
            
            const currentTime = Date.now();
            if (currentTime - lastModalTime.current >= MODAL_DEBOUNCE_TIME) {
              setModalMessage('Vous avez quitté la zone dangereuse.');
              setIsModalVisible(true);
              lastModalTime.current = currentTime;
            }
          } else if (foundDangerZone && currentDangerZone?.code_zone !== foundDangerZone.code_zone) {
            setCurrentDangerZone(foundDangerZone);
            setWaveColor(foundDangerZone.couleur_zone);
            setStatusMessage(`Zone dangereuse : ${foundDangerZone.adresse_zone}`);
            Animated.timing(statusAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }).start();
            
            // Vibrer et jouer le son pour une nouvelle zone dangereuse
            Vibration.vibrate([500, 500, 500]);
            if (soundRef.current) {
              soundRef.current.replayAsync();
            }
            
            const currentTime = Date.now();
            if (currentTime - lastModalTime.current >= MODAL_DEBOUNCE_TIME) {
              setModalMessage(
                `Vous êtes dans ${foundDangerZone.adresse_zone}. ${foundDangerZone.observation_zone}`
              );
              setIsModalVisible(true);
              lastModalTime.current = currentTime;
            }
          } else if (!foundDangerZone) {
            setStatusMessage('Zone sûre');
          }
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          setStatusMessage('Erreur de géolocalisation: ' + error.message);
          setModalMessage('Erreur de géolocalisation: ' + error.message);
          setIsModalVisible(true);
        }
      );
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [dangerZones, currentDangerZone]);

  // Fermer le modal
  const closeModal = () => {
    setIsModalVisible(false);
  };

  // Rafraîchir la position
  const refreshPosition = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ latitude, longitude });

      let foundDangerZone = null;
      for (const zone of dangerZones) {
        const zoneDistance = calculateDistance(
          latitude,
          longitude,
          zone.latitude_zone,
          zone.longitude_zone
        );
        if (zoneDistance <= zone.rayon_zone) {
          foundDangerZone = zone;
          break;
        }
      }

      if (foundDangerZone && !currentDangerZone) {
        setCurrentDangerZone(foundDangerZone);
        setWaveColor(foundDangerZone.couleur_zone);
        setStatusMessage(`Zone dangereuse : ${foundDangerZone.adresse_zone}`);
        Animated.timing(statusAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        
        // Vibrer et jouer le son
        Vibration.vibrate([500, 500, 500]);
        if (soundRef.current && !hasPlayedSound.current) {
          soundRef.current.replayAsync();
          hasPlayedSound.current = true;
        }
        
        setModalMessage(
          `Vous êtes dans ${foundDangerZone.adresse_zone}. ${foundDangerZone.observation_zone}`
        );
        setIsModalVisible(true);
      } else if (!foundDangerZone && currentDangerZone) {
        setCurrentDangerZone(null);
        setWaveColor('#ccc');
        setStatusMessage('Zone sûre');
        Animated.timing(statusAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
        
        // Réinitialiser le flag pour le son
        hasPlayedSound.current = false;
        
        setModalMessage('Vous avez quitté la zone dangereuse.');
        setIsModalVisible(true);
      } else if (foundDangerZone && currentDangerZone?.code_zone !== foundDangerZone.code_zone) {
        setCurrentDangerZone(foundDangerZone);
        setWaveColor(foundDangerZone.couleur_zone);
        setStatusMessage(`Zone dangereuse : ${foundDangerZone.adresse_zone}`);
        Animated.timing(statusAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        
        // Vibrer et jouer le son pour une nouvelle zone dangereuse
        Vibration.vibrate([500, 500, 500]);
        if (soundRef.current) {
          soundRef.current.replayAsync();
        }
        
        setModalMessage(
          `Vous êtes dans ${foundDangerZone.adresse_zone}. ${foundDangerZone.observation_zone}`
        );
        setIsModalVisible(true);
      } else if (!foundDangerZone) {
        setStatusMessage('Zone sûre');
      }
    } catch (error) {
      console.error('Erreur de rafraîchissement:', error);
      setModalMessage('Impossible de rafraîchir la position.');
      setIsModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Onde en arrière-plan */}
      <View style={styles.backgroundWave}>
        <WaveEmitter
          color={waveColor}
          initialRadius={50}
          maxRadius={SCREEN_WIDTH * 0.4}
          duration={2000}
          numberOfWaves={4}
          borderWidth={3}
          fillOpacity={0.3}
        />
      </View>

      {/* Données en haut */}
      <View style={styles.dataContainer}>
        <View style={styles.dataRow}>
          <Text style={styles.label}>
            Latitude: {currentLocation ? currentLocation.latitude.toFixed(6) : 'N/A'}
          </Text>
          <Text style={styles.label}>
            Longitude: {currentLocation ? currentLocation.longitude.toFixed(6) : 'N/A'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>
            Zone: {currentDangerZone ? currentDangerZone.adresse_zone : 'Aucune'}
          </Text>
          <Text style={styles.label}>
            Observation: {currentDangerZone ? currentDangerZone.observation_zone : 'Zone sûre'}
          </Text>
        </View>
      </View>

      {/* Message central animé */}
      <Animated.View style={styles.statusContainer}>
        <Animated.Text
          style={[
            styles.statusText,
            {
              color: statusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#00ff00', waveColor],
              }),
            },
          ]}
        >
          {statusMessage}
        </Animated.Text>
      </Animated.View>

      {/* Bouton de rafraîchissement en bas */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.refreshButtonTop} onPress={refreshPosition}>
          <Feather name="map-pin" size={28} color="white" />
        </TouchableOpacity>
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
  statusContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  statusText: {
    fontSize: 20,
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
     flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  refreshButton: {
    backgroundColor: '#007aff',
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
   refreshButtonTop: {
    backgroundColor: '#fa4447',
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  refreshButtonText: {
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