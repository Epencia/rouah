import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Linking, 
  Platform,
  Vibration,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';

const { width, height } = Dimensions.get('window');

export default function SignalAlerte({ route }) {
  const { id_geoip, latitude, longitude, adresse, utilisateur_id } = route.params;
  const [isModalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef(null);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonFadeAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef(null);

  // Animation de pulsation pour l'icône d'alerte
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  // Animation clignotante pour le bouton
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonFadeAnim, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();

    return () => blink.stop();
  }, [buttonFadeAnim]);

  // Son d'alerte
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/audio/signal-alert.wav'),
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (error) {
        console.log('Erreur audio:', error);
      }
    };

    loadSound();
    startCountdown ();
    Vibration.vibrate([500, 500, 500], true);

    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
      Vibration.cancel();
    };
  }, []);

  // Gestion du compte à rebours
  const startCountdown = () => {
    setModalVisible(true);
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setModalVisible(false);
          stopAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setModalVisible(false);
    setCountdown(5);
  };

  const stopAlert = () => {
    if (soundRef.current) {
      soundRef.current.stopAsync();
    }
    Vibration.cancel();
    // Ici vous pourriez ajouter une logique pour notifier le serveur que l'alerte est terminée
  };

  const openGoogleMaps = () => {
    const url = Platform.select({
      ios: `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}&zoom=15`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${adresse})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      }
    });
  };

  return (
    <LinearGradient 
      colors={['#ff0000', '#cc0000']} 
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Icône d'alerte animée */}
        <Animated.View style={[styles.alertIcon, { transform: [{ scale: pulseAnim }] }]}>
          <MaterialCommunityIcons name="alert-octagon" size={120} color="#fff" />
        </Animated.View>

        {/* Titre */}
        <Text style={styles.title}>ALERTE URGENCE</Text>
        
        {/* Informations */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ID: {id_geoip}</Text>
          <Text style={styles.infoText}>Utilisateur: {utilisateur_id}</Text>
          <Text style={styles.infoText}>Localisation: {latitude}, {longitude}</Text>
          <Text style={styles.infoText}>Adresse: {adresse}</Text>
        </View>

        {/* Boutons d'action */}
        <Animated.View style={[styles.buttonRow, { opacity: buttonFadeAnim }]}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.mapButton]}
            onPress={openGoogleMaps}
          >
            <MaterialIcons name="map" size={24} color="#fff" />
            <Text style={styles.buttonText}>Carte</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.stopButton]}
            onPress={stopAlert}
          >
            <MaterialIcons name="stop" size={24} color="#fff" />
            <Text style={styles.buttonText}>Arrêter</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Modal de confirmation */}
      <Modal isVisible={isModalVisible} backdropOpacity={0.8}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirmer l'arrêt</Text>
          <Text style={styles.modalCountdown}>{countdown}</Text>
          <Text style={styles.modalText}>
            L'alerte sera désactivée dans {countdown} secondes
          </Text>
          <TouchableOpacity 
            style={styles.modalButton} 
            onPress={cancelCountdown}
          >
            <Text style={styles.modalButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertIcon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    marginBottom: 30,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  mapButton: {
    backgroundColor: '#4285F4', // Bleu Google
  },
  stopButton: {
    backgroundColor: '#0A84FF', // Bleu iOS
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 15,
  },
  modalCountdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff0000',
    marginVertical: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#ff0000',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});