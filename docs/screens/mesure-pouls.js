import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert, Platform, ActivityIndicator, Animated } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function QRCodeScanner({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [heartRate, setHeartRate] = useState(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [fingerDetected, setFingerDetected] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Mesure du pouls' });
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  // Animation de pulsation pour le feedback visuel
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const checkFingerPresence = async () => {
    if (!cameraRef.current) return false;
    
    // Dans une vraie application, vous utiliseriez ici une analyse d'image
    // Pour cette simulation, nous supposons que le doigt est présent après 2 secondes
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(true);
      }, 2000);
    });
  };

  const startHeartRateMeasurement = async () => {
    try {
      setIsMeasuring(true);
      setTorch(true);
      startPulseAnimation();
      
      Alert.alert(
        'Prêt à mesurer', 
        'Placez votre index sur le flash de la caméra et maintenez-le immobile',
        [{ text: 'OK', onPress: () => {} }]
      );

      // Vérification de la présence du doigt
      const fingerPresent = await checkFingerPresence();
      
      if (!fingerPresent) {
        Alert.alert('Erreur', 'Détection du doigt échouée. Veuillez couvrir complètement le flash.');
        stopMeasurement();
        return;
      }

      setFingerDetected(true);
      Alert.alert('Détection réussie', 'Début de la mesure du pouls...');

      // Simulation de la mesure du pouls
      const measurementDuration = 15000;
      const interval = 1000;
      
      let elapsed = 0;
      const measurementInterval = setInterval(() => {
        elapsed += interval;
        const progress = Math.min(elapsed / measurementDuration, 1);
        
        if (progress < 1) {
          const simulatedBPM = Math.floor(60 + (progress * 40) + (Math.random() * 10 - 5));
          setHeartRate(simulatedBPM);
        } else {
          const finalBPM = Math.floor(70 + (Math.random() * 20 - 10));
          setHeartRate(finalBPM);
          clearInterval(measurementInterval);
          completeMeasurement(finalBPM);
        }
      }, interval);

      return () => clearInterval(measurementInterval);

    } catch (error) {
      console.error('Erreur:', error);
      stopMeasurement();
      Alert.alert('Erreur', 'Problème lors de la mesure');
    }
  };

  const completeMeasurement = (finalBPM) => {
    setIsMeasuring(false);
    setTorch(false);
    setFingerDetected(false);
    stopPulseAnimation();
    Alert.alert('Mesure terminée', `Votre rythme cardiaque: ${finalBPM} BPM`);
  };

  const stopMeasurement = () => {
    setIsMeasuring(false);
    setTorch(false);
    setFingerDetected(false);
    stopPulseAnimation();
    setHeartRate(null);
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function toggleTorch() {
    setTorch(current => !current);
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={100} color="#0099cc" />
        <Text style={styles.permissionText}>
          L'accès à la caméra est nécessaire pour mesurer votre pouls.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={getCameraPermissions}>
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.permissionText}>Demande d'autorisation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
      >
        <View style={styles.overlay}>
          {/* Zone de détection */}
          <Animated.View style={[
            styles.detectionZone, 
            { transform: [{ scale: pulseAnim }],
              backgroundColor: fingerDetected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)' 
            }
          ]}>
            <Text style={styles.detectionText}>
              {fingerDetected ? 'Détection réussie' : 'Placez votre doigt ici'}
            </Text>
          </Animated.View>

          {/* Contrôles en haut */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <MaterialCommunityIcons name="camera-flip" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleTorch}>
              <MaterialCommunityIcons 
                name={torch ? "flashlight-off" : "flashlight"} 
                size={30} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          {/* Contrôles en bas */}
          <View style={styles.bottomControls}>
            {!isMeasuring ? (
              <TouchableOpacity style={styles.measureButton} onPress={startHeartRateMeasurement}>
                <MaterialCommunityIcons name="heart-pulse" size={30} color="white" />
                <Text style={styles.measureButtonText}>Démarrer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopMeasurement}>
                <Text style={styles.stopButtonText}>Arrêter</Text>
              </TouchableOpacity>
            )}

            {heartRate !== null && (
              <View style={styles.resultContainer}>
                <MaterialCommunityIcons name="heart" size={30} color="#ff3d3d" />
                <Text style={styles.resultText}>{heartRate} BPM</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  permissionButton: {
    backgroundColor: '#0099cc',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionZone: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  detectionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 30,
  },
  measureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 20,
  },
  measureButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  stopButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 20,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  resultText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});