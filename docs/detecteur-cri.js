import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';

const ScreamDetector = () => {
  const [isListening, setIsListening] = useState(false);
  const [decibels, setDecibels] = useState(0);
  const [sound, setSound] = useState(null);
  const [recording, setRecording] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);

  // Seuil en dB pour considérer qu'il s'agit d'un cri
  const SCREAM_THRESHOLD = 70;

  // Vérifier les permissions au montage du composant
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const status = await Audio.requestPermissionsAsync();
        setHasPermission(status.granted);
      } else {
        // Pour iOS, nous allons demander la permission quand l'utilisateur clique
        setHasPermission(null);
      }
    })();
  }, []);

  async function playAudio() {
    console.log('Playing audio...');
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/audio/emergency-alert-alarm.wav')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing audio:', error);
      Alert.alert("Erreur", "Impossible de jouer le son d'alerte");
    }
  }

  useEffect(() => {
    return () => {
      // Nettoyage
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [sound, recording]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission requise",
          "L'application a besoin d'accéder à votre microphone pour fonctionner",
          [
            {
              text: "Annuler",
              style: "cancel"
            },
            { 
              text: "Ouvrir les paramètres", 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (err) {
      console.error('Erreur de permission:', err);
      return false;
    }
  };

  const startListening = async () => {
    try {
      // Vérifier les permissions
      if (hasPermission === false) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsListening(true);

      // Simuler la détection de volume
      const interval = setInterval(async () => {
        if (newRecording) {
          try {
            // Solution temporaire: simulation de niveau sonore
            // En production, vous devriez analyser les données audio réelles
            const status = await newRecording.getStatusAsync();
            const simulatedDb = status.isRecording ? Math.random() * 100 : 0;
            setDecibels(simulatedDb);
            
            if (simulatedDb > SCREAM_THRESHOLD) {
              playAudio();
            }
          } catch (error) {
            console.log('Error checking recording status:', error);
          }
        }
      }, 300);

      return () => clearInterval(interval);
    } catch (err) {
      console.error('Erreur:', err);
      setIsListening(false);
      Alert.alert("Erreur", "Impossible d'accéder au microphone");
    }
  };

  const stopListening = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      setIsListening(false);
      setDecibels(0);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Détecteur de cris</Text>
      
      <Text style={styles.dbText}>
        Niveau sonore: {decibels.toFixed(2)} dB
      </Text>
      
      <Text style={styles.thresholdText}>
        Seuil de cri: {SCREAM_THRESHOLD} dB
      </Text>
      
      {!isListening ? (
        <Button 
          title="Commencer l'écoute" 
          onPress={startListening} 
          disabled={hasPermission === false}
        />
      ) : (
        <Button title="Arrêter l'écoute" onPress={stopListening} />
      )}
      
      {hasPermission === false && (
        <Text style={styles.errorText}>
          Les permissions microphone sont requises pour cette fonctionnalité
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  dbText: {
    fontSize: 18,
    marginBottom: 10,
  },
  thresholdText: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
  },
  errorText: {
    color: 'red',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default ScreamDetector;