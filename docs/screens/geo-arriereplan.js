import React, { useState, useEffect } from 'react';
import { View, Text, Button, Platform, Alert, StyleSheet, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Définition de la tâche en arrière-plan
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Erreur tâche en arrière-plan :', error);
    return;
  }

  const { locations } = data;
  if (locations && locations.length > 0) {
    const { latitude, longitude } = locations[0].coords;
    const newLocation = {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem('lastLocation', JSON.stringify(newLocation));
      console.log('Position enregistrée en arrière-plan :', newLocation);
    } catch (err) {
      console.warn('Erreur AsyncStorage en arrière-plan :', err);
    }
  }
});

export default function GeoArrierePlan() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
  const init = async () => {
    await loadLastLocation();
    await startBackgroundTracking(); // Démarrage automatique
  };
  init();
  const interval = setInterval(loadLastLocation, 60000);
  return () => clearInterval(interval);
}, []);


  const showError = (message, error) => {
    setError(message);
    console.warn(message, error);
  };

  const requestLocationPermissions = async () => {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        showError('Permission de localisation en premier plan refusée');
        return false;
      }

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          showError('Permission de localisation en arrière-plan refusée');
          return false;
        }
      }

      return true;
    } catch (err) {
      showError('Erreur lors de la demande de permission', err);
      return false;
    }
  };

  const getLocation = async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return;

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      setLocation(newLocation);
      await AsyncStorage.setItem('lastLocation', JSON.stringify(newLocation));
      Alert.alert('Succès', 'Position enregistrée localement !');
    } catch (err) {
      showError('Erreur lors de la récupération de la position', err);
    }
  };

  const startBackgroundTracking = async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return;

    try {
      const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (!alreadyRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 600000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Adorès Cloud',
            notificationBody: 'Suivi de localisation en arrière-plan actif',
          },
        });
      }
      setIsTracking(true);
      Alert.alert('Succès', 'Suivi en arrière-plan démarré !');
    } catch (err) {
      showError('Erreur lors du démarrage du suivi en arrière-plan', err);
    }
  };

  const stopBackgroundTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      setIsTracking(false);
      Alert.alert('Succès', 'Suivi en arrière-plan arrêté !');
    } catch (err) {
      showError('Erreur lors de l’arrêt du suivi en arrière-plan', err);
    }
  };

  const loadLastLocation = async () => {
    try {
      const stored = await AsyncStorage.getItem('lastLocation');
      if (stored) {
        setLocation(JSON.parse(stored));
      }
    } catch (err) {
      showError('Erreur lors de la récupération de la dernière position', err);
    }
  };

  const defaultRegion = {
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={defaultRegion} showsUserLocation={true}>
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="Votre position"
            description={`Date: ${location.timestamp}`}
          />
        )}
      </MapView>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {location
            ? `Latitude: ${location.latitude}\nLongitude: ${location.longitude}\nDate: ${location.timestamp}`
            : 'Aucune position enregistrée'}
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Obtenir ma position (Premier plan)" onPress={getLocation} />
        <View style={styles.buttonContainer}>
          <Button
            title={isTracking ? 'Arrêter le suivi en arrière-plan' : 'Démarrer le suivi en arrière-plan'}
            onPress={isTracking ? stopBackgroundTracking : startBackgroundTracking}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.6,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 10,
  },
});
