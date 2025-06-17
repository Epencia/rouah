import React, { useEffect, useState } from 'react';
import { View, Button, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Erreur tâche localisation en arrière-plan :', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      console.log('📍 Localisation arrière-plan:', latitude, longitude);

      try {
        const matricule = await AsyncStorage.getItem('matricule');
        if (!matricule) {
          console.warn('⚠️ Matricule non trouvé.');
          return;
        }

        const url = `https://adores.cloud/api/position.php?latitude=${latitude}&longitude=${longitude}&matricule=${matricule}`;
        const response = await fetch(url);
        const json = await response.json();
        console.log('📤 Réponse API (background):', json);
      } catch (err) {
        console.error('❌ Erreur envoi background:', err);
      }
    }
  }
});

export default function BackgroundLocationManager() {
  const [locationStarted, setLocationStarted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('Permission foreground:', fgStatus);
      if (fgStatus !== 'granted') {
        Alert.alert('Permission refusée', 'La localisation en premier plan est requise.');
        return;
      }

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          Alert.alert('Permission refusée', 'La localisation en arrière-plan est requise.');
          return;
        }
      }

      setReady(true); // ✅ Tout est prêt
    })();
  }, []);

  const startLocationUpdates = async () => {
    console.log("⏳ Démarrage du suivi localisation...");
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 300000, // 5 minutes
        distanceInterval: 50, // 50 mètres
        foregroundService: {
          notificationTitle: 'Suivi de localisation actif',
          notificationBody: 'Votre position est suivie en arrière-plan.',
          notificationColor: '#FF0000',
        },
        showsBackgroundLocationIndicator: true,
      });
      setLocationStarted(true);
      Alert.alert('✅ Succès', 'Suivi de localisation en arrière-plan activé.');
    } else {
      Alert.alert('ℹ️ Info', 'Le suivi est déjà actif.');
    }
  };

  const sendCurrentPosition = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const matricule = await AsyncStorage.getItem('matricule');

      if (!matricule) {
        Alert.alert("Erreur", "Matricule non trouvé.");
        return;
      }

      const url = `https://adores.cloud/api/position.php?latitude=${latitude}&longitude=${longitude}&matricule=${matricule}`;
      const response = await fetch(url);
      const json = await response.json();

      console.log("📤 Position envoyée manuellement:", json);
      Alert.alert("✅ Succès", "Position envoyée manuellement !");
    } catch (error) {
      console.error("❌ Erreur manuelle:", error);
      Alert.alert("Erreur", "Impossible d’envoyer la position.");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button
        title={locationStarted ? "✅ Suivi actif" : "▶️ Activer suivi géolocalisation"}
        onPress={startLocationUpdates}
        color={locationStarted ? 'green' : 'blue'}
        disabled={!ready}
      />
      <View style={{ marginTop: 20 }}>
        <Button
          title="📍 Envoyer ma position maintenant"
          onPress={sendCurrentPosition}
          color="orange"
          disabled={!ready}
        />
      </View>
    </View>
  );
}
