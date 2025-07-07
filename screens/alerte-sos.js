import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Vibration, StyleSheet, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import {Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';

const { width, height } = Dimensions.get('window');

export default function AlerteSOS ({navigation}) {
  const [location, setLocation] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(null);

  // Animation de pulsation
  const pulseAnimation = {
    0: { scale: 1 },
    0.5: { scale: 1.2 },
    1: { scale: 1 },
  };

  // Demander les permissions de localisation
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erreur', 'Permission de localisation refusée.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  // Détection de chute (accéléromètre)
  useEffect(() => {
    let subscription;
    Sensors.Accelerometer.setUpdateInterval(100);
    subscription = Sensors.Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      if (acceleration > 2.5) {
        handleAutomaticSOS();
      }
    });
    return () => subscription?.remove();
  }, [location]);

  // Gérer le compte à rebours
  const startCountdown = () => {
    setModalVisible(true);
    setCountdown(10);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setModalVisible(false);
          sendSOS(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setModalVisible(false);
    setCountdown(10);
  };

  // Envoyer une alerte SOS
  const sendSOS = async (isAutomatic = false) => {
    if (!location) {
      Alert.alert('Erreur', 'Localisation indisponible.');
      return;
    }

    // Vérifier le matricule
    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      console.warn('⚠️ Matricule non trouvé.');
      Alert.alert('Erreur', 'Matricule non configuré. Veuillez vous connecter.');
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    const pushToken = await AsyncStorage.getItem('pushToken');
    const sosData = {
      userId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      matricule,
      type: isAutomatic ? 'AUTO_SOS' : 'MANUAL_SOS',
      timestamp: new Date().toISOString(),
    };

    try {
      // Stocker localement
      let alerts = JSON.parse(await AsyncStorage.getItem('sos_alerts')) || [];
      alerts.push(sosData);
      await AsyncStorage.setItem('sos_alerts', JSON.stringify(alerts));

      // Envoyer à l'API
      const url = `https://rouah.net/api/position.php?latitude=${sosData.latitude}&longitude=${sosData.longitude}&matricule=${matricule}`;
      const response = await fetch(url);
      const json = await response.json();
      console.log('📤 Réponse API (SOS):', json);
      Vibration.vibrate([500, 500, 500]);
      Alert.alert('Succès', 'Alerte envoyée à vos contacts et enregistrée.');
    } catch (error) {
      Alert.alert('Erreur', "Échec de l’envoi de l’alerte. Vérifiez votre connexion.");
      console.error('Erreur SOS:', error);
    }
  };

  const handleAutomaticSOS = () => {
    Alert.alert(
      'Danger détecté',
      'Voulez-vous envoyer une alerte SOS ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer', onPress: () => sendSOS(true) },
      ],
      { cancelable: false }
    );
  };

  return (
    <LinearGradient colors={['#ff4d4d', '#ff9999']} style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.subtitle}>Maintenez pour envoyer une alerte SOS</Text>
        <Animatable.View
          animation={pulseAnimation}
          iterationCount="infinite"
          duration={2000}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            style={styles.sosButton}
            onLongPress={startCountdown}
            activeOpacity={0.8}
          >
            <MaterialIcons name="sos" size={60} color="#fff" />
            <Text style={styles.buttonText}>Alerte</Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
      <Modal isVisible={isModalVisible} backdropOpacity={0.7}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Envoi de l'alerte SOS</Text>
          <Text style={styles.modalCountdown}>{countdown}</Text>
          <Text style={styles.modalText}>L'alerte sera envoyée dans {countdown} secondes</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelCountdown}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>

       <TouchableOpacity
                style={styles.floatingButtonBottom}
                onPress={()=>navigation.navigate("Edition d'alerte")}
              >
                <Feather name="edit" size={24} color="black" />
              </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: '#ff3333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff3333',
    marginBottom: 10,
  },
  modalCountdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff3333',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff3333',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
 floatingButtonBottom: {
  position: 'absolute',       // Positionnement flottant
  bottom: 15,                 // Distance depuis le bas
  right: 15,                  // Distance depuis la droite
  backgroundColor: 'white',
  width: 50,
  height: 50,
  borderRadius: 25,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  zIndex: 3,
}

});